#!/usr/bin/env node

/**
 * Run Auto-Fix Dry Run
 * 
 * Tests auto-fix engines without making actual changes
 * Safe to run - analyzes what would be fixed
 * 
 * Usage:
 *   node scripts/run-autofix-dryrun.js
 *   node scripts/run-autofix-dryrun.js --client instant-auto-traders
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../src/database/index.js';

const execAsync = promisify(exec);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runDryRun(clientId) {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║      Auto-Fix Dry Run Test                    ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  log(`\n📋 Client: ${clientId}`, 'bold');
  
  // Get client info
  const client = db.clientOps.getById(clientId);
  if (!client) {
    log(`\n❌ Client not found: ${clientId}`, 'red');
    log('\nAvailable clients:', 'yellow');
    const clients = db.clientOps.getAll();
    clients.forEach(c => log(`  • ${c.id} (${c.name})`, 'cyan'));
    process.exit(1);
  }
  
  log(`   Name: ${client.name}`, 'cyan');
  log(`   Domain: ${client.domain}`, 'cyan');
  log(`   Status: ${client.status}`, 'cyan');
  
  log('\n⚠️  DRY RUN MODE - No changes will be made', 'yellow');
  log('   This will analyze what would be fixed\n', 'yellow');
  
  try {
    log('🔄 Running dry-run analysis...', 'blue');
    log('   This may take 2-5 minutes...\n', 'blue');
    
    const startTime = Date.now();
    
    // Run the upgraded auto-fix with dry-run flag
    const { stdout, stderr } = await execAsync(
      `node auto-fix-all-upgraded.js --dry-run --client=${clientId}`,
      {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('✅ Dry run completed!', 'green');
    log(`   Duration: ${duration}s\n`, 'cyan');
    
    // Parse output
    log('📊 Analysis Results:', 'bold');
    log('─'.repeat(50), 'cyan');
    
    // Show key findings
    if (stdout.includes('Issues found:')) {
      const lines = stdout.split('\n');
      lines.forEach(line => {
        if (line.includes('✓') || line.includes('✅')) {
          log(`   ${line.trim()}`, 'green');
        } else if (line.includes('⚠') || line.includes('WARNING')) {
          log(`   ${line.trim()}`, 'yellow');
        } else if (line.includes('Issues found:') || line.includes('Would fix:')) {
          log(`   ${line.trim()}`, 'cyan');
        }
      });
    }
    
    // Summary
    log('\n' + '═'.repeat(50), 'cyan');
    log('  DRY RUN SUMMARY', 'bold');
    log('═'.repeat(50), 'cyan');
    
    // Extract numbers from output
    const pagesMatch = stdout.match(/(\d+)\s+pages?/i);
    const issuesMatch = stdout.match(/(\d+)\s+issues?/i);
    const fixesMatch = stdout.match(/would fix:?\s*(\d+)/i);
    
    if (pagesMatch) log(`\n📄 Pages analyzed: ${pagesMatch[1]}`, 'cyan');
    if (issuesMatch) log(`⚠️  Issues found: ${issuesMatch[1]}`, 'yellow');
    if (fixesMatch) log(`🔧 Would be fixed: ${fixesMatch[1]}`, 'green');
    
    log('\n💡 Next Steps:', 'bold');
    log('   1. Review the analysis above');
    log('   2. Check which issues would be fixed');
    log('   3. Run live fix if comfortable: npm run autofix:run');
    log('   4. Or fix specific engines only\n');
    
    // Show full output if verbose
    const args = process.argv.slice(2);
    if (args.includes('--verbose') || args.includes('-v')) {
      log('\n' + '═'.repeat(50), 'cyan');
      log('  FULL OUTPUT', 'bold');
      log('═'.repeat(50), 'cyan');
      console.log(stdout);
    }
    
    if (stderr) {
      log('\n⚠️  Warnings/Errors:', 'yellow');
      console.error(stderr);
    }
    
  } catch (error) {
    log('\n❌ Dry run failed:', 'red');
    log(`   ${error.message}\n`, 'red');
    
    if (error.stdout) {
      log('Partial output:', 'yellow');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      log('\nErrors:', 'red');
      console.error(error.stderr);
    }
    
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
let clientId = 'instant-auto-traders'; // default

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--client' && args[i + 1]) {
    clientId = args[i + 1];
  }
}

runDryRun(clientId);
