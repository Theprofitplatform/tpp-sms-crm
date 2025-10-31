#!/usr/bin/env node
/**
 * PM2 Watchdog - Health Check Monitor
 *
 * Monitors service health and automatically restarts on failure
 * This replaces the Docker watchdog container with native PM2 monitoring
 *
 * Features:
 * - Periodic health checks via HTTP endpoint
 * - Automatic service restart on consecutive failures
 * - Configurable check interval and failure threshold
 * - Detailed logging for debugging
 *
 * Usage:
 *   node scripts/pm2-watchdog.js
 *
 * Environment Variables:
 *   HEALTH_CHECK_URL      - Health endpoint URL (default: http://localhost:9000/api/v2/health)
 *   CHECK_INTERVAL        - Check interval in ms (default: 300000 = 5 minutes)
 *   SERVICE_NAME          - PM2 service name to restart (default: seo-dashboard)
 *   RESTART_ON_FAILURE    - Enable auto-restart (default: true)
 *   MAX_FAILURES          - Consecutive failures before restart (default: 3)
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration from environment variables
const config = {
  healthUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:9000/api/v2/health',
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 300000, // 5 minutes
  serviceName: process.env.SERVICE_NAME || 'seo-dashboard',
  restartOnFailure: process.env.RESTART_ON_FAILURE !== 'false',
  maxConsecutiveFailures: parseInt(process.env.MAX_FAILURES) || 3,
  timeout: 10000  // 10 second timeout for health check
};

// State tracking
let consecutiveFailures = 0;
let totalChecks = 0;
let totalFailures = 0;
let lastHealthyTime = new Date();
let lastRestartTime = null;

/**
 * Perform health check on the service
 * @returns {Promise<boolean>} True if healthy, false otherwise
 */
async function checkHealth() {
  totalChecks++;
  const checkTime = new Date();

  try {
    const response = await axios.get(config.healthUrl, {
      timeout: config.timeout,
      validateStatus: (status) => status === 200
    });

    // Check if response indicates healthy status
    if (response.data && response.data.status === 'healthy') {
      console.log(`[${checkTime.toISOString()}] ✅ Service healthy | Uptime: ${response.data.uptime}s | Memory: ${response.data.memory?.heapUsed || 'N/A'}`);
      consecutiveFailures = 0;
      lastHealthyTime = checkTime;
      return true;
    } else {
      throw new Error(`Unhealthy response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    consecutiveFailures++;
    totalFailures++;

    const errorMsg = error.code === 'ECONNREFUSED'
      ? 'Connection refused - service may be down'
      : error.code === 'ETIMEDOUT'
      ? 'Timeout - service not responding'
      : error.message;

    console.error(`[${checkTime.toISOString()}] ❌ Health check failed (${consecutiveFailures}/${config.maxConsecutiveFailures}): ${errorMsg}`);

    return false;
  }
}

/**
 * Restart the PM2 service
 * @returns {Promise<void>}
 */
async function restartService() {
  if (!config.restartOnFailure) {
    console.log('⚠️  Auto-restart disabled, skipping...');
    return;
  }

  const restartTime = new Date();

  try {
    console.log(`🔄 [${restartTime.toISOString()}] Restarting ${config.serviceName}...`);

    const { stdout, stderr } = await execAsync(`pm2 restart ${config.serviceName}`);

    console.log(`✅ Service restarted successfully`);
    if (stdout) console.log(`   Output: ${stdout.trim()}`);
    if (stderr) console.log(`   Warnings: ${stderr.trim()}`);

    consecutiveFailures = 0;
    lastRestartTime = restartTime;

    // Wait a bit before next check to let service start
    console.log('⏳ Waiting 30 seconds for service to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error(`❌ Failed to restart service: ${error.message}`);
    if (error.stdout) console.error(`   stdout: ${error.stdout}`);
    if (error.stderr) console.error(`   stderr: ${error.stderr}`);
  }
}

/**
 * Print watchdog statistics
 */
function printStats() {
  const now = new Date();
  const uptime = Math.floor((now - startTime) / 1000);
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
  const successRate = totalChecks > 0 ? ((totalChecks - totalFailures) / totalChecks * 100).toFixed(1) : 100;
  const timeSinceHealthy = Math.floor((now - lastHealthyTime) / 1000);

  console.log('\n' + '='.repeat(70));
  console.log('📊 WATCHDOG STATISTICS');
  console.log('='.repeat(70));
  console.log(`Watchdog Uptime:        ${uptimeFormatted}`);
  console.log(`Total Health Checks:    ${totalChecks}`);
  console.log(`Total Failures:         ${totalFailures}`);
  console.log(`Success Rate:           ${successRate}%`);
  console.log(`Consecutive Failures:   ${consecutiveFailures}/${config.maxConsecutiveFailures}`);
  console.log(`Last Healthy:           ${timeSinceHealthy}s ago (${lastHealthyTime.toISOString()})`);
  console.log(`Last Restart:           ${lastRestartTime ? lastRestartTime.toISOString() : 'Never'}`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Main monitoring loop
 */
async function monitor() {
  console.log('\n' + '═'.repeat(70));
  console.log('🐕 PM2 WATCHDOG - SERVICE HEALTH MONITOR');
  console.log('═'.repeat(70));
  console.log(`Service:                ${config.serviceName}`);
  console.log(`Health URL:             ${config.healthUrl}`);
  console.log(`Check Interval:         ${config.checkInterval / 1000}s (${config.checkInterval / 60000}min)`);
  console.log(`Auto-Restart:           ${config.restartOnFailure ? 'Enabled' : 'Disabled'}`);
  console.log(`Failure Threshold:      ${config.maxConsecutiveFailures} consecutive failures`);
  console.log(`Timeout:                ${config.timeout / 1000}s`);
  console.log('═'.repeat(70) + '\n');

  // Perform initial health check
  console.log('🔍 Performing initial health check...');
  await checkHealth();

  // Set up periodic health checks
  setInterval(async () => {
    const healthy = await checkHealth();

    if (!healthy && consecutiveFailures >= config.maxConsecutiveFailures) {
      console.error(`\n⚠️  CRITICAL: ${config.maxConsecutiveFailures} consecutive health check failures detected!`);
      await restartService();
    }
  }, config.checkInterval);

  // Print stats every hour
  setInterval(() => {
    printStats();
  }, 3600000); // 1 hour
}

// Track start time
const startTime = new Date();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Watchdog received SIGINT, shutting down gracefully...');
  printStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Watchdog received SIGTERM, shutting down gracefully...');
  printStats();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in watchdog:', error);
  console.error('Stack:', error.stack);
  // Don't exit - watchdog should keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection in watchdog at:', promise);
  console.error('Reason:', reason);
  // Don't exit - watchdog should keep running
});

// Start monitoring
console.log('🚀 Starting PM2 Watchdog...');
monitor().catch(error => {
  console.error('💥 Fatal error in watchdog:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});
