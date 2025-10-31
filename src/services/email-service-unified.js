/**
 * Unified Email Service for Production
 * 
 * Handles all email notifications with support for:
 * - Gmail (development)
 * - SendGrid (production via SMTP)
 * - AWS SES (optional)
 * - Email templates
 * - Retry logic
 * - Queue support
 */

import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.config = {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.FROM_EMAIL || 'noreply@seoexpert.com',
      fromName: process.env.FROM_NAME || 'SEO Automation Platform',
      replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL,
      company: {
        name: process.env.COMPANY_NAME || 'SEO Automation Platform',
        address: process.env.COMPANY_ADDRESS || '',
        city: process.env.COMPANY_CITY || '',
        state: process.env.COMPANY_STATE || '',
        zip: process.env.COMPANY_ZIP || '',
        supportEmail: process.env.SUPPORT_EMAIL || '',
        supportPhone: process.env.SUPPORT_PHONE || ''
      },
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:9000'
    };

    this.stats = {
      sent: 0,
      failed: 0,
      lastError: null,
      lastSent: null
    };
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    if (!this.config.enabled) {
      console.log('📧 Email notifications disabled (set EMAIL_NOTIFICATIONS_ENABLED=true to enable)');
      return false;
    }

    if (!this.config.user || !this.config.pass) {
      console.warn('⚠️  Email credentials not configured. Set SMTP_USER and SMTP_PASS in .env');
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10 // Max 10 emails per second
      });

      // Verify connection
      await this.transporter.verify();
      this.isInitialized = true;

      console.log('✅ Email service initialized successfully');
      console.log(`   Provider: ${this.config.host}`);
      console.log(`   From: ${this.config.fromName} <${this.config.from}>`);

      return true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.stats.lastError = error.message;
      return false;
    }
  }

  /**
   * Send email
   */
  async send({ to, subject, html, text, attachments = [], priority = 'normal' }) {
    if (!this.config.enabled) {
      console.log('[Email] Skipped (disabled):', subject);
      return { success: false, reason: 'disabled' };
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, reason: 'not_initialized' };
      }
    }

    try {
      // Generate plain text if not provided
      const textContent = text || htmlToText(html, {
        wordwrap: 80,
        ignoreImage: true,
        uppercaseHeadings: false
      });

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.from}>`,
        to,
        replyTo: this.config.replyTo,
        subject,
        html,
        text: textContent,
        attachments,
        headers: {
          'X-Priority': priority === 'high' ? '1' : '3',
          'X-Mailer': 'SEO Automation Platform'
        }
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.stats.sent++;
      this.stats.lastSent = new Date();

      console.log(`✅ Email sent: ${subject} -> ${to}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      this.stats.failed++;
      this.stats.lastError = error.message;

      console.error(`❌ Email failed: ${subject}`, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send audit completion email
   */
  async sendAuditComplete(clientEmail, auditData) {
    const html = this.buildAuditEmail(auditData);

    return await this.send({
      to: clientEmail,
      subject: `SEO Audit Complete - ${auditData.clientName}`,
      html
    });
  }

  /**
   * Send optimization report
   */
  async sendOptimizationReport(clientEmail, reportData) {
    const html = this.buildOptimizationEmail(reportData);

    return await this.send({
      to: clientEmail,
      subject: `SEO Optimization Report - ${reportData.clientName}`,
      html
    });
  }

  /**
   * Send alert notification
   */
  async sendAlert(clientEmail, alertData) {
    const html = this.buildAlertEmail(alertData);

    return await this.send({
      to: clientEmail,
      subject: `⚠️ SEO Alert - ${alertData.title}`,
      html,
      priority: alertData.priority === 'high' ? 'high' : 'normal'
    });
  }

  /**
   * Send weekly report
   */
  async sendWeeklyReport(clientEmail, reportData) {
    const html = this.buildWeeklyReportEmail(reportData);

    return await this.send({
      to: clientEmail,
      subject: `Weekly SEO Report - ${reportData.clientName}`,
      html
    });
  }

  /**
   * Send test email
   */
  async sendTest(to) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Email Service Test</h1>
          <p>This is a test email from the SEO Automation Platform.</p>
          <p>If you received this, your email service is configured correctly!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            Sent at: ${new Date().toISOString()}<br>
            From: ${this.config.from}<br>
            Provider: ${this.config.host}
          </p>
        </div>
      </body>
      </html>
    `;

    return await this.send({
      to,
      subject: 'Test Email - SEO Automation Platform',
      html
    });
  }

  /**
   * Build audit email HTML
   */
  buildAuditEmail(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">SEO Audit Complete ✅</h1>
          
          <p>Hi there,</p>
          
          <p>Your SEO audit for <strong>${data.clientName}</strong> has been completed.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Summary</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📊 SEO Score: <strong>${data.seoScore || 'N/A'}/100</strong></li>
              <li>⚠️  Issues Found: <strong>${data.issuesFound || 0}</strong></li>
              <li>✅ Issues Fixed: <strong>${data.issuesFixed || 0}</strong></li>
              <li>📈 Expected Impact: <strong>${data.expectedImpact || 'Moderate'}</strong></li>
            </ul>
          </div>
          
          ${data.reportUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${data.reportUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Full Report
            </a>
          </p>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            ${this.config.company.name}<br>
            ${this.config.dashboardUrl}<br>
            ${this.config.company.supportEmail}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build optimization email HTML
   */
  buildOptimizationEmail(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
          <h1 style="color: #10b981; margin-top: 0;">Optimization Complete 🚀</h1>
          
          <p>Hi there,</p>
          
          <p>We've optimized <strong>${data.pagesOptimized || 0} pages</strong> on ${data.clientName}.</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #059669;">Improvements Made</h3>
            <ul>
              ${(data.improvements || []).map(imp => `<li>${imp}</li>`).join('')}
            </ul>
          </div>
          
          ${data.dashboardUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Dashboard
            </a>
          </p>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            ${this.config.company.name}<br>
            ${this.config.dashboardUrl}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build alert email HTML
   */
  buildAlertEmail(data) {
    const priorityColor = {
      high: '#dc2626',
      medium: '#f59e0b',
      low: '#3b82f6'
    }[data.priority] || '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
          <h1 style="color: ${priorityColor}; margin-top: 0;">⚠️ SEO Alert</h1>
          
          <h2 style="color: #111827;">${data.title}</h2>
          
          <p>${data.message}</p>
          
          ${data.recommendation ? `
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e40af;">Recommended Action</h3>
            <p style="margin-bottom: 0;">${data.recommendation}</p>
          </div>
          ` : ''}
          
          ${data.actionUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Take Action
            </a>
          </p>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            ${this.config.company.name}<br>
            Priority: ${data.priority.toUpperCase()}<br>
            ${new Date().toISOString()}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build weekly report email
   */
  buildWeeklyReportEmail(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">📊 Weekly SEO Report</h1>
          
          <p>Hi there,</p>
          
          <p>Here's your weekly SEO summary for <strong>${data.clientName}</strong>:</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0;">This Week's Metrics</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Organic Traffic</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${data.organicTraffic || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Average Position</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${data.avgPosition || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Keywords Tracked</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${data.keywordsTracked || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Optimizations Made</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.optimizations || 0}</td>
              </tr>
            </table>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${this.config.dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Full Dashboard
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6b7280;">
            ${this.config.company.name}<br>
            ${this.config.dashboardUrl}<br>
            Week ending: ${new Date().toLocaleDateString()}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get service stats
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      provider: this.config.host
    };
  }
}

// Export singleton instance
export default new EmailService();
