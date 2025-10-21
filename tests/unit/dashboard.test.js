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

// Mock HealthCheck
class MockHealthCheck {
  constructor() {
    this.results = {
      healthy: true,
      checks: {},
      duration: '123ms'
    };
  }

  async runAll() {
    return {
      healthy: true,
      duration: '123ms',
      checks: {
        wordpress_api: { status: 'healthy' },
        config: { status: 'healthy' },
        filesystem: { status: 'healthy' },
        node_version: { status: 'healthy' }
      }
    };
  }
}

jest.unstable_mockModule('../../src/monitoring/health-check.js', () => ({
  default: MockHealthCheck
}));

// Mock PerformanceMonitor
const mockPerformanceMonitor = {
  getAllStats: jest.fn(() => ({})),
  getStats: jest.fn(),
  generateReport: jest.fn(),
  saveReport: jest.fn()
};

jest.unstable_mockModule('../../src/monitoring/performance-monitor.js', () => ({
  performanceMonitor: mockPerformanceMonitor
}));

// Mock ErrorTracker
const mockErrorTracker = {
  getStats: jest.fn(() => ({
    total: 0,
    byType: {},
    mostCommon: [],
    recent: []
  })),
  generateReport: jest.fn(),
  saveReport: jest.fn()
};

jest.unstable_mockModule('../../src/monitoring/error-tracker.js', () => ({
  errorTracker: mockErrorTracker
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
  },
  existsSync: mockFsExistsSync,
  writeFileSync: mockFsWriteFileSync,
  mkdirSync: mockFsMkdirSync
}));

// Mock path
jest.unstable_mockModule('path', () => ({
  default: {
    join: (...args) => args.join('/')
  },
  join: (...args) => args.join('/')
}));

// Dynamic import after mocking
const { MonitoringDashboard } = await import('../../src/monitoring/dashboard.js');

describe('Monitoring Dashboard', () => {
  let dashboard;
  let consoleLogSpy;

  beforeEach(() => {
    dashboard = new MonitoringDashboard();

    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Clear all mocks
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.success.mockClear();
    mockPerformanceMonitor.getAllStats.mockClear();
    mockPerformanceMonitor.getStats.mockClear();
    mockErrorTracker.getStats.mockClear();
    mockFsExistsSync.mockClear();
    mockFsWriteFileSync.mockClear();
    mockFsMkdirSync.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Constructor', () => {
    test('should initialize with health check instance', () => {
      expect(dashboard.healthCheck).toBeDefined();
      expect(dashboard.healthCheck).toBeInstanceOf(MockHealthCheck);
    });

    test('should initialize with performance monitor', () => {
      expect(dashboard.performanceMonitor).toBeDefined();
      expect(dashboard.performanceMonitor).toBe(mockPerformanceMonitor);
    });

    test('should initialize with error tracker', () => {
      expect(dashboard.errorTracker).toBeDefined();
      expect(dashboard.errorTracker).toBe(mockErrorTracker);
    });
  });

  describe('runCheck()', () => {
    test('should run all monitoring checks and return results', async () => {
      mockPerformanceMonitor.getAllStats.mockReturnValue({});
      mockErrorTracker.getStats.mockReturnValue({
        total: 0,
        byType: {},
        mostCommon: [],
        recent: []
      });

      const result = await dashboard.runCheck();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('system');
    });

    test('should display dashboard header', async () => {
      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('MONITORING DASHBOARD'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Timestamp:'));
    });

    test('should display health check results', async () => {
      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('HEALTH CHECKS'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('HEALTHY'));
    });

    test('should display individual check statuses with checkmarks', async () => {
      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('WORDPRESS API'));
    });

    test('should display error icon for unhealthy checks', async () => {
      // Override healthCheck to return unhealthy result
      dashboard.healthCheck.runAll = jest.fn(async () => ({
        healthy: false,
        duration: '100ms',
        checks: {
          wordpress_api: { status: 'unhealthy', error: 'Connection failed' }
        }
      }));

      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Connection failed'));
    });

    test('should display performance metrics when available', async () => {
      mockPerformanceMonitor.getAllStats.mockReturnValue({
        'test-operation': {
          count: 10,
          average: 150,
          min: 100,
          max: 200,
          p95: 190,
          p99: 195
        }
      });

      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PERFORMANCE METRICS'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-operation'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Count: 10'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Average: 150ms'));
    });

    test('should display message when no performance data collected', async () => {
      mockPerformanceMonitor.getAllStats.mockReturnValue({});

      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith('No performance data collected yet');
    });

    test('should display error tracking statistics', async () => {
      mockErrorTracker.getStats.mockReturnValue({
        total: 5,
        byType: {
          Error: 3,
          TypeError: 2
        },
        mostCommon: [
          { error: 'Error:Test error', count: 3, percentage: 60 }
        ],
        recent: [
          { timestamp: '2025-10-19T10:00:00Z', type: 'Error', message: 'Test error' }
        ]
      });

      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR TRACKING'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total Errors: 5'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error: 3'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TypeError: 2'));
    });

    test('should display message when no errors tracked', async () => {
      mockErrorTracker.getStats.mockReturnValue({
        total: 0,
        byType: {},
        mostCommon: [],
        recent: []
      });

      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith('✅ No errors tracked');
    });

    test('should display system metrics', async () => {
      await dashboard.runCheck();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('SYSTEM METRICS'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Node Version:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Platform:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Uptime:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Memory Usage:'));
    });

    test('should include system info in return value', async () => {
      const result = await dashboard.runCheck();

      expect(result.system).toBeDefined();
      expect(result.system.nodeVersion).toBe(process.version);
      expect(result.system.platform).toBe(process.platform);
      expect(result.system.uptime).toBeDefined();
      expect(result.system.memory).toBeDefined();
    });
  });

  describe('generateReport()', () => {
    test('should generate comprehensive report', async () => {
      const report = await dashboard.generateReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.health).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.errors).toBeDefined();
      expect(report.system).toBeDefined();
    });

    test('should include ISO timestamp', async () => {
      const report = await dashboard.generateReport();

      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should call runCheck internally', async () => {
      const runCheckSpy = jest.spyOn(dashboard, 'runCheck');

      await dashboard.generateReport();

      expect(runCheckSpy).toHaveBeenCalled();
    });
  });

  describe('saveReport()', () => {
    test('should save report to file', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      const filename = await dashboard.saveReport();

      expect(mockFsWriteFileSync).toHaveBeenCalled();
      expect(filename).toContain('monitoring-');
      expect(filename).toContain('.json');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring report saved')
      );
    });

    test('should create directory if it does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockFsMkdirSync.mockReturnValue(undefined);
      mockFsWriteFileSync.mockReturnValue(undefined);

      await dashboard.saveReport();

      expect(mockFsMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('monitoring'),
        expect.objectContaining({ recursive: true })
      );
    });

    test('should accept custom filename', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      const customFilename = '/custom/path/report.json';
      const result = await dashboard.saveReport(customFilename);

      expect(result).toBe(customFilename);
    });

    test('should write JSON report with proper formatting', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      await dashboard.saveReport();

      expect(mockFsWriteFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"timestamp"')
      );
    });
  });

  describe('startContinuous()', () => {
    let setIntervalSpy;
    let clearIntervalSpy;

    beforeEach(() => {
      setIntervalSpy = jest.spyOn(global, 'setInterval');
      clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    });

    afterEach(() => {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    test('should set up interval for continuous monitoring', () => {
      dashboard.startContinuous(5000);

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5000
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting continuous monitoring')
      );
    });

    test('should use default interval of 60 seconds', () => {
      dashboard.startContinuous();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        60000
      );
    });

    test('should display interval in seconds', () => {
      dashboard.startContinuous(30000);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('30s interval')
      );
    });

    test('should display stop instructions', () => {
      dashboard.startContinuous();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Press Ctrl+C to stop')
      );
    });
  });

  describe('Integration scenarios', () => {
    test('should handle dashboard with all systems healthy', async () => {
      mockPerformanceMonitor.getAllStats.mockReturnValue({
        'audit-posts': { count: 5, average: 200, min: 150, max: 250, p95: 240, p99: 245 }
      });
      mockErrorTracker.getStats.mockReturnValue({
        total: 0,
        byType: {},
        mostCommon: [],
        recent: []
      });

      const result = await dashboard.runCheck();

      expect(result.health.healthy).toBe(true);
      expect(result.errors.total).toBe(0);
      expect(Object.keys(result.performance).length).toBeGreaterThan(0);
    });

    test('should handle dashboard with errors present', async () => {
      mockPerformanceMonitor.getAllStats.mockReturnValue({});
      mockErrorTracker.getStats.mockReturnValue({
        total: 10,
        byType: { Error: 7, TypeError: 3 },
        mostCommon: [{ error: 'Error:API timeout', count: 7, percentage: 70 }],
        recent: [
          { timestamp: '2025-10-19T10:00:00Z', type: 'Error', message: 'API timeout' }
        ]
      });

      const result = await dashboard.runCheck();

      expect(result.errors.total).toBe(10);
      expect(result.errors.byType.Error).toBe(7);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total Errors: 10'));
    });

    test('should handle complete monitoring cycle', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsWriteFileSync.mockReturnValue(undefined);

      // Run full cycle: check -> generate -> save
      const checkResult = await dashboard.runCheck();
      const report = await dashboard.generateReport();
      const filename = await dashboard.saveReport();

      expect(checkResult).toBeDefined();
      expect(report).toBeDefined();
      expect(filename).toBeDefined();
      expect(mockFsWriteFileSync).toHaveBeenCalled();
    });
  });
});
