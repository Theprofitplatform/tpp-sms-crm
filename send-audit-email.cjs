#!/usr/bin/env node

/**
 * Send Audit Reports via Email
 *
 * Sends SEO audit reports via email with HTML attachments
 * Requires Nodemailer and SMTP configuration
 *
 * Usage:
 *   node send-audit-email.js <email> [date]
 *
 * Examples:
 *   node send-audit-email.js "your@email.com"
 *   node send-audit-email.js "your@email.com" 2025-10-21
 *
 * Environment Variables (create .env.email):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   FROM_EMAIL=seo-expert@theprofitplatform.com.au
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load email configuration
if (fs.existsSync('.env.email')) {
  dotenv.config({ path: '.env.email' });
}

const recipientEmail = process.argv[2];
const auditDate = process.argv[3] || new Date().toISOString().split('T')[0];

if (!recipientEmail) {
  console.log('❌ Usage: node send-audit-email.js <email> [date]');
  console.log('   Example: node send-audit-email.js "avi@theprofitplatform.com.au" 2025-10-21');
  console.log('\n📝 Configure SMTP in .env.email:');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_USER=your-email@gmail.com');
  console.log('   SMTP_PASS=your-app-password');
  console.log('   FROM_EMAIL=seo-expert@theprofitplatform.com.au\n');
  process.exit(1);
}

// Check SMTP configuration
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const fromEmail = process.env.FROM_EMAIL || 'seo-expert@theprofitplatform.com.au';

if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
  console.log('❌ SMTP not configured. Please create .env.email with:');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_USER=your-email@gmail.com');
  console.log('   SMTP_PASS=your-app-password');
  console.log('   FROM_EMAIL=seo-expert@theprofitplatform.com.au\n');
  process.exit(1);
}

// Load client configuration
const configPath = path.join(__dirname, 'clients', 'clients-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get all active WordPress clients
const activeClients = Object.entries(config)
  .filter(([id, client]) => client.status === 'active')
  .map(([id, client]) => ({ id, ...client }));

console.log(`\n📧 Preparing email with audit reports...`);
console.log(`📅 Audit Date: ${auditDate}`);
console.log(`📊 Clients: ${activeClients.length}`);
console.log(`📬 Recipient: ${recipientEmail}\n`);

// Collect audit results and attachments
const results = [];
const attachments = [];

for (const client of activeClients) {
  const reportPath = path.join(__dirname, 'logs', 'clients', client.id, `audit-${auditDate}.html`);
  const jsonPath = path.join(__dirname, 'logs', 'clients', client.id, `audit-${auditDate}.json`);

  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    results.push({
      client: client.name,
      url: client.url,
      score: data.summary?.averageScore || 0,
      issues: data.summary?.totalIssues || 0,
      posts: data.summary?.postsAnalyzed || 0
    });

    if (fs.existsSync(reportPath)) {
      attachments.push({
        filename: `${client.id}-audit-${auditDate}.html`,
        path: reportPath,
        contentType: 'text/html'
      });
    }
  }
}

if (results.length === 0) {
  console.log(`❌ No audit reports found for ${auditDate}`);
  process.exit(1);
}

// Calculate overall statistics
const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
const totalPosts = results.reduce((sum, r) => sum + r.posts, 0);

// Build HTML email
let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .summary { background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .client-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .client-card h3 { margin-top: 0; color: #667eea; }
    .score { font-size: 24px; font-weight: bold; }
    .score.high { color: #2ecc71; }
    .score.medium { color: #f39c12; }
    .score.low { color: #e74c3c; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 SEO Audit Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Daily SEO Audit - ${auditDate}</p>
    </div>

    <div class="summary">
      <h2>📈 Overall Statistics</h2>
      <p><strong>Average Score:</strong> ${avgScore}/100</p>
      <p><strong>Total Posts Analyzed:</strong> ${totalPosts}</p>
      <p><strong>Total Issues Found:</strong> ${totalIssues}</p>
      <p><strong>Clients Audited:</strong> ${results.length}</p>
    </div>
`;

results.forEach(result => {
  const scoreClass = result.score >= 90 ? 'high' : result.score >= 70 ? 'medium' : 'low';
  const scoreEmoji = result.score >= 90 ? '🟢' : result.score >= 70 ? '🟡' : '🔴';

  htmlContent += `
    <div class="client-card">
      <h3>${scoreEmoji} ${result.client}</h3>
      <p><strong>Website:</strong> <a href="${result.url}">${result.url}</a></p>
      <p><strong>Score:</strong> <span class="score ${scoreClass}">${result.score}/100</span></p>
      <p><strong>Posts Analyzed:</strong> ${result.posts}</p>
      <p><strong>Issues Found:</strong> ${result.issues}</p>
    </div>
  `;
});

htmlContent += `
    <div class="footer">
      <p>📎 Detailed HTML reports are attached to this email</p>
      <p style="color: #666; font-size: 14px; margin-top: 15px;">
        Generated by SEO Expert Automation System<br>
        The Profit Platform
      </p>
    </div>
  </div>
</body>
</html>
`;

// Create email message
const mailOptions = {
  from: `"SEO Expert Automation" <${fromEmail}>`,
  to: recipientEmail,
  subject: `SEO Audit Report - ${auditDate} - Avg Score: ${avgScore}/100`,
  html: htmlContent,
  attachments: attachments
};

// Send email
console.log('📤 Sending email...\n');

const transporter = nodemailer.createTransporter(smtpConfig);

transporter.sendMail(mailOptions)
  .then(info => {
    console.log('✅ Email sent successfully!\n');
    console.log(`📊 Summary:`);
    results.forEach(r => {
      const scoreEmoji = r.score >= 90 ? '🟢' : r.score >= 70 ? '🟡' : '🔴';
      console.log(`   ${scoreEmoji} ${r.client}: ${r.score}/100 (${r.issues} issues, ${r.posts} posts)`);
    });
    console.log(`\n📧 Email sent to: ${recipientEmail}`);
    console.log(`📎 Attachments: ${attachments.length} HTML report(s)\n`);
  })
  .catch(error => {
    console.log('❌ Failed to send email');
    console.log(`   Error: ${error.message}\n`);

    if (error.message.includes('authentication') || error.message.includes('password')) {
      console.log('💡 SMTP authentication failed. For Gmail:');
      console.log('   1. Enable 2-factor authentication');
      console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
      console.log('   3. Use App Password in SMTP_PASS (not your regular password)\n');
    }

    process.exit(1);
  });
