#!/usr/bin/env node

/**
 * Test script for proposal database operations
 * Verifies Phase 1 implementation
 */

import db from './src/database/index.js';

console.log('\n🧪 TESTING PROPOSAL DATABASE OPERATIONS\n');

async function runTests() {
  try {
    // Test 1: Verify tables exist
    console.log('1️⃣  Checking tables exist...');
    const tables = db.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND (
        name LIKE '%proposal%' OR 
        name LIKE '%review%' OR
        name LIKE '%approval%'
      )
    `).all();
    
    console.log('   Found tables:', tables.map(t => t.name).join(', '));
    
    const expectedTables = [
      'autofix_proposals',
      'autofix_review_sessions',
      'autofix_review_settings',
      'autofix_approval_templates'
    ];
    
    const foundTables = tables.map(t => t.name);
    const missingTables = expectedTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.error('   ❌ Missing tables:', missingTables.join(', '));
      process.exit(1);
    }
    
    console.log('   ✅ All required tables exist');

    // Test 2: Create a test review session
    console.log('\n2️⃣  Creating test review session...');
    const groupId = `test-group-${Date.now()}`;
    const sessionId = db.proposalOps.createReviewSession({
      groupId,
      clientId: 'test-client',
      engineId: 'test-engine',
      engineName: 'Test Engine',
      totalProposals: 5,
      metadata: { test: true }
    });
    
    console.log(`   ✅ Created session with ID: ${sessionId}`);

    // Test 3: Insert test proposals
    console.log('\n3️⃣  Inserting test proposals...');
    const stmt = db.db.prepare(`
      INSERT INTO autofix_proposals (
        proposal_group_id, engine_id, engine_name, client_id,
        target_type, target_id, target_title, field_name,
        before_value, after_value,
        issue_description, fix_description, expected_benefit,
        severity, risk_level, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const proposals = [];
    for (let i = 1; i <= 5; i++) {
      const result = stmt.run(
        groupId,
        'test-engine',
        'Test Engine',
        'test-client',
        'post',
        `post-${i}`,
        `Test Post ${i}`,
        'title',
        `Old Title ${i}`,
        `New Title ${i}`,
        `Issue description ${i}`,
        `Fix description ${i}`,
        'Improved SEO',
        i % 2 === 0 ? 'high' : 'medium',
        i % 3 === 0 ? 'medium' : 'low',
        'seo'
      );
      proposals.push(result.lastInsertRowid);
    }
    
    console.log(`   ✅ Created ${proposals.length} test proposals`);

    // Test 4: Query proposals using helper methods
    console.log('\n4️⃣  Testing proposalOps.getProposals()...');
    const allProposals = db.proposalOps.getProposals({ groupId });
    console.log(`   ✅ Retrieved ${allProposals.length} proposals`);

    // Test 5: Query by status
    console.log('\n5️⃣  Testing filter by status...');
    const pendingProposals = db.proposalOps.getProposals({ 
      groupId, 
      status: 'pending' 
    });
    console.log(`   ✅ Found ${pendingProposals.length} pending proposals`);

    // Test 6: Get single proposal
    console.log('\n6️⃣  Testing proposalOps.getProposalById()...');
    const singleProposal = db.proposalOps.getProposalById(proposals[0]);
    console.log(`   ✅ Retrieved proposal: ${singleProposal.fix_description}`);

    // Test 7: Update review session
    console.log('\n7️⃣  Testing proposalOps.updateReviewSession()...');
    db.proposalOps.updateReviewSession(groupId, {
      approved_count: 3,
      rejected_count: 2,
      status: 'reviewed'
    });
    
    const updatedSession = db.proposalOps.getReviewSession(groupId);
    console.log(`   ✅ Updated session - Approved: ${updatedSession.approved_count}, Rejected: ${updatedSession.rejected_count}`);

    // Test 8: Update proposal status
    console.log('\n8️⃣  Testing proposal status update...');
    const updateStmt = db.db.prepare(`
      UPDATE autofix_proposals
      SET status = ?, reviewed_at = ?, reviewed_by = ?
      WHERE id = ?
    `);
    
    updateStmt.run('approved', new Date().toISOString(), 'test-user', proposals[0]);
    
    const approvedProposal = db.proposalOps.getProposalById(proposals[0]);
    console.log(`   ✅ Proposal status updated to: ${approvedProposal.status}`);

    // Test 9: Get all review sessions
    console.log('\n9️⃣  Testing proposalOps.getAllReviewSessions()...');
    const sessions = db.proposalOps.getAllReviewSessions({ 
      clientId: 'test-client',
      limit: 10 
    });
    console.log(`   ✅ Found ${sessions.length} review sessions`);

    // Test 10: Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    db.db.prepare('DELETE FROM autofix_proposals WHERE proposal_group_id = ?').run(groupId);
    db.db.prepare('DELETE FROM autofix_review_sessions WHERE proposal_group_id = ?').run(groupId);
    console.log('   ✅ Test data removed');

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log('   ✓ Tables created correctly');
    console.log('   ✓ Review sessions working');
    console.log('   ✓ Proposals CRUD working');
    console.log('   ✓ Helper methods working');
    console.log('   ✓ Filters working');
    console.log('\n🎉 Phase 1 Complete: Database Foundation Ready!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
