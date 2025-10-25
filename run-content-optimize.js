#!/usr/bin/env node

/**
 * Content Optimization CLI - Day 9
 *
 * Run comprehensive content optimization across WordPress site
 *
 * Usage:
 *   node run-content-optimize.js <clientId> [options]
 *
 * Options:
 *   --dry-run          Analyze only, don't apply fixes
 *   --limit <n>        Limit number of pages to analyze (default: 10)
 *   --rollback <id>    Rollback to backup ID
 *
 * Examples:
 *   # Analyze content (no changes)
 *   node run-content-optimize.js instantautotraders --dry-run
 *
 *   # Optimize up to 20 pages
 *   node run-content-optimize.js hottyres --limit 20
 *
 *   # Rollback changes
 *   node run-content-optimize.js sadc --rollback 123
 */

import { ContentOptimizer } from './src/automation/auto-fixers/content-optimizer.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const clientId = args[0];

const dryRun = args.includes('--dry-run');
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10;
const rollbackId = args.includes('--rollback') ? args[args.indexOf('--rollback') + 1] : null;

// Validate arguments
if (!clientId) {
  console.error('❌ Error: Client ID is required\n');
  console.log('Usage: node run-content-optimize.js <clientId> [options]\n');
  console.log('Options:');
  console.log('  --dry-run          Analyze only, don\'t apply fixes');
  console.log('  --limit <n>        Limit number of pages (default: 10)');
  console.log('  --rollback <id>    Rollback to backup ID\n');
  console.log('Examples:');
  console.log('  node run-content-optimize.js instantautotraders --dry-run');
  console.log('  node run-content-optimize.js hottyres --limit 20');
  console.log('  node run-content-optimize.js sadc --rollback 123');
  process.exit(1);
}

// Client configurations
const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    siteUrl: 'https://instantautotraders.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    siteUrl: 'https://hottyres.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  }
};

// Load client-specific .env file if it exists
const clientEnvPath = path.join(__dirname, 'clients', `${clientId}.env`);
if (fs.existsSync(clientEnvPath)) {
  console.log(`📄 Loading client config from: ${clientEnvPath}\n`);
  dotenv.config({ path: clientEnvPath });
}

const config = clientConfigs[clientId];
if (!config) {
  console.error(`❌ Error: Unknown client "${clientId}"\n`);
  console.log('Available clients:');
  Object.keys(clientConfigs).forEach(id => {
    console.log(`  - ${id}`);
  });
  process.exit(1);
}

// Update config with environment variables
if (process.env.WORDPRESS_URL) config.siteUrl = process.env.WORDPRESS_URL;
if (process.env.WORDPRESS_USER) config.wpUser = process.env.WORDPRESS_USER;
if (process.env.WORDPRESS_APP_PASSWORD) config.wpPassword = process.env.WORDPRESS_APP_PASSWORD;

// Validate configuration
if (!config.wpPassword) {
  console.error('❌ Error: WordPress credentials not configured\n');
  console.log('Set environment variables:');
  console.log('  WORDPRESS_USER=your-username');
  console.log('  WORDPRESS_APP_PASSWORD=your-app-password');
  console.log('\nOr create a client-specific .env file:');
  console.log(`  clients/${clientId}.env`);
  process.exit(1);
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 Content Optimizer - Day 9');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Client: ${config.businessName} (${clientId})`);
  console.log(`Site: ${config.siteUrl}`);
  console.log('');

  const optimizer = new ContentOptimizer(config);

  try {
    // Handle rollback
    if (rollbackId) {
      console.log('🔄 Rollback Mode\n');
      const result = await optimizer.rollback(parseInt(rollbackId));

      if (result.success) {
        console.log(`✅ Successfully restored ${result.restoredCount} pages`);
        process.exit(0);
      } else {
        console.error(`❌ Rollback failed: ${result.error}`);
        process.exit(1);
      }
    }

    // Run content optimization
    const result = await optimizer.runOptimization({
      dryRun,
      limit
    });

    if (result.success) {
      // Display detailed results
      if (result.issues.length > 0) {
        console.log('📋 Detailed Issues Found:');
        console.log('');

        // Group by page
        const issuesByPage = {};
        result.issues.forEach(issue => {
          if (!issuesByPage[issue.title]) {
            issuesByPage[issue.title] = [];
          }
          issuesByPage[issue.title].push(issue);
        });

        Object.entries(issuesByPage).forEach(([pageTitle, issues]) => {
          console.log(`   📄 ${pageTitle}`);
          issues.forEach(issue => {
            const icon = issue.severity === 'critical' ? '🔴' :
                        issue.severity === 'medium' ? '🟡' : '🟢';
            console.log(`      ${icon} ${issue.message}`);
            console.log(`         → ${issue.suggestion}`);
          });
          console.log('');
        });
      }

      if (!dryRun && result.fixes.length > 0) {
        console.log('✅ Optimization Complete!');
        console.log('');
        console.log('📊 Results:');
        console.log(`   Pages analyzed: ${result.analyzed}`);
        console.log(`   Issues found: ${result.issues.length}`);
        console.log(`   Fixes applied: ${result.fixes.length}`);
        if (result.backupId) {
          console.log('');
          console.log('💾 Backup Information:');
          console.log(`   Backup ID: ${result.backupId}`);
          console.log('');
          console.log('   To rollback these changes, run:');
          console.log(`   node run-content-optimize.js ${clientId} --rollback ${result.backupId}`);
        }
      } else if (dryRun) {
        console.log('ℹ️  DRY RUN - No changes were made');
        console.log('');
        console.log('   To apply these fixes, run:');
        console.log(`   node run-content-optimize.js ${clientId} --limit ${limit}`);
      }

      console.log('');
      process.exit(0);
    } else {
      console.error(`\n❌ Optimization failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
