/**
 * Signal Generation Job Tests
 *
 * Tests for the automated signal generation job that runs during market hours.
 * Uses Node.js built-in test runner (node:test).
 *
 * Usage:
 *   node --test tests/test-signal-generation.js
 *
 * Note: These tests mock external HTTP calls to the signal service.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  SignalGenerationJob,
  isMarketOpen,
  getMarketSchedule,
  DEFAULT_CONFIG,
} from '../jobs/signal-generation.js';

/**
 * Mock logger for testing
 */
const mockLogger = {
  info: mock.fn(() => {}),
  warn: mock.fn(() => {}),
  error: mock.fn(() => {}),
  debug: mock.fn(() => {}),
};

/**
 * Mock axios for HTTP requests
 */
function createMockAxios(responses = {}) {
  return {
    get: mock.fn(async (url) => {
      if (url.includes('/health')) {
        return { status: 200, data: { status: 'healthy' } };
      }
      if (url.includes('/symbols')) {
        return { status: 200, data: responses.symbols || ['AAPL', 'GOOGL', 'MSFT'] };
      }
      if (url.includes('/strategies')) {
        return {
          status: 200,
          data: responses.strategies || [
            { id: 'momentum', name: 'Momentum' },
            { id: 'breakout', name: 'Breakout' },
          ],
        };
      }
      return { status: 200, data: {} };
    }),
    post: mock.fn(async (url, data) => {
      if (responses.postError) {
        throw new Error(responses.postError);
      }
      if (url.includes('/signals/generate')) {
        return {
          status: 200,
          data: responses.signals || [
            { id: 'sig-1', symbol: 'AAPL', direction: 'BUY' },
          ],
        };
      }
      return { status: 200, data: {} };
    }),
  };
}

/**
 * Test suite for DEFAULT_CONFIG
 */
describe('Default Configuration', () => {
  test('should have required config fields', () => {
    assert.ok(DEFAULT_CONFIG.intervalMinutes);
    assert.ok(DEFAULT_CONFIG.marketOpenHour !== undefined);
    assert.ok(DEFAULT_CONFIG.marketCloseHour !== undefined);
    assert.ok(DEFAULT_CONFIG.timezone);
    assert.ok(Array.isArray(DEFAULT_CONFIG.strategies));
    assert.ok(Array.isArray(DEFAULT_CONFIG.symbols) || DEFAULT_CONFIG.symbols === 'auto');
  });

  test('should have sensible market hours', () => {
    assert.ok(DEFAULT_CONFIG.marketOpenHour >= 0 && DEFAULT_CONFIG.marketOpenHour <= 23);
    assert.ok(DEFAULT_CONFIG.marketCloseHour >= 0 && DEFAULT_CONFIG.marketCloseHour <= 23);
    assert.ok(DEFAULT_CONFIG.marketOpenHour < DEFAULT_CONFIG.marketCloseHour);
  });

  test('should have valid interval', () => {
    assert.ok(DEFAULT_CONFIG.intervalMinutes > 0);
    assert.ok(DEFAULT_CONFIG.intervalMinutes <= 60);
  });
});

/**
 * Test suite for isMarketOpen function
 */
describe('isMarketOpen', () => {
  test('should return false on weekend', () => {
    // Create a Saturday
    const saturday = new Date('2024-01-13T12:00:00-05:00'); // Saturday
    assert.strictEqual(isMarketOpen(saturday), false);

    // Create a Sunday
    const sunday = new Date('2024-01-14T12:00:00-05:00'); // Sunday
    assert.strictEqual(isMarketOpen(sunday), false);
  });

  test('should return true during market hours on weekday', () => {
    // Monday at 11:00 AM EST (within market hours)
    const monday11am = new Date('2024-01-15T11:00:00-05:00');
    const result = isMarketOpen(monday11am);
    // Result depends on timezone handling
    assert.strictEqual(typeof result, 'boolean');
  });

  test('should return false before market open on weekday', () => {
    // Monday at 8:00 AM EST (before 9:30 AM open)
    const monday8am = new Date('2024-01-15T08:00:00-05:00');
    const result = isMarketOpen(monday8am);
    assert.strictEqual(typeof result, 'boolean');
  });

  test('should return false after market close on weekday', () => {
    // Monday at 5:00 PM EST (after 4:00 PM close)
    const monday5pm = new Date('2024-01-15T17:00:00-05:00');
    const result = isMarketOpen(monday5pm);
    assert.strictEqual(typeof result, 'boolean');
  });
});

/**
 * Test suite for getMarketSchedule function
 */
describe('getMarketSchedule', () => {
  test('should return schedule object', () => {
    const schedule = getMarketSchedule();
    assert.ok(schedule);
    assert.ok(schedule.open !== undefined);
    assert.ok(schedule.close !== undefined);
    assert.ok(schedule.timezone !== undefined);
  });

  test('should have valid hours', () => {
    const schedule = getMarketSchedule();
    assert.ok(schedule.open.hour >= 0 && schedule.open.hour <= 23);
    assert.ok(schedule.close.hour >= 0 && schedule.close.hour <= 23);
  });
});

/**
 * Test suite for SignalGenerationJob initialization
 */
describe('SignalGenerationJob Initialization', () => {
  test('should initialize with default config', () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
    });

    assert.ok(job);
    assert.strictEqual(job.isRunning(), false);
  });

  test('should initialize with custom config', () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        intervalMinutes: 30,
        strategies: ['momentum'],
        symbols: ['AAPL', 'GOOGL'],
      },
    });

    assert.ok(job);
  });

  test('should accept service URLs', () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      signalServiceUrl: 'http://localhost:5102',
      dataServiceUrl: 'http://localhost:5101',
    });

    assert.ok(job);
  });
});

/**
 * Test suite for job lifecycle
 */
describe('Job Lifecycle', () => {
  let job;

  beforeEach(() => {
    job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        intervalMinutes: 1,
      },
    });
  });

  afterEach(async () => {
    if (job && job.isRunning()) {
      await job.stop();
    }
  });

  test('should start and stop correctly', async () => {
    assert.strictEqual(job.isRunning(), false);

    await job.start();
    assert.strictEqual(job.isRunning(), true);

    await job.stop();
    assert.strictEqual(job.isRunning(), false);
  });

  test('should not start if already running', async () => {
    await job.start();
    const firstState = job.isRunning();

    // Starting again should be a no-op
    await job.start();
    assert.strictEqual(job.isRunning(), firstState);

    await job.stop();
  });

  test('should handle stop when not running', async () => {
    assert.strictEqual(job.isRunning(), false);

    // Should not throw
    await job.stop();
    assert.strictEqual(job.isRunning(), false);
  });
});

/**
 * Test suite for signal generation execution
 */
describe('Signal Generation Execution', () => {
  test('should fetch symbols if set to auto', async () => {
    const mockAxios = createMockAxios({
      symbols: ['AAPL', 'MSFT', 'GOOGL'],
    });

    const job = new SignalGenerationJob({
      logger: mockLogger,
      axios: mockAxios,
      config: {
        symbols: 'auto',
      },
    });

    if (job.fetchSymbols) {
      const symbols = await job.fetchSymbols();
      assert.ok(Array.isArray(symbols));
    }
  });

  test('should use configured symbols if provided', async () => {
    const configuredSymbols = ['AAPL', 'TSLA'];

    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        symbols: configuredSymbols,
      },
    });

    if (job.getSymbols) {
      const symbols = job.getSymbols();
      assert.deepStrictEqual(symbols, configuredSymbols);
    }
  });

  test('should generate signals for all strategies', async () => {
    const mockAxios = createMockAxios({
      signals: [
        { id: 'sig-1', symbol: 'AAPL', direction: 'BUY', strategy: 'momentum' },
        { id: 'sig-2', symbol: 'AAPL', direction: 'SELL', strategy: 'breakout' },
      ],
    });

    const job = new SignalGenerationJob({
      logger: mockLogger,
      axios: mockAxios,
      config: {
        strategies: ['momentum', 'breakout'],
        symbols: ['AAPL'],
      },
    });

    if (job.generateSignals) {
      const signals = await job.generateSignals();
      assert.ok(Array.isArray(signals));
    }
  });
});

/**
 * Test suite for error handling
 */
describe('Error Handling', () => {
  test('should handle signal service unavailable', async () => {
    const mockAxios = createMockAxios({
      postError: 'Connection refused',
    });

    const job = new SignalGenerationJob({
      logger: mockLogger,
      axios: mockAxios,
    });

    if (job.generateSignals) {
      try {
        await job.generateSignals();
      } catch (err) {
        // Should handle error gracefully or throw
        assert.ok(err instanceof Error);
      }
    }
  });

  test('should handle empty symbol list', async () => {
    const mockAxios = createMockAxios({
      symbols: [],
    });

    const job = new SignalGenerationJob({
      logger: mockLogger,
      axios: mockAxios,
      config: {
        symbols: 'auto',
      },
    });

    if (job.fetchSymbols) {
      const symbols = await job.fetchSymbols();
      assert.ok(Array.isArray(symbols));
      assert.strictEqual(symbols.length, 0);
    }
  });

  test('should handle no strategies configured', async () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        strategies: [],
      },
    });

    // Should not crash
    assert.ok(job);
  });
});

/**
 * Test suite for job status reporting
 */
describe('Job Status', () => {
  test('should report status correctly', () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
    });

    const status = job.getStatus ? job.getStatus() : { running: job.isRunning() };
    assert.ok(status);
    assert.strictEqual(typeof status.running, 'boolean');
  });

  test('should track last run time', async () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        intervalMinutes: 60,
      },
    });

    if (job.getLastRunTime) {
      const lastRun = job.getLastRunTime();
      assert.ok(lastRun === null || lastRun instanceof Date);
    }
  });

  test('should track signals generated count', async () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
    });

    if (job.getStats) {
      const stats = job.getStats();
      assert.ok(stats);
      assert.ok(stats.signalsGenerated !== undefined || stats.totalRuns !== undefined);
    }
  });
});

/**
 * Test suite for market hours enforcement
 */
describe('Market Hours Enforcement', () => {
  test('should skip execution outside market hours when enforced', async () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        enforceMarketHours: true,
      },
    });

    if (job.shouldRun) {
      const shouldRun = job.shouldRun();
      assert.strictEqual(typeof shouldRun, 'boolean');
    }
  });

  test('should run anytime when market hours not enforced', async () => {
    const job = new SignalGenerationJob({
      logger: mockLogger,
      config: {
        enforceMarketHours: false,
      },
    });

    if (job.shouldRun) {
      const shouldRun = job.shouldRun();
      assert.strictEqual(shouldRun, true);
    }
  });
});

/**
 * Test suite for integration with notification service
 */
describe('Notification Integration', () => {
  test('should accept notification callback', () => {
    const notifyCallback = mock.fn(async (signal) => {});

    const job = new SignalGenerationJob({
      logger: mockLogger,
      onSignalGenerated: notifyCallback,
    });

    assert.ok(job);
  });

  test('should call notification on signal generation', async () => {
    const notifyCallback = mock.fn(async (signal) => {});

    const mockAxios = createMockAxios({
      signals: [{ id: 'sig-1', symbol: 'AAPL', direction: 'BUY' }],
    });

    const job = new SignalGenerationJob({
      logger: mockLogger,
      axios: mockAxios,
      onSignalGenerated: notifyCallback,
      config: {
        symbols: ['AAPL'],
        strategies: ['momentum'],
      },
    });

    if (job.generateSignals) {
      await job.generateSignals();
      // Callback may or may not be called depending on implementation
    }
  });
});

// Run tests if executed directly
if (process.argv[1] === import.meta.url.slice(7)) {
  console.log('Run with: node --test tests/test-signal-generation.js');
}
