import { db, schema, renderTemplate, appendOptOutLine, calculateMessageParts, generateShortToken } from '@sms-crm/lib';
import { Worker, Job } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import Fastify from 'fastify';
import Redis from 'ioredis';

import { TwilioProvider } from './providers/twilio';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize provider
const provider = new TwilioProvider(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || '',
  process.env.TWILIO_FROM_NUMBER || ''
);

const worker = new Worker(
  'send-messages',
  async (job: Job) => {
    const { sendJobId } = job.data;

    console.log(`Processing send job: ${sendJobId}`);

    try {
      // Get send job
      const [sendJob] = await db
        .select()
        .from(schema.sendJobs)
        .where(eq(schema.sendJobs.id, sendJobId))
        .limit(1);

      if (!sendJob) {
        console.error('Send job not found:', sendJobId);
        return;
      }

      // Get contact, template, campaign
      const [contact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, sendJob.contactId))
        .limit(1);

      const [template] = await db
        .select()
        .from(schema.messageTemplates)
        .where(eq(schema.messageTemplates.id, sendJob.templateId))
        .limit(1);

      const [campaign] = await db
        .select()
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, sendJob.campaignId))
        .limit(1);

      if (!contact || !template || !campaign) {
        throw new Error('Missing required data');
      }

      // Generate short link if target URL exists
      let shortUrl: string | undefined;
      if (campaign.targetUrl) {
        const token = generateShortToken(sendJob.tenantId, campaign.id, contact.id);
        const shortDomain = process.env.SHORT_DOMAIN || 'sms.link';

        // Create short link record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60); // 60 days TTL

        await db.insert(schema.shortLinks).values({
          tenantId: sendJob.tenantId,
          campaignId: campaign.id,
          contactId: contact.id,
          token,
          targetUrl: campaign.targetUrl,
          expiresAt,
        });

        shortUrl = `https://${shortDomain}/${token}`;
      }

      // Render template
      const variables: Record<string, string> = {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        link: shortUrl || campaign.targetUrl || '',
      };

      let message = renderTemplate(template.body, variables);
      message = appendOptOutLine(message);

      // Calculate parts and cost
      const parts = calculateMessageParts(message);
      const [costRecord] = await db
        .select()
        .from(schema.costs)
        .where(eq(schema.costs.country, 'AU'))
        .limit(1);

      const costCents = costRecord ? costRecord.perPartCents * parts : 0;

      // Update send job with rendered message
      await db
        .update(schema.sendJobs)
        .set({ body: message, parts, costCents })
        .where(eq(schema.sendJobs.id, sendJob.id));

      // Get sending number
      const [sendingNumber] = await db
        .select()
        .from(schema.sendingNumbers)
        .where(eq(schema.sendingNumbers.tenantId, sendJob.tenantId))
        .limit(1);

      if (!sendingNumber) {
        throw new Error('No sending number available');
      }

      // Send via provider
      const result = await provider.send({
        from: sendingNumber.phoneE164,
        to: contact.phoneE164,
        body: message,
      });

      // Update send job
      await db
        .update(schema.sendJobs)
        .set({
          status: 'sent',
          sentAt: new Date(),
          providerMessageId: result.messageId,
          sendingNumberId: sendingNumber.id,
        })
        .where(eq(schema.sendJobs.id, sendJob.id));

      // Update contact last sent
      await db
        .update(schema.contacts)
        .set({ lastSentAt: new Date() })
        .where(eq(schema.contacts.id, contact.id));

      // Update budget
      await db
        .update(schema.budgets)
        .set({
          dailySpentCents: sql`${schema.budgets.dailySpentCents} + ${costCents}`,
          monthlySpentCents: sql`${schema.budgets.monthlySpentCents} + ${costCents}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.budgets.tenantId, sendJob.tenantId));

      // Increment warmup counter
      if (sendingNumber.warmupStartDate) {
        const todayKey = `warmup:${sendingNumber.id}:${new Date().toISOString().split('T')[0]}`;
        await redis.incr(todayKey);
        await redis.expire(todayKey, 86400); // 24 hours
      }

      // Record event
      await db.insert(schema.events).values({
        tenantId: sendJob.tenantId,
        contactId: contact.id,
        campaignId: campaign.id,
        sendJobId: sendJob.id,
        eventType: 'SENT',
        metadata: { providerMessageId: result.messageId },
      });

      console.log(`Successfully sent message: ${result.messageId}`);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Update send job as failed
      await db
        .update(schema.sendJobs)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: error.message,
        })
        .where(eq(schema.sendJobs.id, sendJobId));

      // Record event
      await db.insert(schema.events).values({
        tenantId: sendJobId,
        eventType: 'FAILED',
        metadata: { error: error.message },
      });

      // Only retry on 5xx errors
      if (error.code >= 500) {
        throw error; // Will trigger BullMQ retry
      }
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
    limiter: {
      max: 10, // 10 jobs per minute
      duration: 60000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

console.log('Worker started');

// Health check endpoint
const fastify = Fastify();

fastify.get('/health', async () => {
  return {
    ok: true,
    ts: new Date().toISOString(),
    service: 'worker',
  };
});

const PORT = parseInt(process.env.WORKER_PORT || '3002', 10);
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
  console.log(`Worker health endpoint on port ${PORT}`);
});
