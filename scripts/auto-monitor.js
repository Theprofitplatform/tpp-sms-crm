#!/usr/bin/env node
/**
 * Automated Monitoring System
 * Monitors SEO automation health and sends alerts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const execAsync = promisify(exec);

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const MONITORING_INTERVAL = 60 * 60 * 1000; // 1 hour

class AutoMonitor {
  constructor() {
    this.lastCheck = new Date();
    this.alertsSent = new Set();
  }

  async checkGitHubActions() {
    console.log('📊 Checking GitHub Actions status...');

    try {
      const { stdout } = await execAsync('gh run list --workflow="Weekly SEO Automation" --limit 5 --json status,conclusion,createdAt');
      const runs = JSON.parse(stdout);

      const failedRuns = runs.filter(r => r.conclusion === 'failure');

      if (failedRuns.length > 0) {
        const latestFailed = failedRuns[0];
        const alertKey = `gh-failed-${latestFailed.createdAt}`;

        if (!this.alertsSent.has(alertKey)) {
          await this.sendAlert('GitHub Actions Failure', `Weekly SEO automation failed. Check logs immediately.`);
          this.alertsSent.add(alertKey);
        }

        return { status: 'warning', message: `${failedRuns.length} failed runs` };
      }

      return { status: 'healthy', message: 'All runs successful' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async checkCloudflareAPIs() {
    console.log('🌐 Checking Cloudflare APIs...');

    try {
      const urlFile = '.cloudflare-url';
      if (!existsSync(urlFile)) {
        return { status: 'unknown', message: 'No deployment URL found' };
      }

      const baseUrl = readFileSync(urlFile, 'utf8').trim();

      // Test Dashboard API
      const response = await fetch(`${baseUrl}/api/dashboard`);

      if (!response.ok) {
        await this.sendAlert('Cloudflare API Down', `Dashboard API returning ${response.status}`);
        return { status: 'down', message: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (!data.success || !data.clients) {
        await this.sendAlert('Cloudflare API Error', `Dashboard API returning invalid data`);
        return { status: 'degraded', message: 'Invalid response format' };
      }

      return { status: 'healthy', message: `${data.clients.length} clients available` };
    } catch (error) {
      await this.sendAlert('Cloudflare API Error', error.message);
      return { status: 'error', message: error.message };
    }
  }

  async checkLocalEnvironment() {
    console.log('🔧 Checking local environment...');

    const checks = {
      env: existsSync('config/env/.env'),
      serviceAccount: existsSync('config/google/service-account.json'),
      clientsConfig: existsSync('clients/clients-config.json')
    };

    const allPass = Object.values(checks).every(c => c);

    if (!allPass) {
      const missing = Object.entries(checks)
        .filter(([_, pass]) => !pass)
        .map(([name]) => name);

      return { status: 'warning', message: `Missing: ${missing.join(', ')}` };
    }

    return { status: 'healthy', message: 'All files present' };
  }

  async checkDiskSpace() {
    console.log('💾 Checking disk space...');

    try {
      const { stdout } = await execAsync('df -h . | tail -1');
      const parts = stdout.split(/\s+/);
      const usagePercent = parseInt(parts[4]);

      if (usagePercent > 90) {
        await this.sendAlert('Low Disk Space', `Disk usage at ${usagePercent}%`);
        return { status: 'warning', message: `${usagePercent}% used` };
      }

      return { status: 'healthy', message: `${usagePercent}% used` };
    } catch (error) {
      return { status: 'unknown', message: 'Could not check' };
    }
  }

  async runHealthCheck() {
    console.log('\\n🏥 Running Health Check');
    console.log('=' .repeat(60));

    const results = {
      timestamp: new Date().toISOString(),
      checks: {
        githubActions: await this.checkGitHubActions(),
        cloudflareAPIs: await this.checkCloudflareAPIs(),
        localEnvironment: await this.checkLocalEnvironment(),
        diskSpace: await this.checkDiskSpace()
      }
    };

    // Overall health
    const statuses = Object.values(results.checks).map(c => c.status);
    const hasError = statuses.includes('error') || statuses.includes('down');
    const hasWarning = statuses.includes('warning') || statuses.includes('degraded');

    results.overall = hasError ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    // Save results
    writeFileSync('logs/health-check-latest.json', JSON.stringify(results, null, 2));

    // Display summary
    console.log('\\nHealth Check Results:');
    Object.entries(results.checks).forEach(([name, result]) => {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' || result.status === 'degraded' ? '⚠️' : '❌';
      console.log(`${icon} ${name}: ${result.message}`);
    });

    console.log(`\\nOverall Status: ${results.overall.toUpperCase()}`);

    return results;
  }

  async sendAlert(title, message) {
    console.log(`🚨 ALERT: ${title} - ${message}`);

    if (!DISCORD_WEBHOOK) {
      console.log('   (Discord webhook not configured, alert logged only)');
      return;
    }

    try {
      const payload = {
        embeds: [{
          title: `🚨 ${title}`,
          description: message,
          color: 0xff0000, // Red
          timestamp: new Date().toISOString(),
          footer: { text: 'SEO Automation Monitor' }
        }]
      };

      const response = await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('   ✅ Alert sent to Discord');
      } else {
        console.log(`   ❌ Failed to send Discord alert: ${response.status}`);
      }
    } catch (error) {
      console.error(`   ❌ Error sending alert: ${error.message}`);
    }
  }

  async startMonitoring() {
    console.log('🤖 Starting Automated Monitoring');
    console.log(`   Interval: Every ${MONITORING_INTERVAL / 1000 / 60} minutes`);
    console.log('   Press Ctrl+C to stop\\n');

    // Initial check
    await this.runHealthCheck();

    // Periodic checks
    setInterval(async () => {
      await this.runHealthCheck();
    }, MONITORING_INTERVAL);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const monitor = new AutoMonitor();

  if (command === 'watch') {
    monitor.startMonitoring();
  } else {
    monitor.runHealthCheck().then(() => process.exit(0));
  }
}

export { AutoMonitor };
