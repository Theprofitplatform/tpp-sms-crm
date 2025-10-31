#!/usr/bin/env node

/**
 * Test Email Service
 * 
 * Tests email configuration and sends test email
 * 
 * Usage:
 *   node scripts/test-email-service.js
 *   node scripts/test-email-service.js --to your@email.com
 */

import emailService from '../src/services/email-service-unified.js';

async function testEmailService() {
  console.log('\n==============================================');
  console.log('  Email Service Test');
  console.log('==============================================\n');

  // Parse arguments
  const args = process.argv.slice(2);
  let toEmail = null;

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--to') {
      toEmail = args[i + 1];
    }
  }

  if (!toEmail) {
    console.log('❌ Error: Recipient email required');
    console.log('Usage: node scripts/test-email-service.js --to your@email.com\n');
    process.exit(1);
  }

  try {
    // Display configuration
    console.log('📧 Email Configuration:');
    console.log(`   Enabled: ${process.env.EMAIL_NOTIFICATIONS_ENABLED || 'false'}`);
    console.log(`   Provider: ${process.env.SMTP_HOST || 'not configured'}`);
    console.log(`   Port: ${process.env.SMTP_PORT || 'not configured'}`);
    console.log(`   User: ${process.env.SMTP_USER ? '***configured***' : 'not configured'}`);
    console.log(`   From: ${process.env.FROM_EMAIL || 'not configured'}`);
    console.log();

    // Check if email is enabled
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('⚠️  Email notifications are disabled');
      console.log('   Set EMAIL_NOTIFICATIONS_ENABLED=true in .env to enable\n');
      process.exit(1);
    }

    // Initialize service
    console.log('🔄 Initializing email service...');
    const initialized = await emailService.initialize();

    if (!initialized) {
      console.log('❌ Failed to initialize email service');
      console.log('   Check your SMTP credentials in .env\n');
      process.exit(1);
    }

    // Send test email
    console.log(`📨 Sending test email to ${toEmail}...`);
    const result = await emailService.sendTest(toEmail);

    if (result.success) {
      console.log('\n✅ Test email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`\n📬 Check your inbox at: ${toEmail}\n`);
    } else {
      console.log('\n❌ Failed to send test email');
      console.log(`   Error: ${result.error}\n`);
      process.exit(1);
    }

    // Display stats
    const stats = emailService.getStats();
    console.log('📊 Email Service Stats:');
    console.log(`   Emails sent: ${stats.sent}`);
    console.log(`   Emails failed: ${stats.failed}`);
    console.log(`   Last sent: ${stats.lastSent || 'N/A'}`);
    console.log();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testEmailService();
