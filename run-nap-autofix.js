#!/usr/bin/env node

/**
 * NAP Auto-Fix CLI
 *
 * Command-line tool for running NAP auto-fix or rolling back changes
 *
 * Usage:
 *   node run-nap-autofix.js <clientId>           # Run auto-fix
 *   node run-nap-autofix.js <clientId> --detect  # Detect only (no fixes)
 *   node run-nap-autofix.js <clientId> --rollback <backupId>  # Rollback
 */

import { NAPAutoFixer } from './src/automation/auto-fixers/nap-fixer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Client configurations (same as enhanced automation)
const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    businessType: 'AutomotiveBusiness',
    siteUrl: 'https://instantautotraders.com.au',
    address: '123 Example St',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@instantautotraders.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    businessType: 'AutomotiveBusiness',
    siteUrl: 'https://hottyres.com.au',
    address: '456 Tire Lane',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@hottyres.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    businessType: 'LocalBusiness',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    address: '789 Care Street',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@sadcdisabilityservices.com.au',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  }
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('');
    console.log('NAP AUTO-FIX CLI');
    console.log('='.repeat(70));
    console.log('');
    console.log('Usage:');
    console.log('  node run-nap-autofix.js <clientId>                 # Run auto-fix');
    console.log('  node run-nap-autofix.js <clientId> --detect        # Detect only');
    console.log('  node run-nap-autofix.js <clientId> --rollback <id> # Rollback');
    console.log('');
    console.log('Available clients:');
    Object.keys(clientConfigs).forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('');
    console.log('Environment variables:');
    console.log('  WP_USER         WordPress username (default: admin)');
    console.log('  WP_APP_PASSWORD WordPress application password');
    console.log('');
    process.exit(0);
  }

  const clientId = args[0];
  const mode = args[1];
  const backupId = args[2];

  // Validate client
  if (!clientConfigs[clientId]) {
    console.error(`❌ Error: Client '${clientId}' not found`);
    console.log(`Available clients: ${Object.keys(clientConfigs).join(', ')}`);
    process.exit(1);
  }

  const config = clientConfigs[clientId];

  // Check WordPress credentials
  if (!config.wpPassword) {
    console.error('❌ Error: WordPress credentials not configured');
    console.log('');
    console.log('Please set environment variables:');
    console.log('  export WP_USER="your-username"');
    console.log('  export WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"');
    console.log('');
    console.log('To create an application password:');
    console.log('  1. Log in to WordPress');
    console.log('  2. Go to Users → Profile');
    console.log('  3. Scroll to "Application Passwords"');
    console.log('  4. Create a new application password');
    console.log('');
    process.exit(1);
  }

  const fixer = new NAPAutoFixer(config);

  try {
    if (mode === '--rollback') {
      if (!backupId) {
        console.error('❌ Error: Backup ID required for rollback');
        console.log('Usage: node run-nap-autofix.js <clientId> --rollback <backupId>');
        process.exit(1);
      }

      await fixer.rollback(parseInt(backupId));

    } else if (mode === '--detect') {
      console.log('\n🔍 NAP DETECTION MODE (No changes will be made)');
      console.log('='.repeat(70));

      const results = await fixer.detectInconsistencies();

      console.log('\n📊 DETECTION RESULTS:');
      console.log('-'.repeat(70));
      console.log(`Total content scanned: ${results.summary.totalScanned}`);
      console.log(`Total issues found: ${results.summary.totalIssues}`);
      console.log('');
      console.log('Issues by field:');
      Object.entries(results.summary.byField).forEach(([field, count]) => {
        console.log(`  ${field}: ${count}`);
      });

      if (results.issues.length > 0) {
        console.log('');
        console.log('Sample issues (first 5):');
        results.issues.slice(0, 5).forEach((issue, i) => {
          console.log(`');
          console.log(`${i + 1}. ${issue.field} in ${issue.location}`);
          console.log(`   Found: "${issue.found}"`);
          console.log(`   Should be: "${issue.correct}"`);
        });
      }

      console.log('');
      console.log('To fix these issues, run:');
      console.log(`  node run-nap-autofix.js ${clientId}`);
      console.log('');

    } else {
      // Run full auto-fix
      const results = await fixer.runAutoFix();

      // Save results to file
      const outputDir = path.join(__dirname, 'logs', 'nap-autofix', clientId);
      await fs.mkdir(outputDir, { recursive: true });

      const outputFile = path.join(
        outputDir,
        `nap-autofix-${new Date().toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(
        outputFile,
        JSON.stringify(results, null, 2),
        'utf8'
      );

      console.log('');
      console.log(`📄 Full results saved to: ${outputFile}`);
      console.log('');

      if (results.success) {
        console.log('✅ Auto-fix completed successfully!');
        process.exit(0);
      } else {
        console.log('⚠️  Auto-fix completed with errors. Check the log file for details.');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
