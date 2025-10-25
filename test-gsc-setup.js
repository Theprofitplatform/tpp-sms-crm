#!/usr/bin/env node
/**
 * Test Google Search Console API Setup
 * Run this to verify your GSC integration works
 */

import { GoogleSearchConsole } from './src/automation/google-search-console.js';
import { logger } from './src/audit/logger.js';

async function testGSCSetup() {
  try {
    logger.section('Testing Google Search Console Setup');

    // Initialize GSC client
    logger.info('Initializing Google Search Console API...');
    const gsc = new GoogleSearchConsole();
    logger.success('✅ GSC API initialized');

    // Test site - change this to your actual client domain
    const siteUrl = 'https://hottyres.com.au'; // or sc-domain:hottyres.com.au

    // Test 1: Get basic metrics
    logger.info('\n📊 Test 1: Fetching site metrics...');
    const metrics = await gsc.getSiteMetrics(siteUrl);
    logger.success('✅ Site metrics fetched');
    console.log('  Total clicks (30 days):', metrics.totalClicks);
    console.log('  Total impressions:', metrics.totalImpressions);
    console.log('  Average CTR:', metrics.averageCTR + '%');
    console.log('  Average position:', metrics.averagePosition);

    // Test 2: Get keyword rankings
    logger.info('\n🔍 Test 2: Fetching keyword rankings...');
    const rankings = await gsc.getKeywordRankings(siteUrl, { rowLimit: 10 });
    logger.success(`✅ Found ${rankings.length} keywords`);
    
    if (rankings.length > 0) {
      console.log('\n  Top 5 keywords:');
      rankings.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. "${r.keyword}"`);
        console.log(`     Position: ${r.position}, Clicks: ${r.clicks}, Impressions: ${r.impressions}`);
      });
    }

    // Test 3: Find quick wins
    logger.info('\n🎯 Test 3: Finding quick win opportunities...');
    const quickWins = await gsc.findQuickWins(siteUrl);
    logger.success(`✅ Found ${quickWins.total} quick wins`);
    console.log(`  Estimated traffic gain: +${quickWins.estimatedTrafficGain} clicks/month`);
    
    if (quickWins.opportunities.length > 0) {
      console.log('\n  Top 3 opportunities:');
      quickWins.opportunities.slice(0, 3).forEach((opp, i) => {
        console.log(`  ${i + 1}. "${opp.keyword}" (Position ${opp.position})`);
        console.log(`     ${opp.impressions} impressions, ${opp.clicks} clicks`);
      });
    }

    // Test 4: Find low CTR pages
    logger.info('\n📄 Test 4: Finding low CTR pages...');
    const lowCTR = await gsc.findLowCTRPages(siteUrl);
    logger.success(`✅ Found ${lowCTR.total} low CTR pages`);
    console.log(`  Potential clicks gain: +${lowCTR.potentialClicks} clicks/month`);

    // Summary
    logger.section('\n✅ ALL TESTS PASSED!');
    logger.success('Google Search Console API is working correctly');
    logger.info('\nNext steps:');
    console.log('  1. Run: node cli.js gsc-rankings hottyres');
    console.log('  2. Run: node cli.js bulk-optimize hottyres');
    console.log('  3. Run: node cli.js auto-optimize hottyres');

  } catch (error) {
    logger.error('\n❌ TEST FAILED:', error.message);
    
    if (error.message.includes('ENOENT')) {
      logger.error('\n💡 Fix: Create service account credentials file');
      console.log('  Expected location: config/google/service-account.json');
      console.log('  See: SETUP-AUTOMATION-NOW.md for instructions');
    } else if (error.message.includes('User does not have sufficient permissions')) {
      logger.error('\n💡 Fix: Add service account to Google Search Console');
      console.log('  1. Open the service-account.json file');
      console.log('  2. Copy the "client_email" value');
      console.log('  3. Add it to Search Console: Settings → Users and permissions');
    } else if (error.message.includes('API has not been used')) {
      logger.error('\n💡 Fix: Enable Google Search Console API');
      console.log('  1. Go to: https://console.cloud.google.com/apis/library');
      console.log('  2. Search: "Google Search Console API"');
      console.log('  3. Click "Enable"');
    }
    
    process.exit(1);
  }
}

// Run tests
testGSCSetup();
