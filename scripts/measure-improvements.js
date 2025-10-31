#!/usr/bin/env node

/**
 * Measure Auto-Fix Improvements
 * 
 * Measures SEO improvements before/after auto-fix
 * 
 * Usage:
 *   node scripts/measure-improvements.js --client instant-auto-traders
 */

import db from '../src/database/index.js';
import autofixDB from '../src/database/autofix-db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function measureImprovements(clientId) {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║      Auto-Fix Improvement Analysis             ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  // Get client
  const client = db.clientOps.getById(clientId);
  if (!client) {
    log(`\n❌ Client not found: ${clientId}`, 'red');
    process.exit(1);
  }
  
  log(`\n📊 Client: ${client.name}`, 'bold');
  log(`   Domain: ${client.domain}\n`, 'cyan');
  
  // Get auto-fix history
  try {
    const history = autofixDB.getFixesByClient(clientId, 100);
    
    if (!history || history.length === 0) {
      log('⚠️  No auto-fix history found for this client', 'yellow');
      log('   Run auto-fix first: npm run autofix:run\n');
      return;
    }
    
    log(`📈 Found ${history.length} auto-fix operations\n`, 'cyan');
    
    // Calculate statistics
    const stats = {
      totalFixes: history.length,
      successful: history.filter(h => h.status === 'completed').length,
      failed: history.filter(h => h.status === 'failed').length,
      pagesModified: 0,
      issuesFixed: 0,
      titlesFixed: 0,
      metasFixed: 0,
      h1Fixed: 0,
      imagesFixed: 0,
      schemasAdded: 0
    };
    
    // Aggregate data
    history.forEach(fix => {
      if (fix.metadata) {
        const metadata = typeof fix.metadata === 'string' 
          ? JSON.parse(fix.metadata) 
          : fix.metadata;
        
        stats.pagesModified += metadata.pagesModified || 0;
        stats.issuesFixed += metadata.issuesFixed || 0;
        
        // Count by type
        if (fix.fix_type === 'title-meta') {
          stats.titlesFixed += metadata.titlesFixed || 0;
          stats.metasFixed += metadata.metasFixed || 0;
        } else if (fix.fix_type === 'h1') {
          stats.h1Fixed += metadata.h1Fixed || 0;
        } else if (fix.fix_type === 'image-alt') {
          stats.imagesFixed += metadata.imagesFixed || 0;
        } else if (fix.fix_type === 'schema') {
          stats.schemasAdded += metadata.schemasAdded || 0;
        }
      }
    });
    
    // Display statistics
    log('═'.repeat(50), 'cyan');
    log('  IMPROVEMENT STATISTICS', 'bold');
    log('═'.repeat(50), 'cyan');
    
    log('\n📋 Overall:', 'bold');
    log(`   Total operations: ${stats.totalFixes}`, 'cyan');
    log(`   Successful: ${stats.successful}`, 'green');
    log(`   Failed: ${stats.failed}`, stats.failed > 0 ? 'red' : 'cyan');
    
    log('\n📄 Content Improvements:', 'bold');
    log(`   Pages modified: ${stats.pagesModified}`, 'cyan');
    log(`   Issues fixed: ${stats.issuesFixed}`, 'green');
    
    log('\n🔧 By Category:', 'bold');
    if (stats.titlesFixed > 0) log(`   ✅ Titles optimized: ${stats.titlesFixed}`, 'green');
    if (stats.metasFixed > 0) log(`   ✅ Meta descriptions: ${stats.metasFixed}`, 'green');
    if (stats.h1Fixed > 0) log(`   ✅ H1 tags fixed: ${stats.h1Fixed}`, 'green');
    if (stats.imagesFixed > 0) log(`   ✅ Images alt text: ${stats.imagesFixed}`, 'green');
    if (stats.schemasAdded > 0) log(`   ✅ Schema markup: ${stats.schemasAdded}`, 'green');
    
    // Recent fixes
    log('\n📅 Recent Fixes (Last 5):', 'bold');
    history.slice(0, 5).forEach((fix, index) => {
      const date = new Date(fix.created_at).toLocaleDateString();
      const status = fix.status === 'completed' ? '✅' : '❌';
      log(`   ${status} ${fix.fix_type} - ${date}`, 'cyan');
    });
    
    // Expected impact
    log('\n💡 Expected SEO Impact:', 'bold');
    
    if (stats.issuesFixed > 50) {
      log('   🚀 SIGNIFICANT - Major improvements expected', 'green');
      log('   • Better rankings likely', 'green');
      log('   • Improved click-through rates', 'green');
      log('   • Enhanced user experience', 'green');
    } else if (stats.issuesFixed > 20) {
      log('   📈 MODERATE - Noticeable improvements', 'yellow');
      log('   • Gradual ranking improvements', 'yellow');
      log('   • Better meta display in search', 'yellow');
    } else if (stats.issuesFixed > 0) {
      log('   ⚡ MINOR - Small but valuable fixes', 'cyan');
      log('   • Foundation for future improvements', 'cyan');
    }
    
    // Recommendations
    log('\n📋 Recommendations:', 'bold');
    
    if (stats.pagesModified < 10) {
      log('   • Run auto-fix on more pages', 'yellow');
    }
    
    if (stats.schemasAdded === 0) {
      log('   • Consider adding schema markup', 'yellow');
    }
    
    if (stats.failed > 0) {
      log('   • Review failed fixes and retry', 'yellow');
    }
    
    log('\n   • Monitor rankings over next 2-4 weeks', 'cyan');
    log('   • Track organic traffic changes', 'cyan');
    log('   • Schedule regular auto-fix runs', 'cyan');
    
    log('\n');
    
  } catch (error) {
    log(`\n❌ Error measuring improvements: ${error.message}`, 'red');
    console.error(error);
  }
}

// Parse arguments
const args = process.argv.slice(2);
let clientId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--client' && args[i + 1]) {
    clientId = args[i + 1];
  }
}

if (!clientId) {
  log('\n❌ Please specify a client:', 'red');
  log('   node scripts/measure-improvements.js --client CLIENT_ID\n', 'yellow');
  
  log('Available clients:', 'cyan');
  const clients = db.clientOps.getAll();
  clients.forEach(c => log(`  • ${c.id} (${c.name})`, 'cyan'));
  log('');
  
  process.exit(1);
}

measureImprovements(clientId);
