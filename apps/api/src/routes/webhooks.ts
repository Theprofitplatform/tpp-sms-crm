import { FastifyPluginAsync } from 'fastify';
import { db, schema, isStopKeyword, isStartKeyword } from '@sms-crm/lib';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Provider webhook endpoint (Twilio-compatible)
  fastify.post('/provider', async (request, reply) => {
    const body = request.body as any;

    // Verify signature (Twilio example)
    const signature = request.headers['x-twilio-signature'] as string;
    const url = `${process.env.API_BASE_URL}/webhooks/provider`;

    if (!verifyTwilioSignature(url, body, signature)) {
      fastify.log.warn({ body }, 'Invalid webhook signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Check for replay (idempotency)
    const eventId = body.MessageSid || body.SmsSid;

    const [existing] = await db
      .select()
      .from(schema.webhookEvents)
      .where(eq(schema.webhookEvents.providerEventId, eventId))
      .limit(1);

    if (existing) {
      fastify.log.info({ eventId }, 'Duplicate webhook ignored');
      return reply.send({ status: 'duplicate' });
    }

    // Resolve tenant by To number (receiving number)
    const toNumber = body.To;
    const [sendingNumber] = await db
      .select()
      .from(schema.sendingNumbers)
      .where(eq(schema.sendingNumbers.phoneE164, toNumber))
      .limit(1);

    if (!sendingNumber) {
      fastify.log.error({ toNumber }, 'No tenant found for receiving number');
      return reply.status(404).send({ error: 'Unknown receiving number' });
    }

    const tenantId = sendingNumber.tenantId;

    // Store webhook event
    await db.insert(schema.webhookEvents).values({
      tenantId,
      providerEventId: eventId,
      eventType: body.MessageStatus || body.SmsStatus || 'UNKNOWN',
      payload: body,
    });

    // Handle status updates
    if (body.MessageStatus) {
      await handleStatusUpdate(tenantId, body, fastify);
    }

    // Handle inbound messages (replies)
    if (body.Body && body.From) {
      await handleInboundMessage(tenantId, body, fastify);
    }

    return reply.send({ status: 'ok' });
  });
};

function verifyTwilioSignature(url: string, params: any, signature: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';

  // Create data string
  let data = url;
  Object.keys(params)
    .sort()
    .forEach((key) => {
      data += key + params[key];
    });

  // Generate HMAC
  const hmac = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');

  return hmac === signature;
}

async function handleStatusUpdate(tenantId: string, body: any, fastify: any) {
  const status = body.MessageStatus.toUpperCase();
  const providerMessageId = body.MessageSid;

  // Find send job
  const [job] = await db
    .select()
    .from(schema.sendJobs)
    .where(
      and(
        eq(schema.sendJobs.tenantId, tenantId),
        eq(schema.sendJobs.providerMessageId, providerMessageId)
      )
    )
    .limit(1);

  if (!job) {
    fastify.log.warn({ providerMessageId }, 'Send job not found for status update');
    return;
  }

  // Map Twilio statuses to our event types
  let eventType: string;
  let jobStatus: string = job.status;

  switch (status) {
    case 'QUEUED':
    case 'ACCEPTED':
      eventType = 'QUEUED';
      break;
    case 'SENT':
    case 'SENDING':
      eventType = 'SENT';
      jobStatus = 'sent';
      await db
        .update(schema.sendJobs)
        .set({ status: jobStatus, sentAt: new Date() })
        .where(eq(schema.sendJobs.id, job.id));
      break;
    case 'DELIVERED':
      eventType = 'DELIVERED';
      jobStatus = 'delivered';
      await db
        .update(schema.sendJobs)
        .set({ status: jobStatus, deliveredAt: new Date() })
        .where(eq(schema.sendJobs.id, job.id));
      break;
    case 'FAILED':
    case 'UNDELIVERED':
      eventType = 'FAILED';
      jobStatus = 'failed';
      await db
        .update(schema.sendJobs)
        .set({ status: jobStatus, failedAt: new Date(), failureReason: body.ErrorCode })
        .where(eq(schema.sendJobs.id, job.id));
      break;
    default:
      eventType = status;
  }

  // Record event
  await db.insert(schema.events).values({
    tenantId,
    contactId: job.contactId,
    campaignId: job.campaignId,
    sendJobId: job.id,
    eventType,
    metadata: { providerStatus: status, errorCode: body.ErrorCode },
  });
}

async function handleInboundMessage(tenantId: string, body: any, fastify: any) {
  const fromNumber = body.From;
  const messageBody = body.Body.trim();

  // Find contact
  const [contact] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.tenantId, tenantId), eq(schema.contacts.phoneE164, fromNumber)))
    .limit(1);

  if (!contact) {
    fastify.log.info({ fromNumber }, 'Inbound message from unknown contact');
    return;
  }

  // Check for STOP keywords
  if (isStopKeyword(messageBody)) {
    // Add to DNC
    await db
      .insert(schema.doNotContact)
      .values({
        tenantId,
        phoneE164: fromNumber,
        reason: 'STOP',
      })
      .onConflictDoNothing();

    // Record event
    await db.insert(schema.events).values({
      tenantId,
      contactId: contact.id,
      eventType: 'OPT_OUT',
      metadata: { message: messageBody },
    });

    fastify.log.info({ contactId: contact.id }, 'Contact opted out');

    // Send confirmation (optional, depends on provider settings)
    return;
  }

  // Check for START keywords
  if (isStartKeyword(messageBody)) {
    // Remove from DNC
    await db
      .delete(schema.doNotContact)
      .where(
        and(eq(schema.doNotContact.tenantId, tenantId), eq(schema.doNotContact.phoneE164, fromNumber))
      );

    // Record event
    await db.insert(schema.events).values({
      tenantId,
      contactId: contact.id,
      eventType: 'RESUBSCRIBE',
      metadata: { message: messageBody },
    });

    fastify.log.info({ contactId: contact.id }, 'Contact resubscribed');
    return;
  }

  // Regular reply
  await db.insert(schema.events).values({
    tenantId,
    contactId: contact.id,
    eventType: 'REPLIED',
    metadata: { message: messageBody },
  });
}

export default webhookRoutes;
