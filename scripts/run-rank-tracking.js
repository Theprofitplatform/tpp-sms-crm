#!/usr/bin/env node

/**
 * Rank Tracking Runner
 * 
 * Fetches keyword rankings for all clients
 * Scheduled via PM2 cron: Daily at 6 AM
 */

import { initializePositionTrackingJobs } from '../src/jobs/position-tracking-cron.js';

console.log('==============================================');
console.log('  Rank Tracking Runner');
console.log('  ' + new Date().toISOString());
console.log('==============================================\n');

async function runRankTracking() {
  try {
    console.log('📊 Starting rank tracking jobs...\n');

    // Initialize and run position tracking
    await initializePositionTrackingJobs();

    console.log('\n✅ Rank tracking completed successfully');
    console.log(`⏱️  Completed at: ${new Date().toISOString()}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Rank tracking failed:', error);
    process.exit(1);
  }
}

runRankTracking();
