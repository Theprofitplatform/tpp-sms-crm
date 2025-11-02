/**
 * Comprehensive Health Check Service
 * Monitors all services (API, Database, Redis, External APIs, Frontend, etc.)
 * Works for both development and production environments
 */

import axios from 'axios';
import Database from 'better-sqlite3';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComprehensiveHealthCheck {
  constructor(options = {}) {
    this.environment = process.env.NODE_ENV || 'development';
    this.apiPort = process.env.API_PORT || process.env.PORT || 4000;
    this.dashboardPort = this.environment === 'production' ? 9000 : 5173;
    this.options = options;

    this.results = {
      status: 'healthy', // 'healthy', 'degraded', 'unhealthy'
      timestamp: new Date().toISOString(),
      environment: this.environment,
      version: '2.0.0',
      uptime: process.uptime(),
      services: {},
      metrics: {},
      dependencies: []
    };
  }

  /**
   * Calculate overall status based on service statuses
   */
  calculateOverallStatus() {
    const services = Object.values(this.results.services);
    const criticalDown = services.filter(s => s.critical && s.status === 'down').length;
    const anyDown = services.filter(s => s.status === 'down').length;

    if (criticalDown > 0) {
      return 'unhealthy';
    } else if (anyDown > 0) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Check API Server Health
   */
  async checkAPIServer() {
    const serviceName = 'api';
    const startTime = Date.now();

    try {
      const response = await axios.get(`http://localhost:${this.apiPort}/health`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'API Server',
        status: response.status === 200 ? 'up' : 'degraded',
        critical: true,
        latency: `${latency}ms`,
        port: this.apiPort,
        url: `http://localhost:${this.apiPort}`,
        details: {
          statusCode: response.status,
          uptime: response.data?.uptime || 'N/A'
        }
      };

      this.results.dependencies.push({
        name: 'API Server',
        required: true,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'API Server',
        status: 'down',
        critical: true,
        error: error.message,
        port: this.apiPort,
        url: `http://localhost:${this.apiPort}`,
        details: {
          code: error.code
        }
      };

      this.results.dependencies.push({
        name: 'API Server',
        required: true,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check Dashboard Frontend Health
   */
  async checkDashboard() {
    const serviceName = 'dashboard';
    const startTime = Date.now();

    try {
      const response = await axios.get(`http://localhost:${this.dashboardPort}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'Dashboard UI',
        status: response.status === 200 ? 'up' : 'degraded',
        critical: true,
        latency: `${latency}ms`,
        port: this.dashboardPort,
        url: `http://localhost:${this.dashboardPort}`,
        details: {
          statusCode: response.status,
          type: this.environment === 'production' ? 'Production Build' : 'Vite Dev Server'
        }
      };

      this.results.dependencies.push({
        name: 'Dashboard UI',
        required: true,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'Dashboard UI',
        status: 'down',
        critical: true,
        error: error.message,
        port: this.dashboardPort,
        url: `http://localhost:${this.dashboardPort}`,
        details: {
          code: error.code
        }
      };

      this.results.dependencies.push({
        name: 'Dashboard UI',
        required: true,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check Database Health (SQLite)
   */
  async checkDatabase() {
    const serviceName = 'database';
    const startTime = Date.now();

    try {
      const dbPath = path.join(process.cwd(), 'data', 'seo-automation.db');

      // Check if database file exists
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file not found');
      }

      // Try to connect and query
      const db = new Database(dbPath, { readonly: true });
      const result = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
      db.close();

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'Database (SQLite)',
        status: 'up',
        critical: true,
        latency: `${latency}ms`,
        details: {
          type: 'SQLite',
          path: dbPath,
          tables: result.count,
          size: `${Math.round(fs.statSync(dbPath).size / 1024)}KB`
        }
      };

      this.results.dependencies.push({
        name: 'SQLite Database',
        required: true,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'Database (SQLite)',
        status: 'down',
        critical: true,
        error: error.message,
        details: {
          type: 'SQLite'
        }
      };

      this.results.dependencies.push({
        name: 'SQLite Database',
        required: true,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check Redis Health (if configured)
   */
  async checkRedis() {
    const serviceName = 'redis';

    // Redis is optional
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      this.results.services[serviceName] = {
        name: 'Redis Cache',
        status: 'not_configured',
        critical: false,
        details: {
          message: 'Redis not configured (optional service)'
        }
      };
      return true;
    }

    const startTime = Date.now();

    try {
      // Try to import redis dynamically
      let redis;
      try {
        redis = await import('redis');
      } catch {
        throw new Error('Redis module not installed');
      }

      const client = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
      });

      await client.connect();
      await client.ping();
      const info = await client.info();
      await client.quit();

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'Redis Cache',
        status: 'up',
        critical: false,
        latency: `${latency}ms`,
        details: {
          connected: true
        }
      };

      this.results.dependencies.push({
        name: 'Redis',
        required: false,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'Redis Cache',
        status: 'down',
        critical: false,
        error: error.message,
        details: {
          message: 'Redis unavailable (optional service)'
        }
      };

      this.results.dependencies.push({
        name: 'Redis',
        required: false,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check Google Search Console Authentication
   */
  async checkGoogleSearchConsole() {
    const serviceName = 'gsc';

    try {
      const tokenPath = path.join(process.cwd(), 'data', 'gsc-token.json');

      if (!fs.existsSync(tokenPath)) {
        this.results.services[serviceName] = {
          name: 'Google Search Console',
          status: 'not_authenticated',
          critical: false,
          details: {
            message: 'Not authenticated - no token found'
          }
        };

        this.results.dependencies.push({
          name: 'Google Search Console',
          required: false,
          status: 'not_authenticated'
        });

        return false;
      }

      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      const expiryDate = new Date(tokenData.expiry_date);
      const isExpired = expiryDate < new Date();

      this.results.services[serviceName] = {
        name: 'Google Search Console',
        status: isExpired ? 'expired' : 'up',
        critical: false,
        details: {
          authenticated: !isExpired,
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry: Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        }
      };

      this.results.dependencies.push({
        name: 'Google Search Console',
        required: false,
        status: isExpired ? 'expired' : 'up'
      });

      return !isExpired;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'Google Search Console',
        status: 'error',
        critical: false,
        error: error.message,
        details: {
          message: 'Error checking GSC authentication'
        }
      };

      this.results.dependencies.push({
        name: 'Google Search Console',
        required: false,
        status: 'error',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check SerpAPI Connectivity
   */
  async checkSerpAPI() {
    const serviceName = 'serpapi';

    if (!process.env.SERPAPI_API_KEY) {
      this.results.services[serviceName] = {
        name: 'SerpAPI',
        status: 'not_configured',
        critical: false,
        details: {
          message: 'API key not configured'
        }
      };
      return false;
    }

    const startTime = Date.now();

    try {
      const response = await axios.get('https://serpapi.com/account', {
        params: {
          api_key: process.env.SERPAPI_API_KEY
        },
        timeout: 5000
      });

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'SerpAPI',
        status: 'up',
        critical: false,
        latency: `${latency}ms`,
        details: {
          quotaUsed: response.data?.total_searches_left || 'N/A',
          planType: response.data?.plan_name || 'Unknown'
        }
      };

      this.results.dependencies.push({
        name: 'SerpAPI',
        required: false,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'SerpAPI',
        status: 'down',
        critical: false,
        error: error.message,
        details: {
          message: 'Unable to connect to SerpAPI'
        }
      };

      this.results.dependencies.push({
        name: 'SerpAPI',
        required: false,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Check WordPress Site(s) Connectivity
   */
  async checkWordPress() {
    const serviceName = 'wordpress';

    if (!process.env.WORDPRESS_URL) {
      this.results.services[serviceName] = {
        name: 'WordPress Sites',
        status: 'not_configured',
        critical: false,
        details: {
          message: 'WordPress URL not configured'
        }
      };
      return false;
    }

    const startTime = Date.now();

    try {
      const response = await axios.head(process.env.WORDPRESS_URL, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const latency = Date.now() - startTime;

      this.results.services[serviceName] = {
        name: 'WordPress Sites',
        status: response.status === 200 ? 'up' : 'degraded',
        critical: false,
        latency: `${latency}ms`,
        details: {
          url: process.env.WORDPRESS_URL,
          statusCode: response.status
        }
      };

      this.results.dependencies.push({
        name: 'WordPress',
        required: false,
        status: 'up'
      });

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'WordPress Sites',
        status: 'down',
        critical: false,
        error: error.message,
        details: {
          url: process.env.WORDPRESS_URL,
          code: error.code
        }
      };

      this.results.dependencies.push({
        name: 'WordPress',
        required: false,
        status: 'down',
        error: error.message
      });

      return false;
    }
  }

  /**
   * Get System Metrics
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    this.results.metrics = {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
        percentUsed: Math.round(((totalMem - freeMem) / totalMem) * 100),
        unit: 'MB'
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg().map(v => Math.round(v * 100) / 100)
      },
      process: {
        uptime: Math.round(process.uptime()),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Check File System Permissions
   */
  async checkFileSystem() {
    const serviceName = 'filesystem';

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const dataDir = path.join(process.cwd(), 'data');

      // Ensure directories exist
      [logsDir, dataDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Try to write test files
      const testFile = path.join(logsDir, '.health-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      this.results.services[serviceName] = {
        name: 'File System',
        status: 'up',
        critical: true,
        details: {
          logsDir: logsDir,
          dataDir: dataDir,
          writable: true
        }
      };

      return true;
    } catch (error) {
      this.results.services[serviceName] = {
        name: 'File System',
        status: 'down',
        critical: true,
        error: error.message,
        details: {
          message: 'Cannot write to file system'
        }
      };

      return false;
    }
  }

  /**
   * Run all health checks
   */
  async runAll() {
    const startTime = Date.now();

    // Run all checks in parallel
    await Promise.allSettled([
      this.checkAPIServer(),
      this.checkDashboard(),
      this.checkDatabase(),
      this.checkRedis(),
      this.checkGoogleSearchConsole(),
      this.checkSerpAPI(),
      this.checkWordPress(),
      this.checkFileSystem()
    ]);

    // Get system metrics
    this.getSystemMetrics();

    // Calculate overall status
    this.results.status = this.calculateOverallStatus();

    // Add execution time
    this.results.checkDuration = `${Date.now() - startTime}ms`;

    return this.results;
  }

  /**
   * Get HTTP status code based on overall health
   */
  getStatusCode() {
    switch (this.results.status) {
      case 'healthy': return 200;
      case 'degraded': return 200; // Still operational
      case 'unhealthy': return 503; // Service unavailable
      default: return 500;
    }
  }
}

export default ComprehensiveHealthCheck;
