#!/usr/bin/env node

/**
 * Audit All Clients - Batch SEO Audit Runner
 *
 * Runs comprehensive SEO audits for all active clients
 * Generates individual reports for each client
 *
 * Usage:
 *   node audit-all-clients.js
 *
 * Features:
 *   - Audits all active clients sequentially
 *   - Saves reports to client-specific directories
 *   - Provides progress tracking and summary
 *   - Rate limiting between audits to avoid API throttling
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Configuration
const CLIENTS_DIR = './clients';
const CONFIG_FILE = path.join(CLIENTS_DIR, 'clients-config.json');
const RATE_LIMIT_DELAY = 2000; // 2 seconds between audits

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(message) {
  const line = '='.repeat(60);
  console.log('');
  print(line, 'cyan');
  print(message, 'bright');
  print(line, 'cyan');
  console.log('');
}

function loadClients() {
  try {
    const configPath = path.resolve(CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      print(`❌ Error: Client config not found at ${configPath}`, 'red');
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    print(`❌ Error loading client config: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function auditClient(clientId, client, index, total) {
  printHeader(`📊 Auditing: ${client.name} (${index}/${total})`);

  print(`Client ID: ${clientId}`, 'cyan');
  print(`Website: ${client.url}`, 'cyan');
  print(`Package: ${client.package}`, 'cyan');
  console.log('');

  const startTime = Date.now();

  try {
    print('Running audit via client-manager...', 'yellow');
    console.log('');

    execSync(`node client-manager.js audit ${clientId}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    print(`✅ Audit complete for ${client.name} (${duration}s)`, 'green');
    console.log('');

    // Show where report was saved
    const reportDir = `logs/clients/${clientId}/`;
    if (fs.existsSync(reportDir)) {
      const files = fs.readdirSync(reportDir)
        .filter(f => f.endsWith('.html'))
        .sort()
        .reverse();

      if (files.length > 0) {
        print(`📄 Report saved: ${reportDir}${files[0]}`, 'cyan');
        console.log('');
      }
    }

    return {
      success: true,
      client: client.name,
      duration: duration,
      clientId: clientId
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    print(`❌ Audit failed for ${client.name} (${duration}s)`, 'red');
    console.log('');
    print('Possible issues:', 'yellow');
    print('1. WordPress credentials invalid', 'yellow');
    print('2. Site unreachable or down', 'yellow');
    print('3. REST API disabled', 'yellow');
    print('4. No published posts found', 'yellow');
    console.log('');
    print('Troubleshooting:', 'yellow');
    print(`1. Test credentials: node test-auth.js (with ${clientId}.env)`, 'yellow');
    print(`2. Verify site is accessible: ${client.url}`, 'yellow');
    print(`3. Check logs for details`, 'yellow');
    console.log('');

    return {
      success: false,
      error: 'Audit failed',
      client: client.name,
      duration: duration,
      clientId: clientId
    };
  }
}

async function main() {
  const startTime = Date.now();

  printHeader('📊 Running SEO Audits for All Clients');

  // Load clients
  const clients = loadClients();
  const clientEntries = Object.entries(clients);

  // Filter active clients
  const activeClients = clientEntries.filter(([_, client]) =>
    client.status === 'active'
  );

  if (activeClients.length === 0) {
    print('⚠️  No active clients found', 'yellow');
    console.log('');
    print('To audit clients, update their status in clients/clients-config.json:', 'reset');
    print('"status": "active"', 'cyan');
    console.log('');
    print('Clients with "pending-setup" status will be skipped.', 'yellow');
    print('Update to "active" once WordPress credentials are configured.', 'yellow');
    console.log('');
    return;
  }

  print(`Found ${activeClients.length} active client(s)`, 'cyan');
  console.log('');
  print('Active clients:', 'bright');
  activeClients.forEach(([id, client]) => {
    print(`  • ${client.name} (${id})`, 'cyan');
  });
  console.log('');

  const estimatedTime = Math.ceil((activeClients.length * 60) / 60);
  print(`Estimated time: ~${estimatedTime} minute(s)`, 'yellow');
  console.log('');

  // Audit each client
  const results = {};
  for (let i = 0; i < activeClients.length; i++) {
    const [clientId, client] = activeClients[i];
    results[clientId] = await auditClient(clientId, client, i + 1, activeClients.length);

    // Rate limiting between audits (except for last one)
    if (i < activeClients.length - 1) {
      print(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s before next audit...`, 'yellow');
      console.log('');
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  // Summary Report
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  printHeader('📊 AUDIT SUMMARY');

  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;

  print(`Total Clients: ${activeClients.length}`, 'bright');
  print(`✅ Successful: ${successful}`, successful > 0 ? 'green' : 'reset');
  print(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  print(`⏱️  Total Time: ${totalDuration}s`, 'cyan');
  console.log('');

  if (successful > 0) {
    print('Successful Audits:', 'green');
    Object.entries(results)
      .filter(([_, result]) => result.success)
      .forEach(([clientId, result]) => {
        print(`  ✅ ${result.client} (${clientId}) - ${result.duration}s`, 'green');
      });
    console.log('');
  }

  if (failed > 0) {
    print('Failed Audits:', 'red');
    Object.entries(results)
      .filter(([_, result]) => !result.success)
      .forEach(([clientId, result]) => {
        print(`  ❌ ${result.client} (${clientId}) - ${result.error}`, 'red');
      });
    console.log('');

    print('Next Steps for Failed Audits:', 'yellow');
    print('1. Run test-all-clients.js to verify credentials', 'yellow');
    print('2. Fix authentication issues', 'yellow');
    print('3. Re-run this script', 'yellow');
    console.log('');
  }

  if (successful > 0) {
    printHeader('📁 Reports Location');
    print('All audit reports saved to:', 'bright');
    print('  logs/clients/[client-id]/', 'cyan');
    console.log('');
    print('View reports:', 'bright');
    Object.entries(results)
      .filter(([_, result]) => result.success)
      .forEach(([clientId, result]) => {
        print(`  explorer.exe logs/clients/${clientId}/`, 'cyan');
      });
    console.log('');
  }

  if (successful === activeClients.length) {
    print('🎉 All audits completed successfully!', 'green');
    console.log('');
    print('Next steps:', 'bright');
    print('1. Review audit reports for each client', 'cyan');
    print('2. Run optimizations: node client-manager.js optimize-all', 'cyan');
    print('3. Email reports to clients', 'cyan');
    console.log('');
  } else if (successful > 0 && failed > 0) {
    print('⚠️  Some audits completed, some failed', 'yellow');
    print('Review errors above and fix issues before re-running', 'yellow');
    console.log('');
  } else {
    print('❌ All audits failed', 'red');
    print('Run test-all-clients.js to diagnose authentication issues', 'yellow');
    console.log('');
  }
}

// Run the script
main().catch(error => {
  console.error('');
  print(`❌ Fatal error: ${error.message}`, 'red');
  console.error('');
  process.exit(1);
});
