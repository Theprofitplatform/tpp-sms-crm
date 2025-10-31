#!/usr/bin/env node

/**
 * Local SEO Runner
 * 
 * Runs local SEO optimization for all clients
 * Scheduled via PM2 cron: Daily at 7 AM
 */

import { LocalSEOOrchestrator } from '../src/automation/local-seo-orchestrator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==============================================');
console.log('  Local SEO Runner');
console.log('  ' + new Date().toISOString());
console.log('==============================================\n');

async function runLocalSEO() {
  try {
    // Load clients
    const clientsPath = path.join(__dirname, '..', 'clients', 'clients-config.json');
    
    if (!fs.existsSync(clientsPath)) {
      console.log('⚠️  No clients configuration found');
      return;
    }

    const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
    const activeClients = Object.entries(clients)
      .filter(([_, client]) => client.status === 'active')
      .map(([id, client]) => ({ id, ...client }));

    console.log(`📊 Found ${activeClients.length} active clients\n`);

    let successCount = 0;
    let failCount = 0;

    // Run local SEO for each client
    for (const client of activeClients) {
      try {
        console.log(`\n🌍 Processing: ${client.name}...`);
        
        const orchestrator = new LocalSEOOrchestrator(client);
        await orchestrator.runFullOptimization();

        console.log(`✅ ${client.name}: Local SEO completed`);
        successCount++;

      } catch (error) {
        console.error(`❌ ${client.name}: Local SEO failed`);
        console.error(error.message);
        failCount++;
      }
    }

    // Summary
    console.log('\n==============================================');
    console.log('  Local SEO Summary');
    console.log('==============================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${activeClients.length}`);
    console.log(`⏱️  Completed at: ${new Date().toISOString()}`);
    console.log('==============================================\n');

    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error in local SEO:', error);
    process.exit(1);
  }
}

runLocalSEO();
