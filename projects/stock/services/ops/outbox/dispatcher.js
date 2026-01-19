/**
 * Outbox Dispatcher
 *
 * Polls the outbox_events table and dispatches events to target services.
 * Implements reliable delivery with exponential backoff retries.
 *
 * Features:
 * - Polls every 1 second for pending events
 * - Dispatches events with idempotency key header
 * - Exponential backoff on failures (1s, 2s, 4s, ...)
 * - Dead letter queue after max retries
 * - Concurrent dispatch with configurable limit
 *
 * Usage:
 *   import { OutboxDispatcher } from './dispatcher.js';
 *
 *   const dispatcher = new OutboxDispatcher(pool, {
 *     pollInterval: 1000,
 *     maxConcurrent: 5,
 *   });
 *
 *   dispatcher.start();
 *   // ... later
 *   dispatcher.stop();
 */

import axios from 'axios';
import { Mutex } from 'async-mutex';
import { getEventConfig, isValidEventType } from './events.js';
import { Counter, Histogram, Gauge } from 'prom-client';
import { broadcast } from '../websocket/server.js';

/**
 * Prometheus metrics for outbox dispatcher
 */
const outboxEventsDispatched = new Counter({
  name: 'outbox_events_dispatched_total',
  help: 'Total number of outbox events dispatched',
  labelNames: ['event_type', 'target_service', 'status'],
});

const outboxDispatchDuration = new Histogram({
  name: 'outbox_dispatch_duration_seconds',
  help: 'Duration of outbox event dispatch',
  labelNames: ['event_type', 'target_service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

const outboxPendingGauge = new Gauge({
  name: 'outbox_events_pending',
  help: 'Number of pending outbox events',
});

const outboxDeadLetterGauge = new Gauge({
  name: 'outbox_events_dead_letter',
  help: 'Number of dead letter events',
});

export class OutboxDispatcher {
  /**
   * Create an OutboxDispatcher
   * @param {Pool} pool - PostgreSQL connection pool
   * @param {object} options - Configuration options
   */
  constructor(pool, options = {}) {
    this.pool = pool;
    this.mutex = new Mutex();

    this.options = {
      pollInterval: options.pollInterval || 1000,
      maxConcurrent: options.maxConcurrent || 5,
      defaultTimeout: options.defaultTimeout || 10000,
      batchSize: options.batchSize || 10,
      serviceUrls: options.serviceUrls || {
        ops: 'http://localhost:5100',
        data: 'http://localhost:5101',
        signal: 'http://localhost:5102',
        risk: 'http://localhost:5103',
        execution: 'http://localhost:5104',
      },
      logger: options.logger || console,
    };

    this.isRunning = false;
    this.pollTimeout = null;
    this.activeDispatches = new Map();
  }

  /**
   * Start the dispatcher
   */
  start() {
    if (this.isRunning) {
      this.options.logger.warn('Outbox dispatcher already running');
      return;
    }

    this.isRunning = true;
    this.options.logger.info('Outbox dispatcher started', {
      pollInterval: this.options.pollInterval,
      maxConcurrent: this.options.maxConcurrent,
    });

    this.poll();
  }

  /**
   * Stop the dispatcher
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }

    this.options.logger.info('Outbox dispatcher stopped');
  }

  /**
   * Poll for pending events
   */
  async poll() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Check how many dispatches we can run
      const availableSlots = this.options.maxConcurrent - this.activeDispatches.size;
      if (availableSlots <= 0) {
        // All slots occupied, wait and try again
        this.schedulePoll();
        return;
      }

      // Fetch pending events
      const events = await this.fetchPendingEvents(Math.min(availableSlots, this.options.batchSize));

      // Update metrics
      await this.updateMetrics();

      // Dispatch events concurrently
      if (events.length > 0) {
        this.options.logger.debug(`Dispatching ${events.length} events`);

        const dispatchPromises = events.map(event => this.dispatchEvent(event));
        await Promise.allSettled(dispatchPromises);
      }
    } catch (error) {
      this.options.logger.error('Error in outbox poll', { error: error.message });
    }

    // Schedule next poll
    this.schedulePoll();
  }

  /**
   * Schedule next poll
   */
  schedulePoll() {
    if (!this.isRunning) {
      return;
    }

    this.pollTimeout = setTimeout(() => this.poll(), this.options.pollInterval);
  }

  /**
   * Fetch pending events from database
   * @param {number} limit - Maximum number of events to fetch
   * @returns {Promise<object[]>} Array of events
   */
  async fetchPendingEvents(limit) {
    const release = await this.mutex.acquire();
    try {
      const client = await this.pool.connect();
      try {
        // Lock and fetch pending events
        const result = await client.query(`
          UPDATE outbox_events
          SET status = 'processing'
          WHERE id IN (
            SELECT id FROM outbox_events
            WHERE status = 'pending'
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING *
        `, [limit]);

        return result.rows;
      } finally {
        client.release();
      }
    } finally {
      release();
    }
  }

  /**
   * Dispatch a single event to target service
   * @param {object} event - The event to dispatch
   */
  async dispatchEvent(event) {
    const dispatchId = `${event.id}`;
    this.activeDispatches.set(dispatchId, event);

    const startTime = Date.now();
    const eventConfig = getEventConfig(event.event_type);

    try {
      if (!eventConfig) {
        throw new Error(`Unknown event type: ${event.event_type}`);
      }

      // Build request URL
      const baseUrl = this.options.serviceUrls[event.target_service];
      if (!baseUrl) {
        throw new Error(`Unknown target service: ${event.target_service}`);
      }

      const url = `${baseUrl}${eventConfig.endpoint}`;
      const timeout = eventConfig.timeoutMs || this.options.defaultTimeout;

      // Send request with idempotency key
      const response = await axios({
        method: eventConfig.method || 'POST',
        url,
        data: event.payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': event.idempotency_key,
          'X-Correlation-ID': event.correlation_id || event.idempotency_key,
          'X-Event-Type': event.event_type,
          'X-Source-Service': event.source_service || 'ops',
        },
        timeout,
        validateStatus: () => true, // Don't throw on non-2xx
      });

      // Record duration metric
      const durationSeconds = (Date.now() - startTime) / 1000;
      outboxDispatchDuration.observe(
        { event_type: event.event_type, target_service: event.target_service },
        durationSeconds
      );

      // Check if successful
      if (response.status >= 200 && response.status < 300) {
        await this.markEventCompleted(event.id, response.status, response.data);
        outboxEventsDispatched.inc({
          event_type: event.event_type,
          target_service: event.target_service,
          status: 'completed',
        });

        this.options.logger.info('Event dispatched successfully', {
          eventId: event.id,
          eventType: event.event_type,
          targetService: event.target_service,
          status: response.status,
          duration: durationSeconds,
        });

        // Broadcast event to connected WebSocket clients
        broadcast('event_dispatched', {
          event_id: event.id,
          event_type: event.event_type,
          target_service: event.target_service,
          payload: event.payload,
          response: response.data,
        });
      } else {
        // Non-2xx response, treat as failure
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      const durationSeconds = (Date.now() - startTime) / 1000;

      this.options.logger.error('Event dispatch failed', {
        eventId: event.id,
        eventType: event.event_type,
        targetService: event.target_service,
        retryCount: event.retry_count,
        error: error.message,
        duration: durationSeconds,
      });

      await this.handleDispatchFailure(event, error);

      outboxEventsDispatched.inc({
        event_type: event.event_type,
        target_service: event.target_service,
        status: 'failed',
      });
    } finally {
      this.activeDispatches.delete(dispatchId);
    }
  }

  /**
   * Mark an event as completed
   * @param {number} eventId - Event ID
   * @param {number} responseStatus - HTTP response status
   * @param {object} responseBody - Response body
   */
  async markEventCompleted(eventId, responseStatus, responseBody) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        UPDATE outbox_events
        SET status = 'completed',
            processed_at = NOW(),
            response_status = $2,
            response_body = $3
        WHERE id = $1
      `, [eventId, responseStatus, JSON.stringify(responseBody)]);
    } finally {
      client.release();
    }
  }

  /**
   * Handle dispatch failure with retry logic
   * @param {object} event - The failed event
   * @param {Error} error - The error that occurred
   */
  async handleDispatchFailure(event, error) {
    const newRetryCount = event.retry_count + 1;
    const maxRetries = event.max_retries || 3;

    const client = await this.pool.connect();
    try {
      if (newRetryCount >= maxRetries) {
        // Move to dead letter queue
        await client.query(`
          UPDATE outbox_events
          SET status = 'dead_letter',
              retry_count = $2,
              error_message = $3,
              processed_at = NOW()
          WHERE id = $1
        `, [event.id, newRetryCount, error.message]);

        outboxEventsDispatched.inc({
          event_type: event.event_type,
          target_service: event.target_service,
          status: 'dead_letter',
        });

        this.options.logger.warn('Event moved to dead letter queue', {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
          maxRetries,
        });
      } else {
        // Calculate exponential backoff delay
        const baseDelay = 1000; // 1 second
        const backoffDelay = baseDelay * Math.pow(2, newRetryCount - 1);
        const scheduledAt = new Date(Date.now() + backoffDelay);

        await client.query(`
          UPDATE outbox_events
          SET status = 'pending',
              retry_count = $2,
              scheduled_at = $3,
              error_message = $4
          WHERE id = $1
        `, [event.id, newRetryCount, scheduledAt, error.message]);

        this.options.logger.info('Event scheduled for retry', {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
          scheduledAt,
          backoffDelay,
        });
      }
    } finally {
      client.release();
    }
  }

  /**
   * Update Prometheus metrics
   */
  async updateMetrics() {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT status, COUNT(*) as count
          FROM outbox_events
          WHERE status IN ('pending', 'dead_letter')
          GROUP BY status
        `);

        let pendingCount = 0;
        let deadLetterCount = 0;

        for (const row of result.rows) {
          if (row.status === 'pending') {
            pendingCount = parseInt(row.count, 10);
          } else if (row.status === 'dead_letter') {
            deadLetterCount = parseInt(row.count, 10);
          }
        }

        outboxPendingGauge.set(pendingCount);
        outboxDeadLetterGauge.set(deadLetterCount);
      } finally {
        client.release();
      }
    } catch (error) {
      this.options.logger.error('Error updating outbox metrics', { error: error.message });
    }
  }

  /**
   * Get dispatcher status
   * @returns {Promise<object>} Status object
   */
  async getStatus() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          status,
          COUNT(*) as count
        FROM outbox_events
        GROUP BY status
      `);

      const counts = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        dead_letter: 0,
      };

      for (const row of result.rows) {
        counts[row.status] = parseInt(row.count, 10);
      }

      return {
        isRunning: this.isRunning,
        activeDispatches: this.activeDispatches.size,
        counts,
        pollInterval: this.options.pollInterval,
        maxConcurrent: this.options.maxConcurrent,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get dead letter events
   * @param {object} options - Query options
   * @returns {Promise<object[]>} Dead letter events
   */
  async getDeadLetterEvents(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT *
        FROM outbox_events
        WHERE status = 'dead_letter'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Retry a dead letter event
   * @param {number} eventId - Event ID to retry
   * @returns {Promise<object|null>} Updated event or null
   */
  async retryDeadLetterEvent(eventId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE outbox_events
        SET status = 'pending',
            retry_count = 0,
            scheduled_at = NOW(),
            error_message = NULL,
            processed_at = NULL
        WHERE id = $1
          AND status = 'dead_letter'
        RETURNING *
      `, [eventId]);

      if (result.rows.length === 0) {
        return null;
      }

      this.options.logger.info('Dead letter event requeued', { eventId });
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Retry all dead letter events
   * @returns {Promise<number>} Number of events requeued
   */
  async retryAllDeadLetterEvents() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE outbox_events
        SET status = 'pending',
            retry_count = 0,
            scheduled_at = NOW(),
            error_message = NULL,
            processed_at = NULL
        WHERE status = 'dead_letter'
      `);

      this.options.logger.info('All dead letter events requeued', { count: result.rowCount });
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Purge dead letter events older than specified days
   * @param {number} days - Number of days to keep
   * @returns {Promise<number>} Number of events deleted
   */
  async purgeDeadLetterEvents(days = 30) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM outbox_events
        WHERE status = 'dead_letter'
          AND processed_at < NOW() - INTERVAL '${days} days'
      `);

      this.options.logger.info('Dead letter events purged', { count: result.rowCount, days });
      return result.rowCount;
    } finally {
      client.release();
    }
  }
}

export default OutboxDispatcher;
