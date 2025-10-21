import { describe, test, expect, jest, beforeEach } from '@jest/globals';

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
const { PerformanceMonitor } = await import('../../src/monitoring/performance-monitor.js');

describe('Performance Monitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
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
    test('should initialize with empty metrics and timers', () => {
      expect(monitor.metrics).toBeInstanceOf(Map);
      expect(monitor.timers).toBeInstanceOf(Map);
      expect(monitor.metrics.size).toBe(0);
      expect(monitor.timers.size).toBe(0);
    });

    test('should have default thresholds', () => {
      expect(monitor.thresholds).toEqual({
        slow: 1000,
        verySlow: 5000,
        critical: 10000
      });
    });
  });

  describe('start()', () => {
    test('should start timer for operation', () => {
      monitor.start('test-operation');

      expect(monitor.timers.has('test-operation')).toBe(true);
      const timer = monitor.timers.get('test-operation');
      expect(timer.startTime).toBeDefined();
      expect(timer.startMemory).toBeDefined();
    });

    test('should record current memory usage', () => {
      monitor.start('test-operation');

      const timer = monitor.timers.get('test-operation');
      expect(typeof timer.startMemory).toBe('number');
      expect(timer.startMemory).toBeGreaterThan(0);
    });
  });

  describe('end()', () => {
    test('should end timer and return metric', () => {
      monitor.start('test-operation');
      const metric = monitor.end('test-operation');

      expect(metric).toBeDefined();
      expect(metric.operation).toBe('test-operation');
      expect(metric.duration).toBeGreaterThanOrEqual(0);
      expect(metric.timestamp).toBeDefined();
      expect(metric.status).toBeDefined();
    });

    test('should calculate duration correctly', async () => {
      monitor.start('delay-operation');
      await new Promise(resolve => setTimeout(resolve, 50));
      const metric = monitor.end('delay-operation');

      expect(metric.duration).toBeGreaterThanOrEqual(45);
    });

    test('should calculate memory delta', () => {
      monitor.start('memory-operation');
      const metric = monitor.end('memory-operation');

      expect(metric.memoryDelta).toBeDefined();
      expect(typeof metric.memoryDelta).toBe('number');
    });

    test('should include metadata in metric', () => {
      monitor.start('metadata-operation');
      const metric = monitor.end('metadata-operation', {
        userId: 123,
        action: 'test'
      });

      expect(metric.userId).toBe(123);
      expect(metric.action).toBe('test');
    });

    test('should return null if timer not found', () => {
      const metric = monitor.end('non-existent-operation');

      expect(metric).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No timer found for operation: non-existent-operation'
      );
    });

    test('should store metric in metrics map', () => {
      monitor.start('test-operation');
      monitor.end('test-operation');

      expect(monitor.metrics.has('test-operation')).toBe(true);
      expect(monitor.metrics.get('test-operation')).toHaveLength(1);
    });

    test('should accumulate multiple metrics for same operation', () => {
      monitor.start('repeated-operation');
      monitor.end('repeated-operation');
      monitor.start('repeated-operation');
      monitor.end('repeated-operation');

      expect(monitor.metrics.get('repeated-operation')).toHaveLength(2);
    });

    test('should remove timer after ending', () => {
      monitor.start('test-operation');
      monitor.end('test-operation');

      expect(monitor.timers.has('test-operation')).toBe(false);
    });

    test('should log warning for slow operations', async () => {
      // Override threshold for testing
      monitor.thresholds.slow = 10;

      monitor.start('slow-operation');
      await new Promise(resolve => setTimeout(resolve, 20));
      monitor.end('slow-operation');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation')
      );
    });

    test('should not log warning for fast operations', () => {
      monitor.start('fast-operation');
      monitor.end('fast-operation');

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('getPerformanceStatus()', () => {
    test('should return "good" for fast operations', () => {
      const status = monitor.getPerformanceStatus(500);
      expect(status).toBe('good');
    });

    test('should return "slow" for operations over 1 second', () => {
      const status = monitor.getPerformanceStatus(1500);
      expect(status).toBe('slow');
    });

    test('should return "very_slow" for operations over 5 seconds', () => {
      const status = monitor.getPerformanceStatus(6000);
      expect(status).toBe('very_slow');
    });

    test('should return "critical" for operations over 10 seconds', () => {
      const status = monitor.getPerformanceStatus(12000);
      expect(status).toBe('critical');
    });
  });

  describe('getStats()', () => {
    test('should return null for non-existent operation', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeNull();
    });

    test('should calculate basic statistics', () => {
      // Add mock metrics directly
      monitor.metrics.set('test-op', [
        { duration: 100 },
        { duration: 200 },
        { duration: 300 }
      ]);

      const stats = monitor.getStats('test-op');

      expect(stats.operation).toBe('test-op');
      expect(stats.count).toBe(3);
      expect(stats.average).toBe(200);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(300);
    });

    test('should calculate median for odd number of values', () => {
      monitor.metrics.set('test-op', [
        { duration: 100 },
        { duration: 200 },
        { duration: 300 }
      ]);

      const stats = monitor.getStats('test-op');
      expect(stats.median).toBe(200);
    });

    test('should calculate median for even number of values', () => {
      monitor.metrics.set('test-op', [
        { duration: 100 },
        { duration: 200 },
        { duration: 300 },
        { duration: 400 }
      ]);

      const stats = monitor.getStats('test-op');
      expect(stats.median).toBe(250);
    });

    test('should calculate percentiles', () => {
      monitor.metrics.set('test-op', [
        { duration: 100 },
        { duration: 200 },
        { duration: 300 },
        { duration: 400 },
        { duration: 500 }
      ]);

      const stats = monitor.getStats('test-op');
      expect(stats.p95).toBeDefined();
      expect(stats.p99).toBeDefined();
    });
  });

  describe('calculateMedian()', () => {
    test('should calculate median of sorted values', () => {
      const median = monitor.calculateMedian([1, 2, 3, 4, 5]);
      expect(median).toBe(3);
    });

    test('should calculate median of unsorted values', () => {
      const median = monitor.calculateMedian([5, 1, 3, 2, 4]);
      expect(median).toBe(3);
    });

    test('should handle even-length arrays', () => {
      const median = monitor.calculateMedian([1, 2, 3, 4]);
      expect(median).toBe(3); // Average of 2 and 3, rounded
    });

    test('should handle single value', () => {
      const median = monitor.calculateMedian([42]);
      expect(median).toBe(42);
    });
  });

  describe('calculatePercentile()', () => {
    test('should calculate 95th percentile', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const p95 = monitor.calculatePercentile(values, 95);
      expect(p95).toBeGreaterThan(90);
    });

    test('should calculate 99th percentile', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const p99 = monitor.calculatePercentile(values, 99);
      expect(p99).toBeGreaterThan(95);
    });

    test('should handle small arrays', () => {
      const p95 = monitor.calculatePercentile([1, 2, 3], 95);
      expect(p95).toBe(3);
    });
  });

  describe('getAllStats()', () => {
    test('should return stats for all operations', () => {
      monitor.metrics.set('op1', [{ duration: 100 }]);
      monitor.metrics.set('op2', [{ duration: 200 }]);

      const allStats = monitor.getAllStats();

      expect(allStats).toHaveProperty('op1');
      expect(allStats).toHaveProperty('op2');
      expect(allStats.op1.average).toBe(100);
      expect(allStats.op2.average).toBe(200);
    });

    test('should return empty object when no metrics', () => {
      const allStats = monitor.getAllStats();
      expect(allStats).toEqual({});
    });
  });

  describe('generateReport()', () => {
    test('should generate comprehensive performance report', () => {
      monitor.start('test-op');
      monitor.end('test-op');

      const report = monitor.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalOperations).toBe(1);
      expect(report.summary.totalMeasurements).toBe(1);
      expect(report.operations).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
    });

    test('should include system metrics', () => {
      const report = monitor.generateReport();

      expect(report.systemMetrics.uptime).toBeDefined();
      expect(report.systemMetrics.memory).toBeDefined();
      expect(report.systemMetrics.cpuUsage).toBeDefined();
    });

    test('should count total measurements correctly', () => {
      monitor.start('op1');
      monitor.end('op1');
      monitor.start('op1');
      monitor.end('op1');
      monitor.start('op2');
      monitor.end('op2');

      const report = monitor.generateReport();

      expect(report.summary.totalOperations).toBe(2);
      expect(report.summary.totalMeasurements).toBe(3);
    });
  });

  describe('saveReport()', () => {
    test('should save report to file', () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      monitor.start('test-op');
      monitor.end('test-op');

      const filename = monitor.saveReport();

      expect(mockFsWriteFileSync).toHaveBeenCalled();
      expect(filename).toContain('performance-');
      expect(filename).toContain('.json');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance report saved')
      );
    });

    test('should create directory if it does not exist', () => {
      mockFsExistsSync.mockReturnValue(false);
      mockFsMkdirSync.mockReturnValue(undefined);
      mockFsWriteFileSync.mockReturnValue(undefined);

      monitor.saveReport();

      expect(mockFsMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('performance'),
        expect.objectContaining({ recursive: true })
      );
    });

    test('should accept custom filename', () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      const customFilename = '/custom/path/perf.json';
      const result = monitor.saveReport(customFilename);

      expect(result).toBe(customFilename);
    });
  });

  describe('clear()', () => {
    test('should clear all metrics and timers', () => {
      monitor.start('op1');
      monitor.end('op1');
      monitor.start('op2'); // Started but not ended

      monitor.clear();

      expect(monitor.metrics.size).toBe(0);
      expect(monitor.timers.size).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Performance metrics cleared');
    });
  });

  describe('measure()', () => {
    test('should measure async function execution', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await monitor.measure('test-measure', fn);

      expect(result).toBe('result');
      expect(monitor.metrics.has('test-measure')).toBe(true);
      const metrics = monitor.metrics.get('test-measure');
      expect(metrics[0].success).toBe(true);
    });

    test('should include metadata in measurement', async () => {
      const fn = async () => 'result';
      const metadata = { userId: 123, action: 'test' };

      await monitor.measure('test-measure', fn, metadata);

      const metrics = monitor.metrics.get('test-measure');
      expect(metrics[0].userId).toBe(123);
      expect(metrics[0].action).toBe('test');
    });

    test('should capture errors in measured functions', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      await expect(monitor.measure('error-measure', fn)).rejects.toThrow('Test error');

      const metrics = monitor.metrics.get('error-measure');
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].error).toBe('Test error');
    });

    test('should measure duration even when function fails', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Test error');
      };

      await expect(monitor.measure('failing-measure', fn)).rejects.toThrow();

      const metrics = monitor.metrics.get('failing-measure');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Integration tests', () => {
    test('should track multiple operations over time', async () => {
      await monitor.measure('operation-a', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await monitor.measure('operation-b', async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      await monitor.measure('operation-a', async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
      });

      const statsA = monitor.getStats('operation-a');
      const statsB = monitor.getStats('operation-b');

      expect(statsA.count).toBe(2);
      expect(statsB.count).toBe(1);
      expect(statsA.average).toBeGreaterThan(0);
    });

    test('should handle rapid sequential measurements', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          monitor.measure(`op-${i}`, async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
          })
        );
      }

      await Promise.all(promises);

      expect(monitor.metrics.size).toBe(10);
    });
  });
});
