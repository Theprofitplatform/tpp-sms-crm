#!/usr/bin/env node

/**
 * ENHANCED SEO AUTOMATION RUNNER
 *
 * Combines:
 * - Regular SEO automation (keyword optimization)
 * - Local SEO automation (NAP, schema, directories, reviews)
 * - Competitor tracking (rankings, alerts, gaps)
 *
 * Usage:
 *   node run-enhanced-automation.js                    # Run all features for all clients
 *   node run-enhanced-automation.js instantautotraders # Run for specific client
 *   node run-enhanced-automation.js --local-seo-only   # Run only Local SEO
 *   node run-enhanced-automation.js --competitors-only # Run only competitor tracking
 */

import { LocalSEOOrchestrator } from './src/automation/local-seo-orchestrator.js';
import { CompetitorTracker } from './src/automation/competitor-tracker.js';
import { GoogleSearchConsole } from './src/automation/google-search-console.js';
import { LocalSEOReportGenerator } from './src/reports/local-seo-report-generator.js';
import bridgeClient from './src/automation/bridge-client.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CLIENT CONFIGURATIONS
// ============================================================================

const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Sydney\'s trusted cash car buyer offering instant quotes and same-day service.',
    siteUrl: 'https://instantautotraders.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    industry: 'automotive',
    phone: '+61 2 XXXX XXXX',
    email: 'info@instantautotraders.com.au',
    gscPropertyUrl: 'sc-domain:instantautotraders.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 },
    socialProfiles: [
      'https://www.facebook.com/instantautotraders',
      'https://www.instagram.com/instantautotraders'
    ]
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    businessType: 'AutomotiveBusiness',
    businessDescription: 'Professional tyre and wheel services in Sydney.',
    siteUrl: 'https://hottyres.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    industry: 'automotive-services',
    phone: '+61 2 XXXX XXXX',
    email: 'info@hottyres.com.au',
    gscPropertyUrl: 'sc-domain:hottyres.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 }
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    businessType: 'LocalBusiness',
    businessDescription: 'Comprehensive disability support services in Sydney.',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    industry: 'disability-services',
    phone: '+61 2 XXXX XXXX',
    email: 'info@sadcdisabilityservices.com.au',
    gscPropertyUrl: 'sc-domain:sadcdisabilityservices.com.au',
    geo: { latitude: -33.8688, longitude: 151.2093 }
  }
};

// ============================================================================
// MAIN AUTOMATION RUNNER
// ============================================================================

async function runEnhancedAutomation(clientId = null, options = {}) {
  const startTime = Date.now();

  console.log('\n🚀 ENHANCED SEO AUTOMATION SYSTEM');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  // Parse options
  const {
    localSeoOnly = false,
    competitorsOnly = false,
    skipRegular = false
  } = options;

  // Determine which clients to process
  const clients = clientId ? [clientId] : Object.keys(clientConfigs);

  if (clientId && !clientConfigs[clientId]) {
    console.error(`❌ Error: Client '${clientId}' not found`);
    console.log(`Available clients: ${Object.keys(clientConfigs).join(', ')}`);
    process.exit(1);
  }

  console.log(`Processing ${clients.length} client(s): ${clients.join(', ')}\n`);

  const results = [];

  // Create output directories
  const baseOutputDir = path.join(__dirname, 'logs', 'enhanced-automation');
  await fs.mkdir(baseOutputDir, { recursive: true });

  // Process each client
  for (const client of clients) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`CLIENT: ${client.toUpperCase()}`);
      console.log(`${'='.repeat(70)}`);

      const config = clientConfigs[client];
      const clientResult = {
        client,
        success: false,
        timestamp: new Date().toISOString(),
        features: {}
      };

      // Create client output directory
      const clientOutputDir = path.join(baseOutputDir, client, new Date().toISOString().split('T')[0]);
      await fs.mkdir(clientOutputDir, { recursive: true });

      // Fetch GSC data (needed for competitor tracking)
      let gscData = null;
      if (!localSeoOnly) {
        try {
          console.log('\n📊 Fetching Google Search Console data...');
          const gscClient = new GoogleSearchConsole(config.gscPropertyUrl);
          gscData = await gscClient.getPerformanceData();
          console.log(`   ✓ Retrieved ${gscData.rows?.length || 0} keyword records`);
        } catch (error) {
          console.log(`   ⚠️  Could not fetch GSC data: ${error.message}`);
        }
      }

      // 1. Local SEO Automation
      if (!competitorsOnly) {
        try {
          console.log('\n\n🏪 RUNNING LOCAL SEO AUTOMATION');
          console.log('-'.repeat(70));

          const localSEO = new LocalSEOOrchestrator(config);
          const localSeoResults = await localSEO.runCompleteAudit();

          // Generate reports
          const localSeoReports = await localSEO.generateReport(clientOutputDir);

          // Generate HTML report
          const reportGenerator = new LocalSEOReportGenerator(localSeoResults, config);
          const htmlReportPath = path.join(clientOutputDir, 'local-seo-report.html');
          await reportGenerator.generateHTMLReport(htmlReportPath);

          clientResult.features.localSeo = {
            success: true,
            results: localSeoResults,
            reports: {
              ...localSeoReports,
              htmlReport: htmlReportPath
            },
            recommendations: localSEO.getRecommendations()
          };

          console.log('\n   ✅ Local SEO automation complete');

          // Send results to Bridge API
          try {
            console.log('   🔗 Sending Local SEO results to Bridge API...');
            await bridgeClient.sendLocalSEOResults(config.id, localSeoResults);
            console.log('   ✅ Results stored in database');
          } catch (bridgeError) {
            console.log(`   ⚠️  Bridge API warning: ${bridgeError.message}`);
          }

        } catch (error) {
          console.error(`\n   ❌ Local SEO error: ${error.message}`);
          clientResult.features.localSeo = {
            success: false,
            error: error.message
          };
        }
      }

      // 2. Competitor Tracking
      if (!localSeoOnly && gscData) {
        try {
          console.log('\n\n🎯 RUNNING COMPETITOR TRACKING');
          console.log('-'.repeat(70));

          const competitorTracker = new CompetitorTracker(config, gscData);
          const competitorResults = await competitorTracker.runCompleteAnalysis();

          // Generate report
          const competitorReportPath = await competitorTracker.generateReport(clientOutputDir);

          clientResult.features.competitors = {
            success: true,
            results: competitorResults,
            reportPath: competitorReportPath,
            recommendations: competitorTracker.getRecommendations()
          };

          console.log('\n   ✅ Competitor tracking complete');

          // Send results to Bridge API
          try {
            console.log('   🔗 Sending Competitor results to Bridge API...');
            await bridgeClient.sendCompetitorResults(config.id, competitorResults);
            console.log('   ✅ Results stored in database');
          } catch (bridgeError) {
            console.log(`   ⚠️  Bridge API warning: ${bridgeError.message}`);
          }

        } catch (error) {
          console.error(`\n   ❌ Competitor tracking error: ${error.message}`);
          clientResult.features.competitors = {
            success: false,
            error: error.message
          };
        }
      }

      // Mark overall success if any feature succeeded
      clientResult.success = Object.values(clientResult.features).some(f => f.success);
      results.push(clientResult);

      console.log(`\n✅ ${config.businessName} - Enhanced automation complete`);

    } catch (error) {
      console.error(`\n❌ Error processing ${client}: ${error.message}`);
      results.push({
        client,
        success: false,
        error: error.message
      });
    }
  }

  // Generate overall summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 ENHANCED AUTOMATION SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nTotal Clients: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Duration: ${duration}s`);

  // Display key metrics
  console.log('\n\n📈 KEY METRICS:\n');

  successful.forEach(result => {
    const config = clientConfigs[result.client];
    console.log(`\n${config.businessName}:`);

    if (result.features.localSeo?.success) {
      const napScore = result.features.localSeo.results.tasks?.napConsistency?.score || 0;
      const hasSchema = result.features.localSeo.results.tasks?.schema?.hasSchema;
      console.log(`   Local SEO:`);
      console.log(`      NAP Score: ${napScore}/100`);
      console.log(`      Schema: ${hasSchema ? '✅ Present' : '⚠️  Missing'}`);
      console.log(`      Recommendations: ${result.features.localSeo.recommendations.length}`);
    }

    if (result.features.competitors?.success) {
      const competitors = result.features.competitors.results.competitors?.length || 0;
      const alerts = result.features.competitors.results.alerts?.length || 0;
      console.log(`   Competitor Tracking:`);
      console.log(`      Competitors Found: ${competitors}`);
      console.log(`      Alerts Generated: ${alerts}`);
    }
  });

  // Display all recommendations
  console.log('\n\n🎯 ALL RECOMMENDATIONS:\n');

  successful.forEach(result => {
    const config = clientConfigs[result.client];

    const allRecs = [
      ...(result.features.localSeo?.recommendations || []),
      ...(result.features.competitors?.recommendations || [])
    ];

    if (allRecs.length > 0) {
      console.log(`\n${config.businessName}:`);
      allRecs.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priorityIcon} [${rec.priority}] ${rec.action}`);
        if (rec.impact) {
          console.log(`      💡 Impact: ${rec.impact}`);
        }
      });
    }
  });

  // Save summary
  const summaryPath = path.join(baseOutputDir, `summary-${Date.now()}.json`);
  await fs.writeFile(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    clients: results.length,
    successful: successful.length,
    failed: failed.length,
    results
  }, null, 2));

  console.log(`\n\n📄 Summary saved: ${summaryPath}`);

  // Output locations
  console.log('\n\n📂 OUTPUT LOCATIONS:');
  console.log(`   Main directory: ${baseOutputDir}`);
  successful.forEach(result => {
    const clientDir = path.join(baseOutputDir, result.client);
    console.log(`   ${result.client}: ${clientDir}`);
  });

  console.log('\n\n💡 NEXT STEPS:');
  console.log('   1. Review HTML reports in logs/enhanced-automation/');
  console.log('   2. Address high-priority recommendations');
  console.log('   3. Set up alerts for competitor ranking changes');
  console.log('   4. Schedule monthly re-runs to track progress');

  console.log('\n✅ Enhanced automation complete!\n');

  return results;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Parse arguments
  const clientArg = args.find(arg => !arg.startsWith('--'));
  const options = {
    localSeoOnly: args.includes('--local-seo-only'),
    competitorsOnly: args.includes('--competitors-only'),
    skipRegular: args.includes('--skip-regular')
  };

  // Run automation
  runEnhancedAutomation(clientArg, options)
    .then(results => {
      const failed = results.filter(r => !r.success);
      process.exit(failed.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

export { runEnhancedAutomation, clientConfigs };
