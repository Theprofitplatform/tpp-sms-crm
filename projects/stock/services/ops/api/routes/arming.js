/**
 * Arming Routes
 *
 * API endpoints for LIVE mode arming safety controls.
 * Provides two-condition LIVE requirement (env var + DB flag).
 *
 * SECURITY MEASURES:
 *   - Rate limited to 3 attempts per hour per IP
 *   - IPs blocked after 5 failed attempts (24h ban)
 *   - All attempts logged with IP and timestamp
 *   - Confirmation codes expire after 5 minutes
 *
 * Endpoints:
 *   POST /api/v1/arming/request  - Request arming (generates confirmation code)
 *   POST /api/v1/arming/confirm  - Confirm arming with code
 *   POST /api/v1/arming/disarm   - Disarm the system
 *   GET  /api/v1/arming/status   - Get current arming status
 *   GET  /api/v1/arming/history  - Get arming event history
 *   GET  /api/v1/arming/security - Get arming security status (admin only)
 */

import { Router } from 'express';
import {
  createArmingRateLimitMiddleware,
  recordFailedArmingAttempt,
  getArmingRateLimiterStatus,
  unblockIP,
} from '../../middleware/auth.js';

const router = Router();

// Apply arming-specific rate limiting to all arming endpoints
// This enforces 3 requests/hour and blocks IPs after 5 failures
const armingRateLimiter = createArmingRateLimitMiddleware();

/**
 * POST /api/v1/arming/request
 * Request arming - generates a 6-digit confirmation code
 *
 * RATE LIMITED: 3 requests per hour per IP
 * SECURITY: IPs blocked after 5 failed attempts
 *
 * Body:
 *   - requested_by: (optional) identifier of who is requesting
 *
 * Returns:
 *   - code: The 6-digit confirmation code
 *   - expires_at: When the code expires
 *   - warning: Safety warning message
 */
router.post('/request', armingRateLimiter, (req, res) => {
  const { logger, armingManager } = req.app.locals;
  const { requested_by } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!armingManager) {
    return res.status(503).json({
      error: 'Arming system not initialized',
      message: 'The arming system is not available. Check server configuration.',
    });
  }

  try {
    const result = armingManager.requestArming(requested_by || 'api', ipAddress);

    if (!result.success) {
      // Record failed attempt for IP blocking
      const blockResult = recordFailedArmingAttempt(ipAddress);

      logger.warn('Arming request failed', {
        requested_by: requested_by || 'api',
        ip: ipAddress,
        error: result.error,
        failed_attempts: blockResult.failedCount,
        blocked: blockResult.blocked,
      });

      return res.status(400).json({
        ...result,
        security: {
          remaining_attempts: blockResult.remainingAttempts,
          blocked: blockResult.blocked,
        },
      });
    }

    logger.warn('Arming request initiated', {
      requested_by: requested_by || 'api',
      ip: ipAddress,
      expires_at: result.expires_at,
    });

    res.json({
      ...result,
      rate_limit: {
        remaining: req.armingRateLimit?.remaining,
        limit: req.armingRateLimit?.limit,
        window: 'hour',
      },
    });
  } catch (error) {
    logger.error('Arming request failed', { error: error.message, ip: ipAddress });
    res.status(500).json({ error: 'Failed to request arming', details: error.message });
  }
});

/**
 * POST /api/v1/arming/confirm
 * Confirm arming with the provided confirmation code
 *
 * RATE LIMITED: 3 requests per hour per IP
 * SECURITY: Wrong codes count as failed attempts, IPs blocked after 5 failures
 *
 * Body:
 *   - code: The 6-digit confirmation code
 *
 * Returns:
 *   - armed_at: When the system was armed
 *   - expires_at: When arming expires (24h)
 */
router.post('/confirm', armingRateLimiter, (req, res) => {
  const { logger, armingManager } = req.app.locals;
  const { code } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!armingManager) {
    return res.status(503).json({
      error: 'Arming system not initialized',
      message: 'The arming system is not available. Check server configuration.',
    });
  }

  if (!code) {
    // Record failed attempt
    const blockResult = recordFailedArmingAttempt(ipAddress);

    logger.warn('Arming confirm missing code', {
      ip: ipAddress,
      failed_attempts: blockResult.failedCount,
    });

    return res.status(400).json({
      error: 'Confirmation code is required',
      message: 'Please provide the 6-digit confirmation code.',
      security: {
        remaining_attempts: blockResult.remainingAttempts,
        blocked: blockResult.blocked,
      },
    });
  }

  try {
    const result = armingManager.confirmArming(code, ipAddress);

    if (!result.success) {
      // Record failed attempt - wrong code is a security event
      const blockResult = recordFailedArmingAttempt(ipAddress);

      logger.warn('Arming confirmation failed - invalid code', {
        ip: ipAddress,
        error: result.error,
        failed_attempts: blockResult.failedCount,
        blocked: blockResult.blocked,
      });

      return res.status(400).json({
        ...result,
        security: {
          remaining_attempts: blockResult.remainingAttempts,
          blocked: blockResult.blocked,
          warning: blockResult.blocked
            ? 'Your IP has been blocked due to too many failed attempts'
            : `${blockResult.remainingAttempts} attempts remaining before IP block`,
        },
      });
    }

    logger.warn('System ARMED for LIVE trading', {
      ip: ipAddress,
      armed_at: result.armed_at,
      expires_at: result.expires_at,
    });

    res.json(result);
  } catch (error) {
    logger.error('Arming confirmation failed', { error: error.message, ip: ipAddress });
    res.status(500).json({ error: 'Failed to confirm arming', details: error.message });
  }
});

/**
 * POST /api/v1/arming/disarm
 * Disarm the system - disables LIVE trading capability
 *
 * Body:
 *   - reason: (optional) Reason for disarming
 *   - disarmed_by: (optional) Who is disarming
 *
 * Returns:
 *   - previous_mode: Mode before disarming
 *   - current_mode: Mode after disarming (PAPER if was LIVE)
 */
router.post('/disarm', (req, res) => {
  const { logger, armingManager } = req.app.locals;
  const { reason, disarmed_by } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!armingManager) {
    return res.status(503).json({
      error: 'Arming system not initialized',
      message: 'The arming system is not available. Check server configuration.',
    });
  }

  try {
    const result = armingManager.disarm(
      disarmed_by || 'api',
      reason || 'Manual disarm via API',
      ipAddress
    );

    logger.warn('System DISARMED', {
      disarmed_by: disarmed_by || 'api',
      reason: reason || 'Manual disarm via API',
      ip: ipAddress,
      previous_mode: result.previous_mode,
    });

    res.json(result);
  } catch (error) {
    logger.error('Disarm failed', { error: error.message });
    res.status(500).json({ error: 'Failed to disarm system', details: error.message });
  }
});

/**
 * GET /api/v1/arming/status
 * Get current arming status
 *
 * Returns:
 *   - status: ARMED, DISARMED, or LIVE_DISABLED
 *   - live_enabled: Whether LIVE_ENABLE env var is set
 *   - armed: Whether system is armed
 *   - can_activate_live: Whether LIVE mode can be activated
 *   - armed_at: When armed (if armed)
 *   - expires_at: When arming expires (if armed)
 *   - expires_in_hours: Hours until expiry (if armed)
 */
router.get('/status', (req, res) => {
  const { logger, armingManager } = req.app.locals;

  if (!armingManager) {
    return res.status(503).json({
      error: 'Arming system not initialized',
      message: 'The arming system is not available. Check server configuration.',
    });
  }

  try {
    const status = armingManager.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get arming status', { error: error.message });
    res.status(500).json({ error: 'Failed to get arming status', details: error.message });
  }
});

/**
 * GET /api/v1/arming/history
 * Get arming event history
 *
 * Query params:
 *   - limit: Maximum number of events to return (default: 50)
 *
 * Returns:
 *   - events: Array of arming events
 */
router.get('/history', (req, res) => {
  const { logger, armingManager } = req.app.locals;
  const limit = parseInt(req.query.limit, 10) || 50;

  if (!armingManager) {
    return res.status(503).json({
      error: 'Arming system not initialized',
      message: 'The arming system is not available. Check server configuration.',
    });
  }

  try {
    const events = armingManager.getArmingHistory(limit);
    res.json({
      total: events.length,
      events: events.map(e => ({
        ...e,
        // Mask confirmation code for security
        confirmation_code: e.confirmation_code ? '******' : null,
      })),
    });
  } catch (error) {
    logger.error('Failed to get arming history', { error: error.message });
    res.status(500).json({ error: 'Failed to get arming history', details: error.message });
  }
});

/**
 * GET /api/v1/arming/check
 * Quick check if LIVE mode can be activated
 * Used by mode switching logic
 *
 * Returns:
 *   - can_go_live: Boolean
 *   - reason: If false, why LIVE is not available
 */
router.get('/check', (req, res) => {
  const { armingManager } = req.app.locals;

  if (!armingManager) {
    return res.json({
      can_go_live: false,
      reason: 'Arming system not initialized',
    });
  }

  try {
    const status = armingManager.getStatus();

    if (!status.live_enabled) {
      return res.json({
        can_go_live: false,
        reason: 'LIVE_ENABLE environment variable is not set to true',
      });
    }

    if (!status.armed) {
      return res.json({
        can_go_live: false,
        reason: 'System is not armed. Request arming first via /api/v1/arming/request',
      });
    }

    if (status.kill_switch_active) {
      return res.json({
        can_go_live: false,
        reason: 'Kill switch is active. Deactivate kill switch first.',
      });
    }

    res.json({
      can_go_live: true,
      armed_at: status.armed_at,
      expires_at: status.expires_at,
      expires_in_hours: status.expires_in_hours,
    });
  } catch (error) {
    res.json({
      can_go_live: false,
      reason: `Error checking arming status: ${error.message}`,
    });
  }
});

/**
 * GET /api/v1/arming/security
 * Get arming security status including blocked IPs
 * Requires admin role
 *
 * Returns:
 *   - blockedIPs: Array of blocked IP addresses
 *   - config: Rate limiter configuration
 */
router.get('/security', (req, res) => {
  const { logger } = req.app.locals;

  try {
    const status = getArmingRateLimiterStatus();
    res.json({
      timestamp: new Date().toISOString(),
      ...status,
    });
  } catch (error) {
    logger.error('Failed to get arming security status', { error: error.message });
    res.status(500).json({ error: 'Failed to get security status' });
  }
});

/**
 * POST /api/v1/arming/security/unblock
 * Unblock a blocked IP address
 * Requires admin role
 *
 * Body:
 *   - ip: IP address to unblock
 *   - reason: Reason for unblocking
 */
router.post('/security/unblock', (req, res) => {
  const { logger } = req.app.locals;
  const { ip, reason } = req.body;
  const adminIp = req.ip || req.connection.remoteAddress;

  if (!ip) {
    return res.status(400).json({
      error: 'IP address is required',
    });
  }

  try {
    unblockIP(ip);

    logger.warn('Arming IP unblocked', {
      unblocked_ip: ip,
      unblocked_by_ip: adminIp,
      reason: reason || 'Manual unblock via API',
    });

    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
      unblocked_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to unblock IP', { error: error.message, ip });
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

export default router;
