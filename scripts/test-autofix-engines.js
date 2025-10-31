#!/usr/bin/env node

/**
 * Test Auto-Fix Engines
 * 
 * Verifies all auto-fix engines are properly installed and configured
 * 
 * Usage:
 *   node scripts/test-autofix-engines.js
 */

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

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function testEngine(name, filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    log(`✅ ${name}`, 'green');
    log(`   ${description}`, 'reset');
    log(`   Path: ${filePath}`, 'cyan');
    results.passed++;
    return true;
  } else {
    log(`❌ ${name}`, 'red');
    log(`   Missing: ${filePath}`, 'red');
    results.failed++;
    return false;
  }
}

async function testAutoFixEngines() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║      Auto-Fix Engines Test Suite              ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  
  log('\n🔧 Core Auto-Fix Scripts:', 'bold');
  testEngine(
    'Auto-Fix All (Upgraded)',
    'auto-fix-all-upgraded.js',
    'Main auto-fix orchestrator with AI integration'
  );
  
  testEngine(
    'Auto-Fix All (Legacy)',
    'auto-fix-all.js',
    'Legacy auto-fix system'
  );
  
  testEngine(
    'Auto-Fix Titles',
    'auto-fix-titles.js',
    'Title and meta description optimizer'
  );
  
  testEngine(
    'Auto-Fix H1 Tags',
    'auto-fix-h1-tags.js',
    'H1 tag fixer (one H1 per page)'
  );
  
  testEngine(
    'Auto-Fix Image ALT',
    'auto-fix-image-alt.js',
    'Image alt text generator'
  );
  
  log('\n🎯 Auto-Fixer Modules:', 'bold');
  testEngine(
    'Title/Meta Optimizer',
    'src/automation/auto-fixers/title-meta-optimizer.js',
    'Advanced title and meta optimization'
  );
  
  testEngine(
    'Content Optimizer',
    'src/automation/auto-fixers/content-optimizer.js',
    'Content quality improvements'
  );
  
  log('\n📊 Supporting Services:', 'bold');
  testEngine(
    'Auto-Fix Queue',
    'src/services/autofix-queue.js',
    'Job queue management'
  );
  
  testEngine(
    'Auto-Fix Database',
    'src/database/autofix-db.js',
    'Auto-fix history tracking'
  );
  
  log('\n🔍 Testing & Reporting:', 'bold');
  testEngine(
    'Test Auto-Fix Upgrade',
    'test-autofix-upgrade.js',
    'Upgrade verification tests'
  );
  
  testEngine(
    'View Auto-Fix Changes',
    'view-autofix-changes.js',
    'Change viewer and diff tool'
  );
  
  testEngine(
    'Generate Changes Report',
    'generate-changes-report.js',
    'HTML report generator'
  );
  
  testEngine(
    'Monitor Performance',
    'monitor-autofix-performance.js',
    'Performance monitoring'
  );
  
  log('\n📝 Verification Scripts:', 'bold');
  testEngine(
    'Verify Upgrade',
    'verify-upgrade.js',
    'System upgrade verification'
  );
  
  testEngine(
    'Validate Schema Fixes',
    'validate-schema-fixes.js',
    'Schema markup validation'
  );
  
  // Check database
  log('\n💾 Database:', 'bold');
  const dbPath = path.join(__dirname, '..', 'data', 'autofix-history.db');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    log(`✅ Auto-Fix Database`, 'green');
    log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');
    results.passed++;
  } else {
    log(`⚠️  Auto-Fix Database`, 'yellow');
    log(`   Will be created on first run`, 'yellow');
    results.warnings++;
  }
  
  // Check configuration
  log('\n⚙️  Configuration:', 'bold');
  const autofixConfig = path.join(__dirname, '..', 'src', 'config', 'autofix-config.js');
  if (fs.existsSync(autofixConfig)) {
    log(`✅ Auto-Fix Configuration`, 'green');
    results.passed++;
  } else {
    log(`⚠️  Auto-Fix Configuration`, 'yellow');
    log(`   Using default configuration`, 'yellow');
    results.warnings++;
  }
  
  // Check AI integration
  log('\n🤖 AI Integration:', 'bold');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('ANTHROPIC_API_KEY=sk-ant-')) {
      log(`✅ Anthropic API Key configured`, 'green');
      results.passed++;
    } else {
      log(`⚠️  Anthropic API Key`, 'yellow');
      log(`   AI-powered optimization will be limited`, 'yellow');
      results.warnings++;
    }
    
    if (envContent.includes('OPENAI_API_KEY=sk-')) {
      log(`✅ OpenAI API Key configured`, 'green');
      results.passed++;
    } else {
      log(`⚠️  OpenAI API Key`, 'yellow');
      log(`   AI-powered optimization will be limited`, 'yellow');
      results.warnings++;
    }
  }
  
  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  log('  TEST SUMMARY', 'bold');
  log('═'.repeat(50), 'cyan');
  
  log(`\n✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  log(`📊 Total: ${results.passed + results.failed + results.warnings}\n`);
  
  if (results.failed === 0) {
    log('🎉 All auto-fix engines are installed!', 'green');
    log('\n📋 Next Steps:', 'bold');
    log('1. Run dry-run test: npm run autofix:dry-run');
    log('2. View changes: npm run autofix:view');
    log('3. Run live fix: npm run autofix:run');
    log('4. Generate report: npm run autofix:report\n');
    process.exit(0);
  } else {
    log('⚠️  Some auto-fix engines are missing.', 'yellow');
    log('   Please check the paths above.\n');
    process.exit(1);
  }
}

testAutoFixEngines();
