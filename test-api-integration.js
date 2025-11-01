/**
 * Comprehensive API Integration Test Suite
 *
 * Tests all 12 Manual Review API endpoints
 *
 * Usage:
 *   node test-api-integration.js
 *   node test-api-integration.js --endpoint=detect
 *   node test-api-integration.js --verbose
 *
 * Tests:
 * 1. GET /api/autofix/proposals - List proposals
 * 2. GET /api/autofix/proposals/:id - Get single proposal
 * 3. GET /api/autofix/proposals/group/:groupId - Get group proposals
 * 4. POST /api/autofix/proposals/:id/review - Review single proposal
 * 5. POST /api/autofix/proposals/bulk-review - Bulk review
 * 6. POST /api/autofix/proposals/auto-approve - Auto approve by criteria
 * 7. POST /api/autofix/proposals/accept-all - Accept all (with safety)
 * 8. POST /api/autofix/proposals/accept-low-risk - Accept low risk only
 * 9. POST /api/autofix/detect - Run detection
 * 10. POST /api/autofix/apply - Apply approved proposals
 * 11. GET /api/autofix/statistics - Get statistics
 * 12. POST /api/autofix/expire-old - Expire old proposals
 */

import axios from 'axios';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_CLIENT_ID = process.env.TEST_CLIENT_ID || 'test-client';
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_ENDPOINT = process.argv.find(arg => arg.startsWith('--endpoint='))?.split('=')[1];

// Test state
const testState = {
  groupId: null,
  proposalId: null,
  passed: 0,
  failed: 0,
  skipped: 0,
  results: []
};

/**
 * Logger
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'
  };

  const prefix = {
    info: '   ℹ️ ',
    success: '   ✅',
    error: '   ❌',
    warn: '   ⚠️ '
  };

  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

/**
 * Test runner
 */
async function runTest(name, testFn, dependencies = []) {
  // Check if specific endpoint requested
  if (SPECIFIC_ENDPOINT && !name.toLowerCase().includes(SPECIFIC_ENDPOINT.toLowerCase())) {
    testState.skipped++;
    return;
  }

  // Check dependencies
  for (const dep of dependencies) {
    if (!testState[dep]) {
      log(`Skipped: ${name} (missing dependency: ${dep})`, 'warn');
      testState.skipped++;
      return;
    }
  }

  console.log(`\n🧪 Testing: ${name}`);

  try {
    const result = await testFn();

    if (result.success) {
      log(`PASS: ${name}`, 'success');
      testState.passed++;
      testState.results.push({ name, status: 'pass', result });
    } else {
      log(`FAIL: ${name} - ${result.error || 'Unknown error'}`, 'error');
      testState.failed++;
      testState.results.push({ name, status: 'fail', error: result.error });
    }

    if (VERBOSE && result.data) {
      console.log('   Response:', JSON.stringify(result.data, null, 2));
    }

    return result;
  } catch (error) {
    log(`FAIL: ${name} - ${error.message}`, 'error');
    testState.failed++;
    testState.results.push({ name, status: 'fail', error: error.message });

    if (VERBOSE) {
      console.error('   Error details:', error);
    }
  }
}

/**
 * API Helper
 */
async function apiCall(method, path, data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' }
    };

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);

    if (response.status !== expectedStatus) {
      return {
        success: false,
        error: `Expected status ${expectedStatus}, got ${response.status}`
      };
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test Suite
 */

// Test 1: Run Detection
async function testDetect() {
  log('Running NAP Fixer detection...', 'info');

  const result = await apiCall('POST', '/api/autofix/detect', {
    engineId: 'nap-fixer',
    clientId: TEST_CLIENT_ID,
    options: { limit: 5 }
  });

  if (result.success && result.data?.result?.groupId) {
    testState.groupId = result.data.result.groupId;
    log(`Group ID: ${testState.groupId}`, 'info');
  }

  return result;
}

// Test 2: Get Proposals (List)
async function testGetProposals() {
  const result = await apiCall('GET', '/api/autofix/proposals', {
    status: 'pending',
    limit: 10
  });

  if (result.success && result.data?.proposals?.length > 0) {
    testState.proposalId = result.data.proposals[0].id;
    log(`Found ${result.data.proposals.length} proposals`, 'info');
  }

  return result;
}

// Test 3: Get Single Proposal
async function testGetSingleProposal() {
  if (!testState.proposalId) {
    return { success: false, error: 'No proposal ID available' };
  }

  return await apiCall('GET', `/api/autofix/proposals/${testState.proposalId}`);
}

// Test 4: Get Group Proposals
async function testGetGroupProposals() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  const result = await apiCall('GET', `/api/autofix/proposals/group/${testState.groupId}`);

  if (result.success && result.data?.summary) {
    log(`Group summary: ${JSON.stringify(result.data.summary)}`, 'info');
  }

  return result;
}

// Test 5: Review Single Proposal
async function testReviewProposal() {
  if (!testState.proposalId) {
    return { success: false, error: 'No proposal ID available' };
  }

  return await apiCall('POST', `/api/autofix/proposals/${testState.proposalId}/review`, {
    action: 'approve',
    notes: 'Approved by integration test',
    reviewedBy: 'test-suite'
  });
}

// Test 6: Bulk Review
async function testBulkReview() {
  // Get pending proposals
  const proposals = await apiCall('GET', '/api/autofix/proposals', {
    status: 'pending',
    limit: 3
  });

  if (!proposals.success || proposals.data?.proposals?.length === 0) {
    return { success: false, error: 'No proposals to bulk review' };
  }

  const proposalIds = proposals.data.proposals.slice(0, 2).map(p => p.id);

  return await apiCall('POST', '/api/autofix/proposals/bulk-review', {
    proposalIds,
    action: 'approve',
    notes: 'Bulk approved by test',
    reviewedBy: 'test-suite'
  });
}

// Test 7: Accept Low Risk
async function testAcceptLowRisk() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  const result = await apiCall('POST', '/api/autofix/proposals/accept-low-risk', {
    groupId: testState.groupId,
    maxRiskLevel: 'low',
    reviewedBy: 'test-suite'
  });

  if (result.success && result.data) {
    log(`Approved: ${result.data.approved}, Skipped: ${result.data.skipped}`, 'info');
  }

  return result;
}

// Test 8: Accept All (without confirmation)
async function testAcceptAllWithoutConfirm() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  const result = await apiCall('POST', '/api/autofix/proposals/accept-all', {
    groupId: testState.groupId,
    confirmRisky: false,
    reviewedBy: 'test-suite'
  });

  // Should require confirmation if high-risk present
  if (result.success && result.data?.requiresConfirmation) {
    log('Correctly required confirmation for high-risk proposals', 'info');
    return { success: true, data: result.data };
  }

  return result;
}

// Test 9: Accept All (with confirmation)
async function testAcceptAllWithConfirm() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  const result = await apiCall('POST', '/api/autofix/proposals/accept-all', {
    groupId: testState.groupId,
    confirmRisky: true,
    reviewedBy: 'test-suite'
  });

  if (result.success && result.data) {
    log(`Approved: ${result.data.approved} (including ${result.data.highRisk} high-risk)`, 'info');
  }

  return result;
}

// Test 10: Auto Approve with Criteria
async function testAutoApprove() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  const result = await apiCall('POST', '/api/autofix/proposals/auto-approve', {
    groupId: testState.groupId,
    criteria: {
      maxRiskLevel: 'low',
      minImpactScore: 50
    }
  });

  if (result.success && result.data) {
    log(`Auto-approved: ${JSON.stringify(result.data)}`, 'info');
  }

  return result;
}

// Test 11: Apply Proposals
async function testApply() {
  if (!testState.groupId) {
    return { success: false, error: 'No group ID available' };
  }

  // Note: This test might fail if WordPress credentials are not configured
  // or if there are no approved proposals
  const result = await apiCall('POST', '/api/autofix/apply', {
    groupId: testState.groupId,
    engineId: 'nap-fixer',
    clientId: TEST_CLIENT_ID,
    options: { dryRun: true } // Use dry run for safety
  });

  // Accept both success and certain expected errors
  if (!result.success && result.error?.includes('No approved proposals')) {
    log('No approved proposals to apply (expected)', 'info');
    return { success: true, data: { message: 'No proposals to apply' } };
  }

  return result;
}

// Test 12: Get Statistics
async function testGetStatistics() {
  const result = await apiCall('GET', '/api/autofix/statistics', {
    clientId: TEST_CLIENT_ID
  });

  if (result.success && result.data?.statistics) {
    log(`Statistics: ${JSON.stringify(result.data.statistics)}`, 'info');
  }

  return result;
}

// Test 13: Expire Old Proposals
async function testExpireOld() {
  const result = await apiCall('POST', '/api/autofix/expire-old');

  if (result.success && result.data?.result) {
    log(`Expired: ${result.data.result.expired || 0} proposals`, 'info');
  }

  return result;
}

// Test 14: Get Sessions
async function testGetSessions() {
  const result = await apiCall('GET', '/api/autofix/sessions', {
    clientId: TEST_CLIENT_ID,
    limit: 10
  });

  if (result.success && result.data?.sessions) {
    log(`Found ${result.data.sessions.length || 0} sessions`, 'info');
  }

  return result;
}

// Test 15: Get Client Config
async function testGetConfig() {
  const result = await apiCall('GET', `/api/autofix/config/${TEST_CLIENT_ID}`);

  if (result.success && result.data?.config) {
    log('Config retrieved successfully', 'info');
  }

  return result;
}

// Test 16: Save Client Config
async function testSaveConfig() {
  const testConfig = {
    businessName: 'Test Business',
    phone: '+1234567890',
    email: 'test@example.com',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    country: 'Test Country',
    phoneFormat: 'international'
  };

  return await apiCall('POST', `/api/autofix/config/${TEST_CLIENT_ID}`, {
    config: testConfig
  });
}

// Test 17: Test Config
async function testTestConfig() {
  const testConfig = {
    businessName: 'Test Business',
    phone: '+1234567890'
  };

  return await apiCall('POST', `/api/autofix/config/${TEST_CLIENT_ID}/test`, {
    config: testConfig
  });
}

/**
 * Main Test Runner
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('   📋 MANUAL REVIEW API INTEGRATION TEST SUITE');
  console.log('='.repeat(80));
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   Test Client: ${TEST_CLIENT_ID}`);
  console.log(`   Verbose: ${VERBOSE}`);
  if (SPECIFIC_ENDPOINT) {
    console.log(`   Testing: ${SPECIFIC_ENDPOINT} only`);
  }
  console.log('='.repeat(80));

  // Check API availability
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    log('API server is reachable', 'success');
  } catch (error) {
    log('API server is not reachable - tests will likely fail', 'error');
    log(`Make sure the server is running on ${API_BASE_URL}`, 'warn');
  }

  console.log('\n📦 Test Group 1: Configuration Management');
  await runTest('Get Client Config', testGetConfig);
  await runTest('Save Client Config', testSaveConfig);
  await runTest('Test Config Preview', testTestConfig);

  console.log('\n📦 Test Group 2: Detection & Proposal Creation');
  await runTest('Run Detection', testDetect);
  await runTest('Get Proposals List', testGetProposals, ['groupId']);
  await runTest('Get Single Proposal', testGetSingleProposal, ['proposalId']);
  await runTest('Get Group Proposals', testGetGroupProposals, ['groupId']);

  console.log('\n📦 Test Group 3: Review Workflow');
  await runTest('Review Single Proposal', testReviewProposal, ['proposalId']);
  await runTest('Bulk Review Proposals', testBulkReview);
  await runTest('Accept Low Risk Only', testAcceptLowRisk, ['groupId']);
  await runTest('Accept All (without confirm)', testAcceptAllWithoutConfirm, ['groupId']);
  await runTest('Accept All (with confirm)', testAcceptAllWithConfirm, ['groupId']);
  await runTest('Auto Approve by Criteria', testAutoApprove, ['groupId']);

  console.log('\n📦 Test Group 4: Application & Stats');
  await runTest('Apply Approved Proposals', testApply, ['groupId']);
  await runTest('Get Statistics', testGetStatistics);
  await runTest('Get Review Sessions', testGetSessions);
  await runTest('Expire Old Proposals', testExpireOld);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('   📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`   ✅ Passed: ${testState.passed}`);
  console.log(`   ❌ Failed: ${testState.failed}`);
  console.log(`   ⚠️  Skipped: ${testState.skipped}`);
  console.log(`   📈 Total: ${testState.passed + testState.failed + testState.skipped}`);
  console.log(`   📊 Success Rate: ${Math.round((testState.passed / (testState.passed + testState.failed)) * 100)}%`);
  console.log('='.repeat(80));

  if (testState.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testState.results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(testState.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
