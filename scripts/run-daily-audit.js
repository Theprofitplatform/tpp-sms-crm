#!/usr/bin/env node

/**
 * Daily Audit Runner
 * 
 * Runs SEO audits for all active clients
 * Scheduled via PM2 cron: Daily at 2 AM
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==============================================');
console.log('  Daily Audit Runner');
console.log('  ' + new Date().toISOString());
console.log('==============================================\n');

async function runDailyAudit() {
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
      .map(([id]) => id);

    console.log(`📊 Found ${activeClients.length} active clients\n`);

    let successCount = 0;
    let failCount = 0;

    // Run audit for each client
    for (const clientId of activeClients) {
      try {
        console.log(`\n🔍 Auditing: ${clientId}...`);
        
        const { stdout, stderr } = await execAsync(
          `node client-manager.js audit ${clientId}`,
          { cwd: path.join(__dirname, '..'), timeout: 300000 } // 5 min timeout
        );

        console.log(`✅ ${clientId}: Audit completed`);
        successCount++;

        // Log output if verbose
        if (process.env.VERBOSE === 'true') {
          console.log(stdout);
        }

      } catch (error) {
        console.error(`❌ ${clientId}: Audit failed`);
        console.error(error.message);
        failCount++;
      }
    }

    // Summary
    console.log('\n==============================================');
    console.log('  Audit Summary');
    console.log('==============================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${activeClients.length}`);
    console.log(`⏱️  Completed at: ${new Date().toISOString()}`);
    console.log('==============================================\n');

    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error in daily audit:', error);
    process.exit(1);
  }
}

runDailyAudit();
