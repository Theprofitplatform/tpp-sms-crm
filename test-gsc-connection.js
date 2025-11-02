/**
 * Test GSC Connection and Fetch Real Data
 * This script verifies that GSC settings are configured correctly
 * and fetches real data from Google Search Console API
 */

import { loadGSCSettings, fetchGSCDataFromSettings, testGSCConnection } from './src/services/gsc-service.js';

async function testGSC() {
  console.log('🔍 Testing Google Search Console Connection...\n');

  try {
    // Step 1: Load settings
    console.log('Step 1: Loading GSC settings from data/gsc-settings.json...');
    const settings = loadGSCSettings();

    if (!settings.clientEmail || !settings.privateKey) {
      console.error('❌ ERROR: GSC settings not configured properly');
      console.log('Settings:', JSON.stringify(settings, null, 2));
      process.exit(1);
    }

    console.log('✅ Settings loaded successfully');
    console.log(`   Property Type: ${settings.propertyType}`);
    console.log(`   Property URL: ${settings.propertyUrl}`);
    console.log(`   Client Email: ${settings.clientEmail}`);
    console.log(`   Connected: ${settings.connected}\n`);

    // Step 2: Test connection
    console.log('Step 2: Testing connection to Google Search Console API...');
    const connectionTest = await testGSCConnection(
      settings.clientEmail,
      settings.privateKey,
      settings.propertyUrl,
      settings.propertyType
    );

    if (!connectionTest.success) {
      console.error('❌ Connection test failed:', connectionTest.error);
      process.exit(1);
    }

    console.log('✅ Connection test successful!\n');

    // Step 3: Fetch real data
    console.log('Step 3: Fetching real GSC data...');
    const data = await fetchGSCDataFromSettings();

    console.log('\n✅ SUCCESS! Real GSC data retrieved:\n');
    console.log('📊 GSC Data Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Total Clicks: ${data.totalClicks || 0}`);
    console.log(`Total Impressions: ${data.totalImpressions || 0}`);
    console.log(`Average Position: ${data.avgPosition || 0}`);
    console.log(`Top Queries: ${data.topQueries?.length || 0} queries found\n`);

    if (data.topQueries && data.topQueries.length > 0) {
      console.log('Top 5 Queries:');
      data.topQueries.slice(0, 5).forEach((query, index) => {
        console.log(`  ${index + 1}. "${query.query}"`);
        console.log(`     Clicks: ${query.clicks}, Impressions: ${query.impressions}`);
        console.log(`     CTR: ${query.ctr}, Position: ${query.position}\n`);
      });
    }

    console.log('─────────────────────────────────────');
    console.log('✅ GSC integration is working correctly!');
    console.log('✅ Mock data will NO LONGER be returned');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGSC();
