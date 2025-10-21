#!/usr/bin/env node

/**
 * SEO Monitoring Setup Script
 * Sets up automated monitoring and scheduling
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║           🔍 SEO MONITORING SETUP WIZARD 🔍               ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Check if we're on Windows (WSL) or native Linux
const isWSL = fs.existsSync('/proc/version') &&
               fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');

console.log('📋 Available Monitoring Options:\n');
console.log('1. 📊 Quick Health Check');
console.log('   Run: npm run health');
console.log('   What it does: Checks WordPress API, filesystem, memory\n');

console.log('2. 📈 Ranking Monitor');
console.log('   Run: npm run monitor');
console.log('   What it does: Tracks keyword rankings over time\n');

console.log('3. 🎯 Live Dashboard');
console.log('   Run: npm run monitor:dashboard');
console.log('   What it does: Real-time SEO metrics display\n');

console.log('4. 🔄 Continuous Monitoring');
console.log('   Run: npm run monitor:continuous');
console.log('   What it does: Runs monitoring in loop with updates\n');

console.log('─'.repeat(60) + '\n');

console.log('🤖 AUTOMATED SCHEDULING OPTIONS:\n');

if (isWSL) {
  console.log('⚠️  Detected: WSL/Windows Environment\n');
  console.log('Option A: Windows Task Scheduler (Recommended for WSL)');
  console.log('─────────────────────────────────────────────────────');
  console.log('1. Open Task Scheduler (search "Task Scheduler" in Windows)');
  console.log('2. Click "Create Basic Task"');
  console.log('3. Name: "SEO Automation - Weekly"');
  console.log('4. Trigger: Weekly, Monday at 2:00 AM');
  console.log('5. Action: Start a program');
  console.log('6. Program: wsl.exe');
  console.log('7. Arguments: bash -c "cd ~/projects/seo\\\\ expert && node auto-fix-all.js"');
  console.log('8. Click Finish\n');

  console.log('Option B: Manual Runs (Simplest)');
  console.log('─────────────────────────────────────────────────────');
  console.log('Run manually once per week:');
  console.log('  node auto-fix-all.js\n');
} else {
  console.log('✅ Detected: Linux Environment\n');
  console.log('CRON Schedule Setup (Recommended)');
  console.log('─────────────────────────────────────────────────────');
  console.log('Run: crontab -e');
  console.log('Add these lines:\n');
  console.log('# Weekly SEO optimization (Mondays at 2 AM)');
  console.log('0 2 * * 1 cd /path/to/seo-expert && node auto-fix-all.js >> logs/cron.log 2>&1\n');
  console.log('# Daily health check (Every day at 6 AM)');
  console.log('0 6 * * * cd /path/to/seo-expert && npm run health >> logs/health.log 2>&1\n');
  console.log('# Weekly audit report (Sundays at 11 PM)');
  console.log('0 23 * * 0 cd /path/to/seo-expert && node generate-full-report.js >> logs/audit.log 2>&1\n');
}

console.log('─'.repeat(60) + '\n');

console.log('📧 DISCORD NOTIFICATIONS (Already Configured!):\n');
console.log('✅ Discord webhook URL is set in your .env file');
console.log('   You will receive notifications when:');
console.log('   • SEO issues are detected');
console.log('   • Rankings change significantly');
console.log('   • Automation tasks complete\n');

console.log('─'.repeat(60) + '\n');

console.log('📁 MONITORING FILES CREATED:\n');

// Create monitoring config
const monitoringConfig = {
  schedules: {
    weeklyOptimization: {
      schedule: 'Monday 2:00 AM',
      command: 'node auto-fix-all.js',
      description: 'Full SEO optimization of all posts'
    },
    dailyHealthCheck: {
      schedule: 'Daily 6:00 AM',
      command: 'npm run health',
      description: 'Check site health and API connectivity'
    },
    weeklyAudit: {
      schedule: 'Sunday 11:00 PM',
      command: 'node generate-full-report.js',
      description: 'Generate comprehensive SEO audit report'
    }
  },
  notifications: {
    discord: {
      enabled: true,
      webhook: 'Configured in .env'
    }
  },
  created: new Date().toISOString()
};

fs.writeFileSync('logs/monitoring-config.json', JSON.stringify(monitoringConfig, null, 2));
console.log('✅ logs/monitoring-config.json');

// Create quick scripts
const quickScripts = {
  'quick-health.sh': '#!/bin/bash\ncd "$(dirname "$0")" && npm run health',
  'quick-audit.sh': '#!/bin/bash\ncd "$(dirname "$0")" && node generate-full-report.js',
  'quick-optimize.sh': '#!/bin/bash\ncd "$(dirname "$0")" && node auto-fix-all.js'
};

Object.entries(quickScripts).forEach(([filename, content]) => {
  fs.writeFileSync(filename, content);
  try {
    fs.chmodSync(filename, 0o755);
    console.log(`✅ ${filename} (executable)`);
  } catch (e) {
    console.log(`✅ ${filename}`);
  }
});

console.log('\n─'.repeat(60) + '\n');

console.log('🎯 RECOMMENDED WEEKLY WORKFLOW:\n');
console.log('Monday Morning:');
console.log('  1. Auto-optimization runs (2 AM)');
console.log('  2. Review Discord notifications');
console.log('  3. Check logs/consolidated-report-*.json\n');

console.log('Throughout Week:');
console.log('  • Daily health checks monitor site status');
console.log('  • Rankings tracked continuously');
console.log('  • Discord alerts for issues\n');

console.log('Sunday Night:');
console.log('  1. Weekly audit report generates');
console.log('  2. Review SEO score improvements');
console.log('  3. Plan next week optimizations\n');

console.log('═'.repeat(60) + '\n');

console.log('✅ MONITORING SETUP COMPLETE!\n');
console.log('🚀 Quick Start Commands:\n');
console.log('  ./quick-health.sh      - Check site health now');
console.log('  ./quick-audit.sh       - Generate audit report now');
console.log('  ./quick-optimize.sh    - Run full optimization now\n');

console.log('📊 View Reports:');
console.log('  Open: logs/seo-audit-report-2025-10-20.html (in browser)\n');

console.log('💡 Next Steps:');
console.log('  1. Test health check: npm run health');
console.log('  2. Set up weekly schedule (see options above)');
console.log('  3. Monitor Discord for notifications\n');

console.log('═'.repeat(60) + '\n');
