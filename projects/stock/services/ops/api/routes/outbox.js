/**
 * Outbox API Routes
 *
 * Provides endpoints for managing the outbox event system.
 *
 * Endpoints:
 *   GET  /api/v1/outbox/status      - Get dispatcher status and event counts
 *   GET  /api/v1/outbox/dead-letter - List dead letter events
 *   POST /api/v1/outbox/retry/:id   - Retry a specific dead letter event
 *   POST /api/v1/outbox/retry-all   - Retry all dead letter events
 *   POST /api/v1/events/publish     - Publish a new event to the outbox
 *   GET  /api/v1/events/:id         - Get event by ID
 *   GET  /api/v1/events/correlation/:id - Get events by correlation ID
 *   DELETE /api/v1/events/:id       - Cancel a pending event
 */

import { Router } from 'express';
import { isValidEventType, validatePayload } from '../../outbox/events.js';

const router = Router();

/**
 * GET /api/v1/outbox/status
 * Get outbox dispatcher status and event counts
 */
router.get('/status', async (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  try {
    const status = await outboxDispatcher.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting outbox status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/outbox/dead-letter
 * List dead letter events with pagination
 */
router.get('/dead-letter', async (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const events = await outboxDispatcher.getDeadLetterEvents({ limit, offset });

    // Parse payloads
    const parsedEvents = events.map(event => ({
      ...event,
      payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
      response_body: event.response_body && typeof event.response_body === 'string'
        ? JSON.parse(event.response_body)
        : event.response_body,
    }));

    res.json({
      events: parsedEvents,
      pagination: {
        limit,
        offset,
        count: parsedEvents.length,
      },
    });
  } catch (error) {
    logger.error('Error getting dead letter events', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/outbox/retry/:id
 * Retry a specific dead letter event
 */
router.post('/retry/:id', async (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const event = await outboxDispatcher.retryDeadLetterEvent(eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found or not in dead letter status',
      });
    }

    logger.info('Dead letter event requeued via API', { eventId });

    res.json({
      success: true,
      message: 'Event requeued for retry',
      event: {
        ...event,
        payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
      },
    });
  } catch (error) {
    logger.error('Error retrying dead letter event', { eventId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/outbox/retry-all
 * Retry all dead letter events
 */
router.post('/retry-all', async (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  try {
    const count = await outboxDispatcher.retryAllDeadLetterEvents();

    logger.info('All dead letter events requeued via API', { count });

    res.json({
      success: true,
      message: `${count} events requeued for retry`,
      count,
    });
  } catch (error) {
    logger.error('Error retrying all dead letter events', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/outbox/purge
 * Purge old dead letter events
 */
router.post('/purge', async (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  const days = parseInt(req.body.days, 10) || 30;

  try {
    const count = await outboxDispatcher.purgeDeadLetterEvents(days);

    logger.info('Dead letter events purged via API', { count, days });

    res.json({
      success: true,
      message: `${count} events purged`,
      count,
      retentionDays: days,
    });
  } catch (error) {
    logger.error('Error purging dead letter events', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/outbox/start
 * Start the outbox dispatcher
 */
router.post('/start', (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  try {
    outboxDispatcher.start();
    logger.info('Outbox dispatcher started via API');

    res.json({
      success: true,
      message: 'Outbox dispatcher started',
    });
  } catch (error) {
    logger.error('Error starting outbox dispatcher', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/outbox/stop
 * Stop the outbox dispatcher
 */
router.post('/stop', (req, res) => {
  const { outboxDispatcher, logger } = req.app.locals;

  if (!outboxDispatcher) {
    return res.status(503).json({
      error: 'Outbox dispatcher not initialized',
    });
  }

  try {
    outboxDispatcher.stop();
    logger.info('Outbox dispatcher stopped via API');

    res.json({
      success: true,
      message: 'Outbox dispatcher stopped',
    });
  } catch (error) {
    logger.error('Error stopping outbox dispatcher', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
