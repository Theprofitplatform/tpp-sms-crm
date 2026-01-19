/**
 * Alert Routes - Stock Trading Automation System
 *
 * Manages trading alerts and notifications with comprehensive
 * alerting capabilities including:
 *   - Multi-channel notifications (Discord, Email, SMS, PagerDuty)
 *   - Alert acknowledgment and resolution
 *   - Alert history and statistics
 *   - Test alert functionality
 *   - Escalation management
 *
 * Endpoints:
 *   GET  /api/v1/alerts                   - Get alerts (with filters)
 *   GET  /api/v1/alerts/active            - Get active alerts
 *   GET  /api/v1/alerts/history           - Get alert history
 *   GET  /api/v1/alerts/stats             - Get alert statistics
 *   GET  /api/v1/alerts/rules             - Get alert rules
 *   GET  /api/v1/alerts/:id               - Get single alert
 *   POST /api/v1/alerts                   - Create an alert
 *   POST /api/v1/alerts/:id/acknowledge   - Acknowledge alert
 *   POST /api/v1/alerts/:id/resolve       - Resolve alert
 *   POST /api/v1/alerts/test              - Send test alert
 */

import { Router } from 'express';
import {
  ALERT_RULES,
  SEVERITY_LEVELS,
  ALERT_STATUS,
  getAllAlertRules,
  getAlertRule,
  buildAlertMessage,
} from '../../alerting/index.js';

const router = Router();

/**
 * Get alerts with optional filters
 *
 * Query params:
 *   - status: Filter by status (active, acknowledged, resolved, escalated)
 *   - severity: Filter by severity (info, warning, error, critical)
 *   - type: Filter by alert type
 *   - limit: Maximum results (default: 50)
 *   - offset: Pagination offset (default: 0)
 */
router.get('/', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const { status, severity, type, limit = 50, offset = 0 } = req.query;

    const alerts = await alertManager.getAlertHistory({
      status,
      severity,
      type,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      alerts,
      count: alerts.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/**
 * Get active alerts (not acknowledged or resolved)
 */
router.get('/active', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const { severity, type, limit = 100 } = req.query;

    const alerts = await alertManager.getActiveAlerts({
      severity,
      type,
      limit: parseInt(limit, 10),
    });

    res.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Failed to get active alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve active alerts' });
  }
});

/**
 * Get alert history
 */
router.get('/history', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const { severity, type, status, limit = 100, offset = 0 } = req.query;

    const alerts = await alertManager.getAlertHistory({
      severity,
      type,
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      alerts,
      count: alerts.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    logger.error('Failed to get alert history', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve alert history' });
  }
});

/**
 * Get alert statistics
 */
router.get('/stats', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const stats = await alertManager.getAlertStats();

    res.json({
      timestamp: new Date().toISOString(),
      ...stats,
      timeSinceLastCriticalFormatted: stats.timeSinceLastCritical
        ? formatDuration(stats.timeSinceLastCritical)
        : null,
    });
  } catch (error) {
    logger.error('Failed to get alert stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve alert statistics' });
  }
});

/**
 * Get available alert rules
 */
router.get('/rules', (req, res) => {
  const rules = getAllAlertRules().map(rule => ({
    type: rule.type,
    title: rule.title,
    description: rule.description,
    severity: rule.severity,
    channels: rule.channels,
    threshold: rule.threshold,
    dedupe: rule.dedupe,
    autoResolve: rule.autoResolve,
    runbook: rule.runbook,
  }));

  res.json({
    rules,
    count: rules.length,
    severityLevels: Object.values(SEVERITY_LEVELS),
    alertStatuses: Object.values(ALERT_STATUS),
  });
});

/**
 * Get single alert by ID
 */
router.get('/:id', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const alertId = parseInt(req.params.id, 10);
    const alert = await alertManager.getAlert(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    logger.error('Failed to get alert', { error: error.message, alertId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve alert' });
  }
});

/**
 * Create an alert
 *
 * Body:
 *   - type: Alert type (required)
 *   - title: Alert title (required if not using predefined type)
 *   - message: Alert message (required if not using predefined type)
 *   - severity: Alert severity (optional, defaults based on type)
 *   - details: Additional details object (optional)
 *   - source: Source service (optional, defaults to 'ops-service')
 */
router.post('/', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const { type, severity, title, message, details, source } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Alert type is required' });
    }

    // Check if using predefined rule
    const rule = getAlertRule(type);
    let alertData;

    if (rule) {
      // Use predefined rule
      alertData = {
        type: rule.type,
        severity: severity || rule.severity,
        title: title || rule.title,
        message: message || buildAlertMessage(rule, details || {}),
        details: details || {},
        source: source || 'ops-service',
        deduplicate: rule.dedupe !== false,
      };
    } else {
      // Custom alert
      if (!title || !message) {
        return res.status(400).json({
          error: 'Custom alerts require title and message',
        });
      }

      const validSeverities = Object.values(SEVERITY_LEVELS);
      if (severity && !validSeverities.includes(severity)) {
        return res.status(400).json({
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
        });
      }

      alertData = {
        type,
        severity: severity || SEVERITY_LEVELS.INFO,
        title,
        message,
        details: details || {},
        source: source || 'ops-service',
      };
    }

    const result = await alertManager.sendAlert(alertData);

    if (result.deduplicated) {
      return res.status(200).json({
        status: 'deduplicated',
        message: 'Alert was deduplicated (similar alert sent recently)',
        dedupHash: result.dedupHash,
      });
    }

    if (result.rateLimited) {
      return res.status(429).json({
        status: 'rate_limited',
        message: 'Alert was rate limited (too many alerts of this type)',
      });
    }

    logger.info('Alert created via API', {
      alertId: result.alertId,
      type: alertData.type,
      severity: alertData.severity,
    });

    res.status(201).json({
      status: 'created',
      alertId: result.alertId,
      channels: result.channels,
    });
  } catch (error) {
    logger.error('Failed to create alert', { error: error.message });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * Acknowledge an alert
 */
router.post('/:id/acknowledge', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const alertId = parseInt(req.params.id, 10);
    const { acknowledged_by } = req.body;

    if (!acknowledged_by) {
      return res.status(400).json({ error: 'acknowledged_by is required' });
    }

    const alert = await alertManager.acknowledgeAlert(alertId, acknowledged_by);

    logger.info('Alert acknowledged', {
      alertId,
      acknowledged_by,
    });

    res.json({
      status: 'acknowledged',
      alert,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already')) {
      return res.status(404).json({ error: error.message });
    }

    logger.error('Failed to acknowledge alert', {
      error: error.message,
      alertId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * Resolve an alert
 */
router.post('/:id/resolve', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const alertId = parseInt(req.params.id, 10);
    const { resolved_by, resolution_notes } = req.body;

    if (!resolved_by) {
      return res.status(400).json({ error: 'resolved_by is required' });
    }

    const alert = await alertManager.resolveAlert(alertId, resolved_by, resolution_notes || '');

    logger.info('Alert resolved', {
      alertId,
      resolved_by,
    });

    res.json({
      status: 'resolved',
      alert,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    logger.error('Failed to resolve alert', {
      error: error.message,
      alertId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

/**
 * Send test alert
 *
 * Query params:
 *   - channel: Specific channel to test (discord, email, sms, pagerduty)
 */
router.post('/test', async (req, res) => {
  const { alertManager, logger } = req.app.locals;

  if (!alertManager) {
    return res.status(503).json({ error: 'Alert manager not initialized' });
  }

  try {
    const { channel } = req.query;

    logger.info('Sending test alert', { channel: channel || 'all' });

    const result = await alertManager.sendTestAlert(channel);

    res.json({
      status: 'sent',
      result,
    });
  } catch (error) {
    logger.error('Failed to send test alert', { error: error.message });
    res.status(500).json({ error: 'Failed to send test alert', details: error.message });
  }
});

/**
 * Format duration in human-readable form
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
  return `${Math.round(ms / 86400000)}d`;
}

export default router;
