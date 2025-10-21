import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  success: jest.fn()
};

jest.unstable_mockModule('../../src/audit/logger.js', () => ({
  logger: mockLogger
}));

// Mock fs
const mockFsExistsSync = jest.fn();
const mockFsWriteFileSync = jest.fn();
const mockFsMkdirSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    writeFileSync: mockFsWriteFileSync,
    mkdirSync: mockFsMkdirSync
  }
}));

// Dynamic import after mocking
const { ErrorTracker } = await import('../../src/monitoring/error-tracker.js');

describe('Error Tracker', () => {
  let tracker;

  beforeEach(() => {
    // Create tracker with enabled: false to avoid setting up global handlers
    tracker = new ErrorTracker({ enabled: false });
    // Clear all mocks
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.success.mockClear();
    mockFsExistsSync.mockClear();
    mockFsWriteFileSync.mockClear();
    mockFsMkdirSync.mockClear();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(tracker.errors).toEqual([]);
      expect(tracker.maxErrors).toBe(100);
      expect(tracker.errorCounts).toBeInstanceOf(Map);
      expect(tracker.enabled).toBe(false);
    });

    test('should accept custom options', () => {
      const customTracker = new ErrorTracker({
        maxErrors: 50,
        enabled: false
      });

      expect(customTracker.maxErrors).toBe(50);
      expect(customTracker.enabled).toBe(false);
    });

    test('should set up global handlers when enabled', () => {
      const enabledTracker = new ErrorTracker({ enabled: true });

      expect(mockLogger.info).toHaveBeenCalledWith('Error tracking initialized');
    });
  });

  describe('captureError()', () => {
    test('should capture error with basic information', () => {
      const error = new Error('Test error');
      const result = tracker.captureError(error);

      expect(result).toBeDefined();
      expect(result.message).toBe('Test error');
      expect(result.type).toBe('Error');
      expect(result.stack).toContain('Test error');
      expect(result.timestamp).toBeDefined();
    });

    test('should add error to errors array', () => {
      const error = new Error('Test error');
      tracker.captureError(error);

      expect(tracker.errors).toHaveLength(1);
      expect(tracker.errors[0].message).toBe('Test error');
    });

    test('should include context information', () => {
      const error = new Error('Test error');
      const context = { component: 'test-component', userId: 123 };
      const result = tracker.captureError(error, context);

      expect(result.context).toMatchObject(context);
      expect(result.context.node_version).toBeDefined();
      expect(result.context.platform).toBeDefined();
      expect(result.context.uptime).toBeDefined();
      expect(result.context.memory).toBeDefined();
    });

    test('should update error counts', () => {
      const error = new Error('Test error');
      tracker.captureError(error);
      tracker.captureError(error);

      const errorKey = 'Error:Test error';
      expect(tracker.errorCounts.get(errorKey)).toBe(2);
    });

    test('should log error via logger', () => {
      const error = new Error('Test error');
      tracker.captureError(error, { component: 'test' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error captured:',
        expect.objectContaining({
          message: 'Test error',
          type: 'Error',
          component: 'test'
        })
      );
    });

    test('should limit errors array to maxErrors', () => {
      const smallTracker = new ErrorTracker({ maxErrors: 3, enabled: false });

      for (let i = 0; i < 5; i++) {
        smallTracker.captureError(new Error(`Error ${i}`));
      }

      expect(smallTracker.errors).toHaveLength(3);
      expect(smallTracker.errors[0].message).toBe('Error 2');
      expect(smallTracker.errors[2].message).toBe('Error 4');
    });

    test('should handle errors without stack trace', () => {
      const errorLike = { message: 'String error', name: 'CustomError' };
      const result = tracker.captureError(errorLike);

      expect(result.stack).toBe('No stack trace');
    });

    test('should handle non-Error objects', () => {
      const result = tracker.captureError('String error');

      expect(result.message).toBe('String error');
      expect(result.stack).toBe('No stack trace');
    });
  });

  describe('captureException()', () => {
    test('should call captureError', () => {
      const error = new Error('Exception error');
      const result = tracker.captureException(error, { source: 'test' });

      expect(result.message).toBe('Exception error');
      expect(result.context.source).toBe('test');
    });
  });

  describe('captureMessage()', () => {
    test('should capture message as error', () => {
      const result = tracker.captureMessage('Test message', 'warning', { tag: 'test' });

      expect(result.message).toBe('Test message');
      expect(result.context.level).toBe('warning');
      expect(result.context.tag).toBe('test');
    });

    test('should default to error level', () => {
      const result = tracker.captureMessage('Test message');

      expect(result.context.level).toBe('error');
    });
  });

  describe('getRecentErrors()', () => {
    test('should return recent errors in reverse order', () => {
      tracker.captureError(new Error('Error 1'));
      tracker.captureError(new Error('Error 2'));
      tracker.captureError(new Error('Error 3'));

      const recent = tracker.getRecentErrors(2);

      expect(recent).toHaveLength(2);
      expect(recent[0].message).toBe('Error 3');
      expect(recent[1].message).toBe('Error 2');
    });

    test('should default to 10 errors', () => {
      for (let i = 0; i < 15; i++) {
        tracker.captureError(new Error(`Error ${i}`));
      }

      const recent = tracker.getRecentErrors();

      expect(recent).toHaveLength(10);
    });

    test('should return all errors if less than count', () => {
      tracker.captureError(new Error('Error 1'));

      const recent = tracker.getRecentErrors(10);

      expect(recent).toHaveLength(1);
    });
  });

  describe('getStats()', () => {
    test('should return error statistics', () => {
      tracker.captureError(new Error('Error 1'));
      tracker.captureError(new TypeError('Type error'));
      tracker.captureError(new Error('Error 2'));

      const stats = tracker.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byType).toHaveProperty('Error', 2);
      expect(stats.byType).toHaveProperty('TypeError', 1);
      expect(stats.mostCommon).toBeDefined();
      expect(stats.recent).toBeDefined();
    });

    test('should include most common errors', () => {
      tracker.captureError(new Error('Common error'));
      tracker.captureError(new Error('Common error'));
      tracker.captureError(new Error('Rare error'));

      const stats = tracker.getStats();

      expect(stats.mostCommon).toHaveLength(2);
      expect(stats.mostCommon[0].error).toBe('Error:Common error');
      expect(stats.mostCommon[0].count).toBe(2);
    });
  });

  describe('getMostCommonErrors()', () => {
    test('should return most common errors sorted by count', () => {
      tracker.captureError(new Error('Error A'));
      tracker.captureError(new Error('Error B'));
      tracker.captureError(new Error('Error B'));
      tracker.captureError(new Error('Error C'));
      tracker.captureError(new Error('Error C'));
      tracker.captureError(new Error('Error C'));

      const common = tracker.getMostCommonErrors(3);

      expect(common).toHaveLength(3);
      expect(common[0].error).toBe('Error:Error C');
      expect(common[0].count).toBe(3);
      expect(common[1].error).toBe('Error:Error B');
      expect(common[1].count).toBe(2);
    });

    test('should calculate percentage', () => {
      for (let i = 0; i < 10; i++) {
        tracker.captureError(new Error('Same error'));
      }

      const common = tracker.getMostCommonErrors(1);

      expect(common[0].percentage).toBe(100);
    });
  });

  describe('clear()', () => {
    test('should clear all errors', () => {
      tracker.captureError(new Error('Error 1'));
      tracker.captureError(new Error('Error 2'));

      tracker.clear();

      expect(tracker.errors).toHaveLength(0);
      expect(tracker.errorCounts.size).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Error tracking cleared');
    });
  });

  describe('generateReport()', () => {
    test('should generate comprehensive error report', () => {
      tracker.captureError(new Error('Test error'));

      const report = tracker.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.errors).toHaveLength(1);
      expect(report.system).toHaveProperty('uptime');
      expect(report.system).toHaveProperty('memory');
      expect(report.system).toHaveProperty('node_version');
    });

    test('should include all captured errors', () => {
      tracker.captureError(new Error('Error 1'));
      tracker.captureError(new Error('Error 2'));

      const report = tracker.generateReport();

      expect(report.errors).toHaveLength(2);
    });
  });

  describe('saveReport()', () => {
    test('should save report to file', () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      tracker.captureError(new Error('Test error'));
      const filename = tracker.saveReport();

      expect(mockFsWriteFileSync).toHaveBeenCalled();
      expect(filename).toContain('errors-');
      expect(filename).toContain('.json');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Error report saved'));
    });

    test('should create directory if it does not exist', () => {
      mockFsExistsSync.mockReturnValue(false);
      mockFsMkdirSync.mockReturnValue(undefined);
      mockFsWriteFileSync.mockReturnValue(undefined);

      tracker.saveReport();

      expect(mockFsMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('errors'),
        expect.objectContaining({ recursive: true })
      );
    });

    test('should accept custom filename', () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      const customFilename = '/custom/path/report.json';
      const result = tracker.saveReport(customFilename);

      expect(result).toBe(customFilename);
    });
  });

  describe('wrap()', () => {
    test('should wrap function and return result', async () => {
      const fn = async (x) => x * 2;
      const wrapped = tracker.wrap(fn);

      const result = await wrapped(5);

      expect(result).toBe(10);
    });

    test('should capture errors from wrapped function', async () => {
      const fn = async () => {
        throw new Error('Wrapped error');
      };
      const wrapped = tracker.wrap(fn, { component: 'test' });

      await expect(wrapped()).rejects.toThrow('Wrapped error');
      expect(tracker.errors).toHaveLength(1);
      expect(tracker.errors[0].message).toBe('Wrapped error');
      expect(tracker.errors[0].context.component).toBe('test');
    });

    test('should include function name in context', async () => {
      async function namedFunction() {
        throw new Error('Named error');
      }

      const wrapped = tracker.wrap(namedFunction);

      await expect(wrapped()).rejects.toThrow('Named error');
      expect(tracker.errors[0].context.function).toBe('namedFunction');
    });

    test('should include argument count in context', async () => {
      const fn = async (a, b, c) => {
        throw new Error('Args error');
      };
      const wrapped = tracker.wrap(fn);

      await expect(wrapped(1, 2, 3)).rejects.toThrow('Args error');
      expect(tracker.errors[0].context.args).toBe(3);
    });
  });

  describe('Error types', () => {
    test('should capture different error types', () => {
      tracker.captureError(new Error('Standard error'));
      tracker.captureError(new TypeError('Type error'));
      tracker.captureError(new RangeError('Range error'));

      expect(tracker.errors).toHaveLength(3);
      expect(tracker.errors[0].type).toBe('Error');
      expect(tracker.errors[1].type).toBe('TypeError');
      expect(tracker.errors[2].type).toBe('RangeError');
    });
  });
});
