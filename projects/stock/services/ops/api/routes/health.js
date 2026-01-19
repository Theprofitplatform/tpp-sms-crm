/**
 * Health Check Routes - Stock Trading Automation System
 *
 * Provides health status endpoints for monitoring and orchestration.
 *
 * Endpoints:
 *   GET /health           - Basic health check
 *   GET /health/detailed  - Detailed health with component status
 *   GET /health/ready     - Kubernetes readiness probe
 *   GET /health/live      - Kubernetes liveness probe
 */

import { Router } from 'express';

const router = Router();

/**
 * Basic health check
 */
router.get('/', async (req, res) => {
  const { db, logger, alertManager } = req.app.locals;

  const components = {
    database: 'unknown',
  };

  // Check database
  try {
    db.db.prepare('SELECT 1').get();
    components.database = 'healthy';
  } catch (error) {
    components.database = 'unhealthy';
    logger.error('Database health check failed', { error: error.message });
  }

  // Get alert stats if available
  let alertStats = null;
  if (alertManager) {
    try {
      alertStats = await alertManager.getAlertStats();
    } catch (error) {
      logger.warn('Failed to get alert stats', { error: error.message });
    }
  }

  const status = Object.values(components).every(c => c === 'healthy')
    ? 'healthy'
    : 'degraded';

  const response = {
    status,
    service: 'ops-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    components,
  };

  // Include alert info if available
  if (alertStats) {
    response.alerts = {
      unacknowledged: alertStats.activeAlerts,
      critical: alertStats.criticalAlerts,
      escalated: alertStats.escalatedAlerts,
      timeSinceLastCritical: alertStats.timeSinceLastCritical
        ? formatDuration(alertStats.timeSinceLastCritical)
        : null,
    };
  }

  res.json(response);
});

/**
 * Detailed health check with all components
 */
router.get('/detailed', async (req, res) => {
  const { db, logger, jobQueue, outboxDispatcher, alertManager, reconciliationJob } = req.app.locals;

  const components = {
    database: { status: 'unknown' },
    jobQueue: { status: 'unknown' },
    outbox: { status: 'unknown' },
    alerting: { status: 'unknown' },
    reconciliation: { status: 'unknown' },
  };

  // Check SQLite database
  try {
    db.db.prepare('SELECT 1').get();
    components.database = {
      status: 'healthy',
      type: 'sqlite',
    };
  } catch (error) {
    components.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check job queue
  try {
    if (jobQueue) {
      components.jobQueue = {
        status: 'healthy',
        pendingJobs: jobQueue.getPendingCount?.() || 0,
      };
    } else {
      components.jobQueue = {
        status: 'not_initialized',
      };
    }
  } catch (error) {
    components.jobQueue = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check outbox dispatcher
  try {
    if (outboxDispatcher) {
      const outboxStatus = await outboxDispatcher.getStatus();
      components.outbox = {
        status: outboxStatus.isRunning ? 'healthy' : 'stopped',
        isRunning: outboxStatus.isRunning,
        pending: outboxStatus.pendingCount || 0,
        deadLetter: outboxStatus.deadLetterCount || 0,
      };
    } else {
      components.outbox = {
        status: 'disabled',
      };
    }
  } catch (error) {
    components.outbox = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check alerting system
  try {
    if (alertManager) {
      const alertStats = await alertManager.getAlertStats();
      components.alerting = {
        status: 'healthy',
        activeAlerts: alertStats.activeAlerts,
        criticalAlerts: alertStats.criticalAlerts,
        escalatedAlerts: alertStats.escalatedAlerts,
        lastCriticalAt: alertStats.lastCriticalAt,
        timeSinceLastCritical: alertStats.timeSinceLastCritical
          ? formatDuration(alertStats.timeSinceLastCritical)
          : null,
        totalLast24h: alertStats.totalLast24h,
      };

      // Mark as warning if there are unacknowledged critical alerts
      if (alertStats.criticalAlerts > 0) {
        components.alerting.status = 'warning';
      }
    } else {
      components.alerting = {
        status: 'disabled',
      };
    }
  } catch (error) {
    components.alerting = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check reconciliation job
  try {
    if (reconciliationJob) {
      const reconStatus = await reconciliationJob.getStatus();
      components.reconciliation = {
        status: reconStatus.job_running ? 'healthy' : 'stopped',
        isRunning: reconStatus.job_running,
        lastRunResult: reconStatus.last_run_result?.status,
        consecutiveErrors: reconStatus.consecutive_errors,
      };

      // Mark as warning if there are consecutive errors
      if (reconStatus.consecutive_errors > 0) {
        components.reconciliation.status = 'warning';
      }
    } else {
      components.reconciliation = {
        status: 'disabled',
      };
    }
  } catch (error) {
    components.reconciliation = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Determine overall status
  const statuses = Object.values(components).map(c => c.status);
  let overallStatus = 'healthy';

  if (statuses.some(s => s === 'unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.some(s => s === 'warning' || s === 'degraded')) {
    overallStatus = 'degraded';
  }

  res.json({
    status: overallStatus,
    service: 'ops-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    components,
  });
});

/**
 * Kubernetes readiness probe
 * Returns 200 if service is ready to accept traffic
 */
router.get('/ready', (req, res) => {
  const { db } = req.app.locals;

  try {
    db.db.prepare('SELECT 1').get();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * Kubernetes liveness probe
 * Returns 200 if service is alive
 */
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true, timestamp: new Date().toISOString() });
});

/**
 * Format duration in human-readable form
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

export default router;
