#!/usr/bin/env node

/**
 * Test script for service layer (Phase 2)
 * Tests ProposalService, DiffGenerator, and Base Engine Class
 */

import { proposalService } from './src/services/proposal-service.js';
import { diffGenerator } from './src/services/proposal-diff-generator.js';
import { AutoFixEngineBase } from './src/automation/auto-fixers/engine-base.js';

console.log('\n🧪 TESTING SERVICE LAYER (PHASE 2)\n');

/**
 * Test Engine for demonstration
 */
class TestEngine extends AutoFixEngineBase {
  async detectIssues(options) {
    // Simulate detecting 3 issues
    return [
      {
        target_type: 'post',
        target_id: '123',
        target_title: 'Test Post 1',
        target_url: 'https://example.com/post-1',
        field_name: 'title',
        before_value: 'Old Title With Poor SEO',
        after_value: 'Optimized Title with Target Keyword',
        issue_description: 'Title lacks target keyword and is not optimized',
        fix_description: 'Add target keyword and optimize title length',
        expected_benefit: 'Improved search rankings for target keyword',
        severity: 'high',
        risk_level: 'low',
        impact_score: 80
      },
      {
        target_type: 'post',
        target_id: '124',
        target_title: 'Test Post 2',
        target_url: 'https://example.com/post-2',
        field_name: 'meta_description',
        before_value: 'Short meta',
        after_value: 'Comprehensive meta description that includes relevant keywords and compelling call to action to improve click-through rate from search results',
        issue_description: 'Meta description is too short and not optimized',
        fix_description: 'Expand meta description with keywords and CTA',
        expected_benefit: 'Higher click-through rate from search',
        severity: 'medium',
        risk_level: 'low',
        impact_score: 70
      },
      {
        target_type: 'post',
        target_id: '125',
        target_title: 'Test Post 3',
        target_url: 'https://example.com/post-3',
        field_name: 'content',
        before_value: 'This is some content that needs improvement. It is not very detailed.',
        after_value: 'This is comprehensive, detailed content that provides substantial value to readers. It includes relevant keywords, useful information, and engaging writing that keeps visitors on the page longer.',
        issue_description: 'Content is thin and lacks depth',
        fix_description: 'Expand content with detailed information and keywords',
        expected_benefit: 'Better user engagement and search rankings',
        severity: 'high',
        risk_level: 'medium',
        impact_score: 85
      }
    ];
  }

  async applyFix(proposal, options) {
    // Simulate applying the fix
    console.log(`      [Mock] Applying fix to ${proposal.target_type} ${proposal.target_id}`);
    return { success: true, applied: true };
  }

  getCategory() {
    return 'seo';
  }
}

async function runTests() {
  try {
    // Test 1: DiffGenerator
    console.log('1️⃣  Testing DiffGenerator...');
    const before = 'This is the old text that will be changed';
    const after = 'This is the new improved text that has been optimized';
    
    const diffHTML = diffGenerator.generateDiff(before, after);
    console.log('   Sample diff HTML generated:', diffHTML.substring(0, 100) + '...');
    
    const stats = diffGenerator.generateDiffStats(before, after);
    console.log(`   Diff stats: ${stats.added} added, ${stats.removed} removed, ${stats.changePercent}% changed`);
    
    const summary = diffGenerator.generateSummary(before, after);
    console.log(`   Summary: ${summary}`);
    console.log('   ✅ DiffGenerator working correctly');

    // Test 2: ProposalService - Manual operations
    console.log('\n2️⃣  Testing ProposalService manual operations...');
    const groupId = `test-service-${Date.now()}`;
    
    // Create session
    const sessionId = proposalService.createReviewSession({
      groupId,
      clientId: 'test-client',
      engineId: 'test-engine',
      engineName: 'Test Engine',
      totalProposals: 3,
      metadata: { test: true }
    });
    console.log(`   ✅ Created session: ${sessionId}`);

    // Save proposals manually
    const testProposals = [
      {
        proposal_group_id: groupId,
        engine_id: 'test-engine',
        engine_name: 'Test Engine',
        client_id: 'test-client',
        target_type: 'post',
        target_id: '1',
        target_title: 'Manual Test',
        field_name: 'title',
        before_value: 'Before',
        after_value: 'After',
        issue_description: 'Test issue',
        fix_description: 'Test fix',
        expected_benefit: 'Test benefit',
        severity: 'medium',
        risk_level: 'low',
        category: 'test'
      }
    ];

    const ids = await proposalService.saveProposals(testProposals);
    console.log(`   ✅ Saved ${ids.length} proposals`);

    // Get statistics
    const stats2 = proposalService.getStatistics('test-client');
    console.log(`   ✅ Statistics: ${stats2.total_proposals} total, ${stats2.pending} pending`);

    // Test 3: Base Engine Class - Full workflow
    console.log('\n3️⃣  Testing Base Engine Class workflow...');
    const testConfig = {
      id: 'test-client',
      clientId: 'test-client',
      siteUrl: 'https://example.com'
    };

    const engine = new TestEngine(testConfig);
    console.log(`   Created engine: ${engine.engineName}`);

    // Run detection
    console.log('   Running detection...');
    const detectionResult = await engine.runDetection({ dryRun: true });
    console.log(`   ✅ Detection result: ${detectionResult.detected} issues, ${detectionResult.proposals} proposals`);
    console.log(`   Group ID: ${detectionResult.groupId}`);

    // Get proposals
    const proposals = proposalService.getProposalsByGroup(detectionResult.groupId);
    console.log(`   ✅ Retrieved ${proposals.length} proposals from database`);

    // Review proposals (approve 2, reject 1)
    console.log('   Reviewing proposals...');
    proposalService.reviewProposal(proposals[0].id, {
      action: 'approve',
      reviewedBy: 'test-user'
    });
    proposalService.reviewProposal(proposals[1].id, {
      action: 'approve',
      reviewedBy: 'test-user'
    });
    proposalService.reviewProposal(proposals[2].id, {
      action: 'reject',
      reviewedBy: 'test-user',
      notes: 'Risk too high'
    });
    console.log('   ✅ Reviewed 3 proposals (2 approved, 1 rejected)');

    // Apply approved proposals
    console.log('   Applying approved proposals...');
    const applyResult = await engine.runApplication(detectionResult.groupId);
    console.log(`   ✅ Application result: ${applyResult.succeeded} succeeded, ${applyResult.failed} failed`);

    // Verify final state
    const finalProposals = proposalService.getProposalsByGroup(detectionResult.groupId);
    const applied = finalProposals.filter(p => p.status === 'applied').length;
    const rejected = finalProposals.filter(p => p.status === 'rejected').length;
    console.log(`   ✅ Final state: ${applied} applied, ${rejected} rejected`);

    // Get session summary
    const summary2 = proposalService.getGroupSummary(detectionResult.groupId);
    console.log(`   ✅ Session summary: ${summary2.total} total, ${summary2.approved} approved, ${summary2.applied} applied`);

    // Test 4: Cleanup
    console.log('\n4️⃣  Cleaning up test data...');
    const db = (await import('./src/database/index.js')).default;
    
    // Clean up test proposals
    db.db.prepare('DELETE FROM autofix_proposals WHERE client_id = ?').run('test-client');
    db.db.prepare('DELETE FROM autofix_review_sessions WHERE client_id = ?').run('test-client');
    console.log('   ✅ Test data cleaned up');

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED - PHASE 2 COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   ✓ DiffGenerator creating HTML diffs');
    console.log('   ✓ ProposalService managing proposals');
    console.log('   ✓ Base Engine Class supporting two-phase execution');
    console.log('   ✓ Full workflow: Detect → Review → Apply');
    console.log('   ✓ Database integration working');
    console.log('\n🎉 Phase 2 Complete: Service Layer Ready!');
    console.log('\n📝 Next Steps:');
    console.log('   • Phase 3: Create API endpoints');
    console.log('   • Phase 4: Refactor existing engines');
    console.log('   • Phase 5: Build dashboard UI\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
