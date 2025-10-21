#!/usr/bin/env node

/**
 * Multi-Client Manager
 * Manage and run automation for multiple client websites
 */

import fs from 'fs';
import { execSync } from 'child_process';

const CLIENTS_DIR = './clients';
const LOGS_DIR = './logs/clients';

// Ensure directories exist
if (!fs.existsSync(CLIENTS_DIR)) fs.mkdirSync(CLIENTS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

class ClientManager {
  constructor() {
    this.clients = this.loadClients();
  }

  loadClients() {
    const configPath = `${CLIENTS_DIR}/clients-config.json`;

    if (!fs.existsSync(configPath)) {
      console.log('⚠️  No clients configured yet.');
      console.log(`   Create: ${configPath}\n`);
      return {};
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  listClients() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  📋 CLIENT LIST                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const clients = Object.entries(this.clients);

    if (clients.length === 0) {
      console.log('No clients configured yet.\n');
      console.log('To add a client, edit: clients/clients-config.json\n');
      return;
    }

    clients.forEach(([id, client], index) => {
      const status = client.status === 'active' ? '✅' : '⏸️ ';
      console.log(`${index + 1}. ${status} ${client.name}`);
      console.log(`   ID: ${id}`);
      console.log(`   URL: ${client.url}`);
      console.log(`   Package: ${client.package || 'starter'}`);
      console.log(`   Status: ${client.status}`);
      console.log('');
    });

    console.log(`Total clients: ${clients.length}`);
    console.log(`Active: ${clients.filter(([_, c]) => c.status === 'active').length}\n`);
  }

  getClient(clientId) {
    const client = this.clients[clientId];
    if (!client) {
      throw new Error(`Client '${clientId}' not found`);
    }
    return client;
  }

  async runAudit(clientId) {
    console.log(`\n🔍 Running audit for: ${clientId}\n`);

    const client = this.getClient(clientId);
    const envPath = `${CLIENTS_DIR}/${clientId}.env`;

    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envPath}`);
    }

    // Create temporary env file for this run
    const originalEnv = fs.readFileSync('config/env/.env', 'utf8');
    const clientEnv = fs.readFileSync(envPath, 'utf8');

    try {
      fs.writeFileSync('config/env/.env', clientEnv);

      console.log(`📊 Generating audit report...\n`);
      execSync('node generate-full-report.js', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      // Move report to client-specific directory
      const clientLogDir = `${LOGS_DIR}/${clientId}`;
      if (!fs.existsSync(clientLogDir)) {
        fs.mkdirSync(clientLogDir, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];
      const reportFile = `logs/seo-audit-report-${date}.html`;

      if (fs.existsSync(reportFile)) {
        fs.copyFileSync(
          reportFile,
          `${clientLogDir}/audit-${date}.html`
        );
        console.log(`\n✅ Report saved: ${clientLogDir}/audit-${date}.html\n`);
      }

    } finally {
      // Restore original env
      fs.writeFileSync('config/env/.env', originalEnv);
    }
  }

  async runOptimization(clientId) {
    console.log(`\n🤖 Running optimization for: ${clientId}\n`);

    const client = this.getClient(clientId);
    const envPath = `${CLIENTS_DIR}/${clientId}.env`;

    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envPath}`);
    }

    const originalEnv = fs.readFileSync('config/env/.env', 'utf8');
    const clientEnv = fs.readFileSync(envPath, 'utf8');

    try {
      fs.writeFileSync('config/env/.env', clientEnv);

      console.log(`⚡ Running full automation...\n`);
      execSync('node auto-fix-all.js', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      // Save logs
      const clientLogDir = `${LOGS_DIR}/${clientId}`;
      if (!fs.existsSync(clientLogDir)) {
        fs.mkdirSync(clientLogDir, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];

      // Copy reports
      ['title-optimization', 'h1-fix', 'image-alt-fix', 'consolidated-report'].forEach(type => {
        const srcFile = `logs/${type}-${date}.json`;
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, `${clientLogDir}/${type}-${date}.json`);
        }
      });

      console.log(`\n✅ Optimization complete for ${client.name}\n`);

    } finally {
      fs.writeFileSync('config/env/.env', originalEnv);
    }
  }

  async runForAll(action) {
    const activeClients = Object.entries(this.clients)
      .filter(([_, client]) => client.status === 'active');

    if (activeClients.length === 0) {
      console.log('No active clients found.\n');
      return;
    }

    console.log(`\n🚀 Running ${action} for ${activeClients.length} active clients...\n`);

    for (const [id, client] of activeClients) {
      try {
        console.log('═'.repeat(60));
        console.log(`   ${client.name} (${id})`);
        console.log('═'.repeat(60));

        if (action === 'audit') {
          await this.runAudit(id);
        } else if (action === 'optimize') {
          await this.runOptimization(id);
        }

        // Rate limiting between clients
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`\n❌ Error processing ${id}: ${error.message}\n`);
      }
    }

    console.log('\n✅ Batch processing complete!\n');
  }

  addClient(clientId, clientData) {
    if (this.clients[clientId]) {
      throw new Error(`Client '${clientId}' already exists`);
    }

    this.clients[clientId] = {
      name: clientData.name,
      url: clientData.url,
      contact: clientData.contact || '',
      package: clientData.package || 'starter',
      status: 'active',
      started: new Date().toISOString().split('T')[0],
      ...clientData
    };

    this.saveClients();

    // Create env file template
    const envTemplate = `# WordPress Site Configuration
WORDPRESS_URL=${clientData.url}
WORDPRESS_USER=${clientData.wordpress_user || 'seo_admin'}
WORDPRESS_APP_PASSWORD=${clientData.wordpress_password || 'REPLACE_WITH_APP_PASSWORD'}

# Copy Google API keys from main .env if needed
GOOGLE_PAGESPEED_API_KEY=
GOOGLE_SEARCH_CONSOLE_API_KEY=
GOOGLE_ANALYTICS_API_KEY=

# Discord webhook for this client (optional)
DISCORD_WEBHOOK_URL=

# Safety Settings
APPLY_TO_PUBLISHED=true
DRY_RUN=false
LOG_LEVEL=info
`;

    fs.writeFileSync(`${CLIENTS_DIR}/${clientId}.env`, envTemplate);

    console.log(`\n✅ Client '${clientId}' added successfully!\n`);
    console.log(`📝 Edit their credentials: ${CLIENTS_DIR}/${clientId}.env\n`);
  }

  saveClients() {
    const configPath = `${CLIENTS_DIR}/clients-config.json`;
    fs.writeFileSync(configPath, JSON.stringify(this.clients, null, 2));
  }

  displayUsage() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║            🎯 MULTI-CLIENT MANAGER                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Usage: node client-manager.js <command> [options]\n');

    console.log('Commands:\n');
    console.log('  list                          List all clients');
    console.log('  audit <client-id>             Run audit for specific client');
    console.log('  optimize <client-id>          Run optimization for specific client');
    console.log('  audit-all                     Run audit for all active clients');
    console.log('  optimize-all                  Run optimization for all active clients');
    console.log('  add <client-id>               Add new client (interactive)\n');

    console.log('Examples:\n');
    console.log('  node client-manager.js list');
    console.log('  node client-manager.js audit acme-corp');
    console.log('  node client-manager.js optimize acme-corp');
    console.log('  node client-manager.js optimize-all\n');

    console.log('Setup:\n');
    console.log('  1. Create: clients/clients-config.json');
    console.log('  2. Add client credentials: clients/<client-id>.env');
    console.log('  3. Run: node client-manager.js list');
    console.log('  4. Test: node client-manager.js audit <client-id>\n');
  }
}

// CLI Handler
const args = process.argv.slice(2);
const command = args[0];
const clientId = args[1];

const manager = new ClientManager();

try {
  switch (command) {
    case 'list':
      manager.listClients();
      break;

    case 'audit':
      if (!clientId) throw new Error('Client ID required');
      manager.runAudit(clientId);
      break;

    case 'optimize':
      if (!clientId) throw new Error('Client ID required');
      manager.runOptimization(clientId);
      break;

    case 'audit-all':
      manager.runForAll('audit');
      break;

    case 'optimize-all':
      manager.runForAll('optimize');
      break;

    case 'add':
      console.log('⚠️  Interactive add coming soon!');
      console.log('For now, edit: clients/clients-config.json manually\n');
      break;

    default:
      manager.displayUsage();
  }
} catch (error) {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
}
