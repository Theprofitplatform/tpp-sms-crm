#!/usr/bin/env node

/**
 * Live Test: Complete Auto-Fix Manual Review Workflow
 * Tests detect → review → apply with MOCK data
 */

import { NAPAutoFixer } from './src/automation/auto-fixers/nap-fixer.js';
import proposalService from './src/services/proposal-service.js';
import db from './src/database/index.js';

console.log('\n🧪 LIVE WORKFLOW TEST\n');

async function test() {
  try {
    // Setup
    const config = {
      id: 'test-workflow',
      siteUrl: 'https://test.com',
      wpUser: 'admin',
      wpPassword: 'test',
      businessName: 'Test Business',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      phone: '+61 2 1234 5678',
      email: 'test@test.com'
    };

    const napFixer = new NAPAutoFixer(config);
    
    // Mock the detectInconsistencies method directly
    napFixer.detectInconsistencies = async () => {
      return {
        issues: [
          {
            field: 'phone',
            location: 'post:101:content',
            contentId: 101,
            contentType: 'post',
            contentField: 'content',
            contentTitle: 'About Us',
            contentUrl: 'https://test.com/about',
            found: '(02) 1234-5678',
            correct: '+61 2 1234 5678',
            severity: 'high'
          },
          {
            field: 'businessName',
            location: 'post:101:title',
            contentId: 101,
            contentType: 'post',
            contentField: 'title',
            contentTitle: 'About Us',
            contentUrl: 'https://test.com/about',
            found: 'test business',
            correct: 'Test Business',
            severity: 'medium'
          }
        ],
        scannedLocations: [],
        summary: {
          totalScanned: 1,
          totalIssues: 2,
          byField: { phone: 1, businessName: 1 }
        }
      };
    };

    napFixer.wpClient.getPost = async (id) => ({
      id,
      title: { rendered: 'About Us' },
      content: { rendered: '<p>Call (02) 1234-5678</p>' }
    });

    napFixer.wpClient.updatePost = async (id, updates) => ({ id, ...updates });

    console.log('✅ Setup complete\n');

    // STEP 1: Detection
    console.log('🔍 Running detection...');
    const result = await napFixer.runDetection();
    console.log(`✅ Found ${result.detected} issues`);
    console.log(`✅ Created ${result.proposals} proposals`);
    console.log(`✅ Group ID: ${result.groupId}\n`);

    if (result.proposals === 0) {
      console.log('⚠️  No proposals created\n');
      return;
    }

    // STEP 2: Check database
    console.log('📊 Checking database...');
    const proposals = proposalService.getProposalsByGroup(result.groupId);
    console.log(`✅ Found ${proposals.length} proposals\n`);

    proposals.forEach((p, i) => {
      console.log(`Proposal ${i + 1}:`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Field: ${p.field_name}`);
      console.log(`  Before: ${p.before_value?.substring(0, 30)}...`);
      console.log(`  After: ${p.after_value?.substring(0, 30)}...`);
      console.log(`  Status: ${p.status}`);
      console.log('');
    });

    // STEP 3: Review
    console.log('👍 Approving proposals...');
    proposals.forEach(p => {
      proposalService.reviewProposal(p.id, {
        action: 'approve',
        reviewedBy: 'test-user'
      });
    });
    console.log(`✅ Approved ${proposals.length} proposals\n`);

    // STEP 4: Apply
    console.log('🚀 Applying changes...');
    const applied = await napFixer.runApplication(result.groupId);
    console.log(`✅ Applied ${applied.succeeded} changes`);
    console.log(`❌ Failed ${applied.failed} changes\n`);

    // STEP 5: Verify
    console.log('📊 Final statistics...');
    const stats = proposalService.getStatistics(config.id);
    console.log(`  Approved: ${stats.approved || 0}`);
    console.log(`  Applied: ${stats.applied || 0}`);
    console.log(`  Approval rate: ${stats.approval_rate || 0}%\n`);

    // Cleanup
    db.db.prepare('DELETE FROM autofix_proposals WHERE client_id = ?').run(config.id);
    db.db.prepare('DELETE FROM autofix_review_sessions WHERE client_id = ?').run(config.id);
    console.log('✅ Cleanup complete\n');

    console.log('🎉 WORKFLOW TEST COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
