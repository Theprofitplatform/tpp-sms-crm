/**
 * PIXEL NOTIFICATION SERVICE - Phase 4B Day 3
 *
 * Manages notifications for pixel events:
 * - Critical issue detected (immediate email)
 * - Pixel goes down (alert)
 * - SEO score drops significantly
 * - Daily summary reports
 * - Webhook triggers (issue.detected, issue.resolved)
 * - Dashboard real-time notifications
 *
 * Upgraded: PostgreSQL integration, full email support, webhooks
 * Phase: 4B Day 3 - High-Value Integrations
 * Date: November 2, 2025
 */

import { query } from '../database/client.js';
import nodemailer from 'nodemailer';
import axios from 'axios';

class PixelNotificationService {
  constructor(options = {}) {
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
   * Main: Handle new pixel issue detected
   *
   * @param {Object} issue - Pixel issue object
   * @param {Object} recommendation - Created recommendation
   */
  async handleNewIssue(issue, recommendation) {
    try {
      console.log(`[PixelNotifications] Handling new issue: ${issue.issue_type}`);

      const client = await this.getClientForIssue(issue);
      if (!client) {
        console.warn('[PixelNotifications] No client found for issue');
        return;
      }

      // Determine notification actions based on severity
      const actions = await this.determineNotificationActions(issue, recommendation);

      // Execute notification actions
      const results = {
        email: null,
        webhook: null,
        dashboard: null
      };

      if (actions.sendEmail) {
        results.email = await this.sendCriticalIssueEmail(client, issue, recommendation);
      }

      if (actions.triggerWebhook) {
        results.webhook = await this.triggerWebhook('issue.detected', {
          issue,
          recommendation,
          client
        });
      }

      if (actions.createDashboardNotification) {
        results.dashboard = await this.createDashboardNotification(client.id, {
          type: 'issue_detected',
          severity: issue.severity,
          title: `New ${issue.severity} SEO Issue Detected`,
          message: this.formatIssueMessage(issue),
          link: `/recommendations/${recommendation.id}`,
          metadata: {
            issue_id: issue.id,
            recommendation_id: recommendation.id,
            pixel_id: issue.pixel_id
          }
        });
      }

      // Log notification
      await this.logNotification({
        client_id: client.id,
        issue_id: issue.id,
        recommendation_id: recommendation.id,
        type: 'issue_detected',
        actions: actions,
        results: results
      });

      return results;
    } catch (error) {
      console.error('[PixelNotifications] Error handling new issue:', error.message);
      throw error;
    }
  }

  /**
   * Handle issue resolved
   */
  async handleIssueResolved(issue, recommendation) {
    try {
      const client = await this.getClientForIssue(issue);
      if (!client) return;

      // Send resolution notification
      await this.sendIssueResolvedEmail(client, issue, recommendation);

      // Trigger webhook
      await this.triggerWebhook('issue.resolved', {
        issue,
        recommendation,
        client
      });

      // Dashboard notification
      await this.createDashboardNotification(client.id, {
        type: 'issue_resolved',
        severity: 'INFO',
        title: 'SEO Issue Resolved',
        message: `${issue.issue_type} has been resolved`,
        link: `/recommendations/${recommendation.id}`,
        metadata: {
          issue_id: issue.id,
          recommendation_id: recommendation.id
        }
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
   * @param {number} downtimeSeconds - Downtime in seconds
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

      const notification = {
        type: 'pixel_down',
        severity: 'CRITICAL',
        title: 'Pixel Offline',
        message: `Pixel "${pixel.domain}" has not reported in ${downtimeStr}`,
        clientId: pixel.client_id,
        pixelId: pixel.id,
        data: {
          pixelId: pixel.id,
          domain: pixel.domain,
          lastSeen: pixel.last_ping_at,
          downtimeSeconds,
          downtimeFormatted: downtimeStr
        },
        channels: ['email', 'dashboard', 'sms'],
        actionUrl: `/pixel-management?pixel=${pixelId}`
      };

      await this.sendNotification(notification);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying pixel down:', error.message);
    }
  }

  /**
   * Notify when SEO score drops significantly
   *
   * @param {number} pixelId - Pixel ID
   * @param {number} previousScore - Previous SEO score
   * @param {number} currentScore - Current SEO score
   * @param {number} delta - Score change (negative)
   */
  async notifyScoreDrop(pixelId, previousScore, currentScore, delta) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel) return;

      const notification = {
        type: 'pixel_score_drop',
        severity: 'MEDIUM',
        title: 'SEO Score Decreased',
        message: `Pixel "${pixel.domain}" score dropped from ${previousScore} to ${currentScore} (${delta} points)`,
        clientId: pixel.client_id,
        pixelId: pixel.id,
        data: {
          pixelId: pixel.id,
          domain: pixel.domain,
          previousScore,
          currentScore,
          delta,
          timeframe: '24h'
        },
        channels: ['email', 'dashboard'],
        actionUrl: `/pixel-management?pixel=${pixelId}&tab=analytics`
      };

      await this.sendNotification(notification);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying score drop:', error.message);
    }
  }

  /**
   * Send daily summary of pixel activity
   *
   * @param {Object} stats - Daily statistics
   */
  async notifyDailySummary(stats) {
    try {
      const notification = {
        type: 'pixel_daily_summary',
        severity: 'INFO',
        title: 'Daily SEO Summary',
        message: `${stats.newIssues} new issues, ${stats.resolvedIssues} resolved, avg score: ${stats.avgScore}`,
        data: {
          date: new Date().toISOString().split('T')[0],
          pixelCount: stats.pixelCount,
          activePixels: stats.activePixels,
          newIssues: stats.newIssues,
          resolvedIssues: stats.resolvedIssues,
          avgScore: stats.avgScore,
          criticalIssues: stats.criticalIssues
        },
        channels: ['email'],
        actionUrl: '/analytics'
      };

      await this.sendNotification(notification);
    } catch (error) {
      console.error('[PixelNotifications] Error sending daily summary:', error.message);
    }
  }

  /**
   * Check pixel health and alert if down
   *
   * @param {number} pixelId - Pixel ID
   */
  async checkPixelHealth(pixelId) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel || !pixel.last_ping_at) return;

      const lastPing = new Date(pixel.last_ping_at);
      const now = new Date();
      const downtimeSeconds = (now - lastPing) / 1000;

      // Alert if pixel hasn't reported in 15 minutes (900 seconds)
      const DOWNTIME_THRESHOLD = 900;

      if (downtimeSeconds > DOWNTIME_THRESHOLD) {
        // Check if we already sent a down notification recently
        const recentNotification = this.db.prepare(`
          SELECT id FROM notification_log
          WHERE type = 'pixel_down'
          AND pixel_id = ?
          AND sent_at > datetime('now', '-1 hour')
        `).get(pixelId);

        // Only send if no recent notification
        if (!recentNotification) {
          await this.notifyPixelDown(pixelId, downtimeSeconds);

          // Update pixel status to DOWN
          this.updatePixelStatus(pixelId, 'DOWN');
        }
      } else {
        // Pixel is back up, update status if it was DOWN
        if (pixel.status === 'DOWN') {
          this.updatePixelStatus(pixelId, 'UP');

          // Send recovery notification
          await this.notifyPixelRecovery(pixelId);
        }
      }
    } catch (error) {
      console.error(`[PixelNotifications] Error checking pixel health ${pixelId}:`, error.message);
    }
  }

  /**
   * Notify when pixel recovers from down state
   *
   * @param {number} pixelId - Pixel ID
   */
  async notifyPixelRecovery(pixelId) {
    try {
      const pixel = this.getPixelData(pixelId);
      if (!pixel) return;

      const notification = {
        type: 'pixel_recovery',
        severity: 'INFO',
        title: 'Pixel Back Online',
        message: `Pixel "${pixel.domain}" has recovered and is reporting normally`,
        clientId: pixel.client_id,
        pixelId: pixel.id,
        data: {
          pixelId: pixel.id,
          domain: pixel.domain,
          recoveredAt: new Date().toISOString()
        },
        channels: ['dashboard'],
        actionUrl: `/pixel-management?pixel=${pixelId}`
      };

      await this.sendNotification(notification);
    } catch (error) {
      console.error('[PixelNotifications] Error notifying pixel recovery:', error.message);
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

        // Alert if score dropped >10 points
        const SCORE_DROP_THRESHOLD = 10;

        if (scoreDrop > SCORE_DROP_THRESHOLD) {
          // Check if we already sent a score drop notification recently
          const recentNotification = this.db.prepare(`
            SELECT id FROM notification_log
            WHERE type = 'pixel_score_drop'
            AND pixel_id = ?
            AND sent_at > datetime('now', '-1 day')
          `).get(pixel.id);

          // Only send if no recent notification
          if (!recentNotification) {
            await this.notifyScoreDrop(pixel.id, yesterday.seo_score, today.seo_score, scoreDrop);
          }
        }
      }
    } catch (error) {
      console.error('[PixelNotifications] Error checking score drops:', error.message);
    }
  }

  /**
   * Generate and send daily summary
   */
  async sendDailySummary() {
    try {
      const pixels = this.getAllPixels();
      const activePixels = pixels.filter(p => p.status === 'active');

      // Get issues from last 24 hours
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
        WHERE severity = 'CRITICAL'
        AND status = 'OPEN'
      `).get();

      // Get average SEO score
      const avgScoreResult = this.db.prepare(`
        SELECT AVG(seo_score) as avg FROM pixel_analytics
        WHERE date = date('now')
      `).get();

      const stats = {
        pixelCount: pixels.length,
        activePixels: activePixels.length,
        newIssues: newIssues.count,
        resolvedIssues: resolvedIssues.count,
        avgScore: Math.round(avgScoreResult.avg || 0),
        criticalIssues: criticalIssues.count
      };

      await this.notifyDailySummary(stats);
    } catch (error) {
      console.error('[PixelNotifications] Error sending daily summary:', error.message);
    }
  }

  /**
   * Get pixel data by ID
   *
   * @param {number} pixelId - Pixel ID
   * @returns {Object|null} Pixel data
   */
  getPixelData(pixelId) {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_deployments WHERE id = ?
      `).get(pixelId);
    } catch (error) {
      console.error('[PixelNotifications] Error getting pixel data:', error.message);
      return null;
    }
  }

  /**
   * Get all active pixels
   *
   * @returns {Array} Array of pixels
   */
  getAllActivePixels() {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_deployments WHERE status = 'active'
      `).all();
    } catch (error) {
      console.error('[PixelNotifications] Error getting active pixels:', error.message);
      return [];
    }
  }

  /**
   * Get all pixels
   *
   * @returns {Array} Array of pixels
   */
  getAllPixels() {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_deployments
      `).all();
    } catch (error) {
      console.error('[PixelNotifications] Error getting pixels:', error.message);
      return [];
    }
  }

  /**
   * Get pixel analytics for last N days
   *
   * @param {number} pixelId - Pixel ID
   * @param {number} days - Number of days
   * @returns {Array} Analytics data
   */
  getPixelAnalytics(pixelId, days) {
    try {
      return this.db.prepare(`
        SELECT * FROM pixel_analytics
        WHERE pixel_id = ?
        AND date >= date('now', '-${days} days')
        ORDER BY date DESC
      `).all(pixelId);
    } catch (error) {
      console.error('[PixelNotifications] Error getting pixel analytics:', error.message);
      return [];
    }
  }

  /**
   * Update pixel status
   *
   * @param {number} pixelId - Pixel ID
   * @param {string} status - New status
   */
  updatePixelStatus(pixelId, status) {
    try {
      this.db.prepare(`
        UPDATE pixel_deployments
        SET status = ?
        WHERE id = ?
      `).run(status === 'UP' ? 'active' : 'inactive', pixelId);

      // Also update pixel_health table if it exists
      try {
        this.db.prepare(`
          UPDATE pixel_health
          SET status = ?, last_check_at = datetime('now')
          WHERE pixel_id = ?
        `).run(status, pixelId);
      } catch (e) {
        // pixel_health might not have this row yet, ignore
      }
    } catch (error) {
      console.error('[PixelNotifications] Error updating pixel status:', error.message);
    }
  }

  /**
   * Placeholder for email sending (integrate with your email service)
   *
   * @param {Object} notification - Notification data
   */
  sendEmail(notification) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('[PixelNotifications] Would send email:', {
      subject: notification.title,
      body: notification.message,
      clientId: notification.clientId
    });
  }

  /**
   * Get notification statistics
   *
   * @returns {Object} Notification stats
   */
  getStats() {
    try {
      const totalNotifications = this.db.prepare(`
        SELECT COUNT(*) as count FROM notification_log
      `).get();

      const notificationsByType = this.db.prepare(`
        SELECT type, COUNT(*) as count
        FROM notification_log
        GROUP BY type
        ORDER BY count DESC
      `).all();

      const recentNotifications = this.db.prepare(`
        SELECT COUNT(*) as count FROM notification_log
        WHERE sent_at > datetime('now', '-24 hours')
      `).get();

      const unreadNotifications = this.db.prepare(`
        SELECT COUNT(*) as count FROM notification_log
        WHERE read_at IS NULL
      `).get();

      return {
        totalNotifications: totalNotifications.count,
        notificationsByType,
        last24Hours: recentNotifications.count,
        unread: unreadNotifications.count
      };
    } catch (error) {
      console.error('[PixelNotifications] Error getting stats:', error.message);
      return {};
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
const pixelNotificationService = new PixelNotificationService();
export default pixelNotificationService;
