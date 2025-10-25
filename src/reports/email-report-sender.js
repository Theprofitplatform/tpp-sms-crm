#!/usr/bin/env node
/**
 * Email Report Sender
 * Sends automated weekly SEO reports to clients
 * Supports multiple email providers (Resend, SendGrid, Mailgun)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class EmailReportSender {
  constructor(config) {
    this.config = config;
    this.provider = process.env.EMAIL_PROVIDER || 'resend'; // resend, sendgrid, mailgun
  }

  /**
   * Send weekly report via email
   */
  async sendWeeklyReport(clientId, reportPath, metrics) {
    console.log(`📧 Preparing to send report for ${clientId}...`);

    // Load HTML report
    const reportHTML = readFileSync(reportPath, 'utf8');

    // Get client details
    const client = this.getClientDetails(clientId);

    // Build email
    const email = {
      to: client.contact,
      from: process.env.FROM_EMAIL || 'reports@yourcompany.com',
      subject: `Weekly SEO Report - ${client.name} - ${new Date().toISOString().split('T')[0]}`,
      html: this.buildEmailHTML(client, reportHTML, metrics),
      attachments: [
        {
          filename: `seo-report-${clientId}-${new Date().toISOString().split('T')[0]}.html`,
          content: reportHTML,
          contentType: 'text/html'
        }
      ]
    };

    // Send based on provider
    try {
      await this.sendEmail(email);
      console.log(`✅ Report sent successfully to ${client.contact}`);
      return { success: true, recipient: client.contact };
    } catch (error) {
      console.error(`❌ Failed to send report:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get client details from config
   */
  getClientDetails(clientId) {
    try {
      const configPath = join(process.cwd(), 'clients', 'clients-config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      return config[clientId] || { contact: process.env.DEFAULT_EMAIL };
    } catch (error) {
      console.warn(`Could not load client config, using default email`);
      return { contact: process.env.DEFAULT_EMAIL };
    }
  }

  /**
   * Build email HTML with summary and report attachment
   */
  buildEmailHTML(client, reportHTML, metrics) {
    const quickWins = metrics.quickWins || 0;
    const postsOptimized = metrics.postsOptimized || 0;
    const trafficGain = metrics.estimatedTrafficGain || 0;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            background: #fff;
            padding: 30px;
            border: 1px solid #e0e0e0;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .stat {
            margin: 15px 0;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin: 5px 0;
        }
        .cta {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 0 0 12px 12px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Your Weekly SEO Report</h1>
        <p>${client.name || 'Your Website'}</p>
    </div>

    <div class="content">
        <p>Hi there,</p>

        <p>Your automated SEO optimization ran successfully this week. Here's a quick summary:</p>

        <div class="summary">
            <div class="stat">
                <div class="stat-label">Quick Win Opportunities</div>
                <div class="stat-value">${quickWins}</div>
                <p>Keywords ranking on page 2 that could be optimized to page 1</p>
            </div>

            <div class="stat">
                <div class="stat-label">Posts Optimized</div>
                <div class="stat-value">${postsOptimized}</div>
                <p>Pages automatically improved with better meta descriptions and keywords</p>
            </div>

            <div class="stat">
                <div class="stat-label">Estimated Traffic Gain</div>
                <div class="stat-value">+${trafficGain}</div>
                <p>Potential additional monthly clicks from optimizations</p>
            </div>
        </div>

        <p><strong>What we did this week:</strong></p>
        <ul>
            <li>Fetched latest Google Search Console data</li>
            <li>Identified ${quickWins} quick win keyword opportunities</li>
            <li>Optimized ${postsOptimized} pages automatically</li>
            <li>Created backup of all changes</li>
            <li>Generated detailed performance report</li>
        </ul>

        <p>The complete report is attached to this email with detailed analytics, keyword rankings, and recommendations.</p>

        <div style="text-align: center;">
            <a href="https://instantautotraders.com.au" class="cta">View Your Website</a>
        </div>

        <p><small>This is an automated report. Your website is being optimized weekly without any manual work required.</small></p>
    </div>

    <div class="footer">
        <p>SEO Automation System</p>
        <p>Powered by AI • Delivered Weekly • Zero Manual Work</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Send email via selected provider
   */
  async sendEmail(email) {
    switch (this.provider) {
      case 'resend':
        return await this.sendViaResend(email);
      case 'sendgrid':
        return await this.sendViaSendGrid(email);
      case 'mailgun':
        return await this.sendViaMailgun(email);
      default:
        console.log('📧 Email would be sent:', email.to);
        console.log('   (Email provider not configured, using mock)');
        return { success: true, messageId: 'mock-' + Date.now() };
    }
  }

  /**
   * Send via Resend (https://resend.com)
   */
  async sendViaResend(email) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        attachments: email.attachments
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Send via SendGrid
   */
  async sendViaSendGrid(email) {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: { email: email.from },
        subject: email.subject,
        content: [{ type: 'text/html', value: email.html }],
        attachments: email.attachments?.map(att => ({
          content: Buffer.from(att.content).toString('base64'),
          filename: att.filename,
          type: att.contentType
        }))
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return { success: true, messageId: response.headers.get('X-Message-Id') };
  }

  /**
   * Send via Mailgun
   */
  async sendViaMailgun(email) {
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_API_KEY or MAILGUN_DOMAIN not configured');
    }

    const formData = new FormData();
    formData.append('from', email.from);
    formData.append('to', email.to);
    formData.append('subject', email.subject);
    formData.append('html', email.html);

    email.attachments?.forEach(att => {
      formData.append('attachment', new Blob([att.content], { type: att.contentType }), att.filename);
    });

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun API error: ${error}`);
    }

    return await response.json();
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const clientId = process.argv[2];
  const reportPath = process.argv[3];

  if (!clientId || !reportPath) {
    console.log('Usage: node email-report-sender.js <client-id> <report-path>');
    process.exit(1);
  }

  const sender = new EmailReportSender({});
  const mockMetrics = {
    quickWins: 44,
    postsOptimized: 69,
    estimatedTrafficGain: 33
  };

  sender.sendWeeklyReport(clientId, reportPath, mockMetrics)
    .then(result => {
      if (result.success) {
        console.log('✅ Email sent successfully');
        process.exit(0);
      } else {
        console.error('❌ Email failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
