/**
 * Alert Manager - Stock Trading Automation System
 *
 * Comprehensive alerting system with multi-channel support and escalation.
 *
 * Features:
 *   - Multi-channel notifications: Discord, Email, SMS, PagerDuty
 *   - Severity-based routing
 *   - Automatic escalation for unacknowledged alerts
 *   - Rate limiting to prevent alert storms
 *   - Deduplication of similar alerts
 *
 * Usage:
 *   import { AlertManager } from './alerting/alert-manager.js';
 *
 *   const manager = new AlertManager({
 *     db: database,
 *     pgPool: postgresPool,
 *     logger: logger,
 *     channels: {
 *       discord: { webhookUrl: '...', criticalWebhookUrl: '...' },
 *       email: { host: '...', from: '...', to: '...' },
 *       sms: { twilioSid: '...', authToken: '...', from: '...', to: '...' },
 *       pagerduty: { routingKey: '...' },
 *     },
 *     escalation: {
 *       smsDelayMinutes: 5,
 *       pagerdutyDelayMinutes: 15,
 *     },
 *   });
 *
 *   await manager.sendAlert({
 *     type: 'kill_switch_activated',
 *     severity: 'critical',
 *     title: 'Kill Switch Activated',
 *     message: 'Trading has been halted.',
 *     details: { reason: 'Manual activation' },
 *   });
 *
 * Dependencies:
 *   - axios (HTTP client)
 *   - nodemailer (Email)
 *   - twilio (SMS)
 */

import axios from 'axios';
import nodemailer from 'nodemailer';

// Alert severities in order of importance
export const SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// Alert status values
export const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
};

// Channel names
export const CHANNELS = {
  DISCORD: 'discord',
  EMAIL: 'email',
  SMS: 'sms',
  PAGERDUTY: 'pagerduty',
};

/**
 * AlertManager - Central alert management system
 */
export class AlertManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.db = options.db; // SQLite for config
    this.pgPool = options.pgPool; // PostgreSQL for alerts table

    // Channel configurations
    this.channels = {
      discord: {
        enabled: !!options.channels?.discord?.webhookUrl,
        webhookUrl: options.channels?.discord?.webhookUrl,
        criticalWebhookUrl: options.channels?.discord?.criticalWebhookUrl,
      },
      email: {
        enabled: !!options.channels?.email?.host,
        host: options.channels?.email?.host,
        port: options.channels?.email?.port || 587,
        secure: options.channels?.email?.secure || false,
        user: options.channels?.email?.user,
        password: options.channels?.email?.password,
        from: options.channels?.email?.from,
        to: options.channels?.email?.to,
      },
      sms: {
        enabled: !!options.channels?.sms?.twilioSid,
        twilioSid: options.channels?.sms?.twilioSid,
        authToken: options.channels?.sms?.authToken,
        from: options.channels?.sms?.from,
        to: options.channels?.sms?.to,
      },
      pagerduty: {
        enabled: !!options.channels?.pagerduty?.routingKey,
        routingKey: options.channels?.pagerduty?.routingKey,
      },
    };

    // Escalation configuration
    this.escalation = {
      smsDelayMs: (options.escalation?.smsDelayMinutes || 5) * 60 * 1000,
      pagerdutyDelayMs: (options.escalation?.pagerdutyDelayMinutes || 15) * 60 * 1000,
      enabled: options.escalation?.enabled !== false,
    };

    // Rate limiting configuration
    this.rateLimit = {
      windowMs: options.rateLimit?.windowMs || 60000, // 1 minute
      maxAlerts: options.rateLimit?.maxAlerts || 10,
      alertCounts: new Map(), // type -> { count, windowStart }
    };

    // Deduplication
    this.deduplication = {
      windowMs: options.deduplication?.windowMs || 300000, // 5 minutes
      recentAlerts: new Map(), // hash -> timestamp
    };

    // Active escalation timers
    this.escalationTimers = new Map(); // alertId -> { smsTimer, pagerdutyTimer }

    // Email transporter (lazy initialized)
    this._emailTransporter = null;

    // Twilio client (lazy initialized)
    this._twilioClient = null;

    this.logger.info('AlertManager initialized', {
      channels: {
        discord: this.channels.discord.enabled,
        email: this.channels.email.enabled,
        sms: this.channels.sms.enabled,
        pagerduty: this.channels.pagerduty.enabled,
      },
      escalation: this.escalation.enabled,
    });
  }

  /**
   * Initialize database table for alerts
   */
  async initialize() {
    if (!this.pgPool) {
      this.logger.warn('PostgreSQL pool not available, using in-memory alert storage');
      this._inMemoryAlerts = [];
      return;
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        alert_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        source VARCHAR(100),
        dedup_hash VARCHAR(64),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        channels_notified JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        acknowledged_at TIMESTAMPTZ,
        acknowledged_by VARCHAR(100),
        escalated_at TIMESTAMPTZ,
        escalation_level INTEGER DEFAULT 0,
        resolved_at TIMESTAMPTZ,
        resolved_by VARCHAR(100),
        resolution_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_dedup_hash ON alerts(dedup_hash);
      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
    `;

    try {
      await this.pgPool.query(createTableSQL);
      this.logger.info('Alerts table initialized');
    } catch (error) {
      this.logger.error('Failed to initialize alerts table', { error: error.message });
      throw error;
    }
  }

  /**
   * Get email transporter (lazy initialization)
   */
  _getEmailTransporter() {
    if (!this._emailTransporter && this.channels.email.enabled) {
      this._emailTransporter = nodemailer.createTransport({
        host: this.channels.email.host,
        port: this.channels.email.port,
        secure: this.channels.email.secure,
        auth: {
          user: this.channels.email.user,
          pass: this.channels.email.password,
        },
      });
    }
    return this._emailTransporter;
  }

  /**
   * Get Twilio client (lazy initialization)
   */
  async _getTwilioClient() {
    if (!this._twilioClient && this.channels.sms.enabled) {
      try {
        // Dynamic import for optional dependency
        const twilio = await import('twilio');
        this._twilioClient = twilio.default(
          this.channels.sms.twilioSid,
          this.channels.sms.authToken
        );
      } catch (error) {
        this.logger.warn('Twilio not available', { error: error.message });
        this.channels.sms.enabled = false;
      }
    }
    return this._twilioClient;
  }

  /**
   * Generate deduplication hash for an alert
   */
  _generateDedupHash(alert) {
    const key = `${alert.type}:${alert.severity}:${alert.title}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Check if alert should be deduplicated
   */
  _shouldDeduplicate(dedupHash) {
    const now = Date.now();
    const lastSeen = this.deduplication.recentAlerts.get(dedupHash);

    if (lastSeen && (now - lastSeen) < this.deduplication.windowMs) {
      return true;
    }

    this.deduplication.recentAlerts.set(dedupHash, now);

    // Clean up old entries
    for (const [hash, timestamp] of this.deduplication.recentAlerts) {
      if ((now - timestamp) > this.deduplication.windowMs) {
        this.deduplication.recentAlerts.delete(hash);
      }
    }

    return false;
  }

  /**
   * Check if alert is rate limited
   */
  _isRateLimited(alertType) {
    const now = Date.now();
    const typeCount = this.rateLimit.alertCounts.get(alertType);

    if (!typeCount || (now - typeCount.windowStart) > this.rateLimit.windowMs) {
      this.rateLimit.alertCounts.set(alertType, { count: 1, windowStart: now });
      return false;
    }

    if (typeCount.count >= this.rateLimit.maxAlerts) {
      return true;
    }

    typeCount.count++;
    return false;
  }

  /**
   * Get channels to notify based on severity
   */
  _getChannelsForSeverity(severity) {
    const channelMap = {
      [SEVERITY_LEVELS.INFO]: [CHANNELS.DISCORD],
      [SEVERITY_LEVELS.WARNING]: [CHANNELS.DISCORD, CHANNELS.EMAIL],
      [SEVERITY_LEVELS.ERROR]: [CHANNELS.DISCORD, CHANNELS.EMAIL],
      [SEVERITY_LEVELS.CRITICAL]: [CHANNELS.DISCORD, CHANNELS.EMAIL, CHANNELS.SMS],
    };

    return channelMap[severity] || [CHANNELS.DISCORD];
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(alertData) {
    const alert = {
      type: alertData.type,
      severity: alertData.severity || SEVERITY_LEVELS.INFO,
      title: alertData.title,
      message: alertData.message,
      details: alertData.details || {},
      source: alertData.source || 'ops-service',
      timestamp: new Date().toISOString(),
    };

    // Generate dedup hash
    const dedupHash = this._generateDedupHash(alert);

    // Check deduplication
    if (alertData.deduplicate !== false && this._shouldDeduplicate(dedupHash)) {
      this.logger.debug('Alert deduplicated', { type: alert.type, dedupHash });
      return { deduplicated: true, dedupHash };
    }

    // Check rate limiting
    if (alertData.bypassRateLimit !== true && this._isRateLimited(alert.type)) {
      this.logger.warn('Alert rate limited', { type: alert.type });
      return { rateLimited: true };
    }

    // Store alert in database
    const storedAlert = await this._storeAlert(alert, dedupHash);
    alert.id = storedAlert.id;

    // Determine channels based on severity
    const channels = this._getChannelsForSeverity(alert.severity);
    const notificationResults = {};

    // Send to each channel
    for (const channel of channels) {
      try {
        const result = await this._sendToChannel(channel, alert);
        notificationResults[channel] = { success: true, ...result };
      } catch (error) {
        notificationResults[channel] = { success: false, error: error.message };
        this.logger.error('Failed to send to channel', {
          channel,
          alertId: alert.id,
          error: error.message,
        });
      }
    }

    // Update alert with notification results
    await this._updateAlertChannels(alert.id, Object.keys(notificationResults));

    // Start escalation timer for critical alerts
    if (alert.severity === SEVERITY_LEVELS.CRITICAL && this.escalation.enabled) {
      this._startEscalationTimer(alert);
    }

    this.logger.info('Alert sent', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      channels: Object.keys(notificationResults),
    });

    return {
      alertId: alert.id,
      dedupHash,
      channels: notificationResults,
    };
  }

  /**
   * Store alert in database
   */
  async _storeAlert(alert, dedupHash) {
    if (this.pgPool) {
      const result = await this.pgPool.query(
        `INSERT INTO alerts (alert_type, severity, title, message, details, source, dedup_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at`,
        [
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          JSON.stringify(alert.details),
          alert.source,
          dedupHash,
          ALERT_STATUS.ACTIVE,
        ]
      );
      return { id: result.rows[0].id, created_at: result.rows[0].created_at };
    } else {
      // In-memory fallback
      const id = (this._inMemoryAlerts?.length || 0) + 1;
      const storedAlert = {
        id,
        ...alert,
        dedup_hash: dedupHash,
        status: ALERT_STATUS.ACTIVE,
        created_at: new Date().toISOString(),
      };
      this._inMemoryAlerts.push(storedAlert);
      return { id, created_at: storedAlert.created_at };
    }
  }

  /**
   * Update alert with notified channels
   */
  async _updateAlertChannels(alertId, channels) {
    if (this.pgPool) {
      await this.pgPool.query(
        `UPDATE alerts SET channels_notified = $1 WHERE id = $2`,
        [JSON.stringify(channels), alertId]
      );
    } else if (this._inMemoryAlerts) {
      const alert = this._inMemoryAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.channels_notified = channels;
      }
    }
  }

  /**
   * Send alert to a specific channel
   */
  async _sendToChannel(channel, alert) {
    switch (channel) {
      case CHANNELS.DISCORD:
        return this._sendDiscord(alert);
      case CHANNELS.EMAIL:
        return this._sendEmail(alert);
      case CHANNELS.SMS:
        return this._sendSMS(alert);
      case CHANNELS.PAGERDUTY:
        return this._sendPagerDuty(alert);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send Discord notification
   */
  async _sendDiscord(alert) {
    if (!this.channels.discord.enabled) {
      return { skipped: true, reason: 'Discord not configured' };
    }

    // Use critical webhook for critical alerts if available
    const webhookUrl = alert.severity === SEVERITY_LEVELS.CRITICAL &&
      this.channels.discord.criticalWebhookUrl
      ? this.channels.discord.criticalWebhookUrl
      : this.channels.discord.webhookUrl;

    const severityColors = {
      [SEVERITY_LEVELS.INFO]: 0x3498DB,    // Blue
      [SEVERITY_LEVELS.WARNING]: 0xF1C40F, // Yellow
      [SEVERITY_LEVELS.ERROR]: 0xE74C3C,   // Red
      [SEVERITY_LEVELS.CRITICAL]: 0x9B59B6, // Purple
    };

    const severityEmojis = {
      [SEVERITY_LEVELS.INFO]: ':information_source:',
      [SEVERITY_LEVELS.WARNING]: ':warning:',
      [SEVERITY_LEVELS.ERROR]: ':x:',
      [SEVERITY_LEVELS.CRITICAL]: ':rotating_light:',
    };

    const fields = [
      { name: 'Type', value: alert.type, inline: true },
      { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
      { name: 'Alert ID', value: String(alert.id), inline: true },
    ];

    // Add details as fields
    if (alert.details && Object.keys(alert.details).length > 0) {
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
      content: alert.severity === SEVERITY_LEVELS.CRITICAL ? '@here' : undefined,
      embeds: [{
        title: `${severityEmojis[alert.severity]} ${alert.title}`,
        description: alert.message,
        color: severityColors[alert.severity] || 0x95A5A6,
        fields: fields.slice(0, 25), // Discord limit
        timestamp: alert.timestamp,
        footer: {
          text: `Stock Trading System | ${alert.source}`,
        },
      }],
    };

    await axios.post(webhookUrl, payload, { timeout: 5000 });
    return { sent: true };
  }

  /**
   * Send Email notification
   */
  async _sendEmail(alert) {
    if (!this.channels.email.enabled) {
      return { skipped: true, reason: 'Email not configured' };
    }

    const transporter = this._getEmailTransporter();
    if (!transporter) {
      return { skipped: true, reason: 'Email transporter not available' };
    }

    const severityColors = {
      [SEVERITY_LEVELS.INFO]: '#3498db',
      [SEVERITY_LEVELS.WARNING]: '#f1c40f',
      [SEVERITY_LEVELS.ERROR]: '#e74c3c',
      [SEVERITY_LEVELS.CRITICAL]: '#9b59b6',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header .severity { opacity: 0.9; font-size: 14px; margin-top: 5px; }
          .body { padding: 20px; }
          .message { font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px; }
          .details { background: #f9f9f9; border-radius: 4px; padding: 15px; margin-bottom: 20px; }
          .details h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
          .detail-row { display: flex; margin-bottom: 8px; }
          .detail-label { font-weight: bold; width: 120px; color: #555; }
          .detail-value { color: #333; }
          .footer { padding: 15px 20px; background: #f5f5f5; font-size: 12px; color: #666; text-align: center; }
          .cta { display: inline-block; background: ${severityColors[alert.severity]}; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alert.title}</h1>
            <div class="severity">${alert.severity.toUpperCase()} ALERT</div>
          </div>
          <div class="body">
            <div class="message">${alert.message}</div>
            <div class="details">
              <h3>Alert Details</h3>
              <div class="detail-row">
                <span class="detail-label">Alert ID:</span>
                <span class="detail-value">${alert.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${alert.type}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Source:</span>
                <span class="detail-value">${alert.source}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              ${Object.entries(alert.details || {}).map(([key, value]) =>
                typeof value !== 'object' ? `
                <div class="detail-row">
                  <span class="detail-label">${key}:</span>
                  <span class="detail-value">${value}</span>
                </div>` : ''
              ).join('')}
            </div>
          </div>
          <div class="footer">
            Stock Trading Automation System<br>
            This is an automated alert. Please do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;

    await transporter.sendMail({
      from: this.channels.email.from,
      to: this.channels.email.to,
      subject,
      html,
    });

    return { sent: true };
  }

  /**
   * Send SMS notification
   */
  async _sendSMS(alert) {
    if (!this.channels.sms.enabled) {
      return { skipped: true, reason: 'SMS not configured' };
    }

    const client = await this._getTwilioClient();
    if (!client) {
      return { skipped: true, reason: 'Twilio client not available' };
    }

    const body = `[${alert.severity.toUpperCase()}] ${alert.title}\n\n${alert.message}\n\nAlert ID: ${alert.id}`;

    await client.messages.create({
      body: body.slice(0, 1600), // SMS limit
      from: this.channels.sms.from,
      to: this.channels.sms.to,
    });

    return { sent: true };
  }

  /**
   * Send PagerDuty notification
   */
  async _sendPagerDuty(alert) {
    if (!this.channels.pagerduty.enabled) {
      return { skipped: true, reason: 'PagerDuty not configured' };
    }

    const severityMap = {
      [SEVERITY_LEVELS.INFO]: 'info',
      [SEVERITY_LEVELS.WARNING]: 'warning',
      [SEVERITY_LEVELS.ERROR]: 'error',
      [SEVERITY_LEVELS.CRITICAL]: 'critical',
    };

    const payload = {
      routing_key: this.channels.pagerduty.routingKey,
      event_action: 'trigger',
      dedup_key: `stock-trading-${alert.id}`,
      payload: {
        summary: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        severity: severityMap[alert.severity] || 'warning',
        source: alert.source,
        timestamp: alert.timestamp,
        custom_details: {
          alert_id: alert.id,
          type: alert.type,
          message: alert.message,
          ...alert.details,
        },
      },
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    return { sent: true };
  }

  /**
   * Start escalation timer for critical alerts
   */
  _startEscalationTimer(alert) {
    const timers = {};

    // Escalate to SMS after delay
    if (this.channels.sms.enabled) {
      timers.smsTimer = setTimeout(async () => {
        const isAcknowledged = await this._isAlertAcknowledged(alert.id);
        if (!isAcknowledged) {
          this.logger.warn('Escalating alert to SMS', { alertId: alert.id });
          await this._sendSMS(alert);
          await this._markEscalated(alert.id, 1);
        }
      }, this.escalation.smsDelayMs);
    }

    // Escalate to PagerDuty after longer delay
    if (this.channels.pagerduty.enabled) {
      timers.pagerdutyTimer = setTimeout(async () => {
        const isAcknowledged = await this._isAlertAcknowledged(alert.id);
        if (!isAcknowledged) {
          this.logger.warn('Escalating alert to PagerDuty', { alertId: alert.id });
          await this._sendPagerDuty(alert);
          await this._markEscalated(alert.id, 2);
        }
      }, this.escalation.pagerdutyDelayMs);
    }

    if (Object.keys(timers).length > 0) {
      this.escalationTimers.set(alert.id, timers);
    }
  }

  /**
   * Check if alert has been acknowledged
   */
  async _isAlertAcknowledged(alertId) {
    if (this.pgPool) {
      const result = await this.pgPool.query(
        `SELECT status FROM alerts WHERE id = $1`,
        [alertId]
      );
      return result.rows[0]?.status !== ALERT_STATUS.ACTIVE;
    } else if (this._inMemoryAlerts) {
      const alert = this._inMemoryAlerts.find(a => a.id === alertId);
      return alert?.status !== ALERT_STATUS.ACTIVE;
    }
    return false;
  }

  /**
   * Mark alert as escalated
   */
  async _markEscalated(alertId, level) {
    if (this.pgPool) {
      await this.pgPool.query(
        `UPDATE alerts SET escalated_at = NOW(), escalation_level = $1, status = $2 WHERE id = $3`,
        [level, ALERT_STATUS.ESCALATED, alertId]
      );
    } else if (this._inMemoryAlerts) {
      const alert = this._inMemoryAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.escalated_at = new Date().toISOString();
        alert.escalation_level = level;
        alert.status = ALERT_STATUS.ESCALATED;
      }
    }

    this.logger.info('Alert escalated', { alertId, level });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    // Cancel escalation timers
    const timers = this.escalationTimers.get(alertId);
    if (timers) {
      if (timers.smsTimer) clearTimeout(timers.smsTimer);
      if (timers.pagerdutyTimer) clearTimeout(timers.pagerdutyTimer);
      this.escalationTimers.delete(alertId);
    }

    const now = new Date().toISOString();

    if (this.pgPool) {
      const result = await this.pgPool.query(
        `UPDATE alerts
         SET status = $1, acknowledged_at = NOW(), acknowledged_by = $2
         WHERE id = $3 AND status = 'active'
         RETURNING *`,
        [ALERT_STATUS.ACKNOWLEDGED, acknowledgedBy, alertId]
      );

      if (result.rowCount === 0) {
        throw new Error('Alert not found or already acknowledged');
      }

      return result.rows[0];
    } else if (this._inMemoryAlerts) {
      const alert = this._inMemoryAlerts.find(a => a.id === parseInt(alertId, 10));
      if (!alert) {
        throw new Error('Alert not found');
      }
      if (alert.status !== ALERT_STATUS.ACTIVE) {
        throw new Error('Alert already acknowledged');
      }

      alert.status = ALERT_STATUS.ACKNOWLEDGED;
      alert.acknowledged_at = now;
      alert.acknowledged_by = acknowledgedBy;
      return alert;
    }

    throw new Error('No storage configured');
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy, notes = '') {
    // Cancel escalation timers
    const timers = this.escalationTimers.get(alertId);
    if (timers) {
      if (timers.smsTimer) clearTimeout(timers.smsTimer);
      if (timers.pagerdutyTimer) clearTimeout(timers.pagerdutyTimer);
      this.escalationTimers.delete(alertId);
    }

    if (this.pgPool) {
      const result = await this.pgPool.query(
        `UPDATE alerts
         SET status = $1, resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
         WHERE id = $4
         RETURNING *`,
        [ALERT_STATUS.RESOLVED, resolvedBy, notes, alertId]
      );

      if (result.rowCount === 0) {
        throw new Error('Alert not found');
      }

      // Resolve in PagerDuty if it was escalated there
      if (this.channels.pagerduty.enabled) {
        try {
          await axios.post('https://events.pagerduty.com/v2/enqueue', {
            routing_key: this.channels.pagerduty.routingKey,
            event_action: 'resolve',
            dedup_key: `stock-trading-${alertId}`,
          });
        } catch (error) {
          this.logger.warn('Failed to resolve PagerDuty incident', { error: error.message });
        }
      }

      return result.rows[0];
    } else if (this._inMemoryAlerts) {
      const alert = this._inMemoryAlerts.find(a => a.id === parseInt(alertId, 10));
      if (!alert) {
        throw new Error('Alert not found');
      }

      alert.status = ALERT_STATUS.RESOLVED;
      alert.resolved_at = new Date().toISOString();
      alert.resolved_by = resolvedBy;
      alert.resolution_notes = notes;
      return alert;
    }

    throw new Error('No storage configured');
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(options = {}) {
    const { severity, type, limit = 100 } = options;

    if (this.pgPool) {
      let query = `SELECT * FROM alerts WHERE status IN ('active', 'escalated')`;
      const params = [];
      let paramIndex = 1;

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }

      if (type) {
        query += ` AND alert_type = $${paramIndex++}`;
        params.push(type);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pgPool.query(query, params);
      return result.rows;
    } else if (this._inMemoryAlerts) {
      let alerts = this._inMemoryAlerts.filter(
        a => a.status === ALERT_STATUS.ACTIVE || a.status === ALERT_STATUS.ESCALATED
      );

      if (severity) {
        alerts = alerts.filter(a => a.severity === severity);
      }

      if (type) {
        alerts = alerts.filter(a => a.type === type);
      }

      return alerts.slice(-limit).reverse();
    }

    return [];
  }

  /**
   * Get alert history
   */
  async getAlertHistory(options = {}) {
    const { severity, type, status, limit = 100, offset = 0 } = options;

    if (this.pgPool) {
      let query = `SELECT * FROM alerts WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }

      if (type) {
        query += ` AND alert_type = $${paramIndex++}`;
        params.push(type);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const result = await this.pgPool.query(query, params);
      return result.rows;
    } else if (this._inMemoryAlerts) {
      let alerts = [...this._inMemoryAlerts];

      if (severity) {
        alerts = alerts.filter(a => a.severity === severity);
      }

      if (type) {
        alerts = alerts.filter(a => a.type === type);
      }

      if (status) {
        alerts = alerts.filter(a => a.status === status);
      }

      return alerts.reverse().slice(offset, offset + limit);
    }

    return [];
  }

  /**
   * Get alert statistics for health check
   */
  async getAlertStats() {
    if (this.pgPool) {
      const result = await this.pgPool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('active', 'escalated')) as active_count,
          COUNT(*) FILTER (WHERE status IN ('active', 'escalated') AND severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count,
          MAX(CASE WHEN severity = 'critical' THEN created_at END) as last_critical_at,
          COUNT(*) as total_count
        FROM alerts
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      const stats = result.rows[0];
      return {
        activeAlerts: parseInt(stats.active_count, 10) || 0,
        criticalAlerts: parseInt(stats.critical_count, 10) || 0,
        escalatedAlerts: parseInt(stats.escalated_count, 10) || 0,
        lastCriticalAt: stats.last_critical_at,
        totalLast24h: parseInt(stats.total_count, 10) || 0,
        timeSinceLastCritical: stats.last_critical_at
          ? Date.now() - new Date(stats.last_critical_at).getTime()
          : null,
      };
    } else if (this._inMemoryAlerts) {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const recentAlerts = this._inMemoryAlerts.filter(
        a => new Date(a.created_at).getTime() > dayAgo
      );

      const activeAlerts = recentAlerts.filter(
        a => a.status === ALERT_STATUS.ACTIVE || a.status === ALERT_STATUS.ESCALATED
      );

      const criticalAlerts = activeAlerts.filter(a => a.severity === SEVERITY_LEVELS.CRITICAL);
      const escalatedAlerts = activeAlerts.filter(a => a.status === ALERT_STATUS.ESCALATED);

      const lastCritical = recentAlerts
        .filter(a => a.severity === SEVERITY_LEVELS.CRITICAL)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      return {
        activeAlerts: activeAlerts.length,
        criticalAlerts: criticalAlerts.length,
        escalatedAlerts: escalatedAlerts.length,
        lastCriticalAt: lastCritical?.created_at || null,
        totalLast24h: recentAlerts.length,
        timeSinceLastCritical: lastCritical
          ? now - new Date(lastCritical.created_at).getTime()
          : null,
      };
    }

    return {
      activeAlerts: 0,
      criticalAlerts: 0,
      escalatedAlerts: 0,
      lastCriticalAt: null,
      totalLast24h: 0,
      timeSinceLastCritical: null,
    };
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId) {
    if (this.pgPool) {
      const result = await this.pgPool.query(
        `SELECT * FROM alerts WHERE id = $1`,
        [alertId]
      );
      return result.rows[0] || null;
    } else if (this._inMemoryAlerts) {
      return this._inMemoryAlerts.find(a => a.id === parseInt(alertId, 10)) || null;
    }

    return null;
  }

  /**
   * Send test alert
   */
  async sendTestAlert(channel = null) {
    const testAlert = {
      type: 'test_alert',
      severity: SEVERITY_LEVELS.INFO,
      title: 'Test Alert',
      message: 'This is a test alert to verify the alerting system is working correctly.',
      details: {
        test: true,
        timestamp: new Date().toISOString(),
        requested_channel: channel || 'all configured',
      },
      source: 'ops-service-test',
      deduplicate: false,
      bypassRateLimit: true,
    };

    if (channel) {
      // Send to specific channel only
      const result = await this._sendToChannel(channel, {
        ...testAlert,
        id: 0,
        timestamp: new Date().toISOString(),
      });
      return { channel, result };
    }

    // Send through normal flow
    return this.sendAlert(testAlert);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear all escalation timers
    for (const [alertId, timers] of this.escalationTimers) {
      if (timers.smsTimer) clearTimeout(timers.smsTimer);
      if (timers.pagerdutyTimer) clearTimeout(timers.pagerdutyTimer);
    }
    this.escalationTimers.clear();

    // Clear rate limit counters
    this.rateLimit.alertCounts.clear();

    // Clear deduplication cache
    this.deduplication.recentAlerts.clear();

    this.logger.info('AlertManager cleaned up');
  }
}

export default AlertManager;
