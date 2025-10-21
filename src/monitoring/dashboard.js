#!/usr/bin/env node
/**
 * Monitoring Dashboard
 * Displays real-time health, performance, and error metrics
 */

import HealthCheck from './health-check.js';
import { performanceMonitor } from './performance-monitor.js';
import { errorTracker } from './error-tracker.js';
import { logger } from '../audit/logger.js';

export class MonitoringDashboard {
  constructor() {
    this.healthCheck = new HealthCheck();
    this.performanceMonitor = performanceMonitor;
    this.errorTracker = errorTracker;
  }

  /**
   * Run comprehensive monitoring check
   */
  async runCheck() {
    console.log('\n' + '='.repeat(80));
    console.log('SEO AUTOMATION - MONITORING DASHBOARD');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Health Check
    console.log('\n📊 HEALTH CHECKS');
    console.log('-'.repeat(80));
    const health = await this.healthCheck.runAll();

    for (const [checkName, result] of Object.entries(health.checks)) {
      const status = result.status === 'healthy' ? '✅' : '❌';
      console.log(`${status} ${checkName.replace(/_/g, ' ').toUpperCase()}: ${result.status}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    console.log(`\nOverall Status: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Duration: ${health.duration}`);

    // Performance Metrics
    console.log('\n⚡ PERFORMANCE METRICS');
    console.log('-'.repeat(80));
    const perfStats = this.performanceMonitor.getAllStats();

    if (Object.keys(perfStats).length === 0) {
      console.log('No performance data collected yet');
    } else {
      for (const [operation, stats] of Object.entries(perfStats)) {
        console.log(`\n${operation}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Average: ${stats.average}ms`);
        console.log(`  Min: ${stats.min}ms | Max: ${stats.max}ms`);
        console.log(`  P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
      }
    }

    // Error Tracking
    console.log('\n🔴 ERROR TRACKING');
    console.log('-'.repeat(80));
    const errorStats = this.errorTracker.getStats();

    console.log(`Total Errors: ${errorStats.total}`);

    if (errorStats.total > 0) {
      console.log('\nBy Type:');
      for (const [type, count] of Object.entries(errorStats.byType)) {
        console.log(`  ${type}: ${count}`);
      }

      if (errorStats.mostCommon.length > 0) {
        console.log('\nMost Common:');
        for (const item of errorStats.mostCommon) {
          console.log(`  ${item.error} (${item.count} times, ${item.percentage}%)`);
        }
      }

      console.log('\nRecent Errors:');
      for (const error of errorStats.recent) {
        console.log(`  [${error.timestamp}] ${error.type}: ${error.message}`);
      }
    } else {
      console.log('✅ No errors tracked');
    }

    // System Metrics
    console.log('\n💻 SYSTEM METRICS');
    console.log('-'.repeat(80));
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Uptime: ${Math.round(process.uptime())}s`);
    console.log(`Memory Usage:`);

    const memory = process.memoryUsage();
    console.log(`  RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
    console.log(`  Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    console.log(`  External: ${Math.round(memory.external / 1024 / 1024)}MB`);

    console.log('\n' + '='.repeat(80));

    return {
      health,
      performance: perfStats,
      errors: errorStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
  }

  /**
   * Start continuous monitoring
   */
  startContinuous(intervalMs = 60000) {
    console.log(`Starting continuous monitoring (${intervalMs / 1000}s interval)...`);
    console.log('Press Ctrl+C to stop\n');

    // Run initial check
    this.runCheck();

    // Set up interval
    /* istanbul ignore next */
    const interval = setInterval(() => {
      this.runCheck();
    }, intervalMs);

    // Handle graceful shutdown
    /* istanbul ignore next */
    process.on('SIGINT', () => {
      console.log('\n\nStopping monitoring...');
      clearInterval(interval);
      process.exit(0);
    });
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    const data = await this.runCheck();

    const report = {
      timestamp: new Date().toISOString(),
      ...data
    };

    return report;
  }

  /**
   * Save report to file
   */
  async saveReport(filename = null) {
    const report = await this.generateReport();
    const fs = await import('fs');
    const path = await import('path');

    const reportDir = path.join(process.cwd(), 'logs', 'monitoring');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = filename ||
      path.join(reportDir, `monitoring-${Date.now()}.json`);

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Monitoring report saved: ${reportFile}`);

    return reportFile;
  }
}

// Run if executed directly
/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new MonitoringDashboard();

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'continuous') {
    const interval = parseInt(args[1]) || 60000;
    dashboard.startContinuous(interval);
  } else if (command === 'report') {
    dashboard.saveReport().then(file => {
      console.log(`\nReport saved to: ${file}`);
      process.exit(0);
    });
  } else {
    dashboard.runCheck().then(() => {
      process.exit(0);
    });
  }
}

export default MonitoringDashboard;
