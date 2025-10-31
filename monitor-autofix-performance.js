#!/usr/bin/env node

/**
 * Auto-Fix Performance Monitor
 * 
 * Monitors and reports on auto-fix engine performance:
 * - Execution times
 * - Success rates
 * - Issues detected/fixed
 * - Cache hit rates
 * - Queue statistics
 * - Historical trends
 */

import fs from 'fs';
import path from 'path';
import cache from './src/services/redis-cache.js';
import autofixQueue from './src/services/autofix-queue.js';

class PerformanceMonitor {
  constructor() {
    this.logsDir = './logs';
    this.reports = [];
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║          📊 AUTO-FIX PERFORMANCE MONITOR 📊                  ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    await this.loadReports();
    await this.analyzePerformance();
    await this.checkCacheStats();
    await this.checkQueueStats();
    this.generateTrendReport();
    this.printSummary();

    // Cleanup
    try {
      await autofixQueue.close();
      await cache.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async loadReports() {
    console.log('📂 Loading reports from logs/...\n');

    try {
      const files = fs.readdirSync(this.logsDir)
        .filter(f => f.startsWith('consolidated-report-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 30); // Last 30 reports

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.logsDir, file), 'utf8');
          const report = JSON.parse(content);
          this.reports.push({
            filename: file,
            ...report
          });
        } catch (error) {
          console.log(`   ⚠️  Failed to load ${file}: ${error.message}`);
        }
      }

      console.log(`   ✅ Loaded ${this.reports.length} reports\n`);

    } catch (error) {
      console.log(`   ⚠️  Error loading reports: ${error.message}\n`);
    }
  }

  analyzePerformance() {
    if (this.reports.length === 0) {
      console.log('⚠️  No reports found. Run auto-fix first.\n');
      return;
    }

    console.log('📊 PERFORMANCE ANALYSIS\n');
    console.log('─'.repeat(70) + '\n');

    // Latest report
    const latest = this.reports[0];
    console.log('📄 Latest Run:');
    console.log(`   Date: ${new Date(latest.timestamp).toLocaleString()}`);
    console.log(`   Client: ${latest.client?.name || 'Unknown'}`);
    console.log(`   Mode: ${latest.configuration?.parallel ? 'Parallel' : 'Sequential'}`);
    console.log(`   AI: ${latest.configuration?.useAI ? 'Enabled' : 'Disabled'}`);
    console.log(`   Total Time: ${latest.results?.totalTime || 0}s`);
    console.log(`   Completed: ${latest.results?.completed?.length || 0} engines`);
    console.log(`   Failed: ${latest.results?.failed?.length || 0} engines`);

    if (latest.results?.completed) {
      console.log('\n   Engine Performance:');
      latest.results.completed.forEach(engine => {
        console.log(`     • ${engine.name}: ${engine.duration}s`);
      });
    }

    // Average statistics over all reports
    if (this.reports.length > 1) {
      console.log('\n📈 Historical Averages (last 30 runs):');
      
      const avgTime = this.reports.reduce((sum, r) => 
        sum + (r.results?.totalTime || 0), 0) / this.reports.length;
      
      const avgCompleted = this.reports.reduce((sum, r) => 
        sum + (r.results?.completed?.length || 0), 0) / this.reports.length;
      
      const avgFailed = this.reports.reduce((sum, r) => 
        sum + (r.results?.failed?.length || 0), 0) / this.reports.length;

      const successRate = (avgCompleted / (avgCompleted + avgFailed)) * 100;

      console.log(`   Average Time: ${avgTime.toFixed(1)}s`);
      console.log(`   Average Completed: ${avgCompleted.toFixed(1)} engines`);
      console.log(`   Average Failed: ${avgFailed.toFixed(1)} engines`);
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

      // Fastest and slowest
      const times = this.reports
        .map(r => r.results?.totalTime || 0)
        .filter(t => t > 0);
      
      if (times.length > 0) {
        console.log(`   Fastest Run: ${Math.min(...times)}s`);
        console.log(`   Slowest Run: ${Math.max(...times)}s`);
      }
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  }

  async checkCacheStats() {
    console.log('💾 CACHE STATISTICS\n');

    try {
      const stats = await cache.getStats();

      if (stats.enabled) {
        console.log('   Status: ✅ Enabled');
        console.log('   Performance: Operational');
        console.log('   Note: Detailed stats available with: npm run cache:stats');
      } else {
        console.log('   Status: ⚠️  Disabled or unavailable');
        console.log('   Tip: Install Redis for caching: sudo apt-get install redis-server');
      }

    } catch (error) {
      console.log('   Status: ❌ Error');
      console.log(`   Error: ${error.message}`);
      console.log('   Tip: Check if Redis is running: redis-cli ping');
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  }

  async checkQueueStats() {
    console.log('📋 QUEUE STATISTICS\n');

    try {
      const stats = await autofixQueue.getQueueStats();

      console.log('   Status: ✅ Available');
      console.log(`   Waiting Jobs: ${stats.waiting || 0}`);
      console.log(`   Active Jobs: ${stats.active || 0}`);
      console.log(`   Completed: ${stats.completed || 0}`);
      console.log(`   Failed: ${stats.failed || 0}`);
      console.log(`   Workers: ${stats.workers || 0}`);
      console.log(`   Paused: ${stats.isPaused ? 'Yes' : 'No'}`);

      if (stats.waiting > 0) {
        console.log(`\n   ⚠️  ${stats.waiting} jobs waiting in queue`);
      }

      if (stats.failed > 0) {
        console.log(`\n   ⚠️  ${stats.failed} failed jobs require attention`);
      }

    } catch (error) {
      console.log('   Status: ⚠️  Unavailable');
      console.log(`   Note: ${error.message}`);
      console.log('   Tip: Queue requires Redis. Install: sudo apt-get install redis-server');
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  }

  generateTrendReport() {
    if (this.reports.length < 3) {
      return;
    }

    console.log('📈 TREND ANALYSIS\n');

    // Compare last 3 runs
    const recent = this.reports.slice(0, 3).reverse();
    
    console.log('   Last 3 Runs:');
    recent.forEach((report, i) => {
      const date = new Date(report.timestamp).toLocaleDateString();
      const time = report.results?.totalTime || 0;
      const completed = report.results?.completed?.length || 0;
      const failed = report.results?.failed?.length || 0;
      
      console.log(`\n   ${i + 1}. ${date}`);
      console.log(`      Time: ${time}s`);
      console.log(`      Completed: ${completed} engines`);
      console.log(`      Failed: ${failed} engines`);
    });

    // Calculate trend
    const times = recent.map(r => r.results?.totalTime || 0);
    const avgFirst = times.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const avgLast = times.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const improvement = ((avgFirst - avgLast) / avgFirst) * 100;

    console.log('\n   Trend:');
    if (improvement > 5) {
      console.log(`   ✅ Getting faster (+${improvement.toFixed(1)}% improvement)`);
    } else if (improvement < -5) {
      console.log(`   ⚠️  Getting slower (${improvement.toFixed(1)}% slower)`);
    } else {
      console.log(`   ➡️  Stable performance`);
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  }

  printSummary() {
    console.log('💡 RECOMMENDATIONS\n');

    const latest = this.reports[0];
    const recommendations = [];

    // Check execution mode
    if (!latest?.configuration?.parallel) {
      recommendations.push({
        icon: '🚀',
        text: 'Use parallel mode for 3x faster execution',
        command: 'npm run autofix:parallel'
      });
    }

    // Check AI usage
    if (!latest?.configuration?.useAI) {
      recommendations.push({
        icon: '🤖',
        text: 'Enable AI for better suggestions',
        command: 'npm run autofix:ai'
      });
    }

    // Check cache
    if (this.reports.length > 5) {
      recommendations.push({
        icon: '💾',
        text: 'Install Redis for caching if not already',
        command: 'sudo apt-get install redis-server'
      });
    }

    // Check failures
    if (latest?.results?.failed?.length > 0) {
      recommendations.push({
        icon: '⚠️',
        text: 'Review failed engines',
        command: `cat logs/${latest.filename} | jq '.results.failed'`
      });
    }

    // Check queue usage
    if (this.reports.length > 10 && !latest?.configuration?.useQueue) {
      recommendations.push({
        icon: '📋',
        text: 'Consider using job queue for background processing',
        command: 'npm run autofix:queue'
      });
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.icon} ${rec.text}`);
        console.log(`      ${rec.command}\n`);
      });
    } else {
      console.log('   ✅ All systems optimized!\n');
    }

    console.log('─'.repeat(70) + '\n');

    console.log('📊 QUICK STATS\n');
    console.log(`   Total Reports: ${this.reports.length}`);
    console.log(`   Date Range: ${this.reports.length > 0 ? 
      new Date(this.reports[this.reports.length - 1].timestamp).toLocaleDateString() +
      ' to ' +
      new Date(this.reports[0].timestamp).toLocaleDateString()
      : 'N/A'}`);
    
    if (this.reports.length > 0) {
      const totalRuns = this.reports.length;
      const totalEnginesRun = this.reports.reduce((sum, r) => 
        sum + (r.results?.completed?.length || 0), 0);
      const totalFailed = this.reports.reduce((sum, r) => 
        sum + (r.results?.failed?.length || 0), 0);
      
      console.log(`   Total Engine Runs: ${totalEnginesRun}`);
      console.log(`   Total Failures: ${totalFailed}`);
      console.log(`   Overall Success Rate: ${((totalEnginesRun / (totalEnginesRun + totalFailed)) * 100).toFixed(1)}%`);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║                    ✅ MONITORING COMPLETE                    ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }
}

// Run monitor
const monitor = new PerformanceMonitor();
monitor.run().catch(error => {
  console.error('\n❌ Monitor error:', error.message);
  process.exit(1);
});
