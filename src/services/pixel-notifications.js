/**
 * PIXEL NOTIFICATION SERVICE - Phase 4B Day 3
 *
 * Complete notification system for pixel events:
 * - Critical issue alerts (immediate email)
 * - Pixel down notifications
 * - SEO score drop warnings
 * - Daily summary reports
 * - Webhook triggers (issue.detected, issue.resolved)
 * - Dashboard real-time notifications
 *
 * Integrates with:
 * - notifications-db.js (dashboard notifications)
 * - webhooks-db.js (webhook triggers)
 * - Email service (nodemailer)
 * - Pixel recommendations sync
 *
 * Phase: 4B Day 3 - High-Value Integrations
 * Date: November 2, 2025
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import axios from 'axios';
import notificationsDb from '../database/notifications-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class PixelNotificationService {
  constructor(options = {}) {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    this.options = {
      // Email settings
      emailFrom: options.emailFrom || process.env.EMAIL_FROM || 'noreply@seoexpert.com',
      emailEnabled: options.emailEnabled !== false,

      // Webhook settings
      webhookEnabled: options.webhookEnabled !== false,
      webhookRetries: options.webhookRetries || 3,

      // Notification thresholds
      criticalSeverityThreshold: options.criticalSeverityThreshold || 'HIGH',
      scoreDropThreshold: options.scoreDropThreshold || 10,

      // Rate limiting
      maxEmailsPerHour: options.maxEmailsPerHour || 10,

      ...options
    };

    // Initialize email transporter
    this.emailTransporter = null;
    if (this.options.emailEnabled) {
      this.initializeEmailTransporter();
    }
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('[PixelNotifications] Email transporter initialized');
    } catch (error) {
      console.error('[PixelNotifications] Failed to initialize email:', error.message);
    }
  }

  /**
   * MAIN: Handle new pixel issue detected
   * Called by recommendations sync when new issue is created
   *
   * @param {Object} issue - Pixel issue object from seo_issues table
   * @param {Object} recommendation - Created recommendation
   */
  async handleNewIssue(issue, recommendation) {
    try {
      console.log(`[PixelNotifications] Handling new issue: ${issue.issue_type || issue.type}`);

      // Get client data
      const pixel = this.getPixelData(issue.pixel_id);
      if (!pixel) {
        console.warn('[PixelNotifications] Pixel not found:', issue.pixel_id);
        return;
      }

      // Determine notification actions based on severity
      const actions = this.determineNotificationActions(issue);

      const results = {
        email: null,
        webhook: null,
        dashboard: null
      };

      // 1. Send email for critical/high issues
      if (actions.sendEmail) {
        results.email = await this.sendCriticalIssueEmail(pixel, issue, recommendation);
      }

      // 2. Trigger webhooks
      if (actions.triggerWebhook) {
        results.webhook = await this.triggerWebhook('issue.detected', {
          issue,
          recommendation,
          pixel
        });
      }

      // 3. Create dashboard notification (always)
      if (actions.createDashboardNotification) {
        results.dashboard = await this.createDashboardNotification({
          type: 'pixel_issue',
          category: 'issue',
          title: `${issue.severity || 'Medium'} Priority: ${this.formatIssueType(issue.issue_type || issue.type)}`,
          message: `Detected on ${issue.page_url || pixel.domain}`,
          link: `/recommendations#${recommendation.id || ''}`
        });
      }

      // Log to notification_log
      this.logNotificationSent({
        type: 'pixel_critical_issue',
        severity: issue.severity || 'MEDIUM',
        clientId: pixel.client_id,
        pixelId: issue.pixel_id,
        issueId: issue.id,
        actions: JSON.stringify(actions),
        results: JSON.stringify(results)
      });

      console.log(`[PixelNotifications] Issue handled successfully: ${issue.id}`);
      return results;
    } catch (error) {
      console.error('[PixelNotifications] Error handling new issue:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Handle issue resolved
   *
   * @param {Object} issue - Resolved pixel issue
   * @param {Object} recommendation - Related recommendation
   */
  async handleIssueResolved(issue, recommendation) {
    try {
      const pixel = this.getPixelData(issue.pixel_id);
      if (!pixel) return;

      // Send resolution email
      await this.sendIssueResolvedEmail(pixel, issue);

      // Trigger webhook
      await this.triggerWebhook('issue.resolved', {
        issue,
        recommendation,
        pixel
      });

      // Dashboard notification
      await this.createDashboardNotification({
        type: 'pixel_resolved',
        category: 'update',
        title: `Issue Resolved: ${this.formatIssueType(issue.issue_type || issue.type)}`,
        message: `Fixed on ${issue.page_url || pixel.domain}`,
        link: `/recommendations#${recommendation.id || ''}`
      });

      console.log(`[PixelNotifications] Issue resolved notifications sent: ${issue.id}`);
    } catch (error) {
      console.error('[PixelNotifications] Error handling resolved issue:', error.message);
    }
  }

  /**
   * Notify when pixel goes down
   *
   * @param {number} pixelId - Pixel ID
   * @param {number} downtimeSeconds - Downtime duration
   */
  async notifyPixelDown(pixelId, downtimeSeconds) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel) return;

      const downtimeHours = Math.floor(downtimeSeconds / 3600);
      const downtimeMinutes = Math.floor((downtimeSeconds % 3600) / 60);
      const downtimeStr = downtimeHours > 0
        ? `${downtimeHours}h ${downtimeMinutes}m`
        : `${downtimeMinutes}m`;

      // Send email
      await this.sendPixelDownEmail(pixel, downtimeStr);

      // Trigger webhook
      await this.triggerWebhook('pixel.down', {
        pixelId: pixel.id,
        domain: pixel.domain,
        downtime: downtimeStr,
        downtimeSeconds
      });

      // Dashboard notification
      await this.createDashboardNotification({
        type: 'pixel_down',
        category: 'issue',
        title: 'Pixel Offline',
        message: `${pixel.domain} hasn't reported in ${downtimeStr}`,
        link: `/pixel-management?pixel=${pixelId}`
      });

      console.log(`[PixelNotifications] Pixel down notifications sent: ${pixelId}`);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying pixel down:', error.message);
    }
  }

  /**
   * Notify when pixel recovers
   *
   * @param {number} pixelId - Pixel ID
   */
  async notifyPixelRecovery(pixelId) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel) return;

      // Dashboard notification only (no email for recovery)
      await this.createDashboardNotification({
        type: 'pixel_recovery',
        category: 'update',
        title: 'Pixel Back Online',
        message: `${pixel.domain} is reporting normally`,
        link: `/pixel-management?pixel=${pixelId}`
      });

      // Trigger webhook
      await this.triggerWebhook('pixel.recovered', {
        pixelId: pixel.id,
        domain: pixel.domain
      });

      console.log(`[PixelNotifications] Pixel recovery notification sent: ${pixelId}`);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying pixel recovery:', error.message);
    }
  }

  /**
   * Notify when SEO score drops significantly
   *
   * @param {number} pixelId - Pixel ID
   * @param {number} previousScore - Previous score
   * @param {number} currentScore - Current score
   */
  async notifyScoreDrop(pixelId, previousScore, currentScore) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel) return;

      const delta = previousScore - currentScore;

      // Send email
      await this.sendScoreDropEmail(pixel, previousScore, currentScore, delta);

      // Dashboard notification
      await this.createDashboardNotification({
        type: 'score_drop',
        category: 'issue',
        title: 'SEO Score Decreased',
        message: `${pixel.domain}: ${previousScore} → ${currentScore} (-${delta} points)`,
        link: `/pixel-management?pixel=${pixelId}&tab=analytics`
      });

      console.log(`[PixelNotifications] Score drop notification sent: ${pixelId}`);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying score drop:', error.message);
    }
  }

  /**
   * Send daily summary email
   * Called by cron job once per day
   */
  async sendDailySummary() {
    try {
      const pixels = this.getAllPixels();
      if (pixels.length === 0) return;

      // Get stats for last 24 hours
      const stats = this.getDailySummaryStats();

      // Send summary email
      await this.sendDailySummaryEmail(stats);

      // Dashboard notification
      await this.createDashboardNotification({
        type: 'daily_summary',
        category: 'update',
        title: 'Daily SEO Summary',
        message: `${stats.newIssues} new issues, ${stats.resolvedIssues} resolved`,
        link: '/analytics'
      });

      console.log('[PixelNotifications] Daily summary sent');
    } catch (error) {
      console.error('[PixelNotifications] Error sending daily summary:', error.message);
    }
  }

  /**
   * Determine what notification actions to take
   */
  determineNotificationActions(issue) {
    const severity = issue.severity || 'MEDIUM';

    const actions = {
      sendEmail: false,
      triggerWebhook: false,
      createDashboardNotification: true // Always create dashboard notification
    };

    // Critical/High issues get email
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      actions.sendEmail = true;
      actions.triggerWebhook = true;
    }

    // Medium issues get webhook only
    if (severity === 'MEDIUM') {
      actions.triggerWebhook = true;
    }

    return actions;
  }

  /**
   * Send critical issue email
   */
  async sendCriticalIssueEmail(pixel, issue, recommendation) {
    try {
      if (!this.emailTransporter) {
        console.warn('[PixelNotifications] Email disabled');
        return { success: false, reason: 'email_disabled' };
      }

      const html = this.generateCriticalIssueHTML(pixel, issue, recommendation);

      const result = await this.emailTransporter.sendMail({
        from: this.options.emailFrom,
        to: pixel.notification_email || 'admin@example.com', // TODO: Get from client settings
        subject: `🚨 Critical SEO Issue: ${this.formatIssueType(issue.issue_type || issue.type)}`,
        html
      });

      console.log('[PixelNotifications] Critical issue email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[PixelNotifications] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send issue resolved email
   */
  async sendIssueResolvedEmail(pixel, issue) {
    try {
      if (!this.emailTransporter) return { success: false, reason: 'email_disabled' };

      const html = this.generateIssueResolvedHTML(pixel, issue);

      const result = await this.emailTransporter.sendMail({
        from: this.options.emailFrom,
        to: pixel.notification_email || 'admin@example.com',
        subject: `✅ SEO Issue Resolved: ${this.formatIssueType(issue.issue_type || issue.type)}`,
        html
      });

      console.log('[PixelNotifications] Issue resolved email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[PixelNotifications] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send pixel down email
   */
  async sendPixelDownEmail(pixel, downtimeStr) {
    try {
      if (!this.emailTransporter) return { success: false, reason: 'email_disabled' };

      const html = this.generatePixelDownHTML(pixel, downtimeStr);

      const result = await this.emailTransporter.sendMail({
        from: this.options.emailFrom,
        to: pixel.notification_email || 'admin@example.com',
        subject: `⚠️ Pixel Offline: ${pixel.domain}`,
        html
      });

      console.log('[PixelNotifications] Pixel down email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[PixelNotifications] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send score drop email
   */
  async sendScoreDropEmail(pixel, previousScore, currentScore, delta) {
    try {
      if (!this.emailTransporter) return { success: false, reason: 'email_disabled' };

      const html = this.generateScoreDropHTML(pixel, previousScore, currentScore, delta);

      const result = await this.emailTransporter.sendMail({
        from: this.options.emailFrom,
        to: pixel.notification_email || 'admin@example.com',
        subject: `📉 SEO Score Dropped: ${pixel.domain}`,
        html
      });

      console.log('[PixelNotifications] Score drop email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[PixelNotifications] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send daily summary email
   */
  async sendDailySummaryEmail(stats) {
    try {
      if (!this.emailTransporter) return { success: false, reason: 'email_disabled' };

      const html = this.generateDailySummaryHTML(stats);

      const result = await this.emailTransporter.sendMail({
        from: this.options.emailFrom,
        to: 'admin@example.com', // TODO: Get from settings
        subject: `📊 Daily SEO Summary - ${stats.date}`,
        html
      });

      console.log('[PixelNotifications] Daily summary email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[PixelNotifications] Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger webhook
   *
   * @param {string} event - Event name (issue.detected, issue.resolved, pixel.down, etc.)
   * @param {Object} data - Event data
   */
  async triggerWebhook(event, data) {
    if (!this.options.webhookEnabled) {
      return { success: false, reason: 'webhooks_disabled' };
    }

    try {
      // Get configured webhooks from database
      const webhooks = this.getActiveWebhooks();

      if (webhooks.length === 0) {
        return { success: false, reason: 'no_webhooks_configured' };
      }

      // Send to each webhook
      const results = await Promise.allSettled(
        webhooks.map(webhook => this.sendWebhook(webhook.url, event, data))
      );

      return {
        success: true,
        triggered: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
      };
    } catch (error) {
      console.error('[PixelNotifications] Error triggering webhook:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send single webhook HTTP request
   */
  async sendWebhook(url, event, data, retries = 0) {
    try {
      const response = await axios.post(url, {
        event,
        timestamp: new Date().toISOString(),
        data
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SEOExpert-Webhooks/1.0'
        }
      });

      console.log(`[PixelNotifications] Webhook sent: ${event} -> ${url}`);
      return { success: true, status: response.status };
    } catch (error) {
      if (retries < this.options.webhookRetries) {
        console.warn(`[PixelNotifications] Webhook failed, retrying (${retries + 1}/${this.options.webhookRetries})`);
        await this.delay(1000 * (retries + 1)); // Exponential backoff
        return this.sendWebhook(url, event, data, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Create dashboard notification
   * Uses the notifications-db module
   */
  async createDashboardNotification(notification) {
    try {
      const created = notificationsDb.create(notification);
      console.log(`[PixelNotifications] Dashboard notification created: ${created.id}`);
      return { success: true, notification: created };
    } catch (error) {
      console.error('[PixelNotifications] Error creating dashboard notification:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check pixel health and alert if down
   */
  async checkPixelHealth(pixelId) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel || !pixel.last_ping_at) return;

      const lastPing = new Date(pixel.last_ping_at);
      const now = new Date();
      const downtimeSeconds = (now - lastPing) / 1000;

      // Alert if pixel hasn't reported in 15 minutes
      const DOWNTIME_THRESHOLD = 900;

      if (downtimeSeconds > DOWNTIME_THRESHOLD) {
        // Check if we already sent notification recently
        const recentNotification = this.db.prepare(`
          SELECT id FROM notification_log
          WHERE type = 'pixel_down'
          AND pixel_id = ?
          AND sent_at > datetime('now', '-1 hour')
        `).get(pixelId);

        if (!recentNotification) {
          await this.notifyPixelDown(pixelId, downtimeSeconds);
          this.updatePixelStatus(pixelId, 'DOWN');
        }
      } else {
        // Pixel is back up
        if (pixel.status === 'DOWN' || pixel.status === 'inactive') {
          this.updatePixelStatus(pixelId, 'UP');
          await this.notifyPixelRecovery(pixelId);
        }
      }
    } catch (error) {
      console.error(`[PixelNotifications] Error checking pixel health ${pixelId}:`, error.message);
    }
  }

  /**
   * Check for SEO score drops across all pixels
   */
  async checkScoreDrops() {
    try {
      const pixels = this.getAllActivePixels();

      for (const pixel of pixels) {
        const analytics = this.getPixelAnalytics(pixel.id, 2); // Last 2 days
        if (analytics.length < 2) continue;

        const [today, yesterday] = analytics;
        const scoreDrop = yesterday.seo_score - today.seo_score;

        if (scoreDrop > this.options.scoreDropThreshold) {
          // Check if we already sent notification
          const recentNotification = this.db.prepare(`
            SELECT id FROM notification_log
            WHERE type = 'pixel_score_drop'
            AND pixel_id = ?
            AND sent_at > datetime('now', '-1 day')
          `).get(pixel.id);

          if (!recentNotification) {
            await this.notifyScoreDrop(pixel.id, yesterday.seo_score, today.seo_score);
          }
        }
      }
    } catch (error) {
      console.error('[PixelNotifications] Error checking score drops:', error.message);
    }
  }

  // ===== DATABASE HELPERS =====

  getPixelData(pixelId) {
    try {
      return this.db.prepare('SELECT * FROM pixel_deployments WHERE id = ?').get(pixelId);
    } catch (error) {
      console.error('[PixelNotifications] Error getting pixel data:', error.message);
      return null;
    }
  }

  getAllPixels() {
    try {
      return this.db.prepare('SELECT * FROM pixel_deployments').all();
    } catch (error) {
      console.error('[PixelNotifications] Error getting pixels:', error.message);
      return [];
    }
  }

  getAllActivePixels() {
    try {
      return this.db.prepare('SELECT * FROM pixel_deployments WHERE status = ?').all('active');
    } catch (error) {
      console.error('[PixelNotifications] Error getting active pixels:', error.message);
      return [];
    }
  }

  getPixelAnalytics(pixelId, days) {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_analytics
        WHERE pixel_id = ?
        AND date >= date('now', '-${days} days')
        ORDER BY date DESC
      `).all(pixelId);
    } catch (error) {
      console.error('[PixelNotifications] Error getting analytics:', error.message);
      return [];
    }
  }

  getActiveWebhooks() {
    try {
      return this.db.prepare('SELECT * FROM webhooks WHERE is_active = 1').all();
    } catch (error) {
      // Table might not exist yet, return empty
      return [];
    }
  }

  getDailySummaryStats() {
    try {
      const newIssues = this.db.prepare(`
        SELECT COUNT(*) as count FROM seo_issues
        WHERE detected_at > datetime('now', '-1 day')
      `).get();

      const resolvedIssues = this.db.prepare(`
        SELECT COUNT(*) as count FROM seo_issues
        WHERE resolved_at > datetime('now', '-1 day')
        AND resolved_at IS NOT NULL
      `).get();

      const criticalIssues = this.db.prepare(`
        SELECT COUNT(*) as count FROM seo_issues
        WHERE severity = 'CRITICAL' AND status = 'OPEN'
      `).get();

      const avgScore = this.db.prepare(`
        SELECT AVG(seo_score) as avg FROM pixel_analytics
        WHERE date = date('now')
      `).get();

      const activePixels = this.db.prepare('SELECT COUNT(*) as count FROM pixel_deployments WHERE status = ?').get('active');

      return {
        date: new Date().toLocaleDateString(),
        newIssues: newIssues.count,
        resolvedIssues: resolvedIssues.count,
        criticalIssues: criticalIssues.count,
        avgScore: Math.round(avgScore.avg || 0),
        activePixels: activePixels.count
      };
    } catch (error) {
      console.error('[PixelNotifications] Error getting daily stats:', error.message);
      return {
        date: new Date().toLocaleDateString(),
        newIssues: 0,
        resolvedIssues: 0,
        criticalIssues: 0,
        avgScore: 0,
        activePixels: 0
      };
    }
  }

  updatePixelStatus(pixelId, status) {
    try {
      this.db.prepare('UPDATE pixel_deployments SET status = ? WHERE id = ?')
        .run(status === 'UP' ? 'active' : 'inactive', pixelId);
    } catch (error) {
      console.error('[PixelNotifications] Error updating pixel status:', error.message);
    }
  }

  logNotificationSent(log) {
    try {
      this.db.prepare(`
        INSERT INTO notification_log (
          type, severity, title, message,
          client_id, pixel_id, data, channels, action_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.type,
        log.severity,
        log.title || '',
        log.message || '',
        log.clientId || null,
        log.pixelId || null,
        log.data || null,
        log.channels || JSON.stringify(['dashboard']),
        log.actionUrl || null
      );
    } catch (error) {
      console.error('[PixelNotifications] Error logging notification:', error.message);
    }
  }

  // ===== HTML EMAIL TEMPLATES =====

  generateCriticalIssueHTML(pixel, issue, recommendation) {
    const autoFixAvailable = recommendation && recommendation.auto_fix_available;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; }
    .issue { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .autofix { background: #d4edda; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Critical SEO Issue Detected</h1>
    </div>
    <div class="content">
      <p>A critical SEO issue has been detected on your website <strong>${pixel.domain}</strong>.</p>

      <div class="issue">
        <h3>${this.formatIssueType(issue.issue_type || issue.type)}</h3>
        <p><strong>Page:</strong> ${issue.page_url || 'Multiple pages'}</p>
        <p><strong>Severity:</strong> ${issue.severity || 'HIGH'}</p>
        <p><strong>Detected:</strong> ${new Date(issue.detected_at || Date.now()).toLocaleString()}</p>
      </div>

      ${autoFixAvailable ? `
      <div class="autofix">
        <h4>✨ AutoFix Available!</h4>
        <p>We can automatically generate a fix for this issue.</p>
        <a href="http://localhost:3000/recommendations" class="button">View AutoFix</a>
      </div>
      ` : `
      <a href="http://localhost:3000/recommendations" class="button">View Recommendation</a>
      `}

      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        This is an automated notification from your SEO monitoring system.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  generateIssueResolvedHTML(pixel, issue) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ SEO Issue Resolved</h1>
    </div>
    <div class="content">
      <p>Great news! An SEO issue has been resolved on <strong>${pixel.domain}</strong>.</p>
      <h3>${this.formatIssueType(issue.issue_type || issue.type)}</h3>
      <p><strong>Page:</strong> ${issue.page_url || pixel.domain}</p>
      <p><strong>Resolved:</strong> ${new Date().toLocaleString()}</p>
      <p>Keep up the great work!</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  generatePixelDownHTML(pixel, downtimeStr) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #000; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Pixel Stopped Reporting</h1>
    </div>
    <div class="content">
      <p>Your SEO monitoring pixel on <strong>${pixel.domain}</strong> has stopped reporting data.</p>
      <p><strong>Downtime:</strong> ${downtimeStr}</p>
      <p><strong>Last Seen:</strong> ${new Date(pixel.last_ping_at).toLocaleString()}</p>
      <p>This may indicate:</p>
      <ul>
        <li>The pixel script was removed from your website</li>
        <li>Your website is down</li>
        <li>JavaScript errors preventing pixel execution</li>
      </ul>
      <p>Please check your website and ensure the pixel is properly installed.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  generateScoreDropHTML(pixel, previousScore, currentScore, delta) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff6b6b; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; }
    .score-change { font-size: 24px; font-weight: bold; color: #dc3545; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📉 SEO Score Dropped</h1>
    </div>
    <div class="content">
      <p>The SEO score for <strong>${pixel.domain}</strong> has decreased significantly.</p>
      <div class="score-change">
        ${previousScore} → ${currentScore} (-${delta} points)
      </div>
      <p>Review your recent changes and check for new issues in your dashboard.</p>
      <a href="http://localhost:3000/pixel-management?pixel=${pixel.id}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Analytics</a>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  generateDailySummaryHTML(stats) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; }
    .stat { display: inline-block; width: 30%; text-align: center; margin: 10px; }
    .stat-number { font-size: 32px; font-weight: bold; color: #007bff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily SEO Summary</h1>
      <p>${stats.date}</p>
    </div>
    <div class="content">
      <p>Here's your daily SEO monitoring summary:</p>

      <div style="text-align: center; margin: 20px 0;">
        <div class="stat">
          <div class="stat-number">${stats.newIssues}</div>
          <div>New Issues</div>
        </div>
        <div class="stat">
          <div class="stat-number">${stats.resolvedIssues}</div>
          <div>Resolved</div>
        </div>
        <div class="stat">
          <div class="stat-number">${stats.activePixels}</div>
          <div>Active Pixels</div>
        </div>
      </div>

      ${stats.criticalIssues > 0 ? `<p><strong>⚠️ ${stats.criticalIssues} Critical Issues</strong> require immediate attention.</p>` : ''}
      ${stats.avgScore > 0 ? `<p><strong>Average SEO Score:</strong> ${stats.avgScore}/100</p>` : ''}

      <a href="http://localhost:3000/dashboard" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Dashboard</a>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  // ===== UTILITIES =====

  formatIssueType(issueType) {
    if (!issueType) return 'SEO Issue';
    return issueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
const pixelNotificationService = new PixelNotificationService();
export default pixelNotificationService;
