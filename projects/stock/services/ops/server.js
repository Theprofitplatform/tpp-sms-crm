/**
 * Ops Service - Stock Trading Automation System
 *
 * Central operations service for monitoring, alerts, and job scheduling.
 * Includes the outbox dispatcher for reliable event-driven communication.
 *
 * Usage:
 *   npm start           # Production
 *   npm run dev         # Development with auto-reload
 *
 * Endpoints:
 *   GET  /health                    - Health check
 *   GET  /api/v1/status             - System status
 *   POST /api/v1/mode/switch        - Switch trading mode
 *   GET  /api/v1/alerts             - Get alerts
 *   POST /api/v1/jobs               - Submit a job
 *   GET  /api/v1/metrics            - Prometheus metrics
 *   GET  /api/v1/outbox/status      - Outbox dispatcher status
 *   GET  /api/v1/outbox/dead-letter - Dead letter events
 *   POST /api/v1/outbox/retry/:id   - Retry dead letter event
 *   POST /api/v1/events/publish     - Publish event to outbox
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

import { Database } from './database/db.js';
import { createPool, closePool } from './database/postgres.js';
import { JobQueue } from './queue/job-queue.js';
import { OutboxDispatcher } from './outbox/dispatcher.js';
import { OutboxPublisher } from './outbox/publisher.js';
import healthRoutes from './api/routes/health.js';
import modeRoutes from './api/routes/mode.js';
import alertRoutes from './api/routes/alerts.js';
import jobRoutes from './api/routes/jobs.js';
import settingsRoutes from './api/routes/settings.js';
import outboxRoutes from './api/routes/outbox.js';
import eventsRoutes from './api/routes/events.js';
import armingRoutes from './api/routes/arming.js';
import configRoutes from './api/routes/config.js';
import reportsRoutes from './api/routes/reports.js';
import reconciliationRoutes from './api/routes/reconciliation.js';
import corporateActionsRoutes from './api/routes/corporate-actions.js';
import notificationRoutes from './api/routes/notifications.js';
import { ArmingManager } from './arming/arming.js';
import { ConfigVersionManager } from './config/versioning.js';
import { DailyReportGenerator } from './jobs/daily-report.js';
import { ReconciliationJob } from './jobs/reconciliation.js';
import { CorporateActionsJob } from './jobs/corporate-actions.js';
import { AlertManager } from './alerting/index.js';
import { CriticalAlertHandler } from './alerts/critical_alerts.js';
import { AlertHealthCheckJob } from './jobs/alert-health-check.js';
import { SignalGenerationJob } from './jobs/signal-generation.js';
import { PositionMonitorJob } from './jobs/position-monitor.js';
import { NotificationService, AlertTypes } from './notifications/index.js';
import { WebSocketBroadcaster, broadcast } from './websocket/server.js';

// Authentication and rate limiting middleware
import {
  ApiKeyManager,
  createAuthMiddleware,
  requireRole,
  createOptionalAuthMiddleware,
} from './middleware/auth.js';
import {
  createRateLimiter,
  createRateLimitMiddleware,
  createRateLimitStatusHandler,
} from './middleware/rate-limit.js';

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
  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false', // Default to enabled
    allowEmergencyAccess: process.env.AUTH_ALLOW_EMERGENCY === 'true',
    emergencyToken: process.env.EMERGENCY_ACCESS_TOKEN,
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false', // Default to enabled
  },
  prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
  outbox: {
    enabled: process.env.OUTBOX_ENABLED !== 'false',
    pollInterval: parseInt(process.env.OUTBOX_POLL_INTERVAL || '1000', 10),
    maxConcurrent: parseInt(process.env.OUTBOX_MAX_CONCURRENT || '5', 10),
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10),
    autoStart: process.env.OUTBOX_AUTO_START !== 'false',
  },
  alerting: {
    enabled: process.env.ALERTING_ENABLED !== 'false',
    channels: {
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        criticalWebhookUrl: process.env.DISCORD_CRITICAL_WEBHOOK_URL,
      },
      email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL_TO,
      },
      sms: {
        twilioSid: process.env.TWILIO_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_FROM_NUMBER,
        to: process.env.ALERT_SMS_TO,
      },
      pagerduty: {
        routingKey: process.env.PAGERDUTY_ROUTING_KEY,
      },
    },
    escalation: {
      enabled: process.env.ALERT_ESCALATION_ENABLED !== 'false',
      smsDelayMinutes: parseInt(process.env.ALERT_SMS_DELAY_MINUTES || '5', 10),
      pagerdutyDelayMinutes: parseInt(process.env.ALERT_PAGERDUTY_DELAY_MINUTES || '15', 10),
    },
  },
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Emergency-Token']
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

// Initialize database, job queue, outbox, arming, config versioning, auth, reconciliation, and corporate actions
let db;
let jobQueue;
let pgPool;
let outboxDispatcher;
let outboxPublisher;
let armingManager;
let configVersionManager;
let reconciliationJob;
let corporateActionsJob;
let apiKeyManager;
let rateLimiter;
let alertManager;
let criticalAlertHandler;
let alertHealthCheckJob;
let signalGenerationJob;
let positionMonitorJob;
let notificationService;

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

  // Initialize API Key Manager (for authentication)
  if (config.auth.enabled) {
    try {
      apiKeyManager = new ApiKeyManager(db, logger);
      apiKeyManager.initialize();
      app.locals.apiKeyManager = apiKeyManager;
      logger.info('API key manager initialized');
    } catch (error) {
      logger.warn('Failed to initialize API key manager', { error: error.message });
    }
  } else {
    logger.info('Authentication disabled by configuration');
  }

  // Initialize Rate Limiter
  if (config.rateLimit.enabled) {
    rateLimiter = createRateLimiter();
    app.locals.rateLimiter = rateLimiter;
    logger.info('Rate limiter initialized');
  } else {
    logger.info('Rate limiting disabled by configuration');
  }

  // Make database and job queue available to routes
  app.locals.db = db;
  app.locals.jobQueue = jobQueue;
  app.locals.config = config;
  app.locals.logger = logger;

  // Initialize Config Version Manager
  try {
    configVersionManager = new ConfigVersionManager(db, logger, config.configDir || './config');
    await configVersionManager.initialize();
    app.locals.configVersionManager = configVersionManager;
    logger.info('Config version manager initialized', {
      currentVersion: configVersionManager.getCurrentVersion()?.id,
    });
  } catch (error) {
    logger.warn('Failed to initialize config version manager', { error: error.message });
  }

  // Initialize Arming Manager
  try {
    armingManager = new ArmingManager(db, logger);
    await armingManager.initialize();
    app.locals.armingManager = armingManager;
    logger.info('Arming manager initialized', {
      armed: armingManager.isArmed(),
      liveEnabled: armingManager.isLiveEnabled(),
    });
  } catch (error) {
    logger.warn('Failed to initialize arming manager', { error: error.message });
  }

  // Initialize PostgreSQL pool for outbox (if enabled)
  if (config.outbox.enabled) {
    try {
      pgPool = await createPool();
      logger.info('PostgreSQL pool initialized for outbox');

      // Initialize outbox dispatcher
      outboxDispatcher = new OutboxDispatcher(pgPool, {
        pollInterval: config.outbox.pollInterval,
        maxConcurrent: config.outbox.maxConcurrent,
        batchSize: config.outbox.batchSize,
        serviceUrls: {
          ops: `http://localhost:${config.port}`,
          ...config.services,
        },
        logger,
      });

      // Initialize outbox publisher
      outboxPublisher = new OutboxPublisher(pgPool, {
        logger,
        sourceService: 'ops',
      });

      // Make outbox components available to routes
      app.locals.outboxDispatcher = outboxDispatcher;
      app.locals.outboxPublisher = outboxPublisher;

      // Auto-start dispatcher if configured
      if (config.outbox.autoStart) {
        outboxDispatcher.start();
        logger.info('Outbox dispatcher auto-started');
      }
    } catch (error) {
      logger.warn('Failed to initialize outbox system', { error: error.message });
      logger.warn('Outbox features will be disabled');
    }
  } else {
    logger.info('Outbox system disabled by configuration');
  }

  // Initialize Alert Manager
  if (config.alerting.enabled) {
    try {
      alertManager = new AlertManager({
        db,
        pgPool,
        logger,
        channels: config.alerting.channels,
        escalation: config.alerting.escalation,
      });
      await alertManager.initialize();
      app.locals.alertManager = alertManager;
      logger.info('Alert manager initialized', {
        channels: {
          discord: !!config.alerting.channels.discord.webhookUrl,
          email: !!config.alerting.channels.email.host,
          sms: !!config.alerting.channels.sms.twilioSid,
          pagerduty: !!config.alerting.channels.pagerduty.routingKey,
        },
        escalation: config.alerting.escalation.enabled,
      });
    } catch (error) {
      logger.warn('Failed to initialize alert manager', { error: error.message });
      logger.warn('Alerting features will be limited');
    }
  } else {
    logger.info('Alerting system disabled by configuration');
  }

  // Initialize Critical Alert Handler (direct alerts bypassing Alertmanager)
  try {
    criticalAlertHandler = new CriticalAlertHandler({
      logger,
      discord: {
        webhookUrl: config.alerting.channels.discord.webhookUrl,
        criticalWebhookUrl: config.alerting.channels.discord.criticalWebhookUrl,
      },
      sms: config.alerting.channels.sms,
      pagerduty: config.alerting.channels.pagerduty,
      fallbackLogDir: process.env.CRITICAL_ALERTS_LOG_DIR || './data/critical_alerts',
    });
    app.locals.criticalAlertHandler = criticalAlertHandler;
    logger.info('Critical alert handler initialized');
  } catch (error) {
    logger.warn('Failed to initialize critical alert handler', { error: error.message });
  }

  // Initialize Alert Health Check Job
  if (process.env.ALERT_HEALTH_CHECK_ENABLED !== 'false') {
    try {
      alertHealthCheckJob = new AlertHealthCheckJob({
        logger,
        alertManager,
        criticalAlertHandler,
        alertmanagerUrl: process.env.ALERTMANAGER_URL || 'http://localhost:9093',
        prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
        discordWebhookUrl: config.alerting.channels.discord.webhookUrl,
        checkIntervalMs: parseInt(process.env.ALERT_HEALTH_CHECK_INTERVAL_MS || '900000', 10), // 15 minutes
      });
      app.locals.alertHealthCheckJob = alertHealthCheckJob;
      alertHealthCheckJob.start();
      logger.info('Alert health check job started', {
        intervalMs: alertHealthCheckJob.checkIntervalMs,
      });
    } catch (error) {
      logger.warn('Failed to initialize alert health check job', { error: error.message });
    }
  } else {
    logger.info('Alert health check job disabled by configuration');
  }

  // Initialize Reconciliation Job
  try {
    reconciliationJob = new ReconciliationJob({
      logger,
      executionServiceUrl: config.services.execution,
      riskServiceUrl: config.services.risk,
      discordWebhook: config.notifications.discordWebhook,
      runIntervalMs: parseInt(process.env.RECONCILIATION_INTERVAL_MS || '300000', 10), // 5 minutes
      includeOrders: process.env.RECONCILIATION_INCLUDE_ORDERS !== 'false',
    });
    app.locals.reconciliationJob = reconciliationJob;

    // Auto-start reconciliation job if enabled
    if (process.env.RECONCILIATION_ENABLED !== 'false') {
      reconciliationJob.start();
      logger.info('Reconciliation job started', {
        intervalMs: reconciliationJob.config.runIntervalMs,
      });
    } else {
      logger.info('Reconciliation job disabled by configuration');
    }
  } catch (error) {
    logger.warn('Failed to initialize reconciliation job', { error: error.message });
  }

  // Initialize Corporate Actions Job
  try {
    corporateActionsJob = new CorporateActionsJob({
      logger,
      dataServiceUrl: config.services.data,
      executionServiceUrl: config.services.execution,
      discordWebhook: config.notifications.discordWebhook,
      daysAhead: parseInt(process.env.CORPORATE_ACTIONS_DAYS_AHEAD || '7', 10),
      watchlist: process.env.CORPORATE_ACTIONS_WATCHLIST
        ? process.env.CORPORATE_ACTIONS_WATCHLIST.split(',').map(s => s.trim())
        : [],
      autoApply: process.env.CORPORATE_ACTIONS_AUTO_APPLY === 'true',
    });
    app.locals.corporateActionsJob = corporateActionsJob;

    // Auto-start corporate actions job if enabled
    if (process.env.CORPORATE_ACTIONS_ENABLED !== 'false') {
      corporateActionsJob.start();
      logger.info('Corporate actions job started', {
        daysAhead: corporateActionsJob.config.daysAhead,
        watchlistCount: corporateActionsJob.config.watchlist.length,
      });
    } else {
      logger.info('Corporate actions job disabled by configuration');
    }
  } catch (error) {
    logger.warn('Failed to initialize corporate actions job', { error: error.message });
  }

  // Initialize Signal Generation Job
  try {
    signalGenerationJob = new SignalGenerationJob({
      logger,
      signalServiceUrl: config.services.signal,
      discordWebhook: config.notifications.discordWebhook,
      intervalMinutes: parseInt(process.env.SIGNAL_GENERATION_INTERVAL_MINUTES || '15', 10),
      symbols: process.env.SIGNAL_GENERATION_SYMBOLS
        ? process.env.SIGNAL_GENERATION_SYMBOLS.split(',').map(s => s.trim())
        : ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'],
      strategies: process.env.SIGNAL_GENERATION_STRATEGIES
        ? process.env.SIGNAL_GENERATION_STRATEGIES.split(',').map(s => s.trim())
        : ['momentum', 'mean_reversion'],
      market: process.env.SIGNAL_GENERATION_MARKET || 'US',
      minConfidenceForNotify: parseFloat(process.env.SIGNAL_GENERATION_MIN_CONFIDENCE || '0.7'),
      // Auto-execute signals through outbox pattern
      outboxPublisher: outboxPublisher || null,
      autoExecuteSignals: process.env.SIGNAL_AUTO_EXECUTE === 'true',
    });
    app.locals.signalGenerationJob = signalGenerationJob;

    // Auto-start signal generation job if enabled
    if (process.env.SIGNAL_GENERATION_ENABLED === 'true') {
      signalGenerationJob.start();
      logger.info('Signal generation job started', {
        intervalMinutes: signalGenerationJob.config.intervalMs / 60000,
        symbols: signalGenerationJob.config.symbols,
        strategies: signalGenerationJob.config.strategies,
      });
    } else {
      logger.info('Signal generation job disabled by configuration (set SIGNAL_GENERATION_ENABLED=true to enable)');
    }
  } catch (error) {
    logger.warn('Failed to initialize signal generation job', { error: error.message });
  }

  // Initialize Position Monitor Job
  try {
    positionMonitorJob = new PositionMonitorJob({
      logger,
      executionServiceUrl: config.services.execution,
      dataServiceUrl: config.services.data,
      discordWebhook: config.notifications.discordWebhook,
      intervalSeconds: parseInt(process.env.POSITION_MONITOR_INTERVAL_SECONDS || '30', 10),
      outboxPublisher: outboxPublisher || null,
    });
    app.locals.positionMonitorJob = positionMonitorJob;

    // Auto-start position monitor job if signal generation is enabled
    if (process.env.SIGNAL_GENERATION_ENABLED === 'true') {
      positionMonitorJob.start();
      logger.info('Position monitor job started', {
        intervalSeconds: positionMonitorJob.config.intervalMs / 1000,
      });
    } else {
      logger.info('Position monitor job disabled (starts when signal generation is enabled)');
    }
  } catch (error) {
    logger.warn('Failed to initialize position monitor job', { error: error.message });
  }

  // Initialize Notification Service (Discord + Telegram)
  try {
    notificationService = new NotificationService({
      logger,
      enabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
      discord: {
        webhookUrl: config.notifications.discordWebhook,
        criticalWebhookUrl: config.alerting.channels.discord.criticalWebhookUrl,
      },
      telegram: {
        botToken: config.notifications.telegramBotToken,
        chatId: config.notifications.telegramChatId,
      },
      rateLimitMs: parseInt(process.env.NOTIFICATION_RATE_LIMIT_MS || '1000', 10),
    });
    app.locals.notificationService = notificationService;
    logger.info('Notification service initialized', notificationService.getHealth());
  } catch (error) {
    logger.warn('Failed to initialize notification service', { error: error.message });
  }

  logger.info('Services initialized');
}

// =============================================================================
// Middleware Setup
// =============================================================================

// Apply rate limiting globally (except health check)
if (config.rateLimit.enabled && rateLimiter) {
  app.use('/api', createRateLimitMiddleware(rateLimiter, {
    logger,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path.startsWith('/health');
    },
  }));
  logger.info('Rate limiting middleware applied to /api routes');
}

// Create authentication middleware (if enabled)
let authMiddleware = null;
if (config.auth.enabled && apiKeyManager) {
  authMiddleware = createAuthMiddleware(apiKeyManager, {
    logger,
    allowEmergencyAccess: config.auth.allowEmergencyAccess,
    emergencyEndpoints: ['/api/v1/mode/killswitch/activate'],
  });
}

// =============================================================================
// Routes
// =============================================================================

// Public routes (no auth required)
app.use('/health', healthRoutes);

// Rate limit status endpoint (for monitoring)
if (rateLimiter) {
  app.get('/api/v1/rate-limit/status', createRateLimitStatusHandler(rateLimiter));
}

// Auth audit endpoint (requires admin)
if (apiKeyManager) {
  app.get('/api/v1/auth/audit', (req, res, next) => {
    if (authMiddleware) {
      authMiddleware(req, res, () => {
        requireRole('admin')(req, res, next);
      });
    } else {
      next();
    }
  }, (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = apiKeyManager.getAuditLogs(limit);
    res.json({
      total: logs.length,
      logs,
    });
  });
}

// Protected routes with role requirements
// Note: When auth is disabled, all routes are accessible

// Mode routes - require operator role
app.use('/api/v1/mode', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, modeRoutes);

// Arming routes - require admin role (critical safety endpoints)
app.use('/api/v1/arming', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('admin')(req, res, next);
    });
  } else {
    next();
  }
}, armingRoutes);

// Config routes - require admin role
app.use('/api/v1/config', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('admin')(req, res, next);
    });
  } else {
    next();
  }
}, configRoutes);

// Alerts routes - require viewer role (read) or operator role (write)
app.use('/api/v1/alerts', (req, res, next) => {
  if (authMiddleware) {
    const requiredRole = ['POST', 'PUT', 'DELETE'].includes(req.method) ? 'operator' : 'viewer';
    authMiddleware(req, res, () => {
      requireRole(requiredRole)(req, res, next);
    });
  } else {
    next();
  }
}, alertRoutes);

// Jobs routes - require operator role
app.use('/api/v1/jobs', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, jobRoutes);

// Settings routes - require admin role
app.use('/api/v1/settings', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('admin')(req, res, next);
    });
  } else {
    next();
  }
}, settingsRoutes);

// Outbox routes - require operator role
app.use('/api/v1/outbox', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, outboxRoutes);

// Events routes - require operator role
app.use('/api/v1/events', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, eventsRoutes);

// Reports routes - require viewer role (read) or operator role (generate)
app.use('/api/v1/reports', (req, res, next) => {
  if (authMiddleware) {
    const requiredRole = req.method === 'POST' ? 'operator' : 'viewer';
    authMiddleware(req, res, () => {
      requireRole(requiredRole)(req, res, next);
    });
  } else {
    next();
  }
}, reportsRoutes);

// Reconciliation routes - require operator role
app.use('/api/v1/reconciliation', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, reconciliationRoutes);

// Corporate actions routes - require operator role
app.use('/api/v1/corporate-actions', (req, res, next) => {
  if (authMiddleware) {
    authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  } else {
    next();
  }
}, corporateActionsRoutes);

// Notification routes - require viewer role (read) or operator role (write)
app.use('/api/v1/notifications', (req, res, next) => {
  if (authMiddleware) {
    const requiredRole = ['POST', 'PUT', 'DELETE'].includes(req.method) ? 'operator' : 'viewer';
    authMiddleware(req, res, () => {
      requireRole(requiredRole)(req, res, next);
    });
  } else {
    next();
  }
}, notificationRoutes);

// =============================================================================
// Signal Generation Job Endpoints
// =============================================================================

/**
 * GET /api/v1/signals/job/status - Get signal generation job status
 */
app.get('/api/v1/signals/job/status', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('viewer')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { signalGenerationJob } = req.app.locals;

  if (!signalGenerationJob) {
    return res.status(503).json({ error: 'Signal generation job not initialized' });
  }

  res.json(signalGenerationJob.getStatus());
});

/**
 * POST /api/v1/signals/job/start - Start the signal generation job
 */
app.post('/api/v1/signals/job/start', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { signalGenerationJob, logger: appLogger } = req.app.locals;

  if (!signalGenerationJob) {
    return res.status(503).json({ error: 'Signal generation job not initialized' });
  }

  if (signalGenerationJob.isRunning) {
    return res.status(400).json({
      error: 'Signal generation job is already running',
      status: signalGenerationJob.getStatus(),
    });
  }

  signalGenerationJob.start();
  appLogger.info('Signal generation job started via API');

  res.json({
    status: 'started',
    ...signalGenerationJob.getStatus(),
  });
});

/**
 * POST /api/v1/signals/job/stop - Stop the signal generation job
 */
app.post('/api/v1/signals/job/stop', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { signalGenerationJob, logger: appLogger } = req.app.locals;

  if (!signalGenerationJob) {
    return res.status(503).json({ error: 'Signal generation job not initialized' });
  }

  if (!signalGenerationJob.isRunning) {
    return res.status(400).json({
      error: 'Signal generation job is not running',
      status: signalGenerationJob.getStatus(),
    });
  }

  signalGenerationJob.stop();
  appLogger.info('Signal generation job stopped via API');

  res.json({
    status: 'stopped',
    ...signalGenerationJob.getStatus(),
  });
});

/**
 * POST /api/v1/signals/job/trigger - Manually trigger signal generation
 */
app.post('/api/v1/signals/job/trigger', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { signalGenerationJob, logger: appLogger } = req.app.locals;

  if (!signalGenerationJob) {
    return res.status(503).json({ error: 'Signal generation job not initialized' });
  }

  appLogger.info('Signal generation manually triggered via API');

  try {
    const result = await signalGenerationJob.run();
    res.json({
      status: 'completed',
      ...result,
    });
  } catch (error) {
    appLogger.error('Manual signal generation failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/signals/job/config - Update signal generation job configuration
 * Body: { symbols?: string[], strategies?: string[], minConfidenceForNotify?: number }
 */
app.put('/api/v1/signals/job/config', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('admin')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { signalGenerationJob, logger: appLogger } = req.app.locals;

  if (!signalGenerationJob) {
    return res.status(503).json({ error: 'Signal generation job not initialized' });
  }

  const { symbols, strategies, minConfidenceForNotify, notifyOnSignals } = req.body;

  const updates = {};
  if (symbols && Array.isArray(symbols)) {
    updates.symbols = symbols.map(s => s.toUpperCase().trim());
  }
  if (strategies && Array.isArray(strategies)) {
    updates.strategies = strategies.map(s => s.toLowerCase().trim());
  }
  if (typeof minConfidenceForNotify === 'number') {
    updates.minConfidenceForNotify = Math.max(0, Math.min(1, minConfidenceForNotify));
  }
  if (typeof notifyOnSignals === 'boolean') {
    updates.notifyOnSignals = notifyOnSignals;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'No valid configuration updates provided',
      allowed_fields: ['symbols', 'strategies', 'minConfidenceForNotify', 'notifyOnSignals'],
    });
  }

  appLogger.info('Signal generation job config updated via API', { updates });
  const status = signalGenerationJob.updateConfig(updates);

  res.json({
    status: 'updated',
    ...status,
  });
});

// =============================================================================
// Position Monitor Endpoints
// =============================================================================

/**
 * GET /api/v1/positions/monitor/status - Get position monitor job status
 */
app.get('/api/v1/positions/monitor/status', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('viewer')(req, res, next);
    });
  }
  next();
}, (req, res) => {
  const { positionMonitorJob } = req.app.locals;

  if (!positionMonitorJob) {
    return res.status(503).json({ error: 'Position monitor job not initialized' });
  }

  res.json(positionMonitorJob.getStatus());
});

/**
 * POST /api/v1/positions/monitor/start - Start the position monitor job
 */
app.post('/api/v1/positions/monitor/start', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, (req, res) => {
  const { positionMonitorJob, logger: appLogger } = req.app.locals;

  if (!positionMonitorJob) {
    return res.status(503).json({ error: 'Position monitor job not initialized' });
  }

  if (positionMonitorJob.isRunning) {
    return res.status(400).json({
      error: 'Position monitor job is already running',
      status: positionMonitorJob.getStatus(),
    });
  }

  positionMonitorJob.start();
  appLogger.info('Position monitor job started via API');

  res.json({
    status: 'started',
    ...positionMonitorJob.getStatus(),
  });
});

/**
 * POST /api/v1/positions/monitor/stop - Stop the position monitor job
 */
app.post('/api/v1/positions/monitor/stop', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, (req, res) => {
  const { positionMonitorJob, logger: appLogger } = req.app.locals;

  if (!positionMonitorJob) {
    return res.status(503).json({ error: 'Position monitor job not initialized' });
  }

  if (!positionMonitorJob.isRunning) {
    return res.status(400).json({
      error: 'Position monitor job is not running',
      status: positionMonitorJob.getStatus(),
    });
  }

  positionMonitorJob.stop();
  appLogger.info('Position monitor job stopped via API');

  res.json({
    status: 'stopped',
    ...positionMonitorJob.getStatus(),
  });
});

/**
 * POST /api/v1/positions/monitor/trigger - Manually trigger position monitoring
 */
app.post('/api/v1/positions/monitor/trigger', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { positionMonitorJob, logger: appLogger } = req.app.locals;

  if (!positionMonitorJob) {
    return res.status(503).json({ error: 'Position monitor job not initialized' });
  }

  appLogger.info('Position monitoring manually triggered via API');

  try {
    const result = await positionMonitorJob.run();
    res.json({
      status: 'completed',
      ...result,
    });
  } catch (error) {
    appLogger.error('Manual position monitoring failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

// =============================================================================
// Alert System Endpoints
// =============================================================================

/**
 * GET /api/v1/alerts/health - Get alert system health status
 */
app.get('/api/v1/alerts/health', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('viewer')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { alertManager, criticalAlertHandler, alertHealthCheckJob } = req.app.locals;

  const health = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    components: {},
  };

  // Alert Manager status
  if (alertManager) {
    try {
      const stats = await alertManager.getAlertStats();
      health.components.alertManager = {
        healthy: true,
        activeAlerts: stats.activeAlerts,
        criticalAlerts: stats.criticalAlerts,
        totalLast24h: stats.totalLast24h,
      };
    } catch (error) {
      health.components.alertManager = {
        healthy: false,
        error: error.message,
      };
      health.overall = 'degraded';
    }
  } else {
    health.components.alertManager = { healthy: false, error: 'Not initialized' };
    health.overall = 'degraded';
  }

  // Critical Alert Handler status
  if (criticalAlertHandler) {
    health.components.criticalAlertHandler = criticalAlertHandler.getHealth();
  } else {
    health.components.criticalAlertHandler = { healthy: false, error: 'Not initialized' };
  }

  // Alert Health Check Job status
  if (alertHealthCheckJob) {
    const jobStatus = alertHealthCheckJob.getStatus();
    health.components.healthCheckJob = {
      running: jobStatus.running,
      lastCheckAt: jobStatus.lastCheckAt,
      consecutiveFailures: jobStatus.consecutiveFailures,
      componentStatus: jobStatus.componentStatus,
    };

    // If health check detected issues, mark as degraded
    if (jobStatus.wasDown || jobStatus.consecutiveFailures > 0) {
      health.overall = 'degraded';
    }
  } else {
    health.components.healthCheckJob = { running: false, error: 'Not initialized' };
  }

  res.json(health);
});

/**
 * POST /api/v1/alerts/test - Send test alert
 * Query params: ?channel=discord|email|sms|all
 */
app.post('/api/v1/alerts/test', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { alertManager, criticalAlertHandler, alertHealthCheckJob, logger: appLogger } = req.app.locals;
  const channel = req.query.channel || 'all';

  appLogger.info('Test alert requested', { channel });

  const results = {
    timestamp: new Date().toISOString(),
    channel,
    results: {},
  };

  try {
    // Test via AlertManager
    if (alertManager && (channel === 'all' || channel === 'alertmanager')) {
      try {
        results.results.alertManager = await alertManager.sendTestAlert(
          channel !== 'all' && channel !== 'alertmanager' ? channel : null
        );
      } catch (error) {
        results.results.alertManager = { error: error.message };
      }
    }

    // Test via CriticalAlertHandler (for direct channels)
    if (criticalAlertHandler && channel === 'all') {
      try {
        results.results.criticalAlertHandler = await criticalAlertHandler.testChannels();
      } catch (error) {
        results.results.criticalAlertHandler = { error: error.message };
      }
    }

    // Full test via AlertHealthCheckJob
    if (alertHealthCheckJob && channel === 'all') {
      try {
        results.results.healthCheckTest = await alertHealthCheckJob.sendTestAlert();
      } catch (error) {
        results.results.healthCheckTest = { error: error.message };
      }
    }

    res.json({
      status: 'sent',
      ...results,
    });
  } catch (error) {
    appLogger.error('Test alert failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
      ...results,
    });
  }
});

/**
 * POST /api/v1/alerts/critical - Send immediate critical alert (bypasses Alertmanager)
 * Body: { type, title, message, details }
 */
app.post('/api/v1/alerts/critical', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('admin')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { criticalAlertHandler, logger: appLogger } = req.app.locals;

  if (!criticalAlertHandler) {
    return res.status(503).json({ error: 'Critical alert handler not initialized' });
  }

  const { type, title, message, details } = req.body;

  if (!type || !title || !message) {
    return res.status(400).json({
      error: 'Missing required fields: type, title, message',
    });
  }

  appLogger.warn('Critical alert requested via API', { type, title });

  try {
    const result = await criticalAlertHandler.sendCriticalAlert({
      type,
      title,
      message,
      details: details || {},
    });

    res.json({
      status: result.anySuccess ? 'sent' : 'failed',
      alertId: result.alertId,
      timestamp: result.timestamp,
      results: result.results,
    });
  } catch (error) {
    appLogger.error('Critical alert failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/alerts/webhook/sms - Webhook endpoint for Alertmanager to trigger SMS
 * This is called by Alertmanager when it needs to send SMS alerts
 */
app.post('/api/v1/alerts/webhook/sms', async (req, res) => {
  const { criticalAlertHandler, logger: appLogger } = req.app.locals;

  // Verify internal webhook token if configured
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!criticalAlertHandler) {
    return res.status(503).json({ error: 'Critical alert handler not initialized' });
  }

  try {
    // Alertmanager webhook payload format
    const { alerts } = req.body;

    if (!alerts || !Array.isArray(alerts)) {
      return res.status(400).json({ error: 'Invalid Alertmanager webhook payload' });
    }

    const results = [];

    for (const alert of alerts) {
      if (alert.status === 'firing') {
        // Send SMS for each firing alert
        const result = await criticalAlertHandler.sendCriticalAlert({
          type: alert.labels?.alertname || 'alertmanager_webhook',
          title: alert.annotations?.summary || alert.labels?.alertname || 'Alert',
          message: alert.annotations?.description || 'Alert triggered via Alertmanager',
          details: {
            ...alert.labels,
            startsAt: alert.startsAt,
            generatorURL: alert.generatorURL,
          },
        });
        results.push({ alert: alert.labels?.alertname, result: result.anySuccess ? 'sent' : 'failed' });
      }
    }

    appLogger.info('SMS webhook processed', { alertCount: alerts.length, results });

    res.json({ status: 'processed', results });
  } catch (error) {
    appLogger.error('SMS webhook failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/alerts/health/check - Force immediate health check
 */
app.post('/api/v1/alerts/health/check', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('operator')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  const { alertHealthCheckJob, logger: appLogger } = req.app.locals;

  if (!alertHealthCheckJob) {
    return res.status(503).json({ error: 'Alert health check job not initialized' });
  }

  appLogger.info('Force alert health check requested');

  try {
    const result = await alertHealthCheckJob.forceCheck();
    res.json({
      status: 'completed',
      ...result,
    });
  } catch (error) {
    appLogger.error('Force health check failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// WebSocket status endpoint
app.get('/api/v1/ws/status', (req, res) => {
  if (!wsServer) {
    return res.status(503).json({ error: 'WebSocket server not initialized' });
  }
  res.json(wsServer.getStatus());
});

// System status endpoint (requires viewer role if auth enabled)
app.get('/api/v1/status', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('viewer')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
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

  // Get outbox status if available
  let outboxStatus = null;
  if (outboxDispatcher) {
    try {
      outboxStatus = await outboxDispatcher.getStatus();
    } catch (error) {
      outboxStatus = { error: error.message };
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    trading_mode: modeState.mode,
    kill_switch_active: Boolean(modeState.kill_switch_active),
    services: serviceHealth,
    outbox: outboxStatus,
    overall_status: Object.values(serviceHealth).every(s => s.status === 'healthy')
      ? 'healthy'
      : 'degraded',
  });
});

// Prometheus metrics endpoint (requires viewer role if auth enabled)
app.get('/api/v1/metrics', async (req, res, next) => {
  if (authMiddleware) {
    return authMiddleware(req, res, () => {
      requireRole('viewer')(req, res, next);
    });
  }
  next();
}, async (req, res) => {
  if (!config.prometheusEnabled) {
    return res.status(404).json({ error: 'Metrics disabled' });
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// =============================================================================
// Time Endpoints for Cross-Market Support
// =============================================================================

/**
 * Market configurations for time calculations
 */
const MARKET_CONFIGS = {
  US: {
    timezone: 'America/New_York',
    regularOpen: '09:30',
    regularClose: '16:00',
    preMarketOpen: '04:00',
    afterHoursClose: '20:00',
    is24_7: false,
  },
  ASX: {
    timezone: 'Australia/Sydney',
    regularOpen: '10:00',
    regularClose: '16:00',
    preMarketOpen: '07:00',
    afterHoursClose: null,
    is24_7: false,
  },
  CRYPTO: {
    timezone: 'UTC',
    regularOpen: '00:00',
    regularClose: '23:59',
    preMarketOpen: null,
    afterHoursClose: null,
    is24_7: true,
  },
  LSE: {
    timezone: 'Europe/London',
    regularOpen: '08:00',
    regularClose: '16:30',
    preMarketOpen: '05:05',
    afterHoursClose: null,
    is24_7: false,
  },
  TSX: {
    timezone: 'America/Toronto',
    regularOpen: '09:30',
    regularClose: '16:00',
    preMarketOpen: '07:00',
    afterHoursClose: '17:00',
    is24_7: false,
  },
};

/**
 * Get current time in a specific timezone
 */
function getTimeInTimezone(timezone) {
  return new Date().toLocaleString('en-US', { timeZone: timezone });
}

/**
 * Determine session type for a market
 */
function getSessionType(market, now = new Date()) {
  const marketConfig = MARKET_CONFIGS[market.toUpperCase()];
  if (!marketConfig) return 'unknown';

  if (marketConfig.is24_7) return 'regular';

  // Get local time in market timezone
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: marketConfig.timezone }));
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  // Parse market hours
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const regularOpen = parseTime(marketConfig.regularOpen);
  const regularClose = parseTime(marketConfig.regularClose);
  const preMarketOpen = parseTime(marketConfig.preMarketOpen);
  const afterHoursClose = parseTime(marketConfig.afterHoursClose);

  // Check if weekend
  const dayOfWeek = localTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'closed';

  // Determine session
  if (regularOpen && regularClose) {
    if (timeMinutes >= regularOpen && timeMinutes < regularClose) {
      return 'regular';
    }
  }

  if (preMarketOpen && regularOpen) {
    if (timeMinutes >= preMarketOpen && timeMinutes < regularOpen) {
      return 'pre';
    }
  }

  if (regularClose && afterHoursClose) {
    if (timeMinutes >= regularClose && timeMinutes <= afterHoursClose) {
      return 'post';
    }
  }

  return 'closed';
}

/**
 * Time endpoint for clock synchronization
 */
app.get('/api/v1/time', async (req, res) => {
  const utcNow = new Date();

  // Get status for each market
  const marketsStatus = {};
  for (const market of Object.keys(MARKET_CONFIGS)) {
    const marketConfig = MARKET_CONFIGS[market];
    const sessionType = getSessionType(market, utcNow);

    marketsStatus[market] = {
      session_type: sessionType,
      is_open: sessionType === 'regular' || marketConfig.is24_7,
      timezone: marketConfig.timezone,
      local_time: getTimeInTimezone(marketConfig.timezone),
      regular_open: marketConfig.regularOpen,
      regular_close: marketConfig.regularClose,
    };
  }

  // Get service health status
  const serviceHealth = {};
  for (const [name, url] of Object.entries(config.services)) {
    try {
      const response = await axios.get(`${url}/api/v1/time`, { timeout: 3000 });
      const serviceTime = new Date(response.data.utc_time);
      const skewMs = utcNow.getTime() - serviceTime.getTime();

      serviceHealth[name] = {
        status: 'healthy',
        utc_time: response.data.utc_time,
        skew_ms: skewMs,
        is_synchronized: Math.abs(skewMs) < 30000,
      };
    } catch (error) {
      serviceHealth[name] = {
        status: 'unreachable',
        error: error.message,
      };
    }
  }

  res.json({
    service: 'ops-service',
    version: '1.0.0',
    utc_time: utcNow.toISOString(),
    utc_timestamp: utcNow.getTime() / 1000,
    clock_sync: {
      skew_ms: 0, // Self reference
      is_synchronized: true,
      max_skew_ms: 30000,
    },
    markets: marketsStatus,
    service_clock_status: serviceHealth,
  });
});

/**
 * Detailed time information for a specific market
 */
app.get('/api/v1/time/market/:market', async (req, res) => {
  const market = req.params.market.toUpperCase();
  const marketConfig = MARKET_CONFIGS[market];

  if (!marketConfig) {
    return res.status(404).json({
      error: `Unknown market: ${market}`,
      supported_markets: Object.keys(MARKET_CONFIGS),
    });
  }

  const utcNow = new Date();
  const sessionType = getSessionType(market, utcNow);
  const localTime = new Date(utcNow.toLocaleString('en-US', { timeZone: marketConfig.timezone }));

  res.json({
    market,
    utc_time: utcNow.toISOString(),
    local_time: localTime.toISOString(),
    timezone: marketConfig.timezone,
    session: {
      type: sessionType,
      is_open: sessionType === 'regular' || marketConfig.is24_7,
    },
    trading_hours: {
      pre_market_open: marketConfig.preMarketOpen,
      regular_open: marketConfig.regularOpen,
      regular_close: marketConfig.regularClose,
      after_hours_close: marketConfig.afterHoursClose,
    },
    is_24_7: marketConfig.is24_7,
  });
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

// Daily report scheduler
let dailyReportScheduler = null;

/**
 * Schedule daily report generation
 * Runs at market close (4:00 PM ET for US markets)
 */
function scheduleDailyReport() {
  const generator = new DailyReportGenerator({
    logger,
    executionServiceUrl: config.services.execution,
    riskServiceUrl: config.services.risk,
    dataServiceUrl: config.services.data,
    signalServiceUrl: config.services.signal,
    discordWebhook: config.notifications.discordWebhook,
  });

  // Calculate milliseconds until next 4:00 PM ET
  const scheduleNext = () => {
    const now = new Date();
    const etOffset = -5 * 60; // ET is UTC-5 (simplified, doesn't handle DST)
    const target = new Date(now);

    // Set target to 4:00 PM ET today
    target.setUTCHours(16 + 5, 0, 0, 0); // 4 PM + 5 hours = 21:00 UTC

    // If we've passed today's time, schedule for tomorrow
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    logger.info('Scheduling daily report', {
      next_run: target.toISOString(),
      delay_hours: (delay / (1000 * 60 * 60)).toFixed(2),
    });

    dailyReportScheduler = setTimeout(async () => {
      logger.info('Running scheduled daily report');
      try {
        await generator.generate();
        logger.info('Scheduled daily report completed');
      } catch (error) {
        logger.error('Scheduled daily report failed', { error: error.message });
      }
      // Schedule next run
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  logger.info('Daily report scheduler initialized');
}

// WebSocket server instance
let wsServer = null;

// Start server
async function start() {
  try {
    await initializeServices();

    // Initialize daily report scheduler
    if (process.env.DAILY_REPORT_ENABLED !== 'false') {
      scheduleDailyReport();
    }

    // Create HTTP server from Express app
    const httpServer = http.createServer(app);

    // Initialize WebSocket server
    wsServer = new WebSocketBroadcaster(httpServer, { logger });
    logger.info('WebSocket server initialized', { path: '/ws' });

    httpServer.listen(config.port, () => {
      logger.info(`Ops Service started`, {
        port: config.port,
        env: config.env,
        prometheus: config.prometheusEnabled,
        dailyReportScheduled: process.env.DAILY_REPORT_ENABLED !== 'false',
        websocket: true,
        wsPath: '/ws',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down...`);

  // Stop daily report scheduler
  if (dailyReportScheduler) {
    clearTimeout(dailyReportScheduler);
    logger.info('Daily report scheduler stopped');
  }

  // Stop rate limiter cleanup
  if (rateLimiter) {
    rateLimiter.stop();
    logger.info('Rate limiter stopped');
  }

  // Stop reconciliation job
  if (reconciliationJob) {
    reconciliationJob.stop();
    logger.info('Reconciliation job stopped');
  }

  // Stop corporate actions job
  if (corporateActionsJob) {
    corporateActionsJob.stop();
    logger.info('Corporate actions job stopped');
  }

  // Stop signal generation job
  if (signalGenerationJob) {
    signalGenerationJob.stop();
    logger.info('Signal generation job stopped');
  }

  // Stop position monitor job
  if (positionMonitorJob) {
    positionMonitorJob.stop();
    logger.info('Position monitor job stopped');
  }

  // Close WebSocket server
  if (wsServer) {
    wsServer.close();
    logger.info('WebSocket server closed');
  }

  // Stop alert health check job
  if (alertHealthCheckJob) {
    alertHealthCheckJob.stop();
    logger.info('Alert health check job stopped');
  }

  // Cleanup alert manager
  if (alertManager) {
    alertManager.cleanup();
    logger.info('Alert manager cleaned up');
  }

  // Stop outbox dispatcher
  if (outboxDispatcher) {
    outboxDispatcher.stop();
    logger.info('Outbox dispatcher stopped');
  }

  // Close PostgreSQL pool
  if (pgPool) {
    await closePool();
    logger.info('PostgreSQL pool closed');
  }

  // Close SQLite database
  if (db) {
    db.close();
    logger.info('SQLite database closed');
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
