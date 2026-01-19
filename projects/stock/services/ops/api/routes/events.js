/**
 * Events API Routes
 *
 * Provides endpoints for publishing and querying events.
 *
 * Endpoints:
 *   POST /api/v1/events/publish     - Publish a new event
 *   POST /api/v1/events/batch       - Publish multiple events
 *   POST /api/v1/events/schedule    - Schedule a future event
 *   GET  /api/v1/events/:id         - Get event by ID
 *   GET  /api/v1/events/correlation/:id - Get events by correlation ID
 *   GET  /api/v1/events/idempotency/:key - Get event by idempotency key
 *   DELETE /api/v1/events/:id       - Cancel a pending event
 */

import { Router } from 'express';
import { isValidEventType, EventTypes } from '../../outbox/events.js';

const router = Router();

/**
 * POST /api/v1/events/publish
 * Publish a new event to the outbox
 */
router.post('/publish', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const {
    event_type,
    payload,
    idempotency_key,
    correlation_id,
    target_service,
    max_retries,
    scheduled_at,
  } = req.body;

  // Validation
  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'payload is required and must be an object' });
  }

  if (!isValidEventType(event_type)) {
    return res.status(400).json({
      error: `Invalid event_type: ${event_type}`,
      valid_types: Object.values(EventTypes),
    });
  }

  try {
    const event = await outboxPublisher.publish(event_type, payload, {
      idempotencyKey: idempotency_key,
      correlationId: correlation_id,
      targetService: target_service,
      maxRetries: max_retries,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
    });

    logger.info('Event published via API', {
      eventId: event.id,
      eventType: event_type,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    logger.error('Error publishing event', { error: error.message, event_type });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/events/batch
 * Publish multiple events atomically
 */
router.post('/batch', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      error: 'events array is required and must not be empty',
    });
  }

  // Validate all events
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.event_type) {
      return res.status(400).json({
        error: `events[${i}].event_type is required`,
      });
    }
    if (!event.payload || typeof event.payload !== 'object') {
      return res.status(400).json({
        error: `events[${i}].payload is required and must be an object`,
      });
    }
    if (!isValidEventType(event.event_type)) {
      return res.status(400).json({
        error: `events[${i}].event_type is invalid: ${event.event_type}`,
        valid_types: Object.values(EventTypes),
      });
    }
  }

  try {
    // Transform to publisher format
    const publisherEvents = events.map(event => ({
      eventType: event.event_type,
      payload: event.payload,
      options: {
        idempotencyKey: event.idempotency_key,
        correlationId: event.correlation_id,
        targetService: event.target_service,
        maxRetries: event.max_retries,
        scheduledAt: event.scheduled_at ? new Date(event.scheduled_at) : undefined,
      },
    }));

    const publishedEvents = await outboxPublisher.publishBatch(publisherEvents);

    logger.info('Batch events published via API', {
      count: publishedEvents.length,
    });

    res.status(201).json({
      success: true,
      events: publishedEvents,
      count: publishedEvents.length,
    });
  } catch (error) {
    logger.error('Error publishing batch events', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/events/schedule
 * Schedule an event for future delivery
 */
router.post('/schedule', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const {
    event_type,
    payload,
    scheduled_at,
    idempotency_key,
    correlation_id,
  } = req.body;

  // Validation
  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'payload is required and must be an object' });
  }

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required' });
  }

  const scheduledDate = new Date(scheduled_at);
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ error: 'scheduled_at must be a valid date' });
  }

  if (scheduledDate <= new Date()) {
    return res.status(400).json({ error: 'scheduled_at must be in the future' });
  }

  try {
    const event = await outboxPublisher.schedule(event_type, payload, scheduledDate, {
      idempotencyKey: idempotency_key,
      correlationId: correlation_id,
    });

    logger.info('Event scheduled via API', {
      eventId: event.id,
      eventType: event_type,
      scheduledAt: scheduledDate,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    logger.error('Error scheduling event', { error: error.message, event_type });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/events/:id
 * Get event by ID
 */
router.get('/:id', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const event = await outboxPublisher.getById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    logger.error('Error getting event', { eventId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/events/correlation/:id
 * Get events by correlation ID
 */
router.get('/correlation/:id', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const correlationId = req.params.id;

  try {
    const events = await outboxPublisher.getByCorrelationId(correlationId);

    res.json({
      correlation_id: correlationId,
      events,
      count: events.length,
    });
  } catch (error) {
    logger.error('Error getting events by correlation ID', { correlationId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/events/idempotency/:key
 * Get event by idempotency key
 */
router.get('/idempotency/:key', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const idempotencyKey = req.params.key;

  try {
    const event = await outboxPublisher.getByIdempotencyKey(idempotencyKey);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    logger.error('Error getting event by idempotency key', { idempotencyKey, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/events/:id
 * Cancel a pending event
 */
router.delete('/:id', async (req, res) => {
  const { outboxPublisher, logger } = req.app.locals;

  if (!outboxPublisher) {
    return res.status(503).json({
      error: 'Outbox publisher not initialized',
    });
  }

  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const cancelled = await outboxPublisher.cancel(eventId);

    if (!cancelled) {
      return res.status(404).json({
        error: 'Event not found or not in pending status',
      });
    }

    logger.info('Event cancelled via API', { eventId });

    res.json({
      success: true,
      message: 'Event cancelled',
      eventId,
    });
  } catch (error) {
    logger.error('Error cancelling event', { eventId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/events/types
 * List all available event types
 */
router.get('/types/list', (req, res) => {
  res.json({
    event_types: Object.values(EventTypes),
  });
});

export default router;
