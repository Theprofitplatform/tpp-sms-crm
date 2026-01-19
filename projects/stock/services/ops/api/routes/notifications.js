/**
 * Notification API Routes - Stock Trading Automation System
 *
 * REST API endpoints for the notification service.
 * Supports Discord and Telegram notifications for trading events.
 *
 * Endpoints:
 *   GET  /api/v1/notifications/health   - Get notification service health
 *   GET  /api/v1/notifications/stats    - Get notification statistics
 *   POST /api/v1/notifications/test     - Send test notification
 *   POST /api/v1/notifications/signal   - Send signal notification
 *   POST /api/v1/notifications/order    - Send order notification
 *   POST /api/v1/notifications/alert    - Send custom alert
 *   POST /api/v1/notifications/webhook/signal  - Webhook for signal events
 *   POST /api/v1/notifications/webhook/order   - Webhook for order events
 *   POST /api/v1/notifications/webhook/killswitch - Webhook for kill switch
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /health - Get notification service health status
 */
router.get('/health', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  if (!notificationService) {
    return res.status(503).json({
      status: 'unavailable',
      error: 'Notification service not initialized',
    });
  }

  const health = notificationService.getHealth();

  res.json({
    status: health.enabled ? 'healthy' : 'disabled',
    timestamp: new Date().toISOString(),
    ...health,
  });
});

/**
 * GET /stats - Get notification statistics
 */
router.get('/stats', async (req, res) => {
  const { notificationService } = req.app.locals;

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const stats = notificationService.getStats();

  res.json({
    timestamp: new Date().toISOString(),
    ...stats,
  });
});

/**
 * POST /test - Send test notification
 * Query params: ?channel=discord|telegram|all
 */
router.post('/test', async (req, res) => {
  const { notificationService, logger } = req.app.locals;
  const channel = req.query.channel || null;

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  logger.info('Test notification requested', { channel });

  try {
    const result = await notificationService.sendTestNotification(channel);

    res.json({
      status: 'sent',
      ...result,
    });
  } catch (error) {
    logger.error('Test notification failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /signal - Send signal notification
 * Body: { symbol, direction, strategy, entry, target, stopLoss, confidence, signalId }
 */
router.post('/signal', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const { symbol, direction, strategy, entry, target, stopLoss, confidence, signalId } = req.body;

  if (!symbol || !direction) {
    return res.status(400).json({
      error: 'Missing required fields: symbol, direction',
    });
  }

  logger.info('Signal notification requested', { symbol, direction, strategy });

  try {
    const result = await notificationService.sendSignalAlert({
      symbol,
      direction,
      strategy,
      entry,
      target,
      stopLoss,
      confidence,
      signalId,
    });

    res.json({
      status: 'sent',
      ...result,
    });
  } catch (error) {
    logger.error('Signal notification failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /order - Send order notification
 * Body: { symbol, side, quantity, avgPrice, filledQty, orderId, status, reason, commission }
 */
router.post('/order', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const { symbol, side, quantity, avgPrice, filledQty, orderId, status, reason, commission } = req.body;

  if (!symbol || !side) {
    return res.status(400).json({
      error: 'Missing required fields: symbol, side',
    });
  }

  logger.info('Order notification requested', { symbol, side, status });

  try {
    let result;

    if (status === 'filled' || filledQty) {
      result = await notificationService.sendOrderFilledAlert({
        symbol,
        side,
        quantity,
        avgPrice,
        filledQty: filledQty || quantity,
        orderId,
        commission,
      });
    } else if (status === 'rejected') {
      result = await notificationService.sendOrderRejectedAlert({
        symbol,
        side,
        quantity,
        orderId,
        reason: reason || 'Order rejected',
      });
    } else {
      // Generic order notification
      result = await notificationService.send({
        type: 'order_update',
        severity: 'info',
        title: `Order Update: ${symbol}`,
        message: `Order ${status || 'updated'}`,
        fields: [
          { name: 'Symbol', value: symbol },
          { name: 'Side', value: side },
          { name: 'Quantity', value: quantity },
          { name: 'Status', value: status || 'unknown' },
        ],
      });
    }

    res.json({
      status: 'sent',
      ...result,
    });
  } catch (error) {
    logger.error('Order notification failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /alert - Send custom alert
 * Body: { type, severity, title, message, fields, channels }
 */
router.post('/alert', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const { type, severity, title, message, fields, channels } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      error: 'Missing required fields: title, message',
    });
  }

  logger.info('Custom alert requested', { type, severity, title });

  try {
    const result = await notificationService.send({
      type: type || 'custom_alert',
      severity: severity || 'info',
      title,
      message,
      fields: fields || [],
      channels: channels || ['discord', 'telegram'],
    });

    res.json({
      status: 'sent',
      ...result,
    });
  } catch (error) {
    logger.error('Custom alert failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

// =============================================================================
// Webhook Endpoints - For internal service-to-service notifications
// =============================================================================

/**
 * POST /webhook/signal - Internal webhook for signal events
 * Used by Signal Service to notify on new signals
 */
router.post('/webhook/signal', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const {
    signal_id,
    symbol,
    direction,
    strategy_id,
    strategy_name,
    confidence,
    entry_price,
    target_price,
    stop_loss,
  } = req.body;

  if (!symbol || !direction) {
    return res.status(400).json({
      error: 'Missing required fields: symbol, direction',
    });
  }

  logger.debug('Signal webhook received', { signal_id, symbol, direction });

  try {
    const result = await notificationService.sendSignalAlert({
      signalId: signal_id,
      symbol,
      direction,
      strategy: strategy_name || strategy_id,
      entry: entry_price,
      target: target_price,
      stopLoss: stop_loss,
      confidence,
    });

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Signal webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /webhook/order - Internal webhook for order events
 * Used by Execution Service to notify on order fills/rejections
 */
router.post('/webhook/order', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const {
    event_type,  // 'fill', 'reject', 'cancel'
    order_id,
    symbol,
    side,
    quantity,
    filled_qty,
    avg_price,
    commission,
    reason,
    rejected_by,
  } = req.body;

  if (!symbol || !event_type) {
    return res.status(400).json({
      error: 'Missing required fields: symbol, event_type',
    });
  }

  logger.debug('Order webhook received', { event_type, order_id, symbol });

  try {
    let result;

    switch (event_type) {
      case 'fill':
        result = await notificationService.sendOrderFilledAlert({
          orderId: order_id,
          symbol,
          side,
          quantity,
          filledQty: filled_qty || quantity,
          avgPrice: avg_price,
          commission,
        });
        break;

      case 'reject':
        result = await notificationService.sendOrderRejectedAlert({
          orderId: order_id,
          symbol,
          side,
          quantity,
          reason,
          rejectedBy: rejected_by,
        });
        break;

      case 'cancel':
        result = await notificationService.send({
          type: 'order_cancelled',
          severity: 'warning',
          title: `Order Cancelled: ${symbol}`,
          message: reason || 'Order was cancelled',
          fields: [
            { name: 'Symbol', value: symbol },
            { name: 'Order ID', value: order_id || 'N/A' },
            { name: 'Reason', value: reason || 'Unknown' },
          ],
        });
        break;

      default:
        return res.status(400).json({
          error: `Unknown event_type: ${event_type}`,
        });
    }

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Order webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /webhook/killswitch - Internal webhook for kill switch events
 * Used by Risk Service to notify on kill switch activation/deactivation
 */
router.post('/webhook/killswitch', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const {
    event_type,  // 'activated', 'deactivated'
    reason,
    triggered_by,
    deactivated_by,
    affected_orders,
    notes,
  } = req.body;

  if (!event_type) {
    return res.status(400).json({
      error: 'Missing required field: event_type',
    });
  }

  logger.info('Kill switch webhook received', { event_type, reason });

  try {
    let result;

    if (event_type === 'activated') {
      result = await notificationService.sendKillSwitchActivatedAlert({
        reason,
        triggeredBy: triggered_by,
        affectedOrders: affected_orders,
      });
    } else if (event_type === 'deactivated') {
      result = await notificationService.sendKillSwitchDeactivatedAlert({
        deactivatedBy: deactivated_by,
        notes,
      });
    } else {
      return res.status(400).json({
        error: `Unknown event_type: ${event_type}`,
      });
    }

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Kill switch webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /webhook/error - Internal webhook for error events
 */
router.post('/webhook/error', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const { service, error_type, title, message, code, stack, critical } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Missing required field: message',
    });
  }

  logger.warn('Error webhook received', { service, error_type, title, critical });

  try {
    const result = await notificationService.sendErrorAlert({
      service,
      errorType: error_type,
      title: title || 'Service Error',
      message,
      code,
      stack,
      critical: critical === true,
    });

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Error webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /webhook/daily-summary - Internal webhook for daily summary
 */
router.post('/webhook/daily-summary', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const summary = req.body;

  logger.info('Daily summary webhook received', { date: summary.date });

  try {
    const result = await notificationService.sendDailySummaryAlert(summary);

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Daily summary webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * POST /webhook/position - Internal webhook for position events
 */
router.post('/webhook/position', async (req, res) => {
  const { notificationService, logger } = req.app.locals;

  // Optional: Verify internal webhook token
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== internalToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!notificationService) {
    return res.status(503).json({
      error: 'Notification service not initialized',
    });
  }

  const {
    event_type,  // 'opened', 'closed'
    symbol,
    side,
    quantity,
    entry_price,
    exit_price,
    pnl,
    pnl_percent,
    strategy,
    hold_time,
  } = req.body;

  if (!event_type || !symbol) {
    return res.status(400).json({
      error: 'Missing required fields: event_type, symbol',
    });
  }

  logger.debug('Position webhook received', { event_type, symbol });

  try {
    let result;

    if (event_type === 'opened') {
      result = await notificationService.sendPositionOpenedAlert({
        symbol,
        side,
        quantity,
        entryPrice: entry_price,
        strategy,
      });
    } else if (event_type === 'closed') {
      result = await notificationService.sendPositionClosedAlert({
        symbol,
        quantity,
        entryPrice: entry_price,
        exitPrice: exit_price,
        pnl,
        pnlPercent: pnl_percent,
        holdTime: hold_time,
      });
    } else {
      return res.status(400).json({
        error: `Unknown event_type: ${event_type}`,
      });
    }

    res.json({
      status: 'processed',
      notificationResult: result,
    });
  } catch (error) {
    logger.error('Position webhook processing failed', { error: error.message });
    res.status(500).json({
      status: 'failed',
      error: error.message,
    });
  }
});

export default router;
