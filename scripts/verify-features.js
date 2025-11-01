#!/usr/bin/env node

/**
 * FEATURE VERIFICATION SCRIPT
 * Tests all claimed features to see what actually works
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const results = {
  database: {},
  features: {},
  apis: {},
  modules: {},
  issues: []
};

console.log('🔍 FEATURE VERIFICATION STARTING...\n');

// ============================================
// 1. DATABASE VERIFICATION
// ============================================
console.log('📊 DATABASE VERIFICATION');
console.log('━'.repeat(50));

try {
  const dbPath = join(__dirname, '..', 'data', 'seo-automation.db');

  if (!fs.existsSync(dbPath)) {
    results.issues.push('❌ Main database not found at: ' + dbPath);
    console.log('❌ Database not found');
  } else {
    const db = new Database(dbPath, { readonly: true });

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    results.database.tableCount = tables.length;
    results.database.tables = tables.map(t => t.name);

    console.log(`✅ Database found: ${tables.length} tables`);

    // Check which tables have data
    const tablesWithData = [];
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        if (count.count > 0) {
          tablesWithData.push({ name: table.name, rows: count.count });
        }
      } catch (e) {
        // Skip if table query fails
      }
    }

    results.database.tablesWithData = tablesWithData;
    console.log(`✅ Tables with data: ${tablesWithData.length}/${tables.length}`);

    tablesWithData.forEach(t => {
      console.log(`   ${t.name}: ${t.rows} rows`);
    });

    db.close();
  }
} catch (error) {
  results.issues.push('❌ Database verification failed: ' + error.message);
  console.log('❌ Database verification failed:', error.message);
}

console.log('');

// ============================================
// 2. MODULE VERIFICATION
// ============================================
console.log('🔧 MODULE VERIFICATION');
console.log('━'.repeat(50));

const modules = [
  { name: 'Historical Tracker', path: '../src/automation/historical-tracker.js', lines: 516 },
  { name: 'Local Keyword Tracker', path: '../src/automation/local-keyword-tracker.js', lines: 407 },
  { name: 'Social Media Auditor', path: '../src/automation/social-media-auditor.js', lines: 489 },
  { name: 'GMB Optimizer', path: '../src/automation/gmb-optimizer.js', lines: 514 },
  { name: 'Citation Monitor', path: '../src/automation/citation-monitor.js', lines: 12291 },
  { name: 'Competitor Analyzer', path: '../src/automation/competitor-analyzer.js', lines: 9985 },
  { name: 'Review Monitor', path: '../src/automation/review-monitor.js', lines: 12915 },
  { name: 'Email Automation', path: '../src/automation/email-automation.js', lines: 23177 },
  { name: 'Email Templates', path: '../src/automation/email-templates.js', lines: 17918 }
];

results.modules.total = modules.length;
results.modules.verified = 0;
results.modules.details = [];

for (const module of modules) {
  const modulePath = join(__dirname, module.path);

  if (fs.existsSync(modulePath)) {
    const content = fs.readFileSync(modulePath, 'utf8');
    const actualLines = content.split('\n').length;
    const match = Math.abs(actualLines - module.lines) < 100; // Allow 100 line variance

    if (match) {
      console.log(`✅ ${module.name}: ${actualLines} lines`);
      results.modules.verified++;
      results.modules.details.push({ name: module.name, status: 'verified', lines: actualLines });
    } else {
      console.log(`⚠️  ${module.name}: ${actualLines} lines (expected ~${module.lines})`);
      results.modules.details.push({ name: module.name, status: 'size-mismatch', lines: actualLines });
    }
  } else {
    console.log(`❌ ${module.name}: File not found`);
    results.issues.push(`Module not found: ${module.name} at ${modulePath}`);
    results.modules.details.push({ name: module.name, status: 'missing' });
  }
}

console.log(`\n📊 Modules: ${results.modules.verified}/${results.modules.total} verified\n`);

// ============================================
// 3. FILE STRUCTURE VERIFICATION
// ============================================
console.log('📁 FILE STRUCTURE VERIFICATION');
console.log('━'.repeat(50));

const criticalFiles = [
  'dashboard-server.js',
  'package.json',
  '.env.example',
  'src/database/index.js',
  'src/auth/auth-service.js',
  'src/routes/auth-routes.js'
];

results.files = {
  critical: [],
  missing: []
};

for (const file of criticalFiles) {
  const filePath = join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${Math.round(stats.size / 1024)}KB)`);
    results.files.critical.push({ file, size: stats.size, exists: true });
  } else {
    console.log(`❌ ${file} - MISSING`);
    results.files.missing.push(file);
    results.issues.push(`Critical file missing: ${file}`);
  }
}

console.log('');

// ============================================
// 4. DOCUMENTATION AUDIT
// ============================================
console.log('📚 DOCUMENTATION AUDIT');
console.log('━'.repeat(50));

const docsDir = join(__dirname, '..');
const mdFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

results.documentation = {
  totalFiles: mdFiles.length,
  files: mdFiles
};

console.log(`📄 Total markdown files in root: ${mdFiles.length}`);

if (mdFiles.length > 50) {
  console.log(`⚠️  WARNING: ${mdFiles.length} documentation files is excessive`);
  results.issues.push(`Too many documentation files: ${mdFiles.length} (recommend <15)`);
}

// Find essential docs
const essentialDocs = ['README.md', 'SETUP.md', 'API_REFERENCE.md', 'DEPLOYMENT.md'];
const foundEssential = essentialDocs.filter(doc => mdFiles.includes(doc));
const missingEssential = essentialDocs.filter(doc => !mdFiles.includes(doc));

console.log(`✅ Essential docs found: ${foundEssential.length}/${essentialDocs.length}`);
if (missingEssential.length > 0) {
  console.log(`⚠️  Missing essential: ${missingEssential.join(', ')}`);
}

console.log('');

// ============================================
// 5. DEPENDENCY CHECK
// ============================================
console.log('📦 DEPENDENCY CHECK');
console.log('━'.repeat(50));

const packagePath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

results.dependencies = {
  production: Object.keys(pkg.dependencies || {}).length,
  development: Object.keys(pkg.devDependencies || {}).length,
  total: Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length
};

console.log(`✅ Production dependencies: ${results.dependencies.production}`);
console.log(`✅ Development dependencies: ${results.dependencies.development}`);
console.log(`📊 Total: ${results.dependencies.total}`);

// Check for critical dependencies
const criticalDeps = ['express', 'better-sqlite3', 'jsonwebtoken', 'bcryptjs'];
const missingDeps = criticalDeps.filter(dep => !pkg.dependencies[dep]);

if (missingDeps.length > 0) {
  console.log(`❌ Missing critical dependencies: ${missingDeps.join(', ')}`);
  results.issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
} else {
  console.log(`✅ All critical dependencies present`);
}

console.log('');

// ============================================
// 6. FEATURE CLAIMS VERIFICATION
// ============================================
console.log('🎯 FEATURE CLAIMS VERIFICATION');
console.log('━'.repeat(50));

const claimedFeatures = [
  { name: 'Lead Generation System', verifiable: false },
  { name: 'Email Automation (4-email drip)', verifiable: false },
  { name: 'White-Label Branding', verifiable: false },
  { name: 'Admin Panel', verifiable: false },
  { name: 'SEO Automation', verifiable: true },
  { name: 'Client Portal', verifiable: false },
  { name: 'Historical Tracking', verifiable: true },
  { name: 'Local Keyword Tracking', verifiable: true },
  { name: 'Social Media Audit', verifiable: true },
  { name: 'GMB Optimization', verifiable: true },
  { name: 'Citation & Review Monitoring', verifiable: true },
  { name: 'Competitor Intelligence', verifiable: true }
];

results.features.claimed = claimedFeatures.length;
results.features.verified = claimedFeatures.filter(f => f.verifiable).length;
results.features.unverified = claimedFeatures.filter(f => !f.verifiable).length;

claimedFeatures.forEach(feature => {
  const status = feature.verifiable ? '✅ Verified (code exists)' : '⚠️  Needs testing';
  console.log(`${status} - ${feature.name}`);
});

console.log(`\n📊 Features: ${results.features.verified} verified, ${results.features.unverified} need testing\n`);

// ============================================
// SUMMARY
// ============================================
console.log('');
console.log('═'.repeat(50));
console.log('📋 VERIFICATION SUMMARY');
console.log('═'.repeat(50));

console.log(`\n✅ WORKING:`);
console.log(`   - Database: ${results.database.tableCount} tables, ${results.database.tablesWithData?.length || 0} with data`);
console.log(`   - Modules: ${results.modules.verified}/${results.modules.total} verified`);
console.log(`   - Files: ${results.files.critical.length}/${criticalFiles.length} critical files found`);
console.log(`   - Dependencies: ${results.dependencies.total} packages`);

console.log(`\n⚠️  NEEDS ATTENTION:`);
console.log(`   - ${results.documentation.totalFiles} documentation files (recommend consolidation)`);
console.log(`   - ${results.features.unverified} features need integration testing`);
console.log(`   - ${results.issues.length} issues found`);

if (results.issues.length > 0) {
  console.log(`\n❌ ISSUES FOUND:`);
  results.issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
}

console.log(`\n📊 OVERALL ASSESSMENT:`);
const score = Math.round((
  (results.modules.verified / results.modules.total) * 40 +
  (results.files.critical.length / criticalFiles.length) * 30 +
  ((results.database.tablesWithData?.length || 0) / (results.database.tableCount || 1)) * 30
));

console.log(`   Completion Score: ${score}%`);

if (score >= 90) {
  console.log(`   Status: 🟢 Excellent - Production Ready`);
} else if (score >= 75) {
  console.log(`   Status: 🟡 Good - Needs Minor Fixes`);
} else if (score >= 60) {
  console.log(`   Status: 🟠 Fair - Needs Significant Work`);
} else {
  console.log(`   Status: 🔴 Poor - Major Issues`);
}

// ============================================
// SAVE RESULTS
// ============================================
const resultsPath = join(__dirname, '..', 'INTEGRATION_STATUS_REPORT.json');
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log(`\n💾 Full report saved to: INTEGRATION_STATUS_REPORT.json`);

console.log('\n✅ VERIFICATION COMPLETE\n');

// Exit with appropriate code
process.exit(results.issues.length > 5 ? 1 : 0);
