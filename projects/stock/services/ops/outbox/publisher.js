/**
 * Outbox Event Publisher
 *
 * Publishes events to the outbox_events table for reliable delivery.
 * Events are stored in the database and later dispatched by the OutboxDispatcher.
 *
 * Features:
 * - Automatic idempotency key generation
 * - Payload validation
 * - Correlation ID tracking
 * - Scheduled event publishing
 *
 * Usage:
 *   import { OutboxPublisher } from './publisher.js';
 *
 *   const publisher = new OutboxPublisher(pool, { logger });
 *
 *   await publisher.publish(EventTypes.SIGNAL_GENERATED, {
 *     signal_id: 'sig_123',
 *     symbol: 'AAPL',
 *     direction: 'long',
 *     strategy_id: 'momentum',
 *     confidence: 0.85,
 *   });
 *
 * Dependencies:
 *   - pg (PostgreSQL pool)
 *   - ./events.js (event type definitions)
 */

import { randomUUID } from 'crypto';
import { getEventConfig, isValidEventType, validatePayload } from './events.js';
import { Counter } from 'prom-client';

/**
 * Prometheus metrics for event publishing
 */
const eventsPublished = new Counter({
  name: 'outbox_events_published_total',
  help: 'Total number of events published to outbox',
  labelNames: ['event_type', 'target_service'],
});

const eventsPublishFailed = new Counter({
  name: 'outbox_events_publish_failed_total',
  help: 'Total number of failed event publish attempts',
  labelNames: ['event_type', 'reason'],
});

export class OutboxPublisher {
  /**
   * Create an OutboxPublisher
   * @param {Pool} pool - PostgreSQL connection pool
   * @param {object} options - Configuration options
   */
  constructor(pool, options = {}) {
    this.pool = pool;
    this.options = {
      logger: options.logger || console,
      sourceService: options.sourceService || 'ops',
      validatePayloads: options.validatePayloads !== false,
    };
  }

  /**
   * Generate a unique idempotency key
   * @param {string} eventType - Event type
   * @param {object} payload - Event payload
   * @returns {string} Idempotency key
   */
  generateIdempotencyKey(eventType, payload) {
    const timestamp = Date.now();
    const uuid = randomUUID().substring(0, 8);

    // Include a hash of key payload fields for deduplication
    const keyFields = this.extractKeyFields(eventType, payload);
    const keyHash = Buffer.from(JSON.stringify(keyFields))
      .toString('base64')
      .substring(0, 12);

    return `${eventType}:${timestamp}:${uuid}:${keyHash}`;
  }

  /**
   * Extract key fields from payload for idempotency
   * @param {string} eventType - Event type
   * @param {object} payload - Event payload
   * @returns {object} Key fields
   */
  extractKeyFields(eventType, payload) {
    // Extract identifying fields based on event type
    const keyFieldsMap = {
      market_data_ready: ['symbols', 'market', 'timestamp'],
      signal_generated: ['signal_id', 'symbol'],
      order_proposed: ['order_id', 'symbol'],
      order_approved: ['order_id', 'validation_id'],
      order_rejected: ['order_id'],
      order_submitted: ['order_id', 'broker'],
      fill_received: ['fill_id', 'order_id'],
      risk_alert: ['alert_type', 'symbol', 'message'],
      kill_switch_activated: ['reason', 'activated_at'],
      kill_switch_deactivated: ['deactivated_at'],
    };

    const fields = keyFieldsMap[eventType] || [];
    const result = {};

    for (const field of fields) {
      if (payload[field] !== undefined) {
        result[field] = payload[field];
      }
    }

    return result;
  }

  /**
   * Publish an event to the outbox
   * @param {string} eventType - Type of event from EventTypes
   * @param {object} payload - Event payload
   * @param {object} options - Publishing options
   * @returns {Promise<object>} Published event
   */
  async publish(eventType, payload, options = {}) {
    // Validate event type
    if (!isValidEventType(eventType)) {
      eventsPublishFailed.inc({ event_type: eventType, reason: 'invalid_type' });
      throw new Error(`Invalid event type: ${eventType}`);
    }

    // Get event configuration
    const eventConfig = getEventConfig(eventType);
    if (!eventConfig) {
      eventsPublishFailed.inc({ event_type: eventType, reason: 'no_config' });
      throw new Error(`No configuration found for event type: ${eventType}`);
    }

    // Validate payload if enabled
    if (this.options.validatePayloads) {
      const validation = validatePayload(eventType, payload);
      if (!validation.valid) {
        eventsPublishFailed.inc({ event_type: eventType, reason: 'validation_failed' });
        throw new Error(`Payload validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Generate idempotency key or use provided one
    const idempotencyKey = options.idempotencyKey ||
      this.generateIdempotencyKey(eventType, payload);

    // Determine target service
    const targetService = options.targetService || eventConfig.targetService;

    // Build event record
    const event = {
      event_type: eventType,
      payload: JSON.stringify(payload),
      target_service: targetService,
      idempotency_key: idempotencyKey,
      correlation_id: options.correlationId || randomUUID(),
      source_service: options.sourceService || this.options.sourceService,
      max_retries: options.maxRetries || eventConfig.maxRetries || 3,
      scheduled_at: options.scheduledAt || new Date(),
    };

    const client = await this.pool.connect();
    try {
      // Insert with conflict handling for idempotency
      const result = await client.query(`
        INSERT INTO outbox_events (
          event_type,
          payload,
          target_service,
          idempotency_key,
          correlation_id,
          source_service,
          max_retries,
          scheduled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (idempotency_key) DO UPDATE
          SET id = outbox_events.id
        RETURNING *
      `, [
        event.event_type,
        event.payload,
        event.target_service,
        event.idempotency_key,
        event.correlation_id,
        event.source_service,
        event.max_retries,
        event.scheduled_at,
      ]);

      const publishedEvent = result.rows[0];

      // Update metrics
      eventsPublished.inc({
        event_type: eventType,
        target_service: targetService,
      });

      this.options.logger.info('Event published to outbox', {
        eventId: publishedEvent.id,
        eventType,
        targetService,
        idempotencyKey,
        correlationId: event.correlation_id,
      });

      return {
        ...publishedEvent,
        // Handle both cases: payload as string (needs parsing) or already parsed object
        payload: typeof publishedEvent.payload === 'string'
          ? JSON.parse(publishedEvent.payload)
          : publishedEvent.payload,
      };
    } catch (error) {
      eventsPublishFailed.inc({ event_type: eventType, reason: 'db_error' });

      this.options.logger.error('Failed to publish event', {
        eventType,
        error: error.message,
        idempotencyKey,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publish multiple events in a batch
   * @param {Array<{eventType: string, payload: object, options?: object}>} events
   * @returns {Promise<object[]>} Published events
   */
  async publishBatch(events) {
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('Events array is required and must not be empty');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const publishedEvents = [];

      for (const { eventType, payload, options = {} } of events) {
        // Validate event type
        if (!isValidEventType(eventType)) {
          throw new Error(`Invalid event type: ${eventType}`);
        }

        const eventConfig = getEventConfig(eventType);
        if (!eventConfig) {
          throw new Error(`No configuration found for event type: ${eventType}`);
        }

        // Validate payload
        if (this.options.validatePayloads) {
          const validation = validatePayload(eventType, payload);
          if (!validation.valid) {
            throw new Error(`Payload validation failed for ${eventType}: ${validation.errors.join(', ')}`);
          }
        }

        const idempotencyKey = options.idempotencyKey ||
          this.generateIdempotencyKey(eventType, payload);
        const targetService = options.targetService || eventConfig.targetService;
        const correlationId = options.correlationId || randomUUID();

        const result = await client.query(`
          INSERT INTO outbox_events (
            event_type,
            payload,
            target_service,
            idempotency_key,
            correlation_id,
            source_service,
            max_retries,
            scheduled_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (idempotency_key) DO UPDATE
            SET id = outbox_events.id
          RETURNING *
        `, [
          eventType,
          JSON.stringify(payload),
          targetService,
          idempotencyKey,
          correlationId,
          options.sourceService || this.options.sourceService,
          options.maxRetries || eventConfig.maxRetries || 3,
          options.scheduledAt || new Date(),
        ]);

        const published = result.rows[0];
        publishedEvents.push({
          ...published,
          payload: JSON.parse(published.payload),
        });

        eventsPublished.inc({
          event_type: eventType,
          target_service: targetService,
        });
      }

      await client.query('COMMIT');

      this.options.logger.info('Batch events published', {
        count: publishedEvents.length,
        eventIds: publishedEvents.map(e => e.id),
      });

      return publishedEvents;
    } catch (error) {
      await client.query('ROLLBACK');

      this.options.logger.error('Failed to publish batch events', {
        error: error.message,
        eventCount: events.length,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Schedule an event for future delivery
   * @param {string} eventType - Type of event
   * @param {object} payload - Event payload
   * @param {Date} scheduledAt - When to dispatch the event
   * @param {object} options - Additional options
   * @returns {Promise<object>} Scheduled event
   */
  async schedule(eventType, payload, scheduledAt, options = {}) {
    if (!(scheduledAt instanceof Date) || isNaN(scheduledAt.getTime())) {
      throw new Error('scheduledAt must be a valid Date');
    }

    return this.publish(eventType, payload, {
      ...options,
      scheduledAt,
    });
  }

  /**
   * Check if an event with the given idempotency key already exists
   * @param {string} idempotencyKey - The idempotency key to check
   * @returns {Promise<object|null>} Existing event or null
   */
  async getByIdempotencyKey(idempotencyKey) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM outbox_events
        WHERE idempotency_key = $1
      `, [idempotencyKey]);

      if (result.rows.length === 0) {
        return null;
      }

      const event = result.rows[0];
      return {
        ...event,
        payload: JSON.parse(event.payload),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get event by ID
   * @param {number} eventId - Event ID
   * @returns {Promise<object|null>} Event or null
   */
  async getById(eventId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM outbox_events
        WHERE id = $1
      `, [eventId]);

      if (result.rows.length === 0) {
        return null;
      }

      const event = result.rows[0];
      return {
        ...event,
        payload: JSON.parse(event.payload),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get events by correlation ID
   * @param {string} correlationId - Correlation ID
   * @returns {Promise<object[]>} Array of events
   */
  async getByCorrelationId(correlationId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM outbox_events
        WHERE correlation_id = $1
        ORDER BY created_at ASC
      `, [correlationId]);

      return result.rows.map(event => ({
        ...event,
        payload: JSON.parse(event.payload),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Cancel a pending event
   * @param {number} eventId - Event ID to cancel
   * @returns {Promise<boolean>} True if cancelled
   */
  async cancel(eventId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM outbox_events
        WHERE id = $1
          AND status = 'pending'
        RETURNING id
      `, [eventId]);

      const cancelled = result.rowCount > 0;

      if (cancelled) {
        this.options.logger.info('Event cancelled', { eventId });
      }

      return cancelled;
    } finally {
      client.release();
    }
  }
}

/**
 * Create a convenience function for publishing events
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {object} options - Publisher options
 * @returns {Function} Publish function
 */
export function createPublisher(pool, options = {}) {
  const publisher = new OutboxPublisher(pool, options);

  return async (eventType, payload, publishOptions = {}) => {
    return publisher.publish(eventType, payload, publishOptions);
  };
}

export default OutboxPublisher;
