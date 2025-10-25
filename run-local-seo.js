#!/usr/bin/env node

/**
 * LOCAL SEO AUTOMATION RUNNER
 *
 * Runs comprehensive Local SEO audits and automation for all clients
 *
 * Usage:
 *   node run-local-seo.js                    # Run for all clients
 *   node run-local-seo.js instantautotraders # Run for specific client
 *   node run-local-seo.js --report-only      # Generate reports only
 */

import { LocalSEOOrchestrator } from './src/automation/local-seo-orchestrator.js';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// CLIENT CONFIGURATIONS
// ============================================================================

const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Sydney\'s trusted cash car buyer offering instant quotes and same-day service. We buy all makes and models in any condition across Sydney and NSW.',
    siteUrl: 'https://instantautotraders.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX', // TODO: Add actual phone
    email: 'info@instantautotraders.com.au',
    businessOwner: 'Team',
    reviewLink: null, // TODO: Add Google review link
    logoUrl: 'https://instantautotraders.com.au/wp-content/uploads/logo.png',
    address: {
      street: null, // TODO: Add if public-facing address
      city: 'Sydney',
      state: 'NSW',
      postcode: null,
      country: 'AU'
    },
    geo: {
      latitude: -33.8688,
      longitude: 151.2093
    },
    serviceArea: [
      {
        "@type": "City",
        "name": "Sydney"
      },
      {
        "@type": "State",
        "name": "New South Wales"
      }
    ],
    socialProfiles: [
      'https://www.facebook.com/instantautotraders',
      'https://www.instagram.com/instantautotraders'
    ],
    openingHours: [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "09:00",
        "closes": "16:00"
      }
    ]
  },

  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Professional tyre and wheel services in Sydney. Expert repairs, replacements, and maintenance for all vehicle types.',
    siteUrl: 'https://hottyres.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX', // TODO: Add actual phone
    email: 'info@hottyres.com.au',
    businessOwner: 'Team',
    reviewLink: null, // TODO: Add Google review link
    logoUrl: 'https://hottyres.com.au/wp-content/uploads/logo.png',
    address: {
      street: null,
      city: 'Sydney',
      state: 'NSW',
      postcode: null,
      country: 'AU'
    },
    geo: {
      latitude: -33.8688,
      longitude: 151.2093
    },
    serviceArea: [
      {
        "@type": "City",
        "name": "Sydney"
      }
    ],
    socialProfiles: [],
    openingHours: [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "17:00"
      }
    ]
  },

  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    businessType: 'LocalBusiness',
    businessDescription: 'Comprehensive disability support services in Sydney. Empowering individuals with disabilities to live independently.',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    phone: '+61 2 XXXX XXXX', // TODO: Add actual phone
    email: 'info@sadcdisabilityservices.com.au',
    businessOwner: 'Team',
    reviewLink: null, // TODO: Add Google review link
    logoUrl: 'https://sadcdisabilityservices.com.au/wp-content/uploads/logo.png',
    address: {
      street: null,
      city: 'Sydney',
      state: 'NSW',
      postcode: null,
      country: 'AU'
    },
    geo: {
      latitude: -33.8688,
      longitude: 151.2093
    },
    serviceArea: [
      {
        "@type": "City",
        "name": "Sydney"
      },
      {
        "@type": "State",
        "name": "New South Wales"
      }
    ],
    socialProfiles: [],
    openingHours: [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "17:00"
      }
    ]
  }
};

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runLocalSEO(clientId = null) {
  console.log('\n🏪 LOCAL SEO AUTOMATION SYSTEM');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  // Determine which clients to process
  const clients = clientId ? [clientId] : Object.keys(clientConfigs);

  if (clientId && !clientConfigs[clientId]) {
    console.error(`❌ Error: Client '${clientId}' not found`);
    console.log(`Available clients: ${Object.keys(clientConfigs).join(', ')}`);
    process.exit(1);
  }

  console.log(`Processing ${clients.length} client(s): ${clients.join(', ')}\n`);

  const results = [];

  // Create output directory
  const outputDir = path.join(process.cwd(), 'logs', 'local-seo');
  await fs.mkdir(outputDir, { recursive: true });

  // Process each client
  for (const client of clients) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`CLIENT: ${client.toUpperCase()}`);
      console.log(`${'='.repeat(70)}`);

      const config = clientConfigs[client];
      const orchestrator = new LocalSEOOrchestrator(config);

      // Run complete audit
      const auditResults = await orchestrator.runCompleteAudit();

      // Generate reports
      const clientOutputDir = path.join(outputDir, client);
      await fs.mkdir(clientOutputDir, { recursive: true });

      const reports = await orchestrator.generateReport(clientOutputDir);

      // Get recommendations
      const recommendations = orchestrator.getRecommendations();

      // Store results
      results.push({
        client,
        success: true,
        auditResults,
        reports,
        recommendations
      });

      console.log(`\n✅ ${config.businessName} - Local SEO audit complete`);

    } catch (error) {
      console.error(`\n❌ Error processing ${client}: ${error.message}`);
      results.push({
        client,
        success: false,
        error: error.message
      });
    }
  }

  // Generate summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 LOCAL SEO AUTOMATION SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nTotal Clients: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  // Display recommendations
  console.log('\n\n🎯 KEY RECOMMENDATIONS:\n');

  successful.forEach(result => {
    const config = clientConfigs[result.client];
    console.log(`\n${config.businessName}:`);

    result.recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'HIGH' ? '🔴' : '🟡';
      console.log(`   ${priorityIcon} [${rec.priority}] ${rec.action}`);
      console.log(`      Impact: ${rec.impact}`);
    });
  });

  // Save summary
  const summaryPath = path.join(outputDir, `summary-${Date.now()}.json`);
  await fs.writeFile(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    clients: results.length,
    successful: successful.length,
    failed: failed.length,
    results
  }, null, 2));

  console.log(`\n\n📄 Summary saved: ${summaryPath}`);

  // Output locations
  console.log('\n\n📂 OUTPUT LOCATIONS:');
  console.log(`   Main directory: ${outputDir}`);
  successful.forEach(result => {
    console.log(`   ${result.client}:`);
    console.log(`      → Report: ${result.reports.reportPath}`);
    console.log(`      → Directory tracker: ${result.reports.csvPath}`);
  });

  console.log('\n\n💡 NEXT STEPS:');
  console.log('   1. Review the reports in logs/local-seo/');
  console.log('   2. Address high-priority recommendations');
  console.log('   3. Complete Tier 1 directory submissions');
  console.log('   4. Set up review request automation');
  console.log('   5. Schedule monthly NAP consistency checks');

  console.log('\n✅ Local SEO automation complete!\n');

  return results;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Parse arguments
  const clientArg = args.find(arg => !arg.startsWith('--'));
  const reportOnly = args.includes('--report-only');

  if (reportOnly) {
    console.log('📊 Report generation mode not yet implemented');
    console.log('Run without --report-only to generate fresh audits');
    process.exit(0);
  }

  // Run automation
  runLocalSEO(clientArg)
    .then(results => {
      const failed = results.filter(r => !r.success);
      process.exit(failed.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

export { runLocalSEO, clientConfigs };
