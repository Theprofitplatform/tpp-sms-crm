#!/usr/bin/env node

/**
 * Test All Clients - WordPress Authentication Tester
 *
 * Tests WordPress API authentication for all active clients
 * Helps identify credential issues before running batch operations
 *
 * Usage:
 *   node test-all-clients.js
 *
 * Features:
 *   - Tests all active clients sequentially
 *   - Validates read access, edit context, and user permissions
 *   - Provides detailed error messages for troubleshooting
 *   - Generates summary report of all tests
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Configuration
const CLIENTS_DIR = './clients';
const CONFIG_FILE = path.join(CLIENTS_DIR, 'clients-config.json');
const ENV_FILE = 'config/env/.env';
const ENV_BACKUP = 'config/env/.env.backup';

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

// Helper function to print colored text
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

async function testClient(clientId, client) {
  printHeader(`Testing: ${client.name} (${clientId})`);

  const envPath = path.join(CLIENTS_DIR, `${clientId}.env`);

  // Check if env file exists
  if (!fs.existsSync(envPath)) {
    print(`❌ ERROR: Environment file not found: ${envPath}`, 'red');
    print('', 'reset');
    print('Next steps:', 'yellow');
    print(`1. Create ${envPath}`, 'yellow');
    print(`2. Copy from clients/example-client.env template`, 'yellow');
    print(`3. Fill in WordPress credentials`, 'yellow');
    console.log('');
    return {
      success: false,
      error: 'Environment file not found'
    };
  }

  // Check if env file has credentials
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('WORDPRESS_URL=http') ||
      envContent.includes('WORDPRESS_USER=\n') ||
      envContent.includes('WORDPRESS_APP_PASSWORD=\n')) {
    print(`❌ ERROR: Environment file incomplete`, 'red');
    print('', 'reset');
    print('Environment file exists but credentials are missing.', 'yellow');
    print('', 'reset');
    print('Next steps:', 'yellow');
    print(`1. Edit ${envPath}`, 'yellow');
    print(`2. Fill in WORDPRESS_URL, WORDPRESS_USER, and WORDPRESS_APP_PASSWORD`, 'yellow');
    console.log('');
    return {
      success: false,
      error: 'Credentials incomplete'
    };
  }

  // Backup current env
  const backupEnv = fs.readFileSync(ENV_FILE, 'utf8');

  try {
    // Swap to client env
    const clientEnv = fs.readFileSync(envPath, 'utf8');
    fs.writeFileSync(ENV_FILE, clientEnv);

    // Run test
    print('Running authentication test...', 'cyan');
    console.log('');

    execSync('node test-auth.js', {
      stdio: 'inherit',
      encoding: 'utf8'
    });

    console.log('');
    print(`✅ ${client.name} authentication successful!`, 'green');
    console.log('');

    return {
      success: true,
      client: client.name,
      url: client.url
    };
  } catch (error) {
    console.log('');
    print(`❌ ${client.name} authentication FAILED`, 'red');
    console.log('');
    print('Common issues:', 'yellow');
    print('1. WordPress URL incorrect or site down', 'yellow');
    print('2. Username incorrect', 'yellow');
    print('3. Application password incorrect or expired', 'yellow');
    print('4. User role insufficient (needs Editor or Administrator)', 'yellow');
    print('5. REST API disabled or blocked', 'yellow');
    console.log('');
    print('Troubleshooting:', 'yellow');
    print(`1. Check credentials in ${envPath}`, 'yellow');
    print('2. Verify site is accessible in browser', 'yellow');
    print('3. Regenerate WordPress application password', 'yellow');
    print('4. Check user has Administrator or Editor role', 'yellow');
    console.log('');

    return {
      success: false,
      error: 'Authentication failed',
      client: client.name,
      url: client.url
    };
  } finally {
    // Restore original env
    fs.writeFileSync(ENV_FILE, backupEnv);
  }
}

async function main() {
  printHeader('🔍 Testing WordPress Authentication for All Clients');

  // Load clients
  const clients = loadClients();
  const clientEntries = Object.entries(clients);

  // Filter active clients
  const activeClients = clientEntries.filter(([_, client]) =>
    client.status === 'active' || client.status === 'pending-setup'
  );

  if (activeClients.length === 0) {
    print('⚠️  No active or pending clients found', 'yellow');
    console.log('');
    print('To test clients, update their status in clients/clients-config.json:', 'reset');
    print('"status": "active" or "status": "pending-setup"', 'cyan');
    console.log('');
    return;
  }

  print(`Found ${activeClients.length} client(s) to test`, 'cyan');
  console.log('');

  // Backup current env
  if (!fs.existsSync(ENV_BACKUP)) {
    fs.copyFileSync(ENV_FILE, ENV_BACKUP);
    print('✅ Created env backup', 'green');
    console.log('');
  }

  // Test each client
  const results = {};
  for (const [clientId, client] of activeClients) {
    results[clientId] = await testClient(clientId, client);

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary Report
  printHeader('📊 SUMMARY REPORT');

  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;

  print(`Total Clients Tested: ${activeClients.length}`, 'bright');
  print(`✅ Successful: ${successful}`, successful > 0 ? 'green' : 'reset');
  print(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  console.log('');

  if (successful > 0) {
    print('Successful Clients:', 'green');
    Object.entries(results)
      .filter(([_, result]) => result.success)
      .forEach(([clientId, result]) => {
        print(`  ✅ ${result.client} (${clientId})`, 'green');
        print(`     ${result.url}`, 'cyan');
      });
    console.log('');
  }

  if (failed > 0) {
    print('Failed Clients:', 'red');
    Object.entries(results)
      .filter(([_, result]) => !result.success)
      .forEach(([clientId, result]) => {
        print(`  ❌ ${result.client || clientId}`, 'red');
        print(`     Error: ${result.error}`, 'yellow');
      });
    console.log('');

    print('Next Steps for Failed Clients:', 'yellow');
    print('1. Review error messages above', 'yellow');
    print('2. Check/update credentials in clients/[client-id].env', 'yellow');
    print('3. Verify WordPress sites are accessible', 'yellow');
    print('4. Regenerate application passwords if needed', 'yellow');
    print('5. Run test again: node test-all-clients.js', 'yellow');
    console.log('');
  }

  if (successful === activeClients.length) {
    print('🎉 All clients authenticated successfully!', 'green');
    console.log('');
    print('You\'re ready to run batch operations:', 'bright');
    print('  node client-manager.js optimize-all', 'cyan');
    print('  node audit-all-clients.js', 'cyan');
    console.log('');
  } else {
    print('⚠️  Some clients failed authentication', 'yellow');
    print('Fix the issues above before running batch operations', 'yellow');
    console.log('');
  }

  // Restore original env
  if (fs.existsSync(ENV_BACKUP)) {
    fs.copyFileSync(ENV_BACKUP, ENV_FILE);
  }
}

// Run the script
main().catch(error => {
  console.error('');
  print(`❌ Fatal error: ${error.message}`, 'red');
  console.error('');
  process.exit(1);
});
