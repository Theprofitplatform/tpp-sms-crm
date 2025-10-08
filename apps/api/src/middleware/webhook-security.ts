import { FastifyRequest, FastifyReply } from 'fastify';

import { WebhookSecurityService } from '../services/webhook-security.service';

/**
 * Webhook security middleware
 * Verifies signatures and prevents replay attacks
 */
export function createWebhookSecurityMiddleware(webhookSecurity: WebhookSecurityService) {
  return async function webhookSecurityMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Get signature from headers
      const signature = request.headers['x-webhook-signature'] as string;

      if (!signature) {
        request.log.warn('Webhook received without signature');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing webhook signature',
        });
      }

      // Get webhook secret from environment
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!webhookSecret) {
        request.log.error('WEBHOOK_SECRET not configured');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Webhook secret not configured',
        });
      }

      // Get raw body (should be string or Buffer)
      const rawBody = request.body;
      if (!rawBody) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing request body',
        });
      }

      // Parse body to get event ID and timestamp if available
      let eventId: string | undefined;
      let timestamp: number | undefined;

      try {
        const parsedBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        eventId = parsedBody.event_id || parsedBody.id;
        timestamp = parsedBody.timestamp ? parseInt(parsedBody.timestamp, 10) : undefined;
      } catch (error) {
        // If body parsing fails, continue without event ID/timestamp
        request.log.warn({ error }, 'Failed to parse webhook body for metadata');
      }

      // Verify webhook
      const verification = await webhookSecurity.verifyWebhook({
        payload: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        signature,
        secret: webhookSecret,
        eventId,
        timestamp,
        provider: 'generic',
      });

      if (!verification.valid) {
        request.log.warn({ reason: verification.reason }, 'Webhook verification failed');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: verification.reason || 'Webhook verification failed',
        });
      }

      // Verification passed, continue to route handler
    } catch (error) {
      request.log.error({ error }, 'Webhook security middleware error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify webhook',
      });
    }
  };
}

/**
 * Twilio-specific webhook security middleware
 */
export function createTwilioWebhookSecurityMiddleware(webhookSecurity: WebhookSecurityService) {
  return async function twilioWebhookSecurityMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Get Twilio signature
      const signature = request.headers['x-twilio-signature'] as string;

      if (!signature) {
        request.log.warn('Twilio webhook received without signature');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing Twilio signature',
        });
      }

      // Get Twilio auth token
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!authToken) {
        request.log.error('TWILIO_AUTH_TOKEN not configured');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Twilio auth token not configured',
        });
      }

      // Construct full URL (Twilio requires this for signature)
      const protocol = request.headers['x-forwarded-proto'] || request.protocol;
      const host = request.headers['x-forwarded-host'] || request.hostname;
      const url = `${protocol}://${host}${request.url}`;

      // Get params from body (Twilio sends form data)
      const params = request.body as Record<string, string>;

      // Get event ID for replay protection
      const eventId = params.MessageSid || params.SmsSid || params.CallSid;

      // Verify Twilio signature
      const verification = await webhookSecurity.verifyWebhook({
        payload: '',
        signature,
        secret: authToken,
        eventId,
        provider: 'twilio',
        twilioUrl: url,
        twilioParams: params,
      });

      if (!verification.valid) {
        request.log.warn({ reason: verification.reason }, 'Twilio webhook verification failed');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: verification.reason || 'Twilio webhook verification failed',
        });
      }

      // Verification passed
    } catch (error) {
      request.log.error({ error }, 'Twilio webhook security middleware error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify Twilio webhook',
      });
    }
  };
}
