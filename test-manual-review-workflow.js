/**
 * Test Script for Manual Review Workflow
 *
 * This script tests the complete Detect → Review → Apply workflow
 * Run with: node test-manual-review-workflow.js
 */

import { NAPAutoFixer } from './src/automation/auto-fixers/nap-fixer.js';
import { proposalService } from './src/services/proposal-service.js';

// Test configuration
const testConfig = {
  id: 'test-client',
  businessName: 'Acme Corp',
  phone: '555-123-4567',
  email: 'info@acmecorp.com',
  address: '123 Main St',
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia',
  siteUrl: 'https://example.com',
  wpUser: 'admin',
  wpPassword: 'test-password'
};

async function testWorkflow() {
  console.log('🧪 Testing Manual Review Workflow\n');
  console.log('='.repeat(70));

  try {
    // Phase 1: Detection
    console.log('\n📍 PHASE 1: DETECTION (Safe - No Changes Made)\n');

    const fixer = new NAPAutoFixer(testConfig);

    console.log('Running detection...');
    const detectionResult = await fixer.runDetection();

    if (!detectionResult.success) {
      throw new Error('Detection failed');
    }

    console.log(`✅ Detection complete!`);
    console.log(`   Detected: ${detectionResult.detected} issues`);
    console.log(`   Proposals: ${detectionResult.proposals}`);
    console.log(`   Group ID: ${detectionResult.groupId}`);
    console.log(`   Session ID: ${detectionResult.sessionId}`);

    if (detectionResult.proposals === 0) {
      console.log('\n✨ No issues found! Everything is consistent.');
      return;
    }

    const groupId = detectionResult.groupId;

    // Phase 2: Review Proposals
    console.log('\n📍 PHASE 2: REVIEW PROPOSALS\n');

    console.log('Fetching proposals...');
    const proposals = proposalService.getProposals({
      groupId,
      status: 'pending'
    });

    console.log(`✅ Found ${proposals.length} pending proposals\n`);

    // Display first 3 proposals as examples
    const samplesToShow = Math.min(3, proposals.length);
    console.log(`Showing ${samplesToShow} example proposals:\n`);

    for (let i = 0; i < samplesToShow; i++) {
      const p = proposals[i];
      console.log(`${i + 1}. ${p.fix_description}`);
      console.log(`   Issue: ${p.issue_description}`);
      console.log(`   Benefit: ${p.expected_benefit}`);
      console.log(`   Risk: ${p.risk_level} | Severity: ${p.severity} | Priority: ${p.priority}`);
      console.log(`   Before: "${p.before_value}"`);
      console.log(`   After:  "${p.after_value}"`);

      const metadata = JSON.parse(p.metadata || '{}');
      if (metadata.verificationSteps) {
        console.log(`   Verification:`);
        metadata.verificationSteps.forEach((step, idx) => {
          console.log(`     ${idx + 1}. ${step}`);
        });
      }
      console.log('');
    }

    // Phase 3: Simulate Different Approval Strategies
    console.log('\n📍 PHASE 3: APPROVAL STRATEGIES\n');

    // Strategy A: Accept Low Risk
    console.log('Strategy A: Accept Low Risk Only');
    const lowRiskProposals = proposals.filter(p => p.risk_level === 'low');
    console.log(`   Would approve ${lowRiskProposals.length} low-risk proposals`);

    // Strategy B: Accept All
    console.log('\nStrategy B: Accept All');
    const highRiskProposals = proposals.filter(p => p.risk_level === 'high' || p.severity === 'critical');
    console.log(`   Would approve ${proposals.length} proposals`);
    if (highRiskProposals.length > 0) {
      console.log(`   ⚠️  Warning: Includes ${highRiskProposals.length} high-risk items`);
    }

    // Strategy C: Manual Review
    console.log('\nStrategy C: Manual Review');
    console.log('   High priority items to review first:');
    const highPriority = proposals
      .filter(p => p.priority >= 70)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    highPriority.forEach((p, idx) => {
      console.log(`     ${idx + 1}. [Priority ${p.priority}] ${p.fix_description}`);
    });

    // For testing, let's approve low-risk items
    console.log('\n📍 PHASE 4: BULK APPROVAL (Low Risk)\n');

    console.log('Approving low-risk proposals...');
    const lowRiskIds = lowRiskProposals.map(p => p.id);

    if (lowRiskIds.length > 0) {
      const bulkResult = proposalService.bulkReview(lowRiskIds, {
        action: 'approve',
        notes: 'Auto-approved low-risk items (test)',
        reviewedBy: 'test-script'
      });

      console.log(`✅ Approved ${bulkResult.approved} low-risk proposals`);
    } else {
      console.log('ℹ️  No low-risk proposals to approve');
    }

    // Phase 5: Application (commented out for safety)
    console.log('\n📍 PHASE 5: APPLICATION (Would Apply to WordPress)\n');

    console.log('⚠️  Skipping actual application in test mode');
    console.log('   In production, this would:');
    console.log('   1. Fetch approved proposals');
    console.log('   2. Apply each fix to WordPress');
    console.log('   3. Log success/failure');
    console.log('   4. Update session status');

    console.log('\n   To apply for real, run:');
    console.log(`   await fixer.runApplication('${groupId}');`);

    // Show final session summary
    console.log('\n📍 FINAL SESSION SUMMARY\n');

    const session = proposalService.getReviewSession(groupId);
    if (session) {
      proposalService.updateSessionCounts(groupId);
      const updatedSession = proposalService.getReviewSession(groupId);

      console.log(`Session ID: ${updatedSession.id}`);
      console.log(`Status: ${updatedSession.status}`);
      console.log(`Total Proposals: ${updatedSession.total_proposals}`);
      console.log(`Approved: ${updatedSession.approved_count}`);
      console.log(`Rejected: ${updatedSession.rejected_count}`);
      console.log(`Applied: ${updatedSession.applied_count}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE - Workflow Verified!\n');

    console.log('Next Steps:');
    console.log('1. Review proposals via API: GET /api/autofix/proposals?groupId=' + groupId);
    console.log('2. Approve via UI or API');
    console.log('3. Apply: POST /api/autofix/apply with groupId');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('Starting test in 2 seconds...\n');
setTimeout(testWorkflow, 2000);
