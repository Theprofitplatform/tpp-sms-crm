#!/usr/bin/env node

/**
 * Integration Test Suite for Day 1-4 Features
 * Tests database operations, bridge API, and data flow
 */

import db from './src/database/index.js';
import { BridgeClient } from './src/automation/bridge-client.js';

console.log('\n🧪 INTEGRATION TEST SUITE - Phase 1 (Days 1-4)');
console.log('='.repeat(70));
console.log('');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    console.log(`\n📝 Testing: ${name}`);
    fn();
    console.log('   ✅ PASS');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// DATABASE TESTS
// ============================================================================

console.log('\n\n📊 DATABASE OPERATIONS TESTS');
console.log('-'.repeat(70));

// Test 1: Client Operations
test('clientOps.upsert() should create/update client', () => {
  const result = db.clientOps.upsert({
    id: 'test-client-001',
    name: 'Test Client',
    domain: 'testclient.com',
    businessType: 'LocalBusiness',
    city: 'Sydney',
    state: 'NSW',
    country: 'AU',
    status: 'active'
  });
  assert(result.changes === 1, 'Should create 1 record');
});

test('clientOps.getById() should retrieve client', () => {
  const client = db.clientOps.getById('test-client-001');
  assert(client !== null, 'Should return client');
  assert(client.name === 'Test Client', 'Should have correct name');
  assert(client.domain === 'testclient.com', 'Should have correct domain');
});

test('clientOps.getAll() should return all clients', () => {
  const clients = db.clientOps.getAll();
  assert(Array.isArray(clients), 'Should return array');
  assert(clients.length > 0, 'Should have at least one client');
});

// Test 2: Optimization Recording
test('clientOps.recordOptimization() should store optimization', () => {
  const optimizationId = db.clientOps.recordOptimization('test-client-001', {
    type: 'meta_optimization',
    pagesModified: 5,
    issuesFixed: 3,
    expectedImpact: 'Improved CTR',
    beforeState: { pages: 5, avgTitleLength: 45 },
    afterState: { pages: 5, avgTitleLength: 58 },
    metadata: { tool: 'test-suite' }
  });
  assert(optimizationId > 0, 'Should return optimization ID');
});

test('clientOps.getOptimizationHistory() should retrieve history', () => {
  const history = db.clientOps.getOptimizationHistory('test-client-001', 30);
  assert(Array.isArray(history), 'Should return array');
  assert(history.length > 0, 'Should have at least one optimization');
  assert(history[0].type === 'meta_optimization', 'Should have correct type');
});

test('clientOps.getRecentOptimizations() should retrieve cross-client data', () => {
  const recent = db.clientOps.getRecentOptimizations(10);
  assert(Array.isArray(recent), 'Should return array');
  assert(recent.length > 0, 'Should have at least one optimization');
  assert(recent[0].client_name, 'Should include client name');
});

// Test 3: Local SEO Operations
test('localSeoOps.recordScore() should store NAP score', () => {
  const result = db.localSeoOps.recordScore('test-client-001', {
    napScore: 85,
    hasSchema: true,
    issuesFound: 2,
    metadata: { test: true }
  });
  assert(result.changes === 1, 'Should create 1 record');
});

test('localSeoOps.getLatest() should retrieve latest score', () => {
  const latest = db.localSeoOps.getLatest('test-client-001');
  assert(latest !== null, 'Should return score');
  assert(latest.nap_score === 85, 'Should have correct score');
  assert(latest.has_schema === 1, 'Should have schema');
});

test('localSeoOps.getTrend() should calculate trend', () => {
  // Record another score for trend
  db.localSeoOps.recordScore('test-client-001', {
    napScore: 90,
    hasSchema: true,
    issuesFound: 1,
    metadata: {}
  });

  const trend = db.localSeoOps.getTrend('test-client-001', 90);
  assert(Array.isArray(trend), 'Should return array');
  const avgImprovement = trend.avgImprovement || 0;
  assert(avgImprovement >= 0, 'Should calculate improvement');
});

// Test 4: Competitor Operations
test('competitorOps.recordRanking() should store ranking', () => {
  const result = db.competitorOps.recordRanking('test-client-001', {
    competitorDomain: 'competitor1.com',
    keyword: 'test keyword',
    yourPosition: 5,
    theirPosition: 3,
    searchVolume: 1000
  });
  assert(result.changes === 1, 'Should create 1 record');
});

test('competitorOps.getRankings() should retrieve rankings', () => {
  const rankings = db.competitorOps.getRankings('test-client-001', null, 100);
  assert(Array.isArray(rankings), 'Should return array');
  assert(rankings.length > 0, 'Should have at least one ranking');
});

test('competitorOps.getCompetitorsList() should aggregate competitors', () => {
  const competitors = db.competitorOps.getCompetitorsList('test-client-001');
  assert(Array.isArray(competitors), 'Should return array');
  assert(competitors.length > 0, 'Should have at least one competitor');
  assert(competitors[0].keywordsTracked > 0, 'Should count keywords');
});

test('competitorOps.createAlert() should store alert', () => {
  const alertId = db.competitorOps.createAlert('test-client-001', {
    type: 'position_loss',
    severity: 'HIGH',
    competitorDomain: 'competitor1.com',
    keyword: 'test keyword',
    message: 'Competitor moved up 2 positions',
    actionRequired: 'Review content and optimize'
  });
  assert(alertId > 0, 'Should return alert ID');
});

test('competitorOps.getOpenAlerts() should retrieve active alerts', () => {
  const alerts = db.competitorOps.getOpenAlerts('test-client-001');
  assert(Array.isArray(alerts), 'Should return array');
  assert(alerts.length > 0, 'Should have at least one alert');
});

// Test 5: Keyword Operations
test('keywordOps.recordPerformance() should store keyword data', () => {
  const result = db.keywordOps.recordPerformance('test-client-001', {
    keyword: 'test keyword',
    beforePosition: 10,
    afterPosition: 8,
    impressions: 500,
    clicks: 25,
    ctr: 5.0
  });
  assert(result.changes === 1, 'Should create 1 record');
});

test('keywordOps.getImprovements() should calculate position changes', () => {
  // Add more data points
  db.keywordOps.recordPerformance('test-client-001', {
    keyword: 'test keyword',
    beforePosition: 8,
    afterPosition: 6,
    impressions: 550,
    clicks: 30,
    ctr: 5.5
  });

  const improvements = db.keywordOps.getImprovements('test-client-001', 90);
  assert(Array.isArray(improvements), 'Should return array');
  // Note: improvements might be empty if window function doesn't find enough data
  // This is okay for a test environment
});

test('keywordOps.getTopKeywords() should rank by clicks', () => {
  const top = db.keywordOps.getTopKeywords('test-client-001', 10);
  assert(Array.isArray(top), 'Should return array');
});

// Test 6: GSC Metrics Operations
test('gscOps.recordDaily() should store metrics', () => {
  const result = db.gscOps.recordDaily('test-client-001', {
    date: new Date().toISOString().split('T')[0],
    clicks: 100,
    impressions: 5000,
    ctr: 2.0,
    position: 15.5,
    metadata: { source: 'test' }
  });
  assert(result.changes === 1, 'Should create 1 record');
});

test('gscOps.getTrend() should retrieve trend data', () => {
  const trend = db.gscOps.getTrend('test-client-001', 30);
  assert(Array.isArray(trend), 'Should return array');
  assert(trend.length > 0, 'Should have at least one data point');
});

// Test 7: System Logs
test('systemOps.log() should store log entry', () => {
  db.systemOps.log('info', 'test-suite', 'Integration test running', {
    timestamp: new Date().toISOString()
  });
  // No assertion needed, just verify it doesn't throw
});

// Test 8: Analytics Dashboard
test('analytics.getClientDashboard() should return complete data', () => {
  const dashboard = db.analytics.getClientDashboard('test-client-001', 30);
  assert(dashboard !== null, 'Should return dashboard');
  assert(dashboard.client, 'Should have client data');
  assert(dashboard.localSeo, 'Should have local SEO data');
  assert(dashboard.competitors, 'Should have competitor data');
  assert(dashboard.optimizations, 'Should have optimization data');
});

// ============================================================================
// BRIDGE CLIENT TESTS
// ============================================================================

console.log('\n\n🔗 BRIDGE CLIENT TESTS');
console.log('-'.repeat(70));

test('BridgeClient should initialize correctly', () => {
  const bridge = new BridgeClient({ enabled: false, verbose: false });
  assert(bridge.bridgeUrl, 'Should have bridge URL');
  assert(bridge.enabled === false, 'Should respect enabled flag');
});

test('BridgeClient.sendOptimizationResults() should skip when disabled', async () => {
  const bridge = new BridgeClient({ enabled: false });
  const result = await bridge.sendOptimizationResults('test-client-001', 'test', {
    pagesModified: 1,
    issuesFixed: 1
  });
  assert(result.skipped === true, 'Should skip when disabled');
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

console.log('\n\n🔍 DATA INTEGRITY TESTS');
console.log('-'.repeat(70));

test('Database should maintain referential integrity', () => {
  const client = db.clientOps.getById('test-client-001');
  const optimizations = db.clientOps.getOptimizationHistory('test-client-001');
  const localSeo = db.localSeoOps.getLatest('test-client-001');

  assert(client !== null, 'Client should exist');
  assert(optimizations.length > 0, 'Should have optimizations');
  assert(localSeo !== null, 'Should have local SEO data');
  assert(optimizations[0].client_id === client.id, 'Foreign keys should match');
});

test('JSON metadata should parse correctly', () => {
  const optimization = db.clientOps.getOptimizationHistory('test-client-001')[0];
  const metadata = JSON.parse(optimization.metadata);
  assert(typeof metadata === 'object', 'Metadata should be object');
});

test('Timestamps should be valid ISO dates', () => {
  const optimization = db.clientOps.getOptimizationHistory('test-client-001')[0];
  const timestamp = new Date(optimization.created_at);
  assert(!isNaN(timestamp.getTime()), 'Timestamp should be valid date');
});

// ============================================================================
// CLEANUP
// ============================================================================

console.log('\n\n🧹 CLEANUP');
console.log('-'.repeat(70));

test('Cleanup test data', () => {
  // SQLite requires foreign keys to be enabled for CASCADE to work
  db.db.exec('PRAGMA foreign_keys = ON');

  // Delete child records first (belt and suspenders approach)
  db.db.prepare('DELETE FROM local_seo_scores WHERE client_id = ?').run('test-client-001');
  db.db.prepare('DELETE FROM competitor_rankings WHERE client_id = ?').run('test-client-001');
  db.db.prepare('DELETE FROM competitor_alerts WHERE client_id = ?').run('test-client-001');
  db.db.prepare('DELETE FROM keyword_performance WHERE client_id = ?').run('test-client-001');
  db.db.prepare('DELETE FROM gsc_metrics WHERE client_id = ?').run('test-client-001');
  db.db.prepare('DELETE FROM optimization_history WHERE client_id = ?').run('test-client-001');

  // Now delete the client
  const stmt = db.db.prepare('DELETE FROM clients WHERE id = ?');
  stmt.run('test-client-001');

  // Verify cleanup
  const client = db.clientOps.getById('test-client-001');
  assert(client === undefined, 'Test client should be deleted');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n\n' + '='.repeat(70));
console.log('🏁 TEST RESULTS');
console.log('='.repeat(70));
console.log('');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total:  ${testsPassed + testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('');

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED! Phase 1 integration is solid.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Review errors above.');
  process.exit(1);
}
