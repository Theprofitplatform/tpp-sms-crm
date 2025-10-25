#!/usr/bin/env node

/**
 * Test Email Notification
 * Sends a test email to verify Resend configuration
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'abhishekmaharjan3737@gmail.com';
const FROM_EMAIL = 'SEO Automation <onboarding@resend.dev>';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY environment variable is required');
  console.log('');
  console.log('Set it with:');
  console.log('  export RESEND_API_KEY="your-api-key"');
  process.exit(1);
}

async function sendTestEmail() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      border-bottom: 3px solid #10b981;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #10b981;
    }
    .content {
      font-size: 16px;
    }
    .success-box {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 20px;
      border-radius: 6px;
      margin: 25px 0;
    }
    .success-box h3 {
      margin: 0 0 10px 0;
      color: #065f46;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Email Notifications Active!</h1>
    </div>

    <div class="content">
      <p>Hello,</p>

      <p>This is a test email from your SEO automation system. If you're reading this, your email notifications are configured correctly! 🎉</p>

      <div class="success-box">
        <h3>✅ What's Working:</h3>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Resend API integration</li>
          <li>Email delivery to abhishekmaharjan3737@gmail.com</li>
          <li>HTML email templates</li>
          <li>GitHub Actions integration (ready)</li>
        </ul>
      </div>

      <h3>📧 You'll Receive Emails For:</h3>
      <ul>
        <li><strong>Workflow Completions</strong> - After each SEO automation run</li>
        <li><strong>Daily Summaries</strong> - Every day at 8:00 AM UTC with system health</li>
        <li><strong>Error Alerts</strong> - If any critical issues are detected</li>
      </ul>

      <h3>🔧 Configuration:</h3>
      <ul>
        <li><strong>Email Provider:</strong> Resend</li>
        <li><strong>Recipient:</strong> abhishekmaharjan3737@gmail.com</li>
        <li><strong>Status:</strong> Active and ready</li>
      </ul>

      <p style="margin-top: 25px;">Your SEO automation system will now keep you informed of all activities automatically. No action needed from you!</p>
    </div>

    <div class="footer">
      <p>This is a test email from your SEO automation system.</p>
      <p style="font-size: 12px; margin-top: 15px; color: #9ca3af;">
        Sent on ${new Date().toUTCString()}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    console.log('📧 Sending test email...');
    console.log(`   To: ${NOTIFICATION_EMAIL}`);
    console.log(`   From: ${FROM_EMAIL}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFICATION_EMAIL,
        subject: '✅ Test Email - SEO Automation System',
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();

    console.log('');
    console.log('✅ Test email sent successfully!');
    console.log('');
    console.log('   Email ID:', result.id);
    console.log('   Recipient:', NOTIFICATION_EMAIL);
    console.log('');
    console.log('Check your inbox at abhishekmaharjan3737@gmail.com');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Failed to send test email');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    if (error.message.includes('401')) {
      console.error('The API key might be invalid. Check your Resend dashboard:');
      console.error('https://resend.com/api-keys');
    }

    process.exit(1);
  }
}

sendTestEmail();
