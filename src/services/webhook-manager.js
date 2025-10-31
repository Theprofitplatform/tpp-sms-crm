/**
 * WEBHOOK MANAGER
 * 
 * Manage webhooks for external system integrations
 * Supports multiple webhooks with filtering and retry logic
 */

import fetch from 'node-fetch';
import { EventEmitter } from 'events';

export class WebhookManager extends EventEmitter {
  constructor() {
    super();
    this.webhooks = new Map();
    this.deliveryHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Register a webhook
   */
  registerWebhook(id, config) {
    const webhook = {
      id,
      url: config.url,
      events: config.events || ['*'], // '*' = all events
      headers: config.headers || {},
      enabled: config.enabled !== false,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 5000,
      createdAt: new Date().toISOString()
    };

    this.webhooks.set(id, webhook);
    this.emit('webhookRegistered', webhook);

    console.log(`✅ Webhook registered: ${id} -> ${webhook.url}`);

    return webhook;
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id) {
    const webhook = this.webhooks.get(id);
    
    if (webhook) {
      this.webhooks.delete(id);
      this.emit('webhookUnregistered', { id });
      console.log(`✅ Webhook unregistered: ${id}`);
      return { success: true, id };
    }

    return { success: false, error: 'Webhook not found' };
  }

  /**
   * Trigger webhook for an event
   */
  async triggerEvent(eventType, payload) {
    const webhooksToTrigger = [];

    this.webhooks.forEach((webhook, id) => {
      if (!webhook.enabled) return;
      
      // Check if webhook listens to this event
      if (webhook.events.includes('*') || webhook.events.includes(eventType)) {
        webhooksToTrigger.push(webhook);
      }
    });

    if (webhooksToTrigger.length === 0) {
      return {
        triggered: 0,
        message: 'No webhooks registered for this event'
      };
    }

    const results = await Promise.allSettled(
      webhooksToTrigger.map(webhook => 
        this.deliverWebhook(webhook, eventType, payload)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      triggered: webhooksToTrigger.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        webhook: webhooksToTrigger[i].id,
        ...r.value
      }))
    };
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliverWebhook(webhook, eventType, payload, attempt = 1) {
    const delivery = {
      webhookId: webhook.id,
      event: eventType,
      url: webhook.url,
      attempt,
      timestamp: new Date().toISOString()
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LocalSEO-Platform/3.2',
          'X-Event-Type': eventType,
          'X-Webhook-ID': webhook.id,
          ...webhook.headers
        },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      delivery.statusCode = response.status;
      delivery.success = response.ok;

      if (!response.ok) {
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
        
        // Retry on 5xx errors
        if (response.status >= 500 && attempt < webhook.retryAttempts) {
          console.log(`⚠️  Webhook ${webhook.id} failed (attempt ${attempt}), retrying...`);
          await this.delay(webhook.retryDelay * attempt); // Exponential backoff
          return await this.deliverWebhook(webhook, eventType, payload, attempt + 1);
        }
      }

      this.recordDelivery(delivery);
      this.emit('webhookDelivered', delivery);

      return delivery;

    } catch (error) {
      delivery.success = false;
      delivery.error = error.message;

      // Retry on network errors
      if (attempt < webhook.retryAttempts) {
        console.log(`⚠️  Webhook ${webhook.id} failed (${error.message}), retrying...`);
        await this.delay(webhook.retryDelay * attempt);
        return await this.deliverWebhook(webhook, eventType, payload, attempt + 1);
      }

      this.recordDelivery(delivery);
      this.emit('webhookFailed', delivery);

      return delivery;
    }
  }

  /**
   * Test webhook connection
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      return {
        success: false,
        error: 'Webhook not found'
      };
    }

    const testPayload = {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString()
    };

    const result = await this.deliverWebhook(webhook, 'webhook.test', testPayload);

    return {
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      timestamp: result.timestamp
    };
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks() {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get specific webhook
   */
  getWebhook(id) {
    return this.webhooks.get(id) || null;
  }

  /**
   * Enable/disable webhook
   */
  toggleWebhook(id, enabled) {
    const webhook = this.webhooks.get(id);

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    webhook.enabled = enabled;
    this.webhooks.set(id, webhook);

    console.log(`✅ Webhook ${id} ${enabled ? 'enabled' : 'disabled'}`);

    return {
      success: true,
      webhook
    };
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(id, updates) {
    const webhook = this.webhooks.get(id);

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      id, // Don't allow ID change
      createdAt: webhook.createdAt, // Don't allow timestamp change
      updatedAt: new Date().toISOString()
    };

    this.webhooks.set(id, updatedWebhook);

    console.log(`✅ Webhook ${id} updated`);

    return {
      success: true,
      webhook: updatedWebhook
    };
  }

  /**
   * Record delivery in history
   */
  recordDelivery(delivery) {
    this.deliveryHistory.unshift(delivery);

    if (this.deliveryHistory.length > this.maxHistory) {
      this.deliveryHistory = this.deliveryHistory.slice(0, this.maxHistory);
    }
  }

  /**
   * Get delivery history
   */
  getDeliveryHistory(webhookId = null, limit = 50) {
    let history = this.deliveryHistory;

    if (webhookId) {
      history = history.filter(d => d.webhookId === webhookId);
    }

    return history.slice(0, limit);
  }

  /**
   * Get delivery statistics
   */
  getStatistics(webhookId = null) {
    let deliveries = this.deliveryHistory;

    if (webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === webhookId);
    }

    const total = deliveries.length;
    const successful = deliveries.filter(d => d.success).length;
    const failed = total - successful;

    const byEvent = {};
    const byWebhook = {};

    deliveries.forEach(d => {
      byEvent[d.event] = (byEvent[d.event] || 0) + 1;
      byWebhook[d.webhookId] = (byWebhook[d.webhookId] || 0) + 1;
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      byEvent,
      byWebhook,
      lastDelivery: deliveries[0] || null
    };
  }

  /**
   * Clear delivery history
   */
  clearHistory(webhookId = null) {
    if (webhookId) {
      const before = this.deliveryHistory.length;
      this.deliveryHistory = this.deliveryHistory.filter(d => d.webhookId !== webhookId);
      return { cleared: before - this.deliveryHistory.length };
    }

    const count = this.deliveryHistory.length;
    this.deliveryHistory = [];
    return { cleared: count };
  }

  /**
   * Utility delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Common event types
export const WebhookEvents = {
  AUDIT_COMPLETED: 'audit.completed',
  AUDIT_FAILED: 'audit.failed',
  SCORE_CHANGED: 'score.changed',
  ALERT_TRIGGERED: 'alert.triggered',
  SCHEDULE_EXECUTED: 'schedule.executed',
  WEBHOOK_TEST: 'webhook.test'
};

// Export singleton
export const webhookManager = new WebhookManager();
export default webhookManager;
