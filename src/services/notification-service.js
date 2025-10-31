/**
 * NOTIFICATION SERVICE
 * 
 * Sends notifications for Local SEO audit completion
 * Supports email, webhooks, and logging
 */

import fs from 'fs/promises';
import path from 'path';

export class NotificationService {
  constructor(config = {}) {
    this.config = {
      email: config.email || null,
      webhook: config.webhook || null,
      logToFile: config.logToFile !== false, // Default true
      logDir: config.logDir || './logs/notifications'
    };

    this.notificationHistory = [];
  }

  /**
   * Send audit completion notification
   */
  async sendAuditNotification(auditData) {
    const notification = {
      type: 'audit_completed',
      clientId: auditData.clientId,
      score: auditData.score,
      timestamp: new Date().toISOString(),
      details: {
        napScore: auditData.napScore,
        schemaScore: auditData.schemaScore,
        schedule: auditData.schedule || 'manual'
      }
    };

    const results = {
      email: null,
      webhook: null,
      log: null
    };

    // Send email notification
    if (this.config.email) {
      results.email = await this.sendEmailNotification(notification);
    }

    // Send webhook notification
    if (this.config.webhook) {
      results.webhook = await this.sendWebhookNotification(notification);
    }

    // Log to file
    if (this.config.logToFile) {
      results.log = await this.logNotification(notification);
    }

    // Record in history
    this.notificationHistory.unshift({
      ...notification,
      sent: results,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 notifications
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }

    return results;
  }

  /**
   * Send email notification (placeholder - requires email service)
   */
  async sendEmailNotification(notification) {
    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log('📧 Email notification (placeholder):');
      console.log(`   To: ${this.config.email}`);
      console.log(`   Subject: Local SEO Audit Completed - ${notification.clientId}`);
      console.log(`   Score: ${notification.score}/100`);
      
      return {
        success: true,
        method: 'email',
        recipient: this.config.email,
        note: 'Email service not configured - would send here'
      };
    } catch (error) {
      console.error('❌ Email notification failed:', error.message);
      return {
        success: false,
        method: 'email',
        error: error.message
      };
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification) {
    try {
      // TODO: Implement actual HTTP POST to webhook URL
      console.log('🔗 Webhook notification (placeholder):');
      console.log(`   URL: ${this.config.webhook}`);
      console.log(`   Payload:`, JSON.stringify(notification, null, 2));

      return {
        success: true,
        method: 'webhook',
        url: this.config.webhook,
        note: 'Webhook service not configured - would POST here'
      };
    } catch (error) {
      console.error('❌ Webhook notification failed:', error.message);
      return {
        success: false,
        method: 'webhook',
        error: error.message
      };
    }
  }

  /**
   * Log notification to file
   */
  async logNotification(notification) {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });

      const filename = `notifications-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.config.logDir, filename);

      let logs = [];
      try {
        const existing = await fs.readFile(filepath, 'utf8');
        logs = JSON.parse(existing);
      } catch (err) {
        // File doesn't exist yet
      }

      logs.push({
        ...notification,
        loggedAt: new Date().toISOString()
      });

      await fs.writeFile(filepath, JSON.stringify(logs, null, 2));

      console.log(`📝 Notification logged to ${filename}`);

      return {
        success: true,
        method: 'file',
        path: filepath
      };
    } catch (error) {
      console.error('❌ File logging failed:', error.message);
      return {
        success: false,
        method: 'file',
        error: error.message
      };
    }
  }

  /**
   * Send alert for failed audit
   */
  async sendFailureAlert(clientId, error) {
    const alert = {
      type: 'audit_failed',
      severity: 'high',
      clientId,
      error: error.message || error,
      timestamp: new Date().toISOString()
    };

    console.log('🚨 ALERT: Audit Failed');
    console.log(`   Client: ${clientId}`);
    console.log(`   Error: ${error.message || error}`);

    if (this.config.logToFile) {
      await this.logNotification(alert);
    }

    return alert;
  }

  /**
   * Send score change alert
   */
  async sendScoreChangeAlert(clientId, oldScore, newScore) {
    const change = newScore - oldScore;
    const alert = {
      type: 'score_change',
      severity: change < -10 ? 'high' : change < 0 ? 'medium' : 'low',
      clientId,
      oldScore,
      newScore,
      change,
      timestamp: new Date().toISOString()
    };

    if (Math.abs(change) >= 10) {
      console.log(`📊 Significant Score Change for ${clientId}`);
      console.log(`   Old: ${oldScore}/100`);
      console.log(`   New: ${newScore}/100`);
      console.log(`   Change: ${change > 0 ? '+' : ''}${change}`);

      if (this.config.logToFile) {
        await this.logNotification(alert);
      }
    }

    return alert;
  }

  /**
   * Get notification history
   */
  getHistory(limit = 20) {
    return this.notificationHistory.slice(0, limit);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.notificationHistory.length;
    const byType = {};
    const bySeverity = {};

    this.notificationHistory.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      if (notification.severity) {
        bySeverity[notification.severity] = (bySeverity[notification.severity] || 0) + 1;
      }
    });

    return {
      total,
      byType,
      bySeverity,
      lastNotification: this.notificationHistory[0] || null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    console.log('✅ Notification config updated');
  }
}

// Export singleton with default config
export const notificationService = new NotificationService({
  email: process.env.NOTIFICATION_EMAIL || null,
  webhook: process.env.NOTIFICATION_WEBHOOK || null,
  logToFile: true
});

export default notificationService;
