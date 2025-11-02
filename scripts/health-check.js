#!/usr/bin/env node
/**
 * Comprehensive System Health Check CLI
 * Run with: node scripts/health-check.js [options]
 */

import { ComprehensiveHealthCheck } from '../src/monitoring/comprehensive-health.js';

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

class HealthCheckCLI {
  constructor() {
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.json = process.argv.includes('--json');
    this.watch = process.argv.includes('--watch') || process.argv.includes('-w');
  }

  /**
   * Format status with color (using basic ANSI)
   */
  colorStatus(status) {
    const colors = {
      healthy: '\x1b[32m', // green
      degraded: '\x1b[33m', // yellow
      unhealthy: '\x1b[31m', // red
      up: '\x1b[32m',
      down: '\x1b[31m',
      not_configured: '\x1b[90m', // gray
    };
    const reset = '\x1b[0m';
    const color = colors[status] || '';
    return `${color}${status.toUpperCase()}${reset}`;
  }

  /**
   * Print service status
   */
  printService(name, service) {
    const statusIcon = service.status === 'up' ? ICONS.success :
                       service.status === 'down' ? ICONS.error :
                       ICONS.warning;

    console.log(`  ${statusIcon} ${name}`);
    console.log(`     Status: ${this.colorStatus(service.status)}`);

    if (service.latency) {
      console.log(`     Latency: ${service.latency}`);
    }

    if (service.critical) {
      console.log(`     \x1b[31mCRITICAL SERVICE\x1b[0m`);
    }

    if (service.error) {
      console.log(`     Error: \x1b[31m${service.error}\x1b[0m`);
    }

    if (this.verbose && service.details) {
      console.log(`     Details:`);
      Object.entries(service.details).forEach(([key, value]) => {
        console.log(`       ${key}: ${value}`);
      });
    }

    console.log('');
  }

  /**
   * Print system metrics
   */
  printMetrics(metrics) {
    console.log('\n📊 System Metrics\n');

    if (metrics.memory) {
      console.log('  Memory:');
      console.log(`    Process: ${metrics.memory.used}/${metrics.memory.total} MB`);
      console.log(`    System:  ${metrics.memory.percentUsed}% used (${metrics.memory.systemFree} MB free)`);
    }

    if (metrics.cpu) {
      console.log('\n  CPU:');
      console.log(`    Cores: ${metrics.cpu.cores}`);
      if (metrics.cpu.loadAverage) {
        console.log(`    Load:  ${metrics.cpu.loadAverage.join(', ')}`);
      }
    }

    if (metrics.process) {
      console.log('\n  Process:');
      console.log(`    Uptime:  ${Math.floor(metrics.process.uptime / 60)} minutes`);
      console.log(`    PID:     ${metrics.process.pid}`);
      console.log(`    Node:    ${metrics.process.nodeVersion}`);
    }

    console.log('');
  }

  /**
   * Run health check
   */
  async run() {
    console.log('\n🏥 SEO Expert Platform - System Health Check\n');
    console.log('='.repeat(70));
    console.log('');

    try {
      const healthCheck = new ComprehensiveHealthCheck();
      const results = await healthCheck.runAll();

      if (this.json) {
        console.log(JSON.stringify(results, null, 2));
        process.exit(results.status === 'healthy' ? 0 : 1);
      }

      // Print overall status
      console.log(`Overall Status: ${this.colorStatus(results.status)}`);
      console.log(`Environment: ${results.environment}`);
      console.log(`Version: ${results.version}`);
      console.log(`Uptime: ${Math.floor(results.uptime / 60)} minutes`);
      console.log(`Check Duration: ${results.checkDuration}`);
      console.log('');

      // Print services
      console.log('🔍 Services\n');

      const criticalServices = [];
      const optionalServices = [];

      Object.entries(results.services).forEach(([key, service]) => {
        if (service.critical) {
          criticalServices.push([key, service]);
        } else {
          optionalServices.push([key, service]);
        }
      });

      if (criticalServices.length > 0) {
        console.log('  Critical Services:\n');
        criticalServices.forEach(([key, service]) => this.printService(service.name, service));
      }

      if (optionalServices.length > 0) {
        console.log('  Optional Services:\n');
        optionalServices.forEach(([key, service]) => this.printService(service.name, service));
      }

      // Print metrics if verbose
      if (this.verbose && results.metrics) {
        this.printMetrics(results.metrics);
      }

      // Print summary
      console.log('='.repeat(70));

      const servicesUp = Object.values(results.services).filter(s => s.status === 'up').length;
      const totalServices = Object.keys(results.services).length;
      const criticalDown = criticalServices.filter(([_, s]) => s.status === 'down').length;

      if (criticalDown > 0) {
        console.log(`\n${ICONS.error} ${criticalDown} critical service(s) down!`);
      } else if (results.status === 'degraded') {
        console.log(`\n${ICONS.warning} System degraded - some optional services unavailable`);
      } else {
        console.log(`\n${ICONS.success} All systems operational!`);
      }

      console.log(`\nServices: ${servicesUp}/${totalServices} up`);
      console.log('');

      // Exit code based on health
      if (results.status === 'unhealthy') {
        process.exit(1);
      } else {
        process.exit(0);
      }

    } catch (error) {
      console.error(`\n${ICONS.error} Health check failed:`, error.message);

      if (this.verbose) {
        console.error(error.stack);
      }

      process.exit(2);
    }
  }

  /**
   * Watch mode - run continuously
   */
  async watchMode() {
    console.log('👁️  Watch mode enabled - checking every 10 seconds');
    console.log('Press Ctrl+C to stop\n');

    while (true) {
      await this.run().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('\n' + '-'.repeat(70) + '\n');
    }
  }

  /**
   * Start CLI
   */
  async start() {
    if (this.watch) {
      await this.watchMode();
    } else {
      await this.run();
    }
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏥 SEO Expert Platform - Health Check CLI

Usage: node scripts/health-check.js [options]

Options:
  -v, --verbose     Show detailed information
  -w, --watch       Run continuously (every 10 seconds)
  --json            Output as JSON
  -h, --help        Show this help message

Examples:
  node scripts/health-check.js                 # Run once
  node scripts/health-check.js --verbose       # Show details
  node scripts/health-check.js --watch         # Continuous monitoring
  node scripts/health-check.js --json          # JSON output

Exit Codes:
  0  - System healthy or degraded
  1  - System unhealthy (critical services down)
  2  - Health check error
`);
  process.exit(0);
}

// Run CLI
const cli = new HealthCheckCLI();
cli.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(2);
});
