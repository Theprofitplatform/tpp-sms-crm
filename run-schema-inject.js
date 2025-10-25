#!/usr/bin/env node

/**
 * Schema Auto-Inject CLI
 *
 * Command-line tool for running schema injection, updates, or rollback
 *
 * Usage:
 *   node run-schema-inject.js <clientId>           # Inject/update schema
 *   node run-schema-inject.js <clientId> --detect  # Check existing schema
 *   node run-schema-inject.js <clientId> --update  # Update if needed
 *   node run-schema-inject.js <clientId> --rollback <backupId>  # Rollback
 *   node run-schema-inject.js <clientId> --test    # Test with Google
 */

import { SchemaAutoInjector } from './src/automation/auto-fixers/schema-injector.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Client configurations
const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Sydney\'s trusted cash car buyer offering instant quotes and same-day service.',
    siteUrl: 'https://instantautotraders.com.au',
    address: '123 Example St',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@instantautotraders.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 },
    socialProfiles: [
      'https://www.facebook.com/instantautotraders',
      'https://www.instagram.com/instantautotraders'
    ],
    priceRange: '$$',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Professional tyre and wheel services in Sydney.',
    siteUrl: 'https://hottyres.com.au',
    address: '456 Tire Lane',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@hottyres.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 },
    priceRange: '$$',
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    businessType: 'LocalBusiness',
    businessDescription: 'Comprehensive disability support services in Sydney.',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    address: '789 Care Street',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX',
    email: 'info@sadcdisabilityservices.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 },
    wpUser: process.env.WP_USER || 'admin',
    wpPassword: process.env.WP_APP_PASSWORD || ''
  }
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('');
    console.log('SCHEMA AUTO-INJECT CLI');
    console.log('='.repeat(70));
    console.log('');
    console.log('Usage:');
    console.log('  node run-schema-inject.js <clientId>              # Inject/update schema');
    console.log('  node run-schema-inject.js <clientId> --detect     # Check existing');
    console.log('  node run-schema-inject.js <clientId> --update     # Update if needed');
    console.log('  node run-schema-inject.js <clientId> --rollback <id>  # Rollback');
    console.log('  node run-schema-inject.js <clientId> --test       # Test with Google');
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
    process.exit(1);
  }

  const injector = new SchemaAutoInjector(config);

  try {
    if (mode === '--rollback') {
      if (!backupId) {
        console.error('❌ Error: Backup ID required for rollback');
        console.log('Usage: node run-schema-inject.js <clientId> --rollback <backupId>');
        process.exit(1);
      }

      await injector.rollback(parseInt(backupId));

    } else if (mode === '--detect') {
      console.log('\n🔍 SCHEMA DETECTION MODE');
      console.log('='.repeat(70));

      const existing = await injector.detectExistingSchema();

      if (existing.found) {
        console.log('\n✅ Schema Found:');
        console.log(`   Type: ${existing.type}`);
        console.log(`   Location: ${existing.location}`);
        console.log('');
        console.log('Schema Content:');
        console.log(JSON.stringify(existing.schema, null, 2));

        // Check if needs update
        const needsUpdate = await injector.needsUpdate(existing);
        console.log('');
        if (needsUpdate) {
          console.log('⚠️  Schema needs update (client data has changed)');
          console.log('To update, run:');
          console.log(`  node run-schema-inject.js ${clientId} --update`);
        } else {
          console.log('✅ Schema is up to date');
        }
      } else {
        console.log('\n⚠️  No LocalBusiness schema found');
        console.log('');
        console.log('To inject schema, run:');
        console.log(`  node run-schema-inject.js ${clientId}`);
      }
      console.log('');

    } else if (mode === '--update') {
      const result = await injector.updateSchema();

      if (result.upToDate) {
        console.log('\n✅ Schema is already up to date');
        process.exit(0);
      } else if (result.needsInject) {
        console.log('\n⚠️  No schema found - please run without --update flag');
        process.exit(1);
      } else {
        console.log('\n✅ Schema updated successfully');
        process.exit(0);
      }

    } else if (mode === '--test') {
      const result = await injector.testWithGoogle();
      console.log(result.message);
      process.exit(0);

    } else {
      // Run full injection
      const results = await injector.runAutoInject();

      // Save results
      const outputDir = path.join(__dirname, 'logs', 'schema-inject', clientId);
      await fs.mkdir(outputDir, { recursive: true });

      const outputFile = path.join(
        outputDir,
        `schema-inject-${new Date().toISOString().split('T')[0]}.json`
      );

      await fs.writeFile(
        outputFile,
        JSON.stringify(results, null, 2),
        'utf8'
      );

      console.log('');
      console.log(`📄 Full results saved to: ${outputFile}`);
      console.log('');

      // Test with Google
      const testResult = await injector.testWithGoogle();
      console.log('');

      if (results.success) {
        console.log('✅ Schema injection completed successfully!');
        process.exit(0);
      } else {
        console.log('⚠️  Schema injection completed with errors. Check the log file.');
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
