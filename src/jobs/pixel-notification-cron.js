/**
 * Pixel Notification Cron Jobs
 *
 * Automated tasks for pixel monitoring and notifications:
 * - Check pixel health every 5 minutes
 * - Check for SEO score drops daily
 * - Send daily summary reports
 *
 * Phase: 4B - High-Value Integrations
 * Date: November 2, 2025
 */

import cron from 'node-cron';
import pixelNotificationService from '../services/pixel-notifications.js';
import pixelRecommendationsSync from '../services/pixel-recommendations-sync.js';

let healthCheckJob = null;
let scoreDropJob = null;
let dailySummaryJob = null;
let recommendationsSyncJob = null;

/**
 * Initialize all pixel notification cron jobs
 */
export function initializePixelNotificationJobs() {
  console.log('⏰ Initializing pixel notification cron jobs...');

  // Check pixel health every 5 minutes
  healthCheckJob = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[PixelNotificationCron] Running health check...');
      const pixels = pixelNotificationService.getAllActivePixels();

      for (const pixel of pixels) {
        await pixelNotificationService.checkPixelHealth(pixel.id);
      }

      console.log(`[PixelNotificationCron] Health check complete for ${pixels.length} pixels`);
    } catch (error) {
      console.error('[PixelNotificationCron] Error in health check job:', error.message);
    }
  });

  // Check for SEO score drops daily at 9 AM
  scoreDropJob = cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[PixelNotificationCron] Checking for score drops...');
      await pixelNotificationService.checkScoreDrops();
      console.log('[PixelNotificationCron] Score drop check complete');
    } catch (error) {
      console.error('[PixelNotificationCron] Error in score drop job:', error.message);
    }
  });

  // Send daily summary at 8 AM
  dailySummaryJob = cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[PixelNotificationCron] Sending daily summary...');
      await pixelNotificationService.sendDailySummary();
      console.log('[PixelNotificationCron] Daily summary sent');
    } catch (error) {
      console.error('[PixelNotificationCron] Error in daily summary job:', error.message);
    }
  });

  // Sync pixel issues to recommendations hourly
  recommendationsSyncJob = cron.schedule('0 * * * *', async () => {
    try {
      console.log('[PixelNotificationCron] Running recommendations sync...');
      const result = await pixelRecommendationsSync.syncIssues();
      console.log(`[PixelNotificationCron] Recommendations sync complete: ${result.created} created, ${result.skipped} skipped`);
    } catch (error) {
      console.error('[PixelNotificationCron] Error in recommendations sync job:', error.message);
    }
  });

  console.log('✅ Pixel notification cron jobs initialized');
  console.log('   - Health check: Every 5 minutes');
  console.log('   - Score drop check: Daily at 9:00 AM');
  console.log('   - Daily summary: Daily at 8:00 AM');
  console.log('   - Recommendations sync: Hourly');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopPixelNotificationJobs() {
  if (healthCheckJob) {
    healthCheckJob.stop();
    console.log('⏹️  Stopped pixel health check job');
  }

  if (scoreDropJob) {
    scoreDropJob.stop();
    console.log('⏹️  Stopped score drop check job');
  }

  if (dailySummaryJob) {
    dailySummaryJob.stop();
    console.log('⏹️  Stopped daily summary job');
  }

  if (recommendationsSyncJob) {
    recommendationsSyncJob.stop();
    console.log('⏹️  Stopped recommendations sync job');
  }
}

/**
 * Get status of cron jobs
 */
export function getPixelNotificationJobsStatus() {
  return {
    healthCheck: healthCheckJob ? 'running' : 'stopped',
    scoreDropCheck: scoreDropJob ? 'running' : 'stopped',
    dailySummary: dailySummaryJob ? 'running' : 'stopped',
    recommendationsSync: recommendationsSyncJob ? 'running' : 'stopped'
  };
}
