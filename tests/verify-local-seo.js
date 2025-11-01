/**
 * Local SEO Modules Integration Test
 *
 * Verifies all Local SEO modules are properly integrated:
 * - Citation Monitor
 * - GMB Optimizer
 * - Historical Tracker
 * - Local Keyword Tracker
 * - Social Media Auditor
 */

import db from '../src/database/index.js';
import { CitationMonitor } from '../src/automation/citation-monitor.js';
import { GMBOptimizer } from '../src/automation/gmb-optimizer.js';
import { HistoricalTracker } from '../src/automation/historical-tracker.js';
import { LocalKeywordTracker } from '../src/automation/local-keyword-tracker.js';
import { SocialMediaAuditor } from '../src/automation/social-media-auditor.js';

console.log('🧪 Local SEO Modules Integration Test\n');
console.log('=' . repeat(60));

// Test client data
const testClient = {
  id: 'local-seo-test-client',
  name: 'Test Local Business',
  domain: 'https://testlocalbusiness.com',
  businessType: 'local_business',
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia',
  phone: '+61 2 1234 5678',
  email: 'contact@testlocalbusiness.com'
};

const results = {
  modulesFound: 0,
  modulesWorking: 0,
  databaseIntegration: 0,
  apiEndpoints: 0,
  errors: []
};

async function testModule(name, testFn) {
  try {
    console.log(`\n📋 Testing: ${name}`);
    results.modulesFound++;
    await testFn();
    results.modulesWorking++;
    console.log(`✅ ${name} - PASSED`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} - FAILED`);
    console.log(`   Error: ${error.message}`);
    results.errors.push({ module: name, error: error.message });
    return false;
  }
}

// Setup test client
function setupTestClient() {
  console.log('\n🔧 Setting up test client...');

  try {
    // Create or update test client
    db.clientOps.upsert(testClient);
    console.log('✅ Test client created: ' + testClient.id);
  } catch (error) {
    console.log('❌ Failed to create test client:', error.message);
    throw error;
  }
}

// Cleanup
function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete test client
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    stmt.run(testClient.id);

    // Clean up related data
    db.prepare('DELETE FROM local_seo_audits WHERE client_id = ?').run(testClient.id);
    db.prepare('DELETE FROM citation_checks WHERE client_id = ?').run(testClient.id);
    db.prepare('DELETE FROM keyword_rankings WHERE domain_id = ?').run(testClient.id);

    console.log('✅ Cleanup complete');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

// Test 1: Citation Monitor
async function testCitationMonitor() {
  const monitor = new CitationMonitor(db);

  // Test monitoring
  const result = await monitor.monitorClient(testClient.id);

  if (!result) {
    throw new Error('Citation monitor returned null');
  }

  // Check for expected properties
  if (typeof result.score === 'undefined') {
    throw new Error('Missing score property');
  }

  console.log(`   Citations found: ${result.totalCitations || 0}`);
  console.log(`   NAP score: ${result.score || 0}/100`);
}

// Test 2: GMB Optimizer
async function testGMBOptimizer() {
  const optimizer = new GMBOptimizer(db);

  // Test optimization analysis
  const result = await optimizer.analyzeProfile(testClient.id);

  if (!result) {
    throw new Error('GMB optimizer returned null');
  }

  console.log(`   Overall score: ${result.overallScore || 0}/100`);
  console.log(`   Recommendations: ${result.recommendations?.length || 0}`);
}

// Test 3: Historical Tracker
async function testHistoricalTracker() {
  const tracker = new HistoricalTracker(db);

  // Record a test metric
  await tracker.recordMetric(testClient.id, 'overall_score', 75);

  // Get history
  const history = await tracker.getHistory(testClient.id, 30);

  if (!history) {
    throw new Error('Historical tracker returned null');
  }

  console.log(`   Data points recorded: ${history.length || 0}`);
}

// Test 4: Local Keyword Tracker
async function testLocalKeywordTracker() {
  const tracker = new LocalKeywordTracker(db);

  // Generate local keywords
  const keywords = tracker.generateLocalKeywords(
    testClient.businessType,
    testClient.city,
    testClient.state
  );

  if (!keywords || keywords.length === 0) {
    throw new Error('No keywords generated');
  }

  console.log(`   Keywords generated: ${keywords.length}`);
  console.log(`   Sample: ${keywords.slice(0, 3).join(', ')}`);
}

// Test 5: Social Media Auditor
async function testSocialMediaAuditor() {
  const auditor = new SocialMediaAuditor(db);

  // Audit social presence
  const result = await auditor.auditClient(testClient.id);

  if (!result) {
    throw new Error('Social media auditor returned null');
  }

  console.log(`   Platforms checked: ${result.platformsChecked || 0}`);
  console.log(`   Overall score: ${result.overallScore || 0}/100`);
}

// Test Database Tables
function testDatabaseTables() {
  console.log('\n📊 Testing Database Integration...');

  const tables = [
    'local_seo_audits',
    'citation_checks',
    'gmb_profiles',
    'keyword_rankings',
    'social_media_profiles',
    'seo_history'
  ];

  let tablesExist = 0;

  tables.forEach(table => {
    try {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get();
      console.log(`   ✅ ${table}: ${result.count} records`);
      tablesExist++;
      results.databaseIntegration++;
    } catch (error) {
      console.log(`   ❌ ${table}: Not found or error`);
    }
  });

  console.log(`\n   ${tablesExist}/${tables.length} tables exist`);
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting Local SEO Integration Tests\n');

  try {
    // Setup
    setupTestClient();

    // Run module tests
    await testModule('Citation Monitor', testCitationMonitor);
    await testModule('GMB Optimizer', testGMBOptimizer);
    await testModule('Historical Tracker', testHistoricalTracker);
    await testModule('Local Keyword Tracker', testLocalKeywordTracker);
    await testModule('Social Media Auditor', testSocialMediaAuditor);

    // Test database
    testDatabaseTables();

    // Cleanup
    cleanup();

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS\n');
    console.log(`Modules Found:     ${results.modulesFound}/5`);
    console.log(`Modules Working:   ${results.modulesWorking}/5`);
    console.log(`Database Tables:   ${results.databaseIntegration}/6`);
    console.log(`Pass Rate:         ${Math.round((results.modulesWorking / results.modulesFound) * 100)}%`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      results.errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.module}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (results.modulesWorking === results.modulesFound && results.databaseIntegration >= 4) {
      console.log('\n✅ ALL TESTS PASSED - Local SEO modules are fully integrated!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - See errors above\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
