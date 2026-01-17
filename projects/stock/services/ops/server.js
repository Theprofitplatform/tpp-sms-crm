/**
 * Ops Service - Stock Trading Automation System
 *
 * Central operations service for monitoring, alerts, and job scheduling.
 *
 * Usage:
 *   npm start           # Production
 *   npm run dev         # Development with auto-reload
 *
 * Endpoints:
 *   GET /health         - Health check
 *   GET /api/v1/status  - System status
 *   POST /api/v1/mode/switch - Switch trading mode
 *   GET /api/v1/alerts  - Get alerts
 *   POST /api/v1/jobs   - Submit a job
 *   GET /api/v1/metrics - Prometheus metrics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

import { Database } from './database/db.js';
import { JobQueue } from './queue/job-queue.js';
import healthRoutes from './api/routes/health.js';
import modeRoutes from './api/routes/mode.js';
import alertRoutes from './api/routes/alerts.js';
import jobRoutes from './api/routes/jobs.js';
import settingsRoutes from './api/routes/settings.js';

// Configure logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
  ],
});

// Environment configuration
const config = {
  port: parseInt(process.env.PORT || '5100', 10),
  env: process.env.NODE_ENV || 'development',
  sqliteDbPath: process.env.SQLITE_DB_PATH || './data/stock.db',
  services: {
    data: process.env.DATA_SERVICE_URL || 'http://localhost:5101',
    signal: process.env.SIGNAL_SERVICE_URL || 'http://localhost:5102',
    risk: process.env.RISK_SERVICE_URL || 'http://localhost:5103',
    execution: process.env.EXECUTION_SERVICE_URL || 'http://localhost:5104',
  },
  notifications: {
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
  },
  prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
};

// Initialize Prometheus metrics
if (config.prometheusEnabled) {
  collectDefaultMetrics();
}

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

const tradingModeGauge = new Gauge({
  name: 'trading_mode',
  help: 'Current trading mode (0=BACKTEST, 1=PAPER, 2=LIVE)',
});

const killSwitchGauge = new Gauge({
  name: 'kill_switch_active',
  help: 'Kill switch status (0=inactive, 1=active)',
});

const jobsProcessedCounter = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['type', 'status'],
});

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status: res.statusCode },
      duration
    );
  });
  next();
});

// Initialize database and job queue
let db;
let jobQueue;

async function initializeServices() {
  logger.info('Initializing services...', { dbPath: config.sqliteDbPath });

  // Initialize SQLite database
  db = new Database(config.sqliteDbPath);

  // Initialize job queue
  jobQueue = new JobQueue(db, {
    onJobComplete: (job) => {
      jobsProcessedCounter.inc({ type: job.type, status: 'completed' });
      logger.info('Job completed', { jobId: job.id, type: job.type });
    },
    onJobFailed: (job, error) => {
      jobsProcessedCounter.inc({ type: job.type, status: 'failed' });
      logger.error('Job failed', { jobId: job.id, type: job.type, error: error.message });
    },
  });

  // Make database and job queue available to routes
  app.locals.db = db;
  app.locals.jobQueue = jobQueue;
  app.locals.config = config;
  app.locals.logger = logger;

  logger.info('Services initialized');
}

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/mode', modeRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/settings', settingsRoutes);

// System status endpoint
app.get('/api/v1/status', async (req, res) => {
  const serviceHealth = {};

  // Check each service
  for (const [name, url] of Object.entries(config.services)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      serviceHealth[name] = {
        status: response.data.status || 'healthy',
        url,
      };
    } catch (error) {
      serviceHealth[name] = {
        status: 'unreachable',
        url,
        error: error.message,
      };
    }
  }

  // Get mode state from database
  let modeState = { mode: 'BACKTEST', kill_switch_active: 0 };
  try {
    const row = db.db.prepare('SELECT * FROM mode_state WHERE id = 1').get();
    if (row) {
      modeState = row;
    }
  } catch (error) {
    logger.warn('Could not get mode state', { error: error.message });
  }

  // Update Prometheus gauges
  const modeMap = { BACKTEST: 0, PAPER: 1, LIVE: 2 };
  tradingModeGauge.set(modeMap[modeState.mode] || 0);
  killSwitchGauge.set(modeState.kill_switch_active ? 1 : 0);

  res.json({
    timestamp: new Date().toISOString(),
    trading_mode: modeState.mode,
    kill_switch_active: Boolean(modeState.kill_switch_active),
    services: serviceHealth,
    overall_status: Object.values(serviceHealth).every(s => s.status === 'healthy')
      ? 'healthy'
      : 'degraded',
  });
});

// Prometheus metrics endpoint
app.get('/api/v1/metrics', async (req, res) => {
  if (!config.prometheusEnabled) {
    return res.status(404).json({ error: 'Metrics disabled' });
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    await initializeServices();

    app.listen(config.port, () => {
      logger.info(`Ops Service started`, {
        port: config.port,
        env: config.env,
        prometheus: config.prometheusEnabled,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  if (db) {
    db.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  if (db) {
    db.close();
  }
  process.exit(0);
});

start();
