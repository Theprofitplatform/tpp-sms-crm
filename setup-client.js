#!/usr/bin/env node

/**
 * Interactive Client Setup Wizard
 *
 * Guides you through adding a new client to the system
 * Creates env file, tests authentication, runs first audit
 *
 * Usage:
 *   node setup-client.js [client-id]
 *
 * Features:
 *   - Interactive prompts for all client details
 *   - Creates env file from template
 *   - Tests WordPress authentication
 *   - Runs baseline audit
 *   - Updates client registry
 *   - Provides next steps
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

// Configuration
const CLIENTS_DIR = './clients';
const CONFIG_FILE = path.join(CLIENTS_DIR, 'clients-config.json');
const EXAMPLE_ENV = path.join(CLIENTS_DIR, 'example-client.env');
const MAIN_ENV = 'config/env/.env';
const BACKUP_ENV = 'config/env/.env.backup';

// Colors
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
  const line = '='.repeat(70);
  console.log('');
  print(line, 'cyan');
  print(message, 'bright');
  print(line, 'cyan');
  console.log('');
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function loadClients() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    print(`⚠️  Error loading client config: ${error.message}`, 'yellow');
    return {};
  }
}

function saveClients(clients) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(clients, null, 2));
    return true;
  } catch (error) {
    print(`❌ Error saving client config: ${error.message}`, 'red');
    return false;
  }
}

async function gatherClientInfo(clientId) {
  printHeader('📝 Client Information');

  print('Please provide the following details:', 'cyan');
  console.log('');

  const info = {
    id: clientId,
    name: '',
    url: '',
    contact: '',
    wordpress_user: '',
    wordpress_app_password: '',
    package: '',
    notes: ''
  };

  // Business name
  info.name = await question(colors.bright + 'Business Name: ' + colors.reset);

  // Website URL
  let urlValid = false;
  while (!urlValid) {
    info.url = await question(colors.bright + 'Website URL (https://example.com): ' + colors.reset);
    if (info.url.startsWith('http://') || info.url.startsWith('https://')) {
      urlValid = true;
    } else {
      print('⚠️  URL must start with http:// or https://', 'yellow');
    }
  }

  // Contact email
  info.contact = await question(colors.bright + 'Contact Email: ' + colors.reset);

  // WordPress username
  info.wordpress_user = await question(colors.bright + 'WordPress Username: ' + colors.reset);

  // WordPress app password
  console.log('');
  print('WordPress Application Password:', 'cyan');
  print('Get this from: WordPress Admin → Users → Profile → Application Passwords', 'dim');
  info.wordpress_app_password = await question(colors.bright + 'App Password (remove spaces): ' + colors.reset);

  // Remove spaces from password
  info.wordpress_app_password = info.wordpress_app_password.replace(/\s+/g, '');

  // Package selection
  console.log('');
  print('Select Package:', 'cyan');
  print('1. Starter ($297/month)', 'reset');
  print('2. Professional ($597/month) ⭐ Recommended', 'green');
  print('3. Enterprise ($1,497/month)', 'reset');
  print('4. Internal (your own site)', 'blue');

  const packageChoice = await question(colors.bright + 'Choice (1-4): ' + colors.reset);
  const packages = ['starter', 'professional', 'enterprise', 'internal'];
  info.package = packages[parseInt(packageChoice) - 1] || 'professional';

  // Notes
  console.log('');
  info.notes = await question(colors.bright + 'Notes (optional): ' + colors.reset);

  return info;
}

function createEnvFile(clientId, info) {
  printHeader('📄 Creating Environment File');

  const envPath = path.join(CLIENTS_DIR, `${clientId}.env`);

  if (fs.existsSync(envPath)) {
    print(`⚠️  Env file already exists: ${envPath}`, 'yellow');
    return false;
  }

  const envContent = `# ${info.name} - ${info.url}

# WordPress Site Configuration
WORDPRESS_URL=${info.url}
WORDPRESS_USER=${info.wordpress_user}
WORDPRESS_APP_PASSWORD=${info.wordpress_app_password}

# Optional: Google PageSpeed API (for advanced metrics)
GOOGLE_PAGESPEED_API_KEY=

# Optional: Discord/Slack notifications
DISCORD_WEBHOOK_URL=

# Optimization Settings
APPLY_TO_PUBLISHED=true
DRY_RUN=false

# Created: ${new Date().toISOString().split('T')[0]}
# Package: ${info.package}
# Contact: ${info.contact}
`;

  try {
    fs.writeFileSync(envPath, envContent);
    print(`✅ Created: ${envPath}`, 'green');
    return true;
  } catch (error) {
    print(`❌ Error creating env file: ${error.message}`, 'red');
    return false;
  }
}

function updateClientRegistry(clientId, info) {
  printHeader('📋 Updating Client Registry');

  const clients = loadClients();

  if (clients[clientId]) {
    print(`⚠️  Client ID already exists: ${clientId}`, 'yellow');
    const confirm = false; // For now, don't overwrite
    if (!confirm) {
      print('Skipping registry update', 'yellow');
      return false;
    }
  }

  clients[clientId] = {
    name: info.name,
    url: info.url,
    contact: info.contact,
    wordpress_user: info.wordpress_user,
    package: info.package,
    status: 'pending-setup',
    started: new Date().toISOString().split('T')[0],
    notes: info.notes || 'Added via setup wizard'
  };

  if (saveClients(clients)) {
    print(`✅ Added to registry: ${clientId}`, 'green');
    return true;
  }

  return false;
}

async function testAuthentication(clientId) {
  printHeader('🔐 Testing WordPress Authentication');

  const envPath = path.join(CLIENTS_DIR, `${clientId}.env`);

  if (!fs.existsSync(envPath)) {
    print(`❌ Env file not found: ${envPath}`, 'red');
    return false;
  }

  // Backup current env
  if (fs.existsSync(MAIN_ENV)) {
    fs.copyFileSync(MAIN_ENV, BACKUP_ENV);
  }

  try {
    // Swap to client env
    fs.copyFileSync(envPath, MAIN_ENV);

    print('Running authentication test...', 'cyan');
    console.log('');

    execSync('node test-auth.js', {
      stdio: 'inherit',
      encoding: 'utf8'
    });

    console.log('');
    print('✅ Authentication successful!', 'green');

    return true;
  } catch (error) {
    console.log('');
    print('❌ Authentication failed', 'red');
    console.log('');
    print('Common issues:', 'yellow');
    print('1. WordPress URL incorrect', 'yellow');
    print('2. Username incorrect', 'yellow');
    print('3. Application password incorrect', 'yellow');
    print('4. User role insufficient (needs Editor or Administrator)', 'yellow');
    print('5. REST API disabled', 'yellow');
    console.log('');
    print('Fix the issues and run:', 'cyan');
    print(`  node setup-client.js ${clientId}`, 'cyan');
    console.log('');

    return false;
  } finally {
    // Restore original env
    if (fs.existsSync(BACKUP_ENV)) {
      fs.copyFileSync(BACKUP_ENV, MAIN_ENV);
    }
  }
}

async function runBaselineAudit(clientId) {
  printHeader('📊 Running Baseline Audit');

  const confirm = await question(colors.bright + 'Run baseline audit now? (y/n): ' + colors.reset);

  if (confirm.toLowerCase() !== 'y') {
    print('Skipping audit. You can run it later with:', 'yellow');
    print(`  node client-manager.js audit ${clientId}`, 'cyan');
    return false;
  }

  try {
    print('Running audit...', 'cyan');
    console.log('');

    execSync(`node client-manager.js audit ${clientId}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });

    console.log('');
    print('✅ Baseline audit complete!', 'green');
    return true;
  } catch (error) {
    console.log('');
    print('⚠️  Audit failed. You can run it later.', 'yellow');
    return false;
  }
}

async function activateClient(clientId) {
  printHeader('✅ Activate Client');

  const confirm = await question(colors.bright + 'Mark client as ACTIVE? (y/n): ' + colors.reset);

  if (confirm.toLowerCase() !== 'y') {
    print('Client remains in "pending-setup" status', 'yellow');
    print('Activate later by editing clients/clients-config.json', 'dim');
    return false;
  }

  const clients = loadClients();

  if (!clients[clientId]) {
    print('❌ Client not found in registry', 'red');
    return false;
  }

  clients[clientId].status = 'active';

  if (saveClients(clients)) {
    print('✅ Client activated!', 'green');
    print(`${clientId} will now be included in batch operations`, 'cyan');
    return true;
  }

  return false;
}

function showNextSteps(clientId, info, authSuccess, auditRun, activated) {
  printHeader('🎯 Next Steps');

  print(`Client "${info.name}" setup complete!`, 'green');
  console.log('');

  if (!authSuccess) {
    print('⚠️  Authentication failed. Fix the issues and re-run:', 'yellow');
    print(`  node setup-client.js ${clientId}`, 'cyan');
    console.log('');
    return;
  }

  if (!auditRun) {
    print('📊 Run baseline audit:', 'bright');
    print(`  node client-manager.js audit ${clientId}`, 'cyan');
    console.log('');
  }

  if (!activated) {
    print('✅ Activate client:', 'bright');
    print('  Edit clients/clients-config.json', 'cyan');
    print('  Change "status": "pending-setup" to "status": "active"', 'cyan');
    console.log('');
  }

  print('🚀 Run first optimization:', 'bright');
  print(`  node client-manager.js optimize ${clientId}`, 'cyan');
  console.log('');

  if (activated) {
    print('💼 Client is now active and will be included in:', 'bright');
    print('  node client-manager.js optimize-all', 'cyan');
    print('  node audit-all-clients.js', 'cyan');
    print('  node test-all-clients.js', 'cyan');
    console.log('');
  }

  print('📊 Check overall status:', 'bright');
  print('  node client-status.js', 'cyan');
  console.log('');

  print('📧 Email client with first results:', 'bright');
  print('  Use templates in sales-materials/EMAIL-TEMPLATES.md', 'cyan');
  console.log('');
}

async function main() {
  printHeader('🚀 Interactive Client Setup Wizard');

  // Get client ID
  let clientId = process.argv[2];

  if (!clientId) {
    print('Client ID is a short identifier (lowercase, hyphens only)', 'dim');
    print('Examples: acme-corp, joes-plumbing, techstartup', 'dim');
    console.log('');

    clientId = await question(colors.bright + 'Client ID: ' + colors.reset);
    clientId = clientId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  // Validate client ID
  if (!clientId || clientId.length < 2) {
    print('❌ Invalid client ID', 'red');
    rl.close();
    process.exit(1);
  }

  print(`Setting up client: ${clientId}`, 'cyan');
  console.log('');

  // Check if already exists
  const clients = loadClients();
  if (clients[clientId]) {
    print(`⚠️  Client "${clientId}" already exists in registry`, 'yellow');
    console.log('');
    print('Existing details:', 'cyan');
    print(`  Name: ${clients[clientId].name}`, 'reset');
    print(`  URL: ${clients[clientId].url}`, 'reset');
    print(`  Status: ${clients[clientId].status}`, 'reset');
    console.log('');

    const proceed = await question(colors.bright + 'Continue anyway? (y/n): ' + colors.reset);
    if (proceed.toLowerCase() !== 'y') {
      print('Setup cancelled', 'yellow');
      rl.close();
      return;
    }
  }

  try {
    // Gather information
    const info = await gatherClientInfo(clientId);

    console.log('');
    print('📋 Summary:', 'bright');
    print(`  Client ID: ${clientId}`, 'cyan');
    print(`  Name: ${info.name}`, 'reset');
    print(`  URL: ${info.url}`, 'reset');
    print(`  Contact: ${info.contact}`, 'reset');
    print(`  WordPress User: ${info.wordpress_user}`, 'reset');
    print(`  Package: ${info.package}`, 'reset');
    console.log('');

    const confirm = await question(colors.bright + 'Proceed with setup? (y/n): ' + colors.reset);

    if (confirm.toLowerCase() !== 'y') {
      print('Setup cancelled', 'yellow');
      rl.close();
      return;
    }

    // Create env file
    const envCreated = createEnvFile(clientId, info);

    // Update registry
    const registryUpdated = updateClientRegistry(clientId, info);

    // Test authentication
    const authSuccess = await testAuthentication(clientId);

    // Run baseline audit (optional)
    let auditRun = false;
    if (authSuccess) {
      auditRun = await runBaselineAudit(clientId);
    }

    // Activate client (optional)
    let activated = false;
    if (authSuccess) {
      activated = await activateClient(clientId);
    }

    // Show next steps
    showNextSteps(clientId, info, authSuccess, auditRun, activated);

  } catch (error) {
    console.error('');
    print(`❌ Error: ${error.message}`, 'red');
    console.error('');
  } finally {
    rl.close();
  }
}

// Run the wizard
main().catch(error => {
  console.error('');
  print(`❌ Fatal error: ${error.message}`, 'red');
  console.error('');
  rl.close();
  process.exit(1);
});
