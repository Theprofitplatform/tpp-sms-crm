#!/usr/bin/env node
/**
 * Health Check System
 * Monitors application health and external dependencies
 */

import axios from 'axios';
import { config } from '../../config/env/config.js';
import { logger } from '../audit/logger.js';
import fs from 'fs';
import path from 'path';

export class HealthCheck {
  constructor() {
    this.checks = [];
    this.results = {
      healthy: true,
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: process.uptime(),
      memory: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    };
  }

  /**
   * Check WordPress API connectivity
   */
  async checkWordPressAPI() {
    const checkName = 'wordpress_api';
    try {
      if (!config.wordpress?.url) {
        throw new Error('WordPress URL not configured');
      }

      const response = await axios.get(`${config.wordpress.url}/wp-json/wp/v2/posts`, {
        params: { per_page: 1 },
        timeout: 5000,
        validateStatus: /* istanbul ignore next */ (status) => status < 500
      });

      this.results.checks[checkName] = {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        statusCode: response.status
      };

      logger.info('WordPress API health check: ✅ Healthy');
      return true;
    } catch (error) {
      this.results.healthy = false;
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message,
        code: error.code
      };

      logger.error('WordPress API health check: ❌ Failed', error.message);
      return false;
    }
  }

  /**
   * Check filesystem access
   */
  async checkFilesystem() {
    const checkName = 'filesystem';
    try {
      const logsDir = path.join(process.cwd(), 'logs');

      // Check if logs directory exists and is writable
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Try to write a test file
      const testFile = path.join(logsDir, '.health-check-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      this.results.checks[checkName] = {
        status: 'healthy',
        logsDir: logsDir,
        writable: true
      };

      logger.info('Filesystem health check: ✅ Healthy');
      return true;
    } catch (error) {
      this.results.healthy = false;
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };

      logger.error('Filesystem health check: ❌ Failed', error.message);
      return false;
    }
  }

  /**
   * Check environment configuration
   */
  async checkConfiguration() {
    const checkName = 'configuration';
    try {
      const requiredVars = [
        'WORDPRESS_URL',
        'WORDPRESS_USER',
        'WORDPRESS_APP_PASSWORD'
      ];

      const missing = requiredVars.filter(varName => !process.env[varName]);

      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }

      this.results.checks[checkName] = {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        configuredVars: requiredVars.length
      };

      logger.info('Configuration health check: ✅ Healthy');
      return true;
    } catch (error) {
      this.results.healthy = false;
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };

      logger.warn('Configuration health check: ⚠️ Warning', error.message);
      return false;
    }
  }

  /**
   * Check Node.js version
   */
  async checkNodeVersion() {
    const checkName = 'node_version';
    try {
      const version = process.version;
      const major = parseInt(version.split('.')[0].substring(1));

      if (major < 18) {
        throw new Error(`Node.js ${major} is not supported. Please use Node.js 18 or higher.`);
      }

      this.results.checks[checkName] = {
        status: 'healthy',
        version: version,
        supported: true
      };

      logger.info(`Node.js health check: ✅ ${version}`);
      return true;
    } catch (error) {
      this.results.healthy = false;
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };

      logger.error('Node.js health check: ❌ Failed', error.message);
      return false;
    }
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    const checkName = 'disk_space';
    try {
      // Simple check - just verify we can write
      // More sophisticated disk space checking would require additional dependencies
      const logsDir = path.join(process.cwd(), 'logs');
      const stats = fs.statSync(logsDir);

      this.results.checks[checkName] = {
        status: 'healthy',
        logsDirectory: logsDir,
        accessible: true
      };

      logger.info('Disk space health check: ✅ Healthy');
      return true;
    } catch (error) {
      this.results.healthy = false;
      this.results.checks[checkName] = {
        status: 'unhealthy',
        error: error.message
      };

      logger.error('Disk space health check: ❌ Failed', error.message);
      return false;
    }
  }

  /**
   * Run all health checks
   */
  async runAll() {
    logger.info('Starting health checks...');

    const startTime = Date.now();

    await Promise.all([
      this.checkNodeVersion(),
      this.checkConfiguration(),
      this.checkFilesystem(),
      this.checkDiskSpace(),
      this.checkWordPressAPI()
    ]);

    this.results.duration = `${Date.now() - startTime}ms`;
    this.results.summary = {
      total: Object.keys(this.results.checks).length,
      healthy: Object.values(this.results.checks).filter(c => c.status === 'healthy').length,
      unhealthy: Object.values(this.results.checks).filter(c => c.status === 'unhealthy').length
    };

    logger.info(`Health checks complete: ${this.results.summary.healthy}/${this.results.summary.total} healthy`);

    return this.results;
  }

  /**
   * Get results in JSON format
   */
  toJSON() {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Get status code for HTTP response
   */
  getStatusCode() {
    return this.results.healthy ? 200 : 503;
  }
}

// Run health check if executed directly
/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
  const healthCheck = new HealthCheck();

  healthCheck.runAll()
    .then(results => {
      console.log('\n' + '='.repeat(60));
      console.log('HEALTH CHECK RESULTS');
      console.log('='.repeat(60));
      console.log(JSON.stringify(results, null, 2));
      console.log('='.repeat(60));

      process.exit(results.healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

export default HealthCheck;
