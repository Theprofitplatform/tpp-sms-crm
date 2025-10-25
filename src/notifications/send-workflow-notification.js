#!/usr/bin/env node

/**
 * GitHub Actions Email Notification Sender
 * Sends comprehensive email notifications for workflow runs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value;
  return acc;
}, {});

const {
  client,
  status,
  'run-url': runUrl,
  'run-number': runNumber,
  duration = 'unknown'
} = args;

// Email configuration from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'abhishekmaharjan3737@gmail.com';
const FROM_EMAIL = 'SEO Automation <onboarding@resend.dev>';

if (!RESEND_API_KEY) {
  console.log('⚠️  RESEND_API_KEY not configured - skipping email notification');
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

// Build HTML email template
function buildWorkflowEmail(data) {
  const { client, status, runUrl, runNumber, duration } = data;
  const isSuccess = status === 'true';
  const statusColor = isSuccess ? '#10b981' : '#ef4444';
  const statusIcon = isSuccess ? '✅' : '❌';
  const statusText = isSuccess ? 'SUCCESS' : 'FAILED';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Automation Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
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
      border-bottom: 3px solid ${statusColor};
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: ${statusColor};
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      background: ${statusColor};
      color: white;
      border-radius: 4px;
      font-weight: bold;
      margin-top: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .info-item {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 18px;
      font-weight: bold;
      color: #111827;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
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
      <h1>${statusIcon} SEO Automation ${statusText}</h1>
      <div class="status-badge">${statusText}</div>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your weekly SEO automation for <strong>${client}</strong> has completed.
    </p>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Client</div>
        <div class="info-value">${client}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Run #</div>
        <div class="info-value">${runNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duration</div>
        <div class="info-value">${duration}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value" style="color: ${statusColor}">${statusText}</div>
      </div>
    </div>

    ${isSuccess ? `
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #065f46;">✅ Automation Completed Successfully</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Google Search Console data fetched</li>
        <li>Quick win keywords identified</li>
        <li>Posts optimized with AI</li>
        <li>HTML report generated</li>
        <li>Backup created</li>
      </ul>
    </div>
    ` : `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b;">❌ Automation Failed</h3>
      <p style="margin: 0;">Check the GitHub Actions logs for details.</p>
    </div>
    `}

    <center>
      <a href="${runUrl}" class="button">View Full Report →</a>
    </center>

    <div class="footer">
      <p>This is an automated notification from your SEO automation system.</p>
      <p class="timestamp">Sent on ${new Date().toUTCString()}</p>
      <p style="font-size: 12px; margin-top: 15px;">
        Generated by <a href="https://github.com/Theprofitplatform/seoexpert" style="color: #3b82f6;">SEO Expert Automation</a>
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
    console.log('📧 Preparing to send email notification...');
    console.log(`   Client: ${client}`);
    console.log(`   Status: ${status === 'true' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   To: ${NOTIFICATION_EMAIL}`);

    const emailData = {
      subject: status === 'true'
        ? `✅ SEO Automation Success - ${client} (Run #${runNumber})`
        : `❌ SEO Automation Failed - ${client} (Run #${runNumber})`,
      html: buildWorkflowEmail({
        client,
        status,
        runUrl,
        runNumber,
        duration
      })
    };

    const result = await sendEmail(emailData);

    console.log('✅ Email notification sent successfully!');
    console.log(`   Email ID: ${result.id}`);
    console.log(`   Recipient: ${NOTIFICATION_EMAIL}`);

  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
    // Don't fail the workflow if email fails
    process.exit(0);
  }
}

main();
