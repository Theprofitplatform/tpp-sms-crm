/**
 * Rank Tracking Scheduler
 *
 * Sets up automated daily rank tracking using cron jobs
 */

import cron from 'node-cron';
import { rankTracker } from './rank-tracker.js';
import { config } from '../../config/env/config.js';

export class RankScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start the rank tracking scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Rank tracking scheduler is already running');
      return;
    }

    const enabled = process.env.RANK_TRACKING_ENABLED === 'true';

    if (!enabled) {
      console.log('ℹ️  Rank tracking is disabled (RANK_TRACKING_ENABLED=false)');
      return;
    }

    // Default: Daily at 6 AM
    const schedule = process.env.RANK_TRACKING_SCHEDULE || '0 6 * * *';

    console.log(`📅 Starting rank tracking scheduler with schedule: ${schedule}`);

    const job = cron.schedule(schedule, async () => {
      console.log('🕐 Running scheduled rank tracking...');
      const startTime = Date.now();

      try {
        const results = await rankTracker.runForAllClients();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`✅ Rank tracking completed in ${duration}s`);
        console.log(`   - Clients checked: ${results.clientsChecked}`);
        console.log(`   - Keywords tracked: ${results.totalKeywords}`);
        console.log(`   - Alerts triggered: ${results.alerts}`);

        if (results.errors.length > 0) {
          console.log(`   - Errors: ${results.errors.length}`);
          results.errors.forEach(err => {
            console.error(`     • ${err.client}: ${err.error}`);
          });
        }

      } catch (error) {
        console.error('❌ Rank tracking job failed:', error.message);
      }
    });

    this.jobs.set('rank-tracking', job);
    this.isRunning = true;

    console.log('✅ Rank tracking scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Rank tracking scheduler is not running');
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;

    console.log('✅ Rank tracking scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: process.env.RANK_TRACKING_ENABLED === 'true',
      schedule: process.env.RANK_TRACKING_SCHEDULE || '0 6 * * *',
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }

  /**
   * Run rank tracking manually (bypass schedule)
   */
  async runNow() {
    console.log('🔍 Running manual rank tracking...');
    const startTime = Date.now();

    try {
      const results = await rankTracker.runForAllClients();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Manual rank tracking completed in ${duration}s`);

      return {
        success: true,
        duration: parseFloat(duration),
        ...results
      };

    } catch (error) {
      console.error('❌ Manual rank tracking failed:', error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton
export const rankScheduler = new RankScheduler();
