/**
 * Notification Service - Stock Trading Automation System
 *
 * Multi-channel notification service supporting Discord and Telegram.
 * Sends alerts for trading events: signals, orders, kills switch, errors, and daily summaries.
 *
 * Environment Variables:
 *   NOTIFICATIONS_ENABLED      - Master toggle for all notifications (default: true)
 *   DISCORD_WEBHOOK_URL        - Discord webhook URL for general alerts
 *   DISCORD_CRITICAL_WEBHOOK_URL - Discord webhook URL for critical alerts (optional)
 *   TELEGRAM_BOT_TOKEN         - Telegram bot token
 *   TELEGRAM_CHAT_ID           - Telegram chat ID
 *   NOTIFICATION_RATE_LIMIT_MS - Minimum time between same notification type (default: 1000)
 *
 * Usage:
 *   import { NotificationService, AlertTypes } from './notifications/index.js';
 *
 *   const notifier = new NotificationService({
 *     logger,
 *     discord: { webhookUrl: '...' },
 *     telegram: { botToken: '...', chatId: '...' },
 *   });
 *
 *   await notifier.sendSignalAlert({
 *     symbol: 'AAPL',
 *     direction: 'BUY',
 *     strategy: 'Momentum',
 *     entry: 185.50,
 *     target: 195.00,
 *     stopLoss: 180.00,
 *     confidence: 0.85,
 *   });
 *
 * Dependencies:
 *   - axios (HTTP client)
 */

import axios from 'axios';

/**
 * Alert type constants
 */
export const AlertTypes = {
  SIGNAL_GENERATED: 'signal_generated',
  ORDER_FILLED: 'order_filled',
  ORDER_REJECTED: 'order_rejected',
  ORDER_CANCELLED: 'order_cancelled',
  KILL_SWITCH_ACTIVATED: 'kill_switch_activated',
  KILL_SWITCH_DEACTIVATED: 'kill_switch_deactivated',
  ERROR: 'error',
  DAILY_SUMMARY: 'daily_summary',
  POSITION_OPENED: 'position_opened',
  POSITION_CLOSED: 'position_closed',
  RISK_ALERT: 'risk_alert',
  MODE_CHANGED: 'mode_changed',
  RECONCILIATION_MISMATCH: 'reconciliation_mismatch',
  SYSTEM_HEALTH: 'system_health',
};

/**
 * Severity levels for alerts
 */
export const Severity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Direction indicator emojis
 */
const DIRECTION_EMOJI = {
  BUY: '\u{1F7E2}',   // Green circle
  SELL: '\u{1F534}',  // Red circle
  LONG: '\u{1F7E2}',  // Green circle
  SHORT: '\u{1F534}', // Red circle
};

/**
 * Severity indicator emojis
 */
const SEVERITY_EMOJI = {
  [Severity.INFO]: '\u{2139}\u{FE0F}',      // Information
  [Severity.WARNING]: '\u{26A0}\u{FE0F}',   // Warning
  [Severity.ERROR]: '\u{274C}',             // Red X
  [Severity.CRITICAL]: '\u{1F6A8}',         // Rotating light
};

/**
 * Discord embed colors by severity
 */
const DISCORD_COLORS = {
  [Severity.INFO]: 0x3498DB,      // Blue
  [Severity.WARNING]: 0xF1C40F,   // Yellow
  [Severity.ERROR]: 0xE74C3C,     // Red
  [Severity.CRITICAL]: 0x9B59B6,  // Purple
  success: 0x2ECC71,              // Green
  neutral: 0x95A5A6,              // Gray
};

/**
 * NotificationService - Multi-channel notification delivery
 */
export class NotificationService {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.enabled = options.enabled !== false;

    // Discord configuration
    this.discord = {
      enabled: !!options.discord?.webhookUrl,
      webhookUrl: options.discord?.webhookUrl,
      criticalWebhookUrl: options.discord?.criticalWebhookUrl,
    };

    // Telegram configuration
    this.telegram = {
      enabled: !!options.telegram?.botToken && !!options.telegram?.chatId,
      botToken: options.telegram?.botToken,
      chatId: options.telegram?.chatId,
      apiUrl: 'https://api.telegram.org',
    };

    // Rate limiting configuration
    this.rateLimit = {
      minIntervalMs: options.rateLimitMs || 1000,
      lastSent: new Map(), // type -> timestamp
    };

    // Statistics
    this.stats = {
      sent: 0,
      failed: 0,
      rateLimited: 0,
      byType: {},
      byChannel: { discord: 0, telegram: 0 },
    };

    this.logger.info('NotificationService initialized', {
      enabled: this.enabled,
      discord: this.discord.enabled,
      telegram: this.telegram.enabled,
    });
  }

  /**
   * Check if notification should be rate limited
   */
  _shouldRateLimit(type) {
    const now = Date.now();
    const lastSent = this.rateLimit.lastSent.get(type);

    if (lastSent && (now - lastSent) < this.rateLimit.minIntervalMs) {
      return true;
    }

    this.rateLimit.lastSent.set(type, now);
    return false;
  }

  /**
   * Send notification to all configured channels
   */
  async send(options) {
    if (!this.enabled) {
      this.logger.debug('Notifications disabled, skipping', { type: options.type });
      return { sent: false, reason: 'disabled' };
    }

    const {
      type,
      severity = Severity.INFO,
      title,
      message,
      fields = [],
      skipRateLimit = false,
      channels = ['discord', 'telegram'],
    } = options;

    // Check rate limiting
    if (!skipRateLimit && this._shouldRateLimit(type)) {
      this.stats.rateLimited++;
      this.logger.debug('Notification rate limited', { type });
      return { sent: false, reason: 'rate_limited' };
    }

    const results = {
      timestamp: new Date().toISOString(),
      type,
      channels: {},
    };

    // Send to Discord
    if (channels.includes('discord') && this.discord.enabled) {
      try {
        await this._sendDiscord({ type, severity, title, message, fields });
        results.channels.discord = { success: true };
        this.stats.byChannel.discord++;
      } catch (error) {
        results.channels.discord = { success: false, error: error.message };
        this.logger.error('Discord notification failed', { type, error: error.message });
      }
    }

    // Send to Telegram
    if (channels.includes('telegram') && this.telegram.enabled) {
      try {
        await this._sendTelegram({ type, severity, title, message, fields });
        results.channels.telegram = { success: true };
        this.stats.byChannel.telegram++;
      } catch (error) {
        results.channels.telegram = { success: false, error: error.message };
        this.logger.error('Telegram notification failed', { type, error: error.message });
      }
    }

    // Update statistics
    const anySuccess = Object.values(results.channels).some(c => c.success);
    if (anySuccess) {
      this.stats.sent++;
      this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
    } else {
      this.stats.failed++;
    }

    return results;
  }

  /**
   * Send Discord notification via webhook
   */
  async _sendDiscord({ type, severity, title, message, fields }) {
    // Use critical webhook for critical severity if available
    const webhookUrl = severity === Severity.CRITICAL && this.discord.criticalWebhookUrl
      ? this.discord.criticalWebhookUrl
      : this.discord.webhookUrl;

    const emoji = SEVERITY_EMOJI[severity] || '';
    const color = DISCORD_COLORS[severity] || DISCORD_COLORS.neutral;

    // Build embed fields
    const embedFields = fields.map(field => ({
      name: field.name,
      value: String(field.value).slice(0, 1024),
      inline: field.inline !== false,
    }));

    const payload = {
      content: severity === Severity.CRITICAL ? '@here' : undefined,
      embeds: [{
        title: `${emoji} ${title}`,
        description: message,
        color,
        fields: embedFields.slice(0, 25), // Discord limit
        timestamp: new Date().toISOString(),
        footer: {
          text: `Stock Trading System | ${type}`,
        },
      }],
    };

    await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Send Telegram notification via Bot API
   */
  async _sendTelegram({ type, severity, title, message, fields }) {
    const emoji = SEVERITY_EMOJI[severity] || '';

    // Build Telegram message with HTML formatting
    let text = `<b>${emoji} ${this._escapeHtml(title)}</b>\n\n`;
    text += `${this._escapeHtml(message)}\n`;

    if (fields.length > 0) {
      text += '\n';
      for (const field of fields) {
        text += `<b>${this._escapeHtml(field.name)}:</b> ${this._escapeHtml(String(field.value))}\n`;
      }
    }

    text += `\n<i>${type} | ${new Date().toISOString()}</i>`;

    const url = `${this.telegram.apiUrl}/bot${this.telegram.botToken}/sendMessage`;

    await axios.post(url, {
      chat_id: this.telegram.chatId,
      text: text.slice(0, 4096), // Telegram limit
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Escape HTML special characters for Telegram
   */
  _escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ===========================================================================
  // Convenience Methods for Common Alert Types
  // ===========================================================================

  /**
   * Send signal generated alert
   */
  async sendSignalAlert(signal) {
    const directionEmoji = DIRECTION_EMOJI[signal.direction?.toUpperCase()] || '';

    return this.send({
      type: AlertTypes.SIGNAL_GENERATED,
      severity: Severity.INFO,
      title: `Signal: ${signal.direction?.toUpperCase()} ${signal.symbol}`,
      message: `New trading signal generated by ${signal.strategy || 'strategy'}`,
      fields: [
        { name: 'Symbol', value: signal.symbol },
        { name: 'Direction', value: `${directionEmoji} ${signal.direction?.toUpperCase()}` },
        { name: 'Strategy', value: signal.strategy || 'N/A' },
        { name: 'Entry', value: signal.entry ? `$${signal.entry.toFixed(2)}` : 'Market' },
        ...(signal.target ? [{ name: 'Target', value: `$${signal.target.toFixed(2)}` }] : []),
        ...(signal.stopLoss ? [{ name: 'Stop Loss', value: `$${signal.stopLoss.toFixed(2)}` }] : []),
        ...(signal.confidence !== undefined ? [{
          name: 'Confidence',
          value: `${(signal.confidence * 100).toFixed(0)}%`,
        }] : []),
        ...(signal.signalId ? [{ name: 'Signal ID', value: signal.signalId }] : []),
      ],
    });
  }

  /**
   * Send order filled alert
   */
  async sendOrderFilledAlert(order) {
    const directionEmoji = DIRECTION_EMOJI[order.side?.toUpperCase()] || '';

    return this.send({
      type: AlertTypes.ORDER_FILLED,
      severity: Severity.INFO,
      title: `Order Filled: ${order.side?.toUpperCase()} ${order.symbol}`,
      message: `Order executed successfully`,
      fields: [
        { name: 'Symbol', value: order.symbol },
        { name: 'Side', value: `${directionEmoji} ${order.side?.toUpperCase()}` },
        { name: 'Quantity', value: order.filledQty || order.quantity },
        { name: 'Price', value: order.avgPrice ? `$${order.avgPrice.toFixed(2)}` : 'N/A' },
        { name: 'Total Value', value: order.avgPrice && order.filledQty
          ? `$${(order.avgPrice * order.filledQty).toFixed(2)}`
          : 'N/A' },
        ...(order.orderId ? [{ name: 'Order ID', value: order.orderId }] : []),
        ...(order.commission !== undefined ? [{
          name: 'Commission',
          value: `$${order.commission.toFixed(2)}`,
        }] : []),
      ],
    });
  }

  /**
   * Send order rejected alert
   */
  async sendOrderRejectedAlert(order) {
    return this.send({
      type: AlertTypes.ORDER_REJECTED,
      severity: Severity.WARNING,
      title: `Order Rejected: ${order.symbol}`,
      message: order.reason || 'Order was rejected',
      fields: [
        { name: 'Symbol', value: order.symbol },
        { name: 'Side', value: order.side?.toUpperCase() || 'N/A' },
        { name: 'Quantity', value: order.quantity || 'N/A' },
        { name: 'Reason', value: order.reason || 'Unknown' },
        ...(order.rejectedBy ? [{ name: 'Rejected By', value: order.rejectedBy }] : []),
        ...(order.orderId ? [{ name: 'Order ID', value: order.orderId }] : []),
      ],
    });
  }

  /**
   * Send kill switch activated alert
   */
  async sendKillSwitchActivatedAlert(data) {
    return this.send({
      type: AlertTypes.KILL_SWITCH_ACTIVATED,
      severity: Severity.CRITICAL,
      title: 'KILL SWITCH ACTIVATED',
      message: `All trading has been halted immediately. Reason: ${data.reason || 'Manual activation'}`,
      fields: [
        { name: 'Reason', value: data.reason || 'Manual activation' },
        { name: 'Triggered By', value: data.triggeredBy || 'System' },
        { name: 'Time', value: new Date().toISOString() },
        ...(data.affectedOrders !== undefined ? [{
          name: 'Affected Orders',
          value: data.affectedOrders,
        }] : []),
      ],
      skipRateLimit: true, // Critical alerts should never be rate limited
    });
  }

  /**
   * Send kill switch deactivated alert
   */
  async sendKillSwitchDeactivatedAlert(data) {
    return this.send({
      type: AlertTypes.KILL_SWITCH_DEACTIVATED,
      severity: Severity.WARNING,
      title: 'Kill Switch Deactivated',
      message: 'Trading operations have resumed',
      fields: [
        { name: 'Deactivated By', value: data.deactivatedBy || 'System' },
        { name: 'Time', value: new Date().toISOString() },
        ...(data.notes ? [{ name: 'Notes', value: data.notes }] : []),
      ],
      skipRateLimit: true,
    });
  }

  /**
   * Send error alert
   */
  async sendErrorAlert(error) {
    const severity = error.critical ? Severity.CRITICAL : Severity.ERROR;

    return this.send({
      type: AlertTypes.ERROR,
      severity,
      title: error.title || 'System Error',
      message: error.message || 'An error occurred',
      fields: [
        { name: 'Service', value: error.service || 'Unknown' },
        { name: 'Error Type', value: error.errorType || error.name || 'Error' },
        ...(error.code ? [{ name: 'Error Code', value: error.code }] : []),
        ...(error.stack ? [{
          name: 'Stack Trace',
          value: `\`\`\`${error.stack.slice(0, 500)}\`\`\``,
          inline: false,
        }] : []),
      ],
      skipRateLimit: error.critical,
    });
  }

  /**
   * Send daily summary alert
   */
  async sendDailySummaryAlert(summary) {
    const pnlEmoji = summary.totalPnl >= 0 ? '\u{1F4C8}' : '\u{1F4C9}'; // Chart up/down
    const pnlColor = summary.totalPnl >= 0 ? 'success' : Severity.WARNING;

    return this.send({
      type: AlertTypes.DAILY_SUMMARY,
      severity: Severity.INFO,
      title: `${pnlEmoji} Daily Trading Summary`,
      message: `Performance report for ${summary.date || new Date().toISOString().split('T')[0]}`,
      fields: [
        { name: 'Total P&L', value: `$${summary.totalPnl?.toFixed(2) || '0.00'}` },
        { name: 'Win Rate', value: summary.winRate ? `${(summary.winRate * 100).toFixed(1)}%` : 'N/A' },
        { name: 'Total Trades', value: summary.totalTrades || 0 },
        { name: 'Winners', value: summary.winners || 0 },
        { name: 'Losers', value: summary.losers || 0 },
        { name: 'Open Positions', value: summary.openPositions || 0 },
        ...(summary.bestTrade ? [{
          name: 'Best Trade',
          value: `${summary.bestTrade.symbol} +$${summary.bestTrade.pnl?.toFixed(2)}`,
        }] : []),
        ...(summary.worstTrade ? [{
          name: 'Worst Trade',
          value: `${summary.worstTrade.symbol} -$${Math.abs(summary.worstTrade.pnl)?.toFixed(2)}`,
        }] : []),
        ...(summary.portfolioValue !== undefined ? [{
          name: 'Portfolio Value',
          value: `$${summary.portfolioValue.toFixed(2)}`,
        }] : []),
      ],
      skipRateLimit: true,
    });
  }

  /**
   * Send position opened alert
   */
  async sendPositionOpenedAlert(position) {
    const directionEmoji = DIRECTION_EMOJI[position.side?.toUpperCase()] || '';

    return this.send({
      type: AlertTypes.POSITION_OPENED,
      severity: Severity.INFO,
      title: `Position Opened: ${position.side?.toUpperCase()} ${position.symbol}`,
      message: `New position established`,
      fields: [
        { name: 'Symbol', value: position.symbol },
        { name: 'Side', value: `${directionEmoji} ${position.side?.toUpperCase()}` },
        { name: 'Quantity', value: position.quantity },
        { name: 'Entry Price', value: `$${position.entryPrice?.toFixed(2) || 'N/A'}` },
        { name: 'Position Value', value: position.entryPrice && position.quantity
          ? `$${(position.entryPrice * position.quantity).toFixed(2)}`
          : 'N/A' },
        ...(position.strategy ? [{ name: 'Strategy', value: position.strategy }] : []),
      ],
    });
  }

  /**
   * Send position closed alert
   */
  async sendPositionClosedAlert(position) {
    const pnlEmoji = position.pnl >= 0 ? '\u{1F4B0}' : '\u{1F4B8}'; // Money bag / money with wings
    const severity = position.pnl >= 0 ? Severity.INFO : Severity.WARNING;

    return this.send({
      type: AlertTypes.POSITION_CLOSED,
      severity,
      title: `Position Closed: ${position.symbol}`,
      message: `${pnlEmoji} P&L: $${position.pnl?.toFixed(2) || '0.00'}`,
      fields: [
        { name: 'Symbol', value: position.symbol },
        { name: 'P&L', value: `$${position.pnl?.toFixed(2) || '0.00'}` },
        { name: 'P&L %', value: position.pnlPercent ? `${position.pnlPercent.toFixed(2)}%` : 'N/A' },
        { name: 'Entry Price', value: `$${position.entryPrice?.toFixed(2) || 'N/A'}` },
        { name: 'Exit Price', value: `$${position.exitPrice?.toFixed(2) || 'N/A'}` },
        { name: 'Quantity', value: position.quantity || 'N/A' },
        { name: 'Hold Time', value: position.holdTime || 'N/A' },
      ],
    });
  }

  /**
   * Send risk alert
   */
  async sendRiskAlert(risk) {
    const severity = risk.severity || (risk.critical ? Severity.CRITICAL : Severity.WARNING);

    return this.send({
      type: AlertTypes.RISK_ALERT,
      severity,
      title: risk.title || 'Risk Alert',
      message: risk.message,
      fields: [
        { name: 'Risk Type', value: risk.riskType || 'Unknown' },
        ...(risk.currentValue !== undefined ? [{
          name: 'Current Value',
          value: risk.currentValue,
        }] : []),
        ...(risk.threshold !== undefined ? [{
          name: 'Threshold',
          value: risk.threshold,
        }] : []),
        ...(risk.symbol ? [{ name: 'Symbol', value: risk.symbol }] : []),
        ...(risk.actionRequired ? [{ name: 'Action Required', value: risk.actionRequired }] : []),
      ],
      skipRateLimit: risk.critical,
    });
  }

  /**
   * Send mode changed alert
   */
  async sendModeChangedAlert(data) {
    const severity = data.newMode === 'LIVE' ? Severity.WARNING : Severity.INFO;

    return this.send({
      type: AlertTypes.MODE_CHANGED,
      severity,
      title: `Trading Mode Changed: ${data.newMode}`,
      message: `Trading mode switched from ${data.previousMode} to ${data.newMode}`,
      fields: [
        { name: 'Previous Mode', value: data.previousMode },
        { name: 'New Mode', value: data.newMode },
        { name: 'Changed By', value: data.changedBy || 'System' },
        ...(data.reason ? [{ name: 'Reason', value: data.reason }] : []),
      ],
      skipRateLimit: true,
    });
  }

  /**
   * Send reconciliation mismatch alert
   */
  async sendReconciliationMismatchAlert(data) {
    return this.send({
      type: AlertTypes.RECONCILIATION_MISMATCH,
      severity: Severity.ERROR,
      title: 'Position Reconciliation Mismatch',
      message: `Discrepancy detected between internal and broker positions`,
      fields: [
        { name: 'Symbol', value: data.symbol },
        { name: 'Internal Qty', value: data.internalQty },
        { name: 'Broker Qty', value: data.brokerQty },
        { name: 'Difference', value: data.difference },
        { name: 'Mismatch Type', value: data.mismatchType || 'quantity' },
      ],
      skipRateLimit: true,
    });
  }

  /**
   * Send system health alert
   */
  async sendSystemHealthAlert(data) {
    const severity = data.status === 'degraded' ? Severity.WARNING :
      data.status === 'unhealthy' ? Severity.ERROR : Severity.INFO;

    const fields = [
      { name: 'Overall Status', value: data.status },
    ];

    // Add service-specific health
    if (data.services) {
      for (const [service, status] of Object.entries(data.services)) {
        fields.push({
          name: service.charAt(0).toUpperCase() + service.slice(1),
          value: status.status || status,
        });
      }
    }

    return this.send({
      type: AlertTypes.SYSTEM_HEALTH,
      severity,
      title: `System Health: ${data.status?.toUpperCase()}`,
      message: data.message || `System health status changed to ${data.status}`,
      fields,
      skipRateLimit: data.status !== 'healthy',
    });
  }

  /**
   * Send test notification
   */
  async sendTestNotification(channel = null) {
    const options = {
      type: 'test_notification',
      severity: Severity.INFO,
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      fields: [
        { name: 'Test', value: 'true' },
        { name: 'Timestamp', value: new Date().toISOString() },
        { name: 'Requested Channel', value: channel || 'all' },
      ],
      skipRateLimit: true,
    };

    if (channel) {
      options.channels = [channel];
    }

    return this.send(options);
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      channels: {
        discord: this.discord.enabled,
        telegram: this.telegram.enabled,
      },
    };
  }

  /**
   * Get service health status
   */
  getHealth() {
    return {
      enabled: this.enabled,
      channels: {
        discord: {
          enabled: this.discord.enabled,
          configured: !!this.discord.webhookUrl,
        },
        telegram: {
          enabled: this.telegram.enabled,
          configured: !!this.telegram.botToken && !!this.telegram.chatId,
        },
      },
      stats: {
        sent: this.stats.sent,
        failed: this.stats.failed,
        rateLimited: this.stats.rateLimited,
      },
    };
  }
}

export default NotificationService;
