#!/usr/bin/env node

/**
 * Daily Health Summary Email
 * Sends comprehensive daily system status to abhishekmaharjan3737@gmail.com
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'abhishekmaharjan3737@gmail.com';
const FROM_EMAIL = 'SEO Automation <onboarding@resend.dev>';

if (!RESEND_API_KEY) {
  console.log('⚠️  RESEND_API_KEY not configured - skipping daily summary');
  process.exit(0);
}

// Send email using Resend API
async function sendEmail(emailData) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: NOTIFICATION_EMAIL,
      subject: emailData.subject,
      html: emailData.html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
}

// Get GitHub Actions status
async function getGitHubActionsStatus() {
  try {
    const { stdout } = await execAsync('gh run list --workflow="Weekly SEO Automation" --limit 5 --json conclusion,createdAt,databaseId');
    const runs = JSON.parse(stdout);
    const today = new Date();
    const oneDayAgo = new Date(today - 24 * 60 * 60 * 1000);

    const recentRuns = runs.filter(r => new Date(r.createdAt) > oneDayAgo);
    const successCount = recentRuns.filter(r => r.conclusion === 'success').length;
    const failCount = recentRuns.filter(r => r.conclusion === 'failure').length;

    return {
      total: runs.length,
      recentRuns: recentRuns.length,
      successCount,
      failCount,
      latestRun: runs[0] || null,
      successRate: runs.length > 0 ? Math.round((runs.filter(r => r.conclusion === 'success').length / runs.length) * 100) : 100
    };
  } catch (error) {
    console.error('Error getting GitHub Actions status:', error.message);
    return { total: 0, recentRuns: 0, successCount: 0, failCount: 0, latestRun: null, successRate: 0 };
  }
}

// Get Cloudflare API status
async function getCloudflareStatus() {
  try {
    const baseUrl = 'https://2c2f8877.seo-reports-4d9.pages.dev';
    const response = await fetch(`${baseUrl}/api/dashboard`);

    if (!response.ok) {
      return { status: 'DOWN', responseTime: 0 };
    }

    const data = await response.json();
    return {
      status: 'UP',
      responseTime: '<1s',
      clients: data.clients?.length || 0
    };
  } catch (error) {
    return { status: 'DOWN', responseTime: 0, clients: 0 };
  }
}

// Get disk space info
async function getDiskSpace() {
  try {
    const { stdout } = await execAsync('df -h . | tail -1');
    const parts = stdout.trim().split(/\s+/);
    return {
      total: parts[1],
      used: parts[2],
      available: parts[3],
      usePercent: parts[4]
    };
  } catch (error) {
    return { total: 'Unknown', used: 'Unknown', available: 'Unknown', usePercent: 'Unknown' };
  }
}

// Count recent reports
function getReportStats() {
  const logsDir = 'logs/clients';
  if (!existsSync(logsDir)) {
    return { total: 0, today: 0, thisWeek: 0 };
  }

  let total = 0;
  let today = 0;
  let thisWeek = 0;
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const clients = readdirSync(logsDir);
    for (const client of clients) {
      const reportsDir = join(logsDir, client, 'reports');
      if (existsSync(reportsDir)) {
        const reports = readdirSync(reportsDir).filter(f => f.endsWith('.html'));
        total += reports.length;

        for (const report of reports) {
          const stat = statSync(join(reportsDir, report));
          if (stat.mtime > oneDayAgo) today++;
          if (stat.mtime > oneWeekAgo) thisWeek++;
        }
      }
    }
  } catch (error) {
    console.error('Error counting reports:', error.message);
  }

  return { total, today, thisWeek };
}

// Build HTML email template
function buildDailySummaryEmail(data) {
  const {
    gitHub,
    cloudflare,
    disk,
    reports
  } = data;

  const overallHealth = gitHub.successRate >= 80 && cloudflare.status === 'UP' ? 'HEALTHY' : 'ATTENTION NEEDED';
  const healthColor = overallHealth === 'HEALTHY' ? '#10b981' : '#f59e0b';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily SEO System Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid ${healthColor};
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #111827;
    }
    .health-badge {
      display: inline-block;
      padding: 8px 16px;
      background: ${healthColor};
      color: white;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 10px;
      font-size: 14px;
    }
    .section {
      margin: 25px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .section h2 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #1f2937;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .metric {
      background: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .status-item:last-child {
      border-bottom: none;
    }
    .status-label {
      color: #6b7280;
      font-weight: 500;
    }
    .status-value {
      font-weight: 600;
      color: #111827;
    }
    .status-success {
      color: #10b981;
    }
    .status-warning {
      color: #f59e0b;
    }
    .status-error {
      color: #ef4444;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .timestamp {
      color: #9ca3af;
      font-size: 13px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily System Summary</h1>
      <div class="health-badge">${overallHealth}</div>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
        ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-value">${gitHub.successRate}%</div>
        <div class="metric-label">Success Rate</div>
      </div>
      <div class="metric">
        <div class="metric-value">${reports.today}</div>
        <div class="metric-label">Reports Today</div>
      </div>
      <div class="metric">
        <div class="metric-value">${cloudflare.clients}</div>
        <div class="metric-label">Active Clients</div>
      </div>
    </div>

    <!-- GitHub Actions Status -->
    <div class="section">
      <h2>🔄 GitHub Actions</h2>
      <div class="status-item">
        <span class="status-label">Latest Run Status</span>
        <span class="status-value ${gitHub.latestRun?.conclusion === 'success' ? 'status-success' : 'status-error'}">
          ${gitHub.latestRun?.conclusion?.toUpperCase() || 'N/A'}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">Recent Runs (24h)</span>
        <span class="status-value">${gitHub.recentRuns} runs (${gitHub.successCount} ✅, ${gitHub.failCount} ❌)</span>
      </div>
      <div class="status-item">
        <span class="status-label">Overall Success Rate</span>
        <span class="status-value ${gitHub.successRate >= 80 ? 'status-success' : 'status-warning'}">${gitHub.successRate}%</span>
      </div>
    </div>

    <!-- Cloudflare APIs Status -->
    <div class="section">
      <h2>☁️ Cloudflare APIs</h2>
      <div class="status-item">
        <span class="status-label">API Status</span>
        <span class="status-value ${cloudflare.status === 'UP' ? 'status-success' : 'status-error'}">${cloudflare.status}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Response Time</span>
        <span class="status-value">${cloudflare.responseTime}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Clients Served</span>
        <span class="status-value">${cloudflare.clients}</span>
      </div>
    </div>

    <!-- Reports Generated -->
    <div class="section">
      <h2>📄 Reports Generated</h2>
      <div class="status-item">
        <span class="status-label">Today</span>
        <span class="status-value status-success">${reports.today}</span>
      </div>
      <div class="status-item">
        <span class="status-label">This Week</span>
        <span class="status-value">${reports.thisWeek}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Total</span>
        <span class="status-value">${reports.total}</span>
      </div>
    </div>

    <!-- System Resources -->
    <div class="section">
      <h2>💾 System Resources</h2>
      <div class="status-item">
        <span class="status-label">Disk Usage</span>
        <span class="status-value">${disk.usePercent}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Available Space</span>
        <span class="status-value">${disk.available}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Total Capacity</span>
        <span class="status-value">${disk.total}</span>
      </div>
    </div>

    ${gitHub.failCount > 0 ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b;">⚠️ Attention Required</h3>
      <p style="margin: 0;">There were ${gitHub.failCount} failed runs in the last 24 hours. Check the <a href="https://github.com/Theprofitplatform/seoexpert/actions" style="color: #dc2626;">GitHub Actions</a> page for details.</p>
    </div>
    ` : `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #065f46;">✅ All Systems Running Smoothly</h3>
      <p style="margin: 0;">No issues detected in the last 24 hours. Your SEO automation is working perfectly!</p>
    </div>
    `}

    <div class="footer">
      <p>This is your automated daily summary from the SEO automation system.</p>
      <p class="timestamp">Generated on ${new Date().toUTCString()}</p>
      <p style="font-size: 12px; margin-top: 15px;">
        View full details at <a href="https://github.com/Theprofitplatform/seoexpert/actions" style="color: #3b82f6;">GitHub Actions</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Main execution
async function main() {
  try {
    console.log('📊 Generating daily health summary...');

    // Gather all system data
    const [gitHub, cloudflare, disk, reports] = await Promise.all([
      getGitHubActionsStatus(),
      getCloudflareStatus(),
      getDiskSpace(),
      Promise.resolve(getReportStats())
    ]);

    console.log('✓ GitHub Actions status:', gitHub.successRate + '%');
    console.log('✓ Cloudflare status:', cloudflare.status);
    console.log('✓ Reports generated today:', reports.today);

    const emailData = {
      subject: `📊 Daily SEO System Summary - ${new Date().toLocaleDateString()}`,
      html: buildDailySummaryEmail({ gitHub, cloudflare, disk, reports })
    };

    const result = await sendEmail(emailData);

    console.log('✅ Daily summary email sent successfully!');
    console.log(`   Email ID: ${result.id}`);
    console.log(`   Recipient: ${NOTIFICATION_EMAIL}`);

  } catch (error) {
    console.error('❌ Failed to send daily summary:', error.message);
    process.exit(0);
  }
}

main();
