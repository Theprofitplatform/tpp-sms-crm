/**
 * Outbox Module
 *
 * Provides reliable event-driven communication between services
 * using the transactional outbox pattern.
 *
 * Usage:
 *   import { OutboxDispatcher, OutboxPublisher, EventTypes } from './outbox/index.js';
 *
 *   // Initialize
 *   const dispatcher = new OutboxDispatcher(pool, { logger });
 *   const publisher = new OutboxPublisher(pool, { logger });
 *
 *   // Publish events
 *   await publisher.publish(EventTypes.SIGNAL_GENERATED, { ... });
 *
 *   // Start dispatcher
 *   dispatcher.start();
 */

export { OutboxDispatcher } from './dispatcher.js';
export { OutboxPublisher, createPublisher } from './publisher.js';
export {
  EventTypes,
  getEventConfig,
  isValidEventType,
  getEventTypesForService,
  validatePayload,
  PayloadSchemas,
} from './events.js';
