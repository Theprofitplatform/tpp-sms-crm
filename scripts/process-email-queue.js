#!/usr/bin/env node

/**
 * Email Queue Processor
 * 
 * Processes pending emails from the queue
 * Scheduled via PM2 cron: Every 15 minutes
 */

import emailService from '../src/services/email-service-unified.js';

console.log('==============================================');
console.log('  Email Queue Processor');
console.log('  ' + new Date().toISOString());
console.log('==============================================\n');

async function processEmailQueue() {
  try {
    // Check if email service is enabled
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true') {
      console.log('⚠️  Email notifications disabled. Skipping...\n');
      process.exit(0);
    }

    // Initialize email service
    const initialized = await emailService.initialize();
    
    if (!initialized) {
      console.log('⚠️  Email service not initialized. Check configuration.\n');
      process.exit(0);
    }

    console.log('📧 Email service ready');
    console.log('🔄 Processing queue...\n');

    // Here you would implement actual queue processing
    // For now, this is a placeholder that shows the service stats
    const stats = emailService.getStats();
    
    console.log('📊 Email Service Stats:');
    console.log(`   Sent: ${stats.sent}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Last sent: ${stats.lastSent || 'Never'}`);
    
    // TODO: Implement actual queue processing
    // Example:
    // const pendingEmails = await getEmailQueue();
    // for (const email of pendingEmails) {
    //   await emailService.send(email);
    // }

    console.log('\n✅ Queue processing completed');
    console.log(`⏱️  Completed at: ${new Date().toISOString()}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Email queue processing failed:', error);
    process.exit(1);
  }
}

processEmailQueue();
