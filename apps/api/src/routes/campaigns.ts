import { FastifyPluginAsync } from 'fastify';
import { db, schema, calculateMessageParts, appendOptOutLine, renderTemplate } from '@sms-crm/lib';
import { eq, and } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { GateChecker } from '../services/gate-checker';

const sendQueue = new Queue('send-messages', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

const gateChecker = new GateChecker();

const campaignRoutes: FastifyPluginAsync = async (fastify) => {
  // Create campaign
  fastify.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { name, templateIds, targetUrl } = request.body as {
      name: string;
      templateIds: string[];
      targetUrl?: string;
    };

    const [campaign] = await db
      .insert(schema.campaigns)
      .values({
        tenantId: authReq.user!.tenantId,
        name,
        templateIds,
        targetUrl,
        status: 'draft',
      })
      .returning();

    return campaign;
  });

  // Get campaign
  fastify.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(
        and(eq(schema.campaigns.id, id), eq(schema.campaigns.tenantId, authReq.user!.tenantId))
      )
      .limit(1);

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    return campaign;
  });

  // Queue campaign
  fastify.post('/:id/queue', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { segmentFilter } = request.body as { segmentFilter?: any };

    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(
        and(eq(schema.campaigns.id, id), eq(schema.campaigns.tenantId, authReq.user!.tenantId))
      )
      .limit(1);

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    // Get eligible contacts (with explicit or implied consent)
    const contacts = await db
      .select()
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.tenantId, authReq.user!.tenantId),
          sql`${schema.contacts.consentStatus} IN ('explicit', 'implied')`
        )
      );

    let queuedCount = 0;
    let skippedCount = 0;
    const templateIds = campaign.templateIds as string[];

    for (const contact of contacts) {
      // Check all gates
      const gateResult = await gateChecker.checkAllGates(
        authReq.user!.tenantId,
        contact.id,
        campaign.id
      );

      if (!gateResult.allowed) {
        skippedCount++;
        fastify.log.info(
          { contactId: contact.id, reason: gateResult.reason },
          'Contact skipped'
        );
        continue;
      }

      // Pick template (rotate)
      const templateId = templateIds[queuedCount % templateIds.length];

      // Create send job
      const [job] = await db
        .insert(schema.sendJobs)
        .values({
          tenantId: authReq.user!.tenantId,
          campaignId: campaign.id,
          contactId: contact.id,
          templateId,
          status: 'queued',
          body: '', // Will be rendered by worker
        })
        .returning()
        .onConflictDoNothing(); // Idempotency

      if (job) {
        // Add to queue
        await sendQueue.add('send-sms', { sendJobId: job.id });
        queuedCount++;
      }
    }

    // Update campaign status
    await db
      .update(schema.campaigns)
      .set({ status: 'running', queuedAt: new Date() })
      .where(eq(schema.campaigns.id, campaign.id));

    return {
      campaignId: campaign.id,
      queued: queuedCount,
      skipped: skippedCount,
      total: contacts.length,
    };
  });

  // Message preview (calculate parts and cost)
  fastify.post('/messages/preview', { preHandler: requireAuth }, async (request) => {
    const { message } = request.body as { message: string };

    const fullMessage = appendOptOutLine(message);
    const parts = calculateMessageParts(fullMessage);

    // Get cost per part
    const [cost] = await db
      .select()
      .from(schema.costs)
      .where(eq(schema.costs.country, 'AU'))
      .limit(1);

    const totalCostCents = cost ? cost.perPartCents * parts : 0;

    return {
      originalLength: message.length,
      fullMessageLength: fullMessage.length,
      parts,
      costPerPartCents: cost?.perPartCents || 0,
      totalCostCents,
      preview: fullMessage,
    };
  });
};

export default campaignRoutes;
