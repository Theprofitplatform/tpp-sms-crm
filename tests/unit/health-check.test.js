import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock axios
const mockAxiosGet = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockAxiosGet
  }
}));

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
const mockFsUnlinkSync = jest.fn();
const mockFsStatSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    writeFileSync: mockFsWriteFileSync,
    mkdirSync: mockFsMkdirSync,
    unlinkSync: mockFsUnlinkSync,
    statSync: mockFsStatSync
  }
}));

// Dynamic import after mocking
const { HealthCheck } = await import('../../src/monitoring/health-check.js');

describe('Health Check System', () => {
  let healthCheck;

  beforeEach(() => {
    healthCheck = new HealthCheck();
    // Clear all mocks
    mockAxiosGet.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.success.mockClear();
    mockFsExistsSync.mockClear();
    mockFsWriteFileSync.mockClear();
    mockFsMkdirSync.mockClear();
    mockFsUnlinkSync.mockClear();
    mockFsStatSync.mockClear();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(healthCheck.checks).toEqual([]);
      expect(healthCheck.results).toBeDefined();
      expect(healthCheck.results.healthy).toBe(true);
      expect(healthCheck.results.timestamp).toBeDefined();
      expect(healthCheck.results.checks).toEqual({});
    });

    test('should include uptime in results', () => {
      expect(healthCheck.results.uptime).toBeDefined();
      expect(typeof healthCheck.results.uptime).toBe('number');
    });

    test('should include memory usage in results', () => {
      expect(healthCheck.results.memory).toBeDefined();
      expect(healthCheck.results.memory.rss).toBeDefined();
      expect(healthCheck.results.memory.heapTotal).toBeDefined();
      expect(healthCheck.results.memory.heapUsed).toBeDefined();
    });
  });

  describe('getMemoryUsage()', () => {
    test('should return memory usage statistics', () => {
      const memUsage = healthCheck.getMemoryUsage();

      expect(memUsage).toHaveProperty('rss');
      expect(memUsage).toHaveProperty('heapTotal');
      expect(memUsage).toHaveProperty('heapUsed');
      expect(memUsage).toHaveProperty('external');
    });

    test('should format memory values in MB', () => {
      const memUsage = healthCheck.getMemoryUsage();

      expect(memUsage.rss).toMatch(/\d+MB$/);
      expect(memUsage.heapTotal).toMatch(/\d+MB$/);
      expect(memUsage.heapUsed).toMatch(/\d+MB$/);
    });
  });

  describe('checkWordPressAPI()', () => {
    test('should return true when WordPress API is healthy', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        headers: { 'x-response-time': '120ms' },
        data: [{ id: 1, title: { rendered: 'Test' } }]
      });

      const result = await healthCheck.checkWordPressAPI();

      expect(result).toBe(true);
      expect(healthCheck.results.checks.wordpress_api).toBeDefined();
      expect(healthCheck.results.checks.wordpress_api.status).toBe('healthy');
      expect(healthCheck.results.checks.wordpress_api.statusCode).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('WordPress API health check'));
    });

    test('should return false when WordPress API fails', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await healthCheck.checkWordPressAPI();

      expect(result).toBe(false);
      expect(healthCheck.results.healthy).toBe(false);
      expect(healthCheck.results.checks.wordpress_api.status).toBe('unhealthy');
      expect(healthCheck.results.checks.wordpress_api.error).toBe('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxiosGet.mockRejectedValueOnce(timeoutError);

      const result = await healthCheck.checkWordPressAPI();

      expect(result).toBe(false);
      expect(healthCheck.results.checks.wordpress_api.code).toBe('ECONNABORTED');
    });

    test('should handle missing WordPress URL configuration', async () => {
      const { config } = await import('../../config/env/config.js');
      const originalUrl = config.wordpress?.url;

      // Temporarily remove WordPress URL
      if (config.wordpress) {
        config.wordpress.url = undefined;
      }

      const result = await healthCheck.checkWordPressAPI();

      expect(result).toBe(false);
      expect(healthCheck.results.checks.wordpress_api.status).toBe('unhealthy');
      expect(healthCheck.results.checks.wordpress_api.error).toContain('WordPress URL not configured');

      // Restore original URL
      if (config.wordpress) {
        config.wordpress.url = originalUrl;
      }
    });

    test('should call WordPress API with correct parameters', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: []
      });

      await healthCheck.checkWordPressAPI();

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining('/wp-json/wp/v2/posts'),
        expect.objectContaining({
          params: { per_page: 1 },
          timeout: 5000
        })
      );
    });
  });

  describe('checkFilesystem()', () => {
    test('should return true when filesystem is accessible', async () => {
      mockFsExistsSync.mockReturnValue(true);

      const result = await healthCheck.checkFilesystem();

      expect(result).toBe(true);
      expect(healthCheck.results.checks.filesystem).toBeDefined();
      expect(healthCheck.results.checks.filesystem.status).toBe('healthy');
    });

    test('should return false when filesystem check fails', async () => {
      mockFsExistsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await healthCheck.checkFilesystem();

      expect(result).toBe(false);
      expect(healthCheck.results.healthy).toBe(false);
      expect(healthCheck.results.checks.filesystem.status).toBe('unhealthy');
    });

    test('should check logs directory exists', async () => {
      mockFsExistsSync.mockReturnValue(true);

      await healthCheck.checkFilesystem();

      expect(mockFsExistsSync).toHaveBeenCalledWith(expect.stringContaining('logs'));
    });
  });

  describe('toJSON()', () => {
    test('should return JSON representation of health status', () => {
      const jsonString = healthCheck.toJSON();
      const json = JSON.parse(jsonString);

      expect(json).toHaveProperty('healthy');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('checks');
      expect(json).toHaveProperty('uptime');
      expect(json).toHaveProperty('memory');
    });

    test('should reflect failed checks in JSON output', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));

      await healthCheck.checkWordPressAPI();

      const jsonString = healthCheck.toJSON();
      const json = JSON.parse(jsonString);

      expect(json.healthy).toBe(false);
      expect(json.checks.wordpress_api.status).toBe('unhealthy');
    });
  });

  describe('getStatusCode()', () => {
    test('should return 200 when healthy', () => {
      const statusCode = healthCheck.getStatusCode();

      expect(statusCode).toBe(200);
    });

    test('should return 503 when unhealthy', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));

      await healthCheck.checkWordPressAPI();

      const statusCode = healthCheck.getStatusCode();

      expect(statusCode).toBe(503);
    });
  });

  describe('runAll()', () => {
    test('should run all health checks', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: []
      });
      mockFsExistsSync.mockReturnValue(true);

      const results = await healthCheck.runAll();

      expect(results).toBeDefined();
      expect(results.checks).toHaveProperty('wordpress_api');
      expect(results.checks).toHaveProperty('filesystem');
    });

    test('should mark overall health as unhealthy if any check fails', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));
      mockFsExistsSync.mockReturnValue(true);

      const results = await healthCheck.runAll();

      expect(results.healthy).toBe(false);
    });

    test('should continue running checks even if one fails', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));
      mockFsExistsSync.mockReturnValue(true);

      const results = await healthCheck.runAll();

      expect(results.checks.wordpress_api).toBeDefined();
      expect(results.checks.filesystem).toBeDefined();
    });
  });

  describe('checkConfiguration()', () => {
    test('should return true when all required config is present', async () => {
      // Set required environment variables
      process.env.WORDPRESS_URL = 'https://test.com';
      process.env.WORDPRESS_USER = 'user';
      process.env.WORDPRESS_APP_PASSWORD = 'pass';

      const result = await healthCheck.checkConfiguration();

      expect(result).toBe(true);
      expect(healthCheck.results.checks.configuration.status).toBe('healthy');
    });

    test('should return false when required config is missing', async () => {
      // Remove required variables
      delete process.env.WORDPRESS_URL;

      const result = await healthCheck.checkConfiguration();

      expect(result).toBe(false);
      expect(healthCheck.results.checks.configuration.status).toBe('unhealthy');
    });
  });

  describe('checkNodeVersion()', () => {
    test('should return true for supported Node version', async () => {
      const result = await healthCheck.checkNodeVersion();

      expect(result).toBe(true);
      expect(healthCheck.results.checks.node_version.status).toBe('healthy');
    });
  });

  describe('checkDiskSpace()', () => {
    test('should return true when disk space check passes', async () => {
      // Mock fs.statSync to return valid stats
      mockFsStatSync.mockReturnValue({
        isDirectory: () => true,
        size: 1024
      });

      const result = await healthCheck.checkDiskSpace();

      expect(result).toBe(true);
      expect(healthCheck.results.checks.disk_space).toBeDefined();
      expect(healthCheck.results.checks.disk_space.status).toBe('healthy');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Disk space'));
    });

    test('should return false when disk space check fails', async () => {
      mockFsStatSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = await healthCheck.checkDiskSpace();

      expect(result).toBe(false);
      expect(healthCheck.results.healthy).toBe(false);
      expect(healthCheck.results.checks.disk_space.status).toBe('unhealthy');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    test('should handle WordPress API with missing config', async () => {
      // Clear WordPress URL to trigger error
      const originalUrl = process.env.WORDPRESS_URL;
      delete process.env.WORDPRESS_URL;

      const result = await healthCheck.checkWordPressAPI();

      // Should fail when config is missing
      expect(result).toBe(false);

      // Restore
      if (originalUrl) process.env.WORDPRESS_URL = originalUrl;
    });

    test('should handle filesystem check when directory needs creation', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockFsMkdirSync.mockReturnValue(undefined);
      mockFsWriteFileSync.mockReturnValue(undefined);
      mockFsUnlinkSync.mockReturnValue(undefined);

      const result = await healthCheck.checkFilesystem();

      expect(mockFsMkdirSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle multiple consecutive checks', async () => {
      mockAxiosGet.mockResolvedValue({
        status: 200,
        headers: {},
        data: []
      });
      mockFsExistsSync.mockReturnValue(true);
      mockFsStatSync.mockReturnValue({ size: 1024 });

      // Run checks multiple times
      await healthCheck.checkWordPressAPI();
      await healthCheck.checkFilesystem();
      await healthCheck.checkConfiguration();
      await healthCheck.checkDiskSpace();

      const json = JSON.parse(healthCheck.toJSON());

      expect(Object.keys(json.checks).length).toBeGreaterThanOrEqual(4);
    });

    test('should run all checks via runAll() method', async () => {
      mockAxiosGet.mockResolvedValue({
        status: 200,
        headers: {},
        data: []
      });
      mockFsExistsSync.mockReturnValue(true);
      mockFsStatSync.mockReturnValue({ size: 1024 });

      const results = await healthCheck.runAll();

      expect(results).toBeDefined();
      expect(results.checks).toBeDefined();
      expect(Object.keys(results.checks).length).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should fail when Node.js version is too old (lines 161, 173-180)', async () => {
      // Mock process.version to return Node 16
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.20.0',
        writable: true,
        configurable: true
      });

      const result = await healthCheck.checkNodeVersion();

      expect(result).toBe(false);
      expect(healthCheck.results.healthy).toBe(false);
      expect(healthCheck.results.checks.node_version).toBeDefined();
      expect(healthCheck.results.checks.node_version.status).toBe('unhealthy');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Node.js health check'),
        expect.any(String)
      );

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true,
        configurable: true
      });

      // Reset health check state
      healthCheck.results.healthy = true;
    });
  });
});
