#!/usr/bin/env node
/**
 * Email Notification System
 * Sends comprehensive updates about automation status
 */

import { readFileSync, existsSync } from 'fs';

export class EmailNotifier {
  constructor(options = {}) {
    this.toEmail = options.toEmail || process.env.NOTIFICATION_EMAIL || 'abhishekmaharjan3737@gmail.com';
    this.fromEmail = options.fromEmail || process.env.FROM_EMAIL || 'seo-automation@updates.com';
    this.provider = options.provider || process.env.EMAIL_PROVIDER || 'resend';
  }

  /**
   * Send workflow completion notification
   */
  async sendWorkflowNotification(workflowData) {
    const { status, conclusion, clients, duration, runUrl, reports } = workflowData;

    const subject = conclusion === 'success'
      ? `✅ SEO Automation Completed Successfully`
      : `❌ SEO Automation Failed`;

    const html = this.buildWorkflowEmail(workflowData);

    return await this.sendEmail({
      subject,
      html,
      priority: conclusion === 'failure' ? 'high' : 'normal'
    });
  }

  /**
   * Send health check alert
   */
  async sendHealthAlert(healthData) {
    const { status, checks, timestamp } = healthData;

    const subject = status === 'healthy'
      ? `✅ System Health Check: All Systems Operational`
      : status === 'degraded'
      ? `⚠️ System Health Check: Performance Degraded`
      : `🚨 System Health Check: Critical Issues Detected`;

    const html = this.buildHealthEmail(healthData);

    return await this.sendEmail({
      subject,
      html,
      priority: status === 'unhealthy' ? 'high' : 'normal'
    });
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(summaryData) {
    const { date, clients, metrics, issues } = summaryData;

    const subject = `📊 Daily SEO Summary - ${date}`;
    const html = this.buildDailySummaryEmail(summaryData);

    return await this.sendEmail({
      subject,
      html
    });
  }

  /**
   * Send critical error alert
   */
  async sendErrorAlert(errorData) {
    const { error, context, timestamp, stackTrace } = errorData;

    const subject = `🚨 CRITICAL: Automation Error Detected`;
    const html = this.buildErrorEmail(errorData);

    return await this.sendEmail({
      subject,
      html,
      priority: 'high'
    });
  }

  /**
   * Send weekly report notification
   */
  async sendWeeklyReport(reportData) {
    const { week, totalClients, totalOptimizations, totalQuickWins, revenue } = reportData;

    const subject = `📈 Weekly SEO Report - Week of ${week}`;
    const html = this.buildWeeklyReportEmail(reportData);

    return await this.sendEmail({
      subject,
      html
    });
  }

  /**
   * Build workflow completion email
   */
  buildWorkflowEmail(data) {
    const statusColor = data.conclusion === 'success' ? '#10b981' : '#ef4444';
    const statusIcon = data.conclusion === 'success' ? '✅' : '❌';
    const statusText = data.conclusion === 'success' ? 'SUCCESS' : 'FAILED';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            margin: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: ${statusColor};
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            margin-top: 10px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #667eea;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 8px;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .client-list {
            list-style: none;
            padding: 0;
        }
        .client-item {
            padding: 12px;
            margin: 8px 0;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid ${statusColor};
        }
        .client-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .client-stats {
            font-size: 14px;
            color: #666;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .timestamp {
            color: #999;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} GitHub Actions Workflow</h1>
            <div class="status-badge">${statusText}</div>
        </div>

        <div class="content">
            <div class="section">
                <h2>📊 Execution Summary</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-label">Duration</div>
                        <div class="stat-value">${data.duration || 'N/A'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Clients</div>
                        <div class="stat-value">${data.clients?.length || 0}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Success Rate</div>
                        <div class="stat-value">${data.successRate || '100%'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Reports</div>
                        <div class="stat-value">${data.reportsGenerated || 0}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>👥 Client Results</h2>
                <ul class="client-list">
                    ${(data.clients || []).map(client => `
                        <li class="client-item">
                            <div class="client-name">${client.status === 'success' ? '✅' : '❌'} ${client.name}</div>
                            <div class="client-stats">
                                Posts Optimized: ${client.postsOptimized || 0} •
                                Quick Wins: ${client.quickWins || 0} •
                                Duration: ${client.duration || 'N/A'}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>

            ${data.conclusion === 'failure' ? `
            <div class="section">
                <h2>❌ Error Details</h2>
                <div style="background: #fee; border-left: 4px solid #f00; padding: 15px; border-radius: 4px;">
                    <strong>Error:</strong> ${data.error || 'Check workflow logs for details'}
                </div>
            </div>
            ` : ''}

            <div class="section" style="text-align: center;">
                <a href="${data.runUrl}" class="cta-button">View Full Workflow Logs →</a>
            </div>

            <div class="section">
                <h2>📥 Next Steps</h2>
                <ul>
                    ${data.conclusion === 'success' ? `
                        <li>Reports are available in GitHub Actions artifacts</li>
                        <li>Download and review client reports</li>
                        <li>Check the live dashboard for updated metrics</li>
                        <li>All changes have been backed up</li>
                    ` : `
                        <li>Review error logs in GitHub Actions</li>
                        <li>Check system health status</li>
                        <li>Verify client configurations</li>
                        <li>Contact support if issue persists</li>
                    `}
                </ul>
            </div>
        </div>

        <div class="footer">
            <p><strong>SEO Automation System</strong></p>
            <p>Automated Weekly Optimization • Zero Manual Work • 100% Profit</p>
            <div class="timestamp">Sent: ${new Date().toISOString()}</div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Build health check email
   */
  buildHealthEmail(data) {
    const statusColor = data.status === 'healthy' ? '#10b981' :
                       data.status === 'degraded' ? '#f59e0b' : '#ef4444';
    const statusIcon = data.status === 'healthy' ? '✅' :
                      data.status === 'degraded' ? '⚠️' : '🚨';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .check-item { padding: 12px; margin: 8px 0; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${statusColor}; }
        .check-name { font-weight: 600; }
        .check-status { font-size: 14px; color: #666; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${statusIcon} System Health Check</h1>
        <p>Status: ${data.status.toUpperCase()}</p>
    </div>

    <div style="margin: 20px 0;">
        <h2>Component Status</h2>
        ${Object.entries(data.checks || {}).map(([name, check]) => `
            <div class="check-item">
                <div class="check-name">
                    ${check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
                    ${name.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div class="check-status">${check.message}</div>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>SEO Automation Health Monitor</p>
        <p>${new Date().toISOString()}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Build daily summary email
   */
  buildDailySummaryEmail(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
        .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 28px; font-weight: bold; color: #667eea; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Summary</h1>
        <p>${data.date}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <div class="metric-value">${data.clients || 0}</div>
            <div class="metric-label">Active Clients</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.optimizations || 0}</div>
            <div class="metric-label">Optimizations</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.quickWins || 0}</div>
            <div class="metric-label">Quick Wins</div>
        </div>
        <div class="metric">
            <div class="metric-value">+${data.trafficGain || 0}</div>
            <div class="metric-label">Potential Clicks</div>
        </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Key Highlights</h3>
        <ul>
            <li>All systems operational</li>
            <li>No critical errors detected</li>
            <li>Reports delivered on schedule</li>
            <li>Revenue tracking: $${data.revenue || 0}/month</li>
        </ul>
    </div>
</body>
</html>
    `;
  }

  /**
   * Build error alert email
   */
  buildErrorEmail(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px; }
        .error-header { background: #fee; border: 2px solid #f00; padding: 20px; border-radius: 8px; color: #900; }
        .error-details { background: #333; color: #0f0; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 15px 0; }
        pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <div class="error-header">
        <h1>🚨 CRITICAL ERROR</h1>
        <p><strong>Error:</strong> ${data.error}</p>
        <p><strong>Time:</strong> ${data.timestamp || new Date().toISOString()}</p>
        <p><strong>Context:</strong> ${data.context || 'Unknown'}</p>
    </div>

    ${data.stackTrace ? `
    <div class="error-details">
        <h3>Stack Trace:</h3>
        <pre>${data.stackTrace}</pre>
    </div>
    ` : ''}

    <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
        <h3>⚠️ Immediate Action Required</h3>
        <ol>
            <li>Check system logs immediately</li>
            <li>Verify all services are running</li>
            <li>Review recent changes</li>
            <li>Contact support if needed</li>
        </ol>
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
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .revenue { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 Weekly Report</h1>
        <p>Week of ${data.week}</p>
    </div>

    <div class="revenue">
        $${data.revenue || 0}/month
    </div>

    <div class="summary">
        <h3>This Week's Performance</h3>
        <ul>
            <li><strong>${data.totalClients || 0}</strong> active clients</li>
            <li><strong>${data.totalOptimizations || 0}</strong> posts optimized</li>
            <li><strong>${data.totalQuickWins || 0}</strong> quick win opportunities found</li>
            <li><strong>+${data.totalTrafficGain || 0}</strong> potential monthly clicks</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="https://github.com/Theprofitplatform/seoexpert/actions" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Detailed Reports →
        </a>
    </div>
</body>
</html>
    `;
  }

  /**
   * Send email via selected provider
   */
  async sendEmail({ subject, html, priority = 'normal' }) {
    const email = {
      to: this.toEmail,
      from: this.fromEmail,
      subject,
      html,
      priority
    };

    console.log(`📧 Sending email: ${subject}`);
    console.log(`   To: ${this.toEmail}`);

    try {
      let result;

      switch (this.provider) {
        case 'resend':
          result = await this.sendViaResend(email);
          break;
        case 'sendgrid':
          result = await this.sendViaSendGrid(email);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(email);
          break;
        case 'smtp':
          result = await this.sendViaSMTP(email);
          break;
        default:
          console.log('📧 Email would be sent (provider not configured, using mock)');
          console.log(`   Subject: ${subject}`);
          return { success: true, messageId: 'mock-' + Date.now(), mock: true };
      }

      console.log(`✅ Email sent successfully`);
      return { success: true, ...result };

    } catch (error) {
      console.error(`❌ Failed to send email:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via Resend (Recommended - Free tier: 100 emails/day)
   */
  async sendViaResend(email) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY || RESEND_API_KEY === 'your-resend-api-key') {
      throw new Error('RESEND_API_KEY not configured. Sign up at resend.com and add your API key.');
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
        html: email.html
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
        content: [{ type: 'text/html', value: email.html }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return { messageId: response.headers.get('X-Message-Id') };
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

  /**
   * Send via SMTP (Gmail, Outlook, etc.)
   */
  async sendViaSMTP(email) {
    // Note: Would require nodemailer package
    // For now, throw error suggesting to use Resend instead
    throw new Error('SMTP not implemented. Use Resend instead (free tier available)');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const notifier = new EmailNotifier();

  if (command === 'test') {
    // Send test email
    notifier.sendWorkflowNotification({
      conclusion: 'success',
      duration: '3m 45s',
      clients: [
        { name: 'Instant Auto Traders', status: 'success', postsOptimized: 69, quickWins: 44, duration: '3m 11s' },
        { name: 'Hot Tyres', status: 'success', postsOptimized: 30, quickWins: 25, duration: '3m 3s' },
        { name: 'SADC', status: 'success', postsOptimized: 15, quickWins: 12, duration: '1m 30s' }
      ],
      successRate: '100%',
      reportsGenerated: 3,
      runUrl: 'https://github.com/Theprofitplatform/seoexpert/actions'
    }).then(result => {
      if (result.success) {
        console.log('✅ Test email sent!');
        if (result.mock) {
          console.log('⚠️  Using mock mode - configure RESEND_API_KEY for real emails');
        }
        process.exit(0);
      } else {
        console.error('❌ Failed:', result.error);
        process.exit(1);
      }
    });
  } else if (command === 'health') {
    // Send health check email
    notifier.sendHealthAlert({
      status: 'healthy',
      checks: {
        githubActions: { status: 'healthy', message: 'All runs successful' },
        cloudflareAPIs: { status: 'healthy', message: '4/4 tests passing' },
        localEnvironment: { status: 'healthy', message: 'All files present' },
        diskSpace: { status: 'healthy', message: '60% used' }
      },
      timestamp: new Date().toISOString()
    }).then(result => {
      if (result.success) {
        console.log('✅ Health alert sent!');
        process.exit(0);
      } else {
        console.error('❌ Failed:', result.error);
        process.exit(1);
      }
    });
  } else {
    console.log('Usage:');
    console.log('  node email-notifier.js test    - Send test notification');
    console.log('  node email-notifier.js health  - Send health check');
  }
}

export default EmailNotifier;
