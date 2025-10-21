#!/usr/bin/env node

/**
 * Client Status Dashboard
 *
 * Shows a quick overview of all clients and their configuration status
 * Helps identify what's ready and what needs setup
 *
 * Usage:
 *   node client-status.js
 *
 * Features:
 *   - Lists all clients with their status
 *   - Shows which have credentials configured
 *   - Identifies missing setup steps
 *   - Provides next action recommendations
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CLIENTS_DIR = './clients';
const CONFIG_FILE = path.join(CLIENTS_DIR, 'clients-config.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(message) {
  const line = '='.repeat(70);
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

function checkEnvFile(clientId) {
  const envPath = path.join(CLIENTS_DIR, `${clientId}.env`);

  if (!fs.existsSync(envPath)) {
    return {
      exists: false,
      configured: false,
      message: 'No env file'
    };
  }

  const envContent = fs.readFileSync(envPath, 'utf8');

  // Check if credentials are filled in
  const hasUrl = envContent.includes('WORDPRESS_URL=http');
  const hasUser = !envContent.includes('WORDPRESS_USER=\n') &&
                  envContent.includes('WORDPRESS_USER=');
  const hasPassword = !envContent.includes('WORDPRESS_APP_PASSWORD=\n') &&
                      envContent.includes('WORDPRESS_APP_PASSWORD=');

  const configured = hasUrl && hasUser && hasPassword;

  return {
    exists: true,
    configured: configured,
    hasUrl: hasUrl,
    hasUser: hasUser,
    hasPassword: hasPassword,
    message: configured ? 'Configured' : 'Incomplete'
  };
}

function checkReports(clientId) {
  const reportDir = path.join('logs', 'clients', clientId);

  if (!fs.existsSync(reportDir)) {
    return {
      exists: false,
      count: 0,
      latest: null
    };
  }

  const files = fs.readdirSync(reportDir)
    .filter(f => f.endsWith('.html'))
    .sort()
    .reverse();

  return {
    exists: true,
    count: files.length,
    latest: files.length > 0 ? files[0] : null
  };
}

function getStatusIcon(status) {
  switch (status) {
    case 'active':
      return '✅';
    case 'pending-setup':
      return '🔄';
    case 'inactive':
      return '⏸️';
    case 'paused':
      return '⏸️';
    default:
      return '❓';
  }
}

function getPackageColor(packageType) {
  switch (packageType) {
    case 'internal':
      return 'blue';
    case 'starter':
      return 'cyan';
    case 'professional':
      return 'green';
    case 'enterprise':
      return 'magenta';
    default:
      return 'reset';
  }
}

function getNextAction(client, envCheck, reports) {
  if (!envCheck.exists) {
    return 'Create env file';
  }

  if (!envCheck.configured) {
    return 'Add credentials';
  }

  if (client.status === 'pending-setup') {
    return 'Test auth & set active';
  }

  if (reports.count === 0) {
    return 'Run first audit';
  }

  if (client.status === 'inactive') {
    return 'Activate client';
  }

  return 'Ready for operations';
}

function displayClientDetails(clientId, client) {
  const envCheck = checkEnvFile(clientId);
  const reports = checkReports(clientId);
  const nextAction = getNextAction(client, envCheck, reports);

  const statusIcon = getStatusIcon(client.status);
  const packageColor = getPackageColor(client.package);

  print(`${statusIcon} ${client.name}`, 'bright');
  print(`   ID: ${clientId}`, 'cyan');
  print(`   URL: ${client.url}`, 'dim');
  print(`   Package: ${client.package.toUpperCase()}`, packageColor);
  print(`   Status: ${client.status}`, client.status === 'active' ? 'green' : 'yellow');

  // Credentials status
  if (envCheck.exists) {
    if (envCheck.configured) {
      print(`   Credentials: ✅ Configured`, 'green');
    } else {
      print(`   Credentials: ⚠️  Incomplete`, 'yellow');
      if (!envCheck.hasUrl) print(`      Missing: WORDPRESS_URL`, 'red');
      if (!envCheck.hasUser) print(`      Missing: WORDPRESS_USER`, 'red');
      if (!envCheck.hasPassword) print(`      Missing: WORDPRESS_APP_PASSWORD`, 'red');
    }
  } else {
    print(`   Credentials: ❌ No env file`, 'red');
  }

  // Reports status
  if (reports.count > 0) {
    print(`   Reports: ${reports.count} report(s)`, 'green');
    print(`   Latest: ${reports.latest}`, 'dim');
  } else {
    print(`   Reports: No audits run yet`, 'yellow');
  }

  // Next action
  print(`   Next Action: ${nextAction}`, nextAction === 'Ready for operations' ? 'green' : 'yellow');

  // Notes if present
  if (client.notes) {
    print(`   Notes: ${client.notes}`, 'dim');
  }

  console.log('');
}

function main() {
  printHeader('📊 CLIENT STATUS DASHBOARD');

  const clients = loadClients();
  const clientEntries = Object.entries(clients);

  if (clientEntries.length === 0) {
    print('⚠️  No clients configured', 'yellow');
    console.log('');
    print('Add clients to clients/clients-config.json to get started', 'reset');
    console.log('');
    return;
  }

  // Group by status
  const active = clientEntries.filter(([_, c]) => c.status === 'active');
  const pendingSetup = clientEntries.filter(([_, c]) => c.status === 'pending-setup');
  const inactive = clientEntries.filter(([_, c]) => c.status === 'inactive' || c.status === 'paused');

  // Summary
  print(`Total Clients: ${clientEntries.length}`, 'bright');
  print(`  ✅ Active: ${active.length}`, active.length > 0 ? 'green' : 'dim');
  print(`  🔄 Pending Setup: ${pendingSetup.length}`, pendingSetup.length > 0 ? 'yellow' : 'dim');
  print(`  ⏸️  Inactive: ${inactive.length}`, inactive.length > 0 ? 'dim' : 'dim');
  console.log('');

  // Active Clients
  if (active.length > 0) {
    printHeader('✅ ACTIVE CLIENTS');
    active.forEach(([id, client]) => displayClientDetails(id, client));
  }

  // Pending Setup
  if (pendingSetup.length > 0) {
    printHeader('🔄 PENDING SETUP');
    pendingSetup.forEach(([id, client]) => displayClientDetails(id, client));
  }

  // Inactive
  if (inactive.length > 0) {
    printHeader('⏸️  INACTIVE CLIENTS');
    inactive.forEach(([id, client]) => displayClientDetails(id, client));
  }

  // Quick Actions
  printHeader('⚡ QUICK ACTIONS');

  const needsEnv = clientEntries.filter(([id, _]) =>
    !checkEnvFile(id).exists
  ).length;

  const needsCredentials = clientEntries.filter(([id, _]) => {
    const check = checkEnvFile(id);
    return check.exists && !check.configured;
  }).length;

  const readyForAudit = clientEntries.filter(([id, client]) => {
    const check = checkEnvFile(id);
    const reports = checkReports(id);
    return check.configured && reports.count === 0 && client.status !== 'inactive';
  }).length;

  if (needsEnv > 0) {
    print(`📝 ${needsEnv} client(s) need env file created`, 'yellow');
    print('   Action: Copy from clients/example-client.env', 'dim');
    console.log('');
  }

  if (needsCredentials > 0) {
    print(`🔑 ${needsCredentials} client(s) need credentials added`, 'yellow');
    print('   Action: Edit clients/[client-id].env and add WordPress details', 'dim');
    console.log('');
  }

  if (readyForAudit > 0) {
    print(`🚀 ${readyForAudit} client(s) ready for first audit`, 'green');
    print('   Action: node audit-all-clients.js', 'dim');
    console.log('');
  }

  if (active.length > 0) {
    print(`💼 ${active.length} client(s) ready for operations`, 'green');
    print('   Test all: node test-all-clients.js', 'dim');
    print('   Audit all: node audit-all-clients.js', 'dim');
    print('   Optimize all: node client-manager.js optimize-all', 'dim');
    console.log('');
  }

  // Recommendations
  if (pendingSetup.length > 0 || needsEnv > 0 || needsCredentials > 0) {
    printHeader('📋 RECOMMENDED NEXT STEPS');

    let step = 1;

    if (needsEnv > 0) {
      print(`${step}. Create env files for clients without them`, 'bright');
      print('   cp clients/example-client.env clients/[client-id].env', 'cyan');
      console.log('');
      step++;
    }

    if (needsCredentials > 0) {
      print(`${step}. Add WordPress credentials to env files`, 'bright');
      print('   Edit clients/[client-id].env', 'cyan');
      print('   Get app password from WordPress admin', 'dim');
      console.log('');
      step++;
    }

    if (pendingSetup.length > 0) {
      print(`${step}. Test authentication for pending clients`, 'bright');
      print('   node test-all-clients.js', 'cyan');
      console.log('');
      step++;
    }

    if (readyForAudit > 0) {
      print(`${step}. Run first audits`, 'bright');
      print('   node audit-all-clients.js', 'cyan');
      console.log('');
      step++;
    }

    if (active.length > 0) {
      print(`${step}. Run optimizations for active clients`, 'bright');
      print('   node client-manager.js optimize-all', 'cyan');
      console.log('');
    }
  } else if (active.length > 0) {
    printHeader('🎉 ALL SYSTEMS GO!');
    print('All clients are configured and ready', 'green');
    console.log('');
    print('Run weekly operations:', 'bright');
    print('  node client-manager.js optimize-all', 'cyan');
    print('  node audit-all-clients.js', 'cyan');
    console.log('');
  }
}

// Run the script
main();
