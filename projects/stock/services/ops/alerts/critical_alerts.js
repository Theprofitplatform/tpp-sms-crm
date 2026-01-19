/**
 * Critical Alerts Handler - Stock Trading Automation System
 *
 * Provides direct critical alert delivery that bypasses Alertmanager.
 * This ensures critical alerts (kill switch, position mismatch) reach
 * operators even if Prometheus/Alertmanager are down.
 *
 * Features:
 *   - Direct Discord webhook for immediate notification
 *   - SMS via Twilio for critical escalation
 *   - PagerDuty integration for on-call alerting
 *   - Local fallback logging when all channels fail
 *   - Health tracking for monitoring alert system status
 *
 * Usage:
 *   import { CriticalAlertHandler } from './alerts/critical_alerts.js';
 *
 *   const handler = new CriticalAlertHandler({
 *     logger: logger,
 *     discord: { webhookUrl: process.env.DISCORD_CRITICAL_WEBHOOK_URL },
 *     sms: { twilioSid: '...', authToken: '...', from: '...', to: '...' },
 *     pagerduty: { routingKey: '...' },
 *   });
 *
 *   await handler.sendKillSwitchAlert({ reason: 'Manual activation' });
 *   await handler.sendPositionMismatchAlert({ symbol: 'AAPL', internal: 100, broker: 0 });
 *
 * Dependencies:
 *   - axios (HTTP client)
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

/**
 * Critical alert types
 */
export const CRITICAL_ALERT_TYPES = {
  KILL_SWITCH: 'kill_switch',
  POSITION_MISMATCH: 'position_mismatch',
  DRAWDOWN_BREACH: 'drawdown_breach',
  SERVICE_DOWN: 'service_down',
  DATA_STALE: 'data_stale',
  ALERT_SYSTEM_FAILURE: 'alert_system_failure',
};

/**
 * CriticalAlertHandler - Direct critical alert delivery
 *
 * Bypasses Alertmanager to ensure critical alerts are always delivered.
 */
export class CriticalAlertHandler {
  constructor(options = {}) {
    this.logger = options.logger || console;

    // Discord configuration
    this.discord = {
      enabled: !!options.discord?.webhookUrl,
      webhookUrl: options.discord?.webhookUrl,
      criticalWebhookUrl: options.discord?.criticalWebhookUrl || options.discord?.webhookUrl,
    };

    // SMS (Twilio) configuration
    this.sms = {
      enabled: !!options.sms?.twilioSid,
      twilioSid: options.sms?.twilioSid,
      authToken: options.sms?.authToken,
      from: options.sms?.from,
      to: options.sms?.to,
    };

    // PagerDuty configuration
    this.pagerduty = {
      enabled: !!options.pagerduty?.routingKey,
      routingKey: options.pagerduty?.routingKey,
    };

    // Fallback log directory for when all channels fail
    this.fallbackLogDir = options.fallbackLogDir || './data/critical_alerts';

    // Health tracking
    this.health = {
      lastSuccessfulAlert: null,
      lastFailedAlert: null,
      consecutiveFailures: 0,
      totalAlertsSent: 0,
      channelStatus: {
        discord: { healthy: true, lastAttempt: null, lastError: null },
        sms: { healthy: true, lastAttempt: null, lastError: null },
        pagerduty: { healthy: true, lastAttempt: null, lastError: null },
      },
    };

    // Twilio client (lazy initialized)
    this._twilioClient = null;

    this.logger.info('CriticalAlertHandler initialized', {
      discord: this.discord.enabled,
      sms: this.sms.enabled,
      pagerduty: this.pagerduty.enabled,
    });
  }

  /**
   * Get Twilio client (lazy initialization)
   */
  async _getTwilioClient() {
    if (!this._twilioClient && this.sms.enabled) {
      try {
        const twilio = await import('twilio');
        this._twilioClient = twilio.default(
          this.sms.twilioSid,
          this.sms.authToken
        );
      } catch (error) {
        this.logger.warn('Twilio not available', { error: error.message });
        this.sms.enabled = false;
      }
    }
    return this._twilioClient;
  }

  /**
   * Send a critical alert to all available channels
   */
  async sendCriticalAlert(alert) {
    const timestamp = new Date().toISOString();
    const alertWithMeta = {
      ...alert,
      timestamp,
      alertId: `critical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.logger.warn('Sending critical alert', {
      type: alert.type,
      title: alert.title,
      alertId: alertWithMeta.alertId,
    });

    const results = {
      discord: null,
      sms: null,
      pagerduty: null,
      fallback: null,
    };

    let anySuccess = false;

    // 1. Try Discord first (fastest)
    if (this.discord.enabled) {
      try {
        results.discord = await this._sendDiscord(alertWithMeta);
        anySuccess = true;
        this._updateChannelHealth('discord', true);
      } catch (error) {
        results.discord = { error: error.message };
        this._updateChannelHealth('discord', false, error.message);
        this.logger.error('Discord critical alert failed', { error: error.message });
      }
    }

    // 2. Try SMS for immediate escalation
    if (this.sms.enabled) {
      try {
        results.sms = await this._sendSMS(alertWithMeta);
        anySuccess = true;
        this._updateChannelHealth('sms', true);
      } catch (error) {
        results.sms = { error: error.message };
        this._updateChannelHealth('sms', false, error.message);
        this.logger.error('SMS critical alert failed', { error: error.message });
      }
    }

    // 3. Try PagerDuty for on-call escalation
    if (this.pagerduty.enabled) {
      try {
        results.pagerduty = await this._sendPagerDuty(alertWithMeta);
        anySuccess = true;
        this._updateChannelHealth('pagerduty', true);
      } catch (error) {
        results.pagerduty = { error: error.message };
        this._updateChannelHealth('pagerduty', false, error.message);
        this.logger.error('PagerDuty critical alert failed', { error: error.message });
      }
    }

    // 4. Always write to fallback log (for audit trail and when all channels fail)
    try {
      results.fallback = await this._writeFallbackLog(alertWithMeta, results);
    } catch (error) {
      results.fallback = { error: error.message };
      this.logger.error('Fallback log write failed', { error: error.message });
    }

    // Update health tracking
    if (anySuccess) {
      this.health.lastSuccessfulAlert = timestamp;
      this.health.consecutiveFailures = 0;
      this.health.totalAlertsSent++;
    } else {
      this.health.lastFailedAlert = timestamp;
      this.health.consecutiveFailures++;
      this.logger.error('ALL CRITICAL ALERT CHANNELS FAILED', {
        alert: alertWithMeta,
        results,
      });
    }

    return {
      alertId: alertWithMeta.alertId,
      timestamp,
      anySuccess,
      results,
    };
  }

  /**
   * Update channel health status
   */
  _updateChannelHealth(channel, success, error = null) {
    const channelHealth = this.health.channelStatus[channel];
    channelHealth.healthy = success;
    channelHealth.lastAttempt = new Date().toISOString();
    if (error) {
      channelHealth.lastError = error;
    }
  }

  /**
   * Send Discord notification directly (bypasses AlertManager)
   */
  async _sendDiscord(alert) {
    const webhookUrl = this.discord.criticalWebhookUrl || this.discord.webhookUrl;

    const severityEmoji = {
      [CRITICAL_ALERT_TYPES.KILL_SWITCH]: ':octagonal_sign:',
      [CRITICAL_ALERT_TYPES.POSITION_MISMATCH]: ':warning:',
      [CRITICAL_ALERT_TYPES.DRAWDOWN_BREACH]: ':chart_with_downwards_trend:',
      [CRITICAL_ALERT_TYPES.SERVICE_DOWN]: ':red_circle:',
      [CRITICAL_ALERT_TYPES.DATA_STALE]: ':hourglass:',
      [CRITICAL_ALERT_TYPES.ALERT_SYSTEM_FAILURE]: ':rotating_light:',
    };

    const fields = [
      { name: 'Alert ID', value: alert.alertId, inline: true },
      { name: 'Type', value: alert.type, inline: true },
      { name: 'Time', value: alert.timestamp, inline: true },
    ];

    // Add details as fields
    if (alert.details) {
      for (const [key, value] of Object.entries(alert.details)) {
        if (typeof value !== 'object') {
          fields.push({
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            value: String(value).slice(0, 1024),
            inline: true,
          });
        }
      }
    }

    const payload = {
      content: '@here @everyone **CRITICAL TRADING ALERT**',
      embeds: [{
        title: `${severityEmoji[alert.type] || ':rotating_light:'} ${alert.title}`,
        description: alert.message,
        color: 0xFF0000, // Red for critical
        fields: fields.slice(0, 25),
        timestamp: alert.timestamp,
        footer: {
          text: 'Stock Trading System | CRITICAL ALERT (Direct)',
        },
      }],
    };

    const response = await axios.post(webhookUrl, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    return { sent: true, status: response.status };
  }

  /**
   * Send SMS via Twilio
   */
  async _sendSMS(alert) {
    const client = await this._getTwilioClient();
    if (!client) {
      throw new Error('Twilio client not available');
    }

    const body = [
      `[CRITICAL] ${alert.title}`,
      '',
      alert.message,
      '',
      `Alert ID: ${alert.alertId}`,
      `Time: ${alert.timestamp}`,
    ].join('\n');

    const message = await client.messages.create({
      body: body.slice(0, 1600),
      from: this.sms.from,
      to: this.sms.to,
    });

    return { sent: true, messageSid: message.sid };
  }

  /**
   * Send PagerDuty incident
   */
  async _sendPagerDuty(alert) {
    const payload = {
      routing_key: this.pagerduty.routingKey,
      event_action: 'trigger',
      dedup_key: `stock-trading-critical-${alert.type}-${alert.alertId}`,
      payload: {
        summary: `[CRITICAL] ${alert.title}`,
        severity: 'critical',
        source: 'stock-trading-system',
        timestamp: alert.timestamp,
        component: 'trading',
        group: 'critical-alerts',
        class: alert.type,
        custom_details: {
          alert_id: alert.alertId,
          type: alert.type,
          message: alert.message,
          ...alert.details,
        },
      },
      links: [
        {
          href: 'https://trading.example.com/alerts',
          text: 'View in Dashboard',
        },
      ],
    };

    const response = await axios.post(
      'https://events.pagerduty.com/v2/enqueue',
      payload,
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return { sent: true, dedupKey: payload.dedup_key, status: response.status };
  }

  /**
   * Write alert to fallback log file
   */
  async _writeFallbackLog(alert, results) {
    try {
      await fs.mkdir(this.fallbackLogDir, { recursive: true });

      const logEntry = {
        ...alert,
        deliveryResults: results,
        loggedAt: new Date().toISOString(),
      };

      const filename = `critical_alert_${new Date().toISOString().split('T')[0]}.jsonl`;
      const filepath = path.join(this.fallbackLogDir, filename);

      await fs.appendFile(filepath, JSON.stringify(logEntry) + '\n');

      return { written: true, filepath };
    } catch (error) {
      throw error;
    }
  }

  // =========================================================================
  // Specific Alert Methods
  // =========================================================================

  /**
   * Send kill switch activation alert
   */
  async sendKillSwitchAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.KILL_SWITCH,
      title: 'KILL SWITCH ACTIVATED',
      message: `Trading kill switch has been activated. All trading operations are now HALTED. Reason: ${details.reason || 'Not specified'}`,
      details: {
        reason: details.reason || 'Unknown',
        activatedBy: details.activatedBy || 'System',
        previousState: details.previousState || 'Unknown',
        ...details,
      },
    });
  }

  /**
   * Send position mismatch alert
   */
  async sendPositionMismatchAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.POSITION_MISMATCH,
      title: 'POSITION MISMATCH DETECTED',
      message: `Critical position mismatch detected for ${details.symbol || 'Unknown'}. Internal: ${details.internal ?? 'N/A'}, Broker: ${details.broker ?? 'N/A'}. Immediate investigation required.`,
      details: {
        symbol: details.symbol,
        internalQty: details.internal,
        brokerQty: details.broker,
        difference: (details.internal ?? 0) - (details.broker ?? 0),
        market: details.market || 'Unknown',
        ...details,
      },
    });
  }

  /**
   * Send P&L drawdown breach alert
   */
  async sendDrawdownBreachAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.DRAWDOWN_BREACH,
      title: 'P&L DRAWDOWN LIMIT BREACHED',
      message: `Portfolio drawdown has exceeded the maximum allowed limit. Current: ${details.current ?? 'N/A'}%, Limit: ${details.limit ?? 'N/A'}%. Trading may be automatically halted.`,
      details: {
        currentDrawdown: details.current,
        drawdownLimit: details.limit,
        portfolioValue: details.portfolioValue,
        peakValue: details.peakValue,
        ...details,
      },
    });
  }

  /**
   * Send service down alert
   */
  async sendServiceDownAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.SERVICE_DOWN,
      title: `CRITICAL SERVICE DOWN: ${details.service || 'Unknown'}`,
      message: `Critical service ${details.service || 'Unknown'} is not responding. Trading operations may be affected.`,
      details: {
        service: details.service,
        lastSeen: details.lastSeen,
        downSince: details.downSince,
        endpoint: details.endpoint,
        ...details,
      },
    });
  }

  /**
   * Send data stale alert
   */
  async sendDataStaleAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.DATA_STALE,
      title: `MARKET DATA STALE: ${details.market || 'Unknown'}`,
      message: `Market data for ${details.market || 'Unknown'} has not been updated in ${details.staleDuration || 'Unknown'} seconds. Trading decisions may be based on outdated data.`,
      details: {
        market: details.market,
        staleDuration: details.staleDuration,
        lastUpdate: details.lastUpdate,
        expectedInterval: details.expectedInterval,
        ...details,
      },
    });
  }

  /**
   * Send alert system failure notification
   * Used when Alertmanager/Prometheus are detected as down
   */
  async sendAlertSystemFailureAlert(details = {}) {
    return this.sendCriticalAlert({
      type: CRITICAL_ALERT_TYPES.ALERT_SYSTEM_FAILURE,
      title: 'ALERT SYSTEM FAILURE DETECTED',
      message: `The primary alerting system (Alertmanager/Prometheus) appears to be down. Critical alerts are being sent directly. Component: ${details.component || 'Unknown'}`,
      details: {
        component: details.component,
        lastHealthy: details.lastHealthy,
        error: details.error,
        ...details,
      },
    });
  }

  // =========================================================================
  // Health and Status
  // =========================================================================

  /**
   * Get health status of the critical alert handler
   */
  getHealth() {
    const now = Date.now();

    return {
      healthy: this.health.consecutiveFailures < 3,
      channels: {
        discord: {
          configured: this.discord.enabled,
          ...this.health.channelStatus.discord,
        },
        sms: {
          configured: this.sms.enabled,
          ...this.health.channelStatus.sms,
        },
        pagerduty: {
          configured: this.pagerduty.enabled,
          ...this.health.channelStatus.pagerduty,
        },
      },
      stats: {
        totalAlertsSent: this.health.totalAlertsSent,
        consecutiveFailures: this.health.consecutiveFailures,
        lastSuccessfulAlert: this.health.lastSuccessfulAlert,
        lastFailedAlert: this.health.lastFailedAlert,
        timeSinceLastSuccess: this.health.lastSuccessfulAlert
          ? now - new Date(this.health.lastSuccessfulAlert).getTime()
          : null,
      },
    };
  }

  /**
   * Test all configured channels
   */
  async testChannels() {
    const results = {};

    if (this.discord.enabled) {
      try {
        await this._sendDiscord({
          alertId: 'test-' + Date.now(),
          type: 'test',
          title: 'Test Alert',
          message: 'This is a test of the critical alert system. No action required.',
          timestamp: new Date().toISOString(),
          details: { test: true },
        });
        results.discord = { success: true };
      } catch (error) {
        results.discord = { success: false, error: error.message };
      }
    }

    if (this.sms.enabled) {
      try {
        // For SMS test, just verify client can be created
        const client = await this._getTwilioClient();
        results.sms = { success: !!client, message: 'Client initialized (no SMS sent for test)' };
      } catch (error) {
        results.sms = { success: false, error: error.message };
      }
    }

    if (this.pagerduty.enabled) {
      // For PagerDuty test, we don't actually trigger
      results.pagerduty = {
        success: true,
        message: 'PagerDuty configured (no incident triggered for test)',
        routingKey: this.pagerduty.routingKey ? '***configured***' : 'not set',
      };
    }

    return results;
  }
}

export default CriticalAlertHandler;
