/**
 * Outbox System Tests
 *
 * Tests for the outbox dispatcher, publisher, and event system.
 * Uses Node.js built-in test runner (node:test).
 *
 * Usage:
 *   node --test tests/test-outbox.js
 *
 * Note: These tests require a PostgreSQL database connection.
 * Set environment variables or use defaults for local testing.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  EventTypes,
  getEventConfig,
  isValidEventType,
  getEventTypesForService,
  validatePayload,
  PayloadSchemas,
} from '../outbox/events.js';
import { OutboxPublisher } from '../outbox/publisher.js';
import { OutboxDispatcher } from '../outbox/dispatcher.js';

/**
 * Test suite for event types and configuration
 */
describe('Event Types', () => {
  test('EventTypes should have all required event types', () => {
    const expectedTypes = [
      'MARKET_DATA_READY',
      'SIGNAL_GENERATED',
      'ORDER_PROPOSED',
      'ORDER_APPROVED',
      'ORDER_REJECTED',
      'ORDER_SUBMITTED',
      'FILL_RECEIVED',
      'RISK_ALERT',
      'KILL_SWITCH_ACTIVATED',
      'KILL_SWITCH_DEACTIVATED',
    ];

    for (const type of expectedTypes) {
      assert.ok(EventTypes[type], `EventTypes should have ${type}`);
      assert.strictEqual(typeof EventTypes[type], 'string');
    }
  });

  test('isValidEventType should return true for valid types', () => {
    assert.strictEqual(isValidEventType('market_data_ready'), true);
    assert.strictEqual(isValidEventType('signal_generated'), true);
    assert.strictEqual(isValidEventType('order_proposed'), true);
  });

  test('isValidEventType should return false for invalid types', () => {
    assert.strictEqual(isValidEventType('invalid_type'), false);
    assert.strictEqual(isValidEventType(''), false);
    assert.strictEqual(isValidEventType(null), false);
    assert.strictEqual(isValidEventType(undefined), false);
  });

  test('getEventConfig should return config for valid event types', () => {
    const config = getEventConfig(EventTypes.SIGNAL_GENERATED);

    assert.ok(config, 'Should return config');
    assert.strictEqual(config.targetService, 'execution');
    assert.strictEqual(config.endpoint, '/api/v1/orders/propose');
    assert.strictEqual(config.method, 'POST');
    assert.strictEqual(typeof config.maxRetries, 'number');
    assert.strictEqual(typeof config.timeoutMs, 'number');
  });

  test('getEventConfig should return null for invalid event types', () => {
    assert.strictEqual(getEventConfig('invalid_type'), null);
    assert.strictEqual(getEventConfig(''), null);
  });

  test('getEventTypesForService should return event types for a service', () => {
    const executionEvents = getEventTypesForService('execution');
    assert.ok(Array.isArray(executionEvents));
    assert.ok(executionEvents.includes(EventTypes.SIGNAL_GENERATED));
    assert.ok(executionEvents.includes(EventTypes.ORDER_APPROVED));

    const riskEvents = getEventTypesForService('risk');
    assert.ok(riskEvents.includes(EventTypes.ORDER_PROPOSED));
    assert.ok(riskEvents.includes(EventTypes.FILL_RECEIVED));
  });
});

/**
 * Test suite for payload validation
 */
describe('Payload Validation', () => {
  test('validatePayload should pass for valid signal_generated payload', () => {
    const payload = {
      signal_id: 'sig_123',
      symbol: 'AAPL',
      direction: 'long',
      strategy_id: 'momentum',
      confidence: 0.85,
    };

    const result = validatePayload(EventTypes.SIGNAL_GENERATED, payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('validatePayload should fail for missing required fields', () => {
    const payload = {
      signal_id: 'sig_123',
      symbol: 'AAPL',
      // Missing: direction, strategy_id, confidence
    };

    const result = validatePayload(EventTypes.SIGNAL_GENERATED, payload);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('direction')));
    assert.ok(result.errors.some(e => e.includes('strategy_id')));
    assert.ok(result.errors.some(e => e.includes('confidence')));
  });

  test('validatePayload should pass for valid order_proposed payload', () => {
    const payload = {
      order_id: 'ord_123',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 100,
      order_type: 'market',
      signal_id: 'sig_123',
    };

    const result = validatePayload(EventTypes.ORDER_PROPOSED, payload);
    assert.strictEqual(result.valid, true);
  });

  test('validatePayload should fail for unknown event type', () => {
    const result = validatePayload('unknown_type', {});
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors[0].includes('Unknown event type'));
  });

  test('PayloadSchemas should have all required schemas', () => {
    for (const eventType of Object.values(EventTypes)) {
      assert.ok(
        PayloadSchemas[eventType],
        `PayloadSchemas should have schema for ${eventType}`
      );
      assert.ok(
        Array.isArray(PayloadSchemas[eventType].required),
        `Schema for ${eventType} should have required array`
      );
    }
  });
});

/**
 * Test suite for OutboxPublisher
 */
describe('OutboxPublisher', () => {
  // Mock pool for testing without database
  const createMockPool = () => {
    const mockClient = {
      query: mock.fn(async () => ({
        rows: [{
          id: 1,
          event_type: 'signal_generated',
          payload: '{"signal_id":"sig_123"}',
          target_service: 'execution',
          idempotency_key: 'test_key_123',
          status: 'pending',
          created_at: new Date().toISOString(),
        }],
        rowCount: 1,
      })),
      release: mock.fn(),
    };

    return {
      connect: mock.fn(async () => mockClient),
      query: mock.fn(async () => ({ rows: [], rowCount: 0 })),
      _mockClient: mockClient,
    };
  };

  test('OutboxPublisher should initialize with defaults', () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool);

    assert.ok(publisher);
    assert.strictEqual(publisher.options.sourceService, 'ops');
    assert.strictEqual(publisher.options.validatePayloads, true);
  });

  test('OutboxPublisher should accept custom options', () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool, {
      sourceService: 'data',
      validatePayloads: false,
      logger: console,
    });

    assert.strictEqual(publisher.options.sourceService, 'data');
    assert.strictEqual(publisher.options.validatePayloads, false);
  });

  test('OutboxPublisher.generateIdempotencyKey should create unique keys', () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool);

    const key1 = publisher.generateIdempotencyKey('signal_generated', { signal_id: '1' });
    const key2 = publisher.generateIdempotencyKey('signal_generated', { signal_id: '1' });

    assert.ok(key1.startsWith('signal_generated:'));
    assert.ok(key2.startsWith('signal_generated:'));
    // Keys should be different even with same payload (includes timestamp/uuid)
    assert.notStrictEqual(key1, key2);
  });

  test('OutboxPublisher.extractKeyFields should extract correct fields', () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool);

    const payload = {
      signal_id: 'sig_123',
      symbol: 'AAPL',
      direction: 'long',
      extra_field: 'ignored',
    };

    const keyFields = publisher.extractKeyFields('signal_generated', payload);

    assert.deepStrictEqual(keyFields, {
      signal_id: 'sig_123',
      symbol: 'AAPL',
    });
    assert.ok(!('extra_field' in keyFields));
  });

  test('OutboxPublisher.publish should reject invalid event type', async () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool);

    await assert.rejects(
      () => publisher.publish('invalid_type', {}),
      /Invalid event type/
    );
  });

  test('OutboxPublisher.publish should reject invalid payload', async () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool, { validatePayloads: true });

    const invalidPayload = {
      signal_id: 'sig_123',
      // Missing required fields
    };

    await assert.rejects(
      () => publisher.publish(EventTypes.SIGNAL_GENERATED, invalidPayload),
      /Payload validation failed/
    );
  });

  test('OutboxPublisher.publish should call database correctly', async () => {
    const mockPool = createMockPool();
    const publisher = new OutboxPublisher(mockPool, {
      validatePayloads: false, // Skip validation for simplicity
    });

    const payload = {
      signal_id: 'sig_123',
      symbol: 'AAPL',
      direction: 'long',
      strategy_id: 'momentum',
      confidence: 0.85,
    };

    const result = await publisher.publish(EventTypes.SIGNAL_GENERATED, payload);

    assert.ok(result);
    assert.strictEqual(result.id, 1);
    assert.strictEqual(result.event_type, 'signal_generated');

    // Verify client was acquired and released
    assert.strictEqual(mockPool.connect.mock.calls.length, 1);
    assert.strictEqual(mockPool._mockClient.release.mock.calls.length, 1);
  });
});

/**
 * Test suite for OutboxDispatcher
 */
describe('OutboxDispatcher', () => {
  const createMockPool = () => {
    const mockClient = {
      query: mock.fn(async () => ({ rows: [], rowCount: 0 })),
      release: mock.fn(),
    };

    return {
      connect: mock.fn(async () => mockClient),
      _mockClient: mockClient,
    };
  };

  test('OutboxDispatcher should initialize with defaults', () => {
    const mockPool = createMockPool();
    const dispatcher = new OutboxDispatcher(mockPool);

    assert.ok(dispatcher);
    assert.strictEqual(dispatcher.options.pollInterval, 1000);
    assert.strictEqual(dispatcher.options.maxConcurrent, 5);
    assert.strictEqual(dispatcher.options.batchSize, 10);
    assert.strictEqual(dispatcher.isRunning, false);
  });

  test('OutboxDispatcher should accept custom options', () => {
    const mockPool = createMockPool();
    const dispatcher = new OutboxDispatcher(mockPool, {
      pollInterval: 2000,
      maxConcurrent: 10,
      batchSize: 20,
      serviceUrls: {
        data: 'http://custom:5101',
      },
    });

    assert.strictEqual(dispatcher.options.pollInterval, 2000);
    assert.strictEqual(dispatcher.options.maxConcurrent, 10);
    assert.strictEqual(dispatcher.options.batchSize, 20);
    assert.strictEqual(dispatcher.options.serviceUrls.data, 'http://custom:5101');
  });

  test('OutboxDispatcher.start should set isRunning to true', () => {
    const mockPool = createMockPool();
    const dispatcher = new OutboxDispatcher(mockPool, {
      pollInterval: 100000, // Long interval to prevent auto-polling
    });

    dispatcher.start();
    assert.strictEqual(dispatcher.isRunning, true);

    // Cleanup
    dispatcher.stop();
  });

  test('OutboxDispatcher.stop should set isRunning to false', () => {
    const mockPool = createMockPool();
    const dispatcher = new OutboxDispatcher(mockPool, {
      pollInterval: 100000,
    });

    dispatcher.start();
    dispatcher.stop();
    assert.strictEqual(dispatcher.isRunning, false);
  });

  test('OutboxDispatcher should not start if already running', () => {
    const mockPool = createMockPool();
    const mockLogger = {
      info: mock.fn(),
      warn: mock.fn(),
      error: mock.fn(),
      debug: mock.fn(),
    };

    const dispatcher = new OutboxDispatcher(mockPool, {
      pollInterval: 100000,
      logger: mockLogger,
    });

    dispatcher.start();
    dispatcher.start(); // Second start should warn

    assert.ok(mockLogger.warn.mock.calls.some(
      call => call.arguments[0].includes('already running')
    ));

    dispatcher.stop();
  });

  test('OutboxDispatcher.getStatus should return status object', async () => {
    const mockPool = createMockPool();
    mockPool._mockClient.query = mock.fn(async () => ({
      rows: [
        { status: 'pending', count: '5' },
        { status: 'completed', count: '10' },
        { status: 'dead_letter', count: '2' },
      ],
    }));

    const dispatcher = new OutboxDispatcher(mockPool);
    const status = await dispatcher.getStatus();

    assert.ok(status);
    assert.strictEqual(status.isRunning, false);
    assert.strictEqual(status.activeDispatches, 0);
    assert.strictEqual(status.counts.pending, 5);
    assert.strictEqual(status.counts.completed, 10);
    assert.strictEqual(status.counts.dead_letter, 2);
  });

  test('OutboxDispatcher.getDeadLetterEvents should query database', async () => {
    const mockPool = createMockPool();
    const mockEvents = [
      {
        id: 1,
        event_type: 'signal_generated',
        payload: '{}',
        status: 'dead_letter',
        error_message: 'Connection refused',
      },
    ];
    mockPool._mockClient.query = mock.fn(async () => ({
      rows: mockEvents,
    }));

    const dispatcher = new OutboxDispatcher(mockPool);
    const events = await dispatcher.getDeadLetterEvents({ limit: 10 });

    assert.deepStrictEqual(events, mockEvents);
    assert.strictEqual(mockPool._mockClient.query.mock.calls.length, 1);
  });

  test('OutboxDispatcher.retryDeadLetterEvent should update event status', async () => {
    const mockPool = createMockPool();
    const updatedEvent = {
      id: 1,
      event_type: 'signal_generated',
      payload: '{}',
      status: 'pending',
      retry_count: 0,
    };
    mockPool._mockClient.query = mock.fn(async () => ({
      rows: [updatedEvent],
      rowCount: 1,
    }));

    const dispatcher = new OutboxDispatcher(mockPool);
    const result = await dispatcher.retryDeadLetterEvent(1);

    assert.deepStrictEqual(result, updatedEvent);
  });

  test('OutboxDispatcher.retryDeadLetterEvent should return null for non-existent event', async () => {
    const mockPool = createMockPool();
    mockPool._mockClient.query = mock.fn(async () => ({
      rows: [],
      rowCount: 0,
    }));

    const dispatcher = new OutboxDispatcher(mockPool);
    const result = await dispatcher.retryDeadLetterEvent(999);

    assert.strictEqual(result, null);
  });

  test('OutboxDispatcher.retryAllDeadLetterEvents should return count', async () => {
    const mockPool = createMockPool();
    mockPool._mockClient.query = mock.fn(async () => ({
      rows: [],
      rowCount: 5,
    }));

    const dispatcher = new OutboxDispatcher(mockPool);
    const count = await dispatcher.retryAllDeadLetterEvents();

    assert.strictEqual(count, 5);
  });
});

/**
 * Integration tests (require database)
 */
describe('Integration Tests (skipped without DB)', { skip: !process.env.TEST_WITH_DB }, () => {
  test('Full publish and dispatch cycle', async () => {
    // This test requires a real database connection
    // Set TEST_WITH_DB=true and configure POSTGRES_* env vars to run
    assert.ok(true, 'Integration test placeholder');
  });
});

/**
 * Event flow tests
 */
describe('Event Flow', () => {
  test('Signal flow: SIGNAL_GENERATED -> execution -> ORDER_PROPOSED -> risk', () => {
    // Verify the event chain configuration
    const signalConfig = getEventConfig(EventTypes.SIGNAL_GENERATED);
    assert.strictEqual(signalConfig.targetService, 'execution');

    const orderConfig = getEventConfig(EventTypes.ORDER_PROPOSED);
    assert.strictEqual(orderConfig.targetService, 'risk');

    const approvedConfig = getEventConfig(EventTypes.ORDER_APPROVED);
    assert.strictEqual(approvedConfig.targetService, 'execution');
  });

  test('Kill switch flow should notify execution service', () => {
    const activatedConfig = getEventConfig(EventTypes.KILL_SWITCH_ACTIVATED);
    assert.strictEqual(activatedConfig.targetService, 'execution');

    const deactivatedConfig = getEventConfig(EventTypes.KILL_SWITCH_DEACTIVATED);
    assert.strictEqual(deactivatedConfig.targetService, 'execution');
  });

  test('All events should have valid configurations', () => {
    for (const eventType of Object.values(EventTypes)) {
      const config = getEventConfig(eventType);

      assert.ok(config, `Config should exist for ${eventType}`);
      assert.ok(config.targetService, `${eventType} should have targetService`);
      assert.ok(config.endpoint, `${eventType} should have endpoint`);
      assert.ok(config.method, `${eventType} should have method`);
      assert.ok(typeof config.maxRetries === 'number', `${eventType} should have numeric maxRetries`);
      assert.ok(typeof config.timeoutMs === 'number', `${eventType} should have numeric timeoutMs`);
    }
  });
});

// Run tests
console.log('Running outbox tests...');
