import crypto from 'crypto';
import webhooksDB from '../database/webhooks-db.js';
import notificationsDB from '../database/notifications-db.js';

/**
 * Webhook Delivery Service
 * Handles webhook event triggering and delivery
 */

// Trigger webhook event
export const triggerWebhookEvent = async (event, payload) => {
  const webhooks = webhooksDB.getByEvent(event);

  if (webhooks.length === 0) {
    console.log(`No webhooks subscribed to event: ${event}`);
    return;
  }

  console.log(`Triggering ${webhooks.length} webhooks for event: ${event}`);

  const deliveryPromises = webhooks.map(webhook => 
    deliverWebhook(webhook, event, payload)
  );

  await Promise.allSettled(deliveryPromises);
};

// Deliver webhook
const deliverWebhook = async (webhook, event, payload) => {
  const startTime = Date.now();

  try {
    // Create signature if secret is provided
    const signature = webhook.secret 
      ? createSignature(webhook.secret, payload) 
      : null;

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'SEO-Dashboard-Webhooks/1.0'
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    // Make HTTP request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;
    const status = response.status;

    // Record delivery
    webhooksDB.recordDelivery(
      webhook.id,
      event,
      payload,
      status,
      responseTime,
      response.ok ? null : await response.text()
    );

    if (!response.ok) {
      console.error(`Webhook delivery failed: ${webhook.name} (${status})`);
      
      // Create notification for failed delivery
      notificationsDB.create({
        type: 'error',
        category: 'webhook',
        title: 'Webhook Delivery Failed',
        message: `Webhook "${webhook.name}" failed with status ${status}`,
        link: `/webhooks`
      });
    }

    return { success: response.ok, status, responseTime };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error(`Webhook delivery error: ${webhook.name}`, error.message);

    // Record failed delivery
    webhooksDB.recordDelivery(
      webhook.id,
      event,
      payload,
      0,
      responseTime,
      error.message
    );

    // Create notification
    notificationsDB.create({
      type: 'error',
      category: 'webhook',
      title: 'Webhook Delivery Error',
      message: `Webhook "${webhook.name}" encountered an error: ${error.message}`,
      link: `/webhooks`
    });

    return { success: false, error: error.message };
  }
};

// Create HMAC signature
const createSignature = (secret, payload) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
};

// Test webhook delivery
export const testWebhook = async (webhook) => {
  const testPayload = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };

  return await deliverWebhook(webhook, 'test', testPayload);
};

export default {
  triggerWebhookEvent,
  testWebhook
};
