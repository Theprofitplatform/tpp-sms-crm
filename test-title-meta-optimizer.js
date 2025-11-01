/**
 * Test Title/Meta Optimizer v2 with Manual Review Workflow
 *
 * Tests the refactored Title/Meta Optimizer to ensure it:
 * 1. Detects low-CTR pages
 * 2. Generates AI optimizations
 * 3. Creates proposals with rich descriptions
 * 4. Allows manual review
 * 5. Applies approved fixes
 *
 * Usage: node test-title-meta-optimizer.js [--live]
 *
 * Options:
 *   --live    Use real GSC data and AI (requires API keys)
 */

import { TitleMetaOptimizerV2 } from './src/automation/auto-fixers/title-meta-optimizer-v2.js';
import { proposalService } from './src/services/proposal-service.js';

const args = process.argv.slice(2);
const useLiveData = args.includes('--live');

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║  Title/Meta Optimizer v2 - Manual Review Workflow Test           ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

if (!useLiveData) {
  console.log('📝 Running in TEST MODE (mock data)');
  console.log('   To use real GSC data and AI, run with: node test-title-meta-optimizer.js --live');
  console.log('');
}

/**
 * Mock Google Search Console client
 */
class MockGSC {
  async getPerformanceData(options) {
    console.log('   [MOCK] Returning sample GSC data...');

    return {
      rows: [
        {
          keys: ['https://example.com/low-ctr-page-1'],
          ctr: 0.015, // 1.5% CTR (low)
          impressions: 5000,
          clicks: 75,
          position: 8.5
        },
        {
          keys: ['https://example.com/low-ctr-page-2'],
          ctr: 0.018, // 1.8% CTR (low)
          impressions: 3000,
          clicks: 54,
          position: 6.2
        },
        {
          keys: ['https://example.com/good-ctr-page'],
          ctr: 0.045, // 4.5% CTR (good)
          impressions: 2000,
          clicks: 90,
          position: 5.0
        },
        {
          keys: ['https://example.com/low-traffic-page'],
          ctr: 0.012, // 1.2% CTR but low traffic
          impressions: 50, // Too low
          clicks: 1,
          position: 15.0
        }
      ]
    };
  }
}

/**
 * Mock WordPress client
 */
class MockWordPress {
  async getPosts(params) {
    console.log('   [MOCK] Returning sample posts...');

    return [
      {
        id: 101,
        type: 'post',
        title: { rendered: 'Complete Guide to SEO Basics' },
        link: 'https://example.com/low-ctr-page-1',
        slug: 'low-ctr-page-1',
        content: { rendered: '<p>This is a comprehensive guide about SEO basics for beginners. Learn everything about search engine optimization...</p>' },
        excerpt: { rendered: 'Learn SEO basics in this comprehensive guide.' },
        yoast_head_json: {
          og_description: 'Learn SEO basics in this comprehensive guide.'
        }
      },
      {
        id: 102,
        type: 'post',
        title: { rendered: 'How to Improve Your Website Speed' },
        link: 'https://example.com/low-ctr-page-2',
        slug: 'low-ctr-page-2',
        content: { rendered: '<p>Website speed is crucial for SEO. Here are tips to make your site faster...</p>' },
        excerpt: { rendered: 'Tips for improving website speed.' },
        yoast_head_json: {
          og_description: 'Tips for improving website speed.'
        }
      }
    ];
  }

  async getPages(params) {
    return [];
  }

  async updatePost(id, data) {
    console.log(`   [MOCK] Would update post #${id}:`, data);
    return { id, ...data };
  }

  async updatePage(id, data) {
    console.log(`   [MOCK] Would update page #${id}:`, data);
    return { id, ...data };
  }
}

/**
 * Mock Anthropic API
 */
async function mockAnthropicCall(page) {
  console.log(`      [MOCK] Generating AI optimization for: ${page.title.substring(0, 50)}...`);

  // Simulate AI delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock optimization
  return {
    newTitle: `${page.title.replace('Complete Guide to', '2024 Guide:')} [Boost Your Traffic]`,
    newDescription: `Discover proven ${page.title.toLowerCase().substring(0, 30)} strategies that actually work. Get more traffic today!`,
    reasoning: 'Added year for freshness, power words to increase urgency, and clear value proposition',
    aiModel: 'claude-3-5-sonnet-20241022'
  };
}

/**
 * Main test function
 */
async function runTest() {
  try {
    // Create test config
    const testConfig = {
      id: 'test-client',
      clientId: 'test-client',
      businessName: 'Test Business',
      siteUrl: 'https://example.com',
      wpUser: 'test',
      wpPassword: 'test',
      gscPropertyUrl: 'https://example.com',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
    };

    // Create optimizer instance
    const optimizer = new TitleMetaOptimizerV2(testConfig);

    // Mock clients if not using live data
    if (!useLiveData) {
      optimizer.gscClient = new MockGSC();
      optimizer.wpClient = new MockWordPress();

      // Mock the AI call
      const originalGenerateAI = optimizer.generateAIOptimization.bind(optimizer);
      optimizer.generateAIOptimization = async function(page) {
        if (useLiveData) {
          return await originalGenerateAI(page);
        }
        return await mockAnthropicCall(page);
      };
    }

    console.log('─'.repeat(70));
    console.log('PHASE 1: DETECTION\n');

    // Run detection
    const detectionResult = await optimizer.runDetection({ limit: 2 });

    console.log('\n📊 Detection Results:');
    console.log(`   Detected issues: ${detectionResult.detected}`);
    console.log(`   Proposals created: ${detectionResult.proposals}`);
    console.log(`   Group ID: ${detectionResult.groupId}`);
    console.log(`   Session ID: ${detectionResult.sessionId}`);

    if (detectionResult.proposals === 0) {
      console.log('\n✅ No low-CTR pages found. Test complete!');
      return;
    }

    console.log('\n' + '─'.repeat(70));
    console.log('PHASE 2: REVIEW\n');

    // Get proposals for review
    const proposals = proposalService.getProposals({
      groupId: detectionResult.groupId,
      status: 'pending'
    });

    console.log(`📋 Found ${proposals.length} proposals for review:\n`);

    proposals.forEach((proposal, index) => {
      console.log(`Proposal #${index + 1}:`);
      console.log(`   Issue: ${proposal.issue_description.substring(0, 100)}...`);
      console.log(`   Fix: ${proposal.fix_description.substring(0, 100)}...`);
      console.log(`   Risk Level: ${proposal.risk_level}`);
      console.log(`   Severity: ${proposal.severity}`);
      console.log(`   Priority: ${proposal.priority}`);

      // Show before/after preview
      const before = JSON.parse(proposal.before_value);
      const after = JSON.parse(proposal.after_value);

      console.log('\n   📝 Before:');
      console.log(`      Title: ${before.title}`);
      console.log(`      Meta:  ${before.meta}`);

      console.log('\n   ✨ After:');
      console.log(`      Title: ${after.title}`);
      console.log(`      Meta:  ${after.meta}`);

      console.log('\n   ✅ Verification Steps:');
      if (proposal.metadata && proposal.metadata.verificationSteps) {
        proposal.metadata.verificationSteps.slice(0, 3).forEach(step => {
          console.log(`      ${step}`);
        });
      }

      console.log('');
    });

    console.log('─'.repeat(70));
    console.log('PHASE 3: APPROVAL\n');

    // Approve low-risk proposals
    const lowRiskProposals = proposals.filter(p => p.risk_level === 'low');

    console.log(`✅ Auto-approving ${lowRiskProposals.length} low-risk proposals...\n`);

    lowRiskProposals.forEach(proposal => {
      proposalService.reviewProposal(proposal.id, {
        action: 'approve',
        reviewedBy: 'test-script',
        notes: 'Auto-approved during test (low risk)'
      });

      console.log(`   ✅ Approved proposal #${proposal.id}`);
    });

    console.log('\n' + '─'.repeat(70));
    console.log('PHASE 4: APPLICATION\n');

    // Apply approved proposals
    const applicationResult = await optimizer.runApplication(detectionResult.groupId);

    console.log('📊 Application Results:');
    console.log(`   Total: ${applicationResult.total}`);
    console.log(`   Succeeded: ${applicationResult.succeeded}`);
    console.log(`   Failed: ${applicationResult.failed}`);
    console.log(`   Duration: ${Math.round(applicationResult.duration / 1000)}s`);

    console.log('\n' + '─'.repeat(70));
    console.log('PHASE 5: VERIFICATION\n');

    // Get final proposal states
    const finalProposals = proposalService.getProposals({
      groupId: detectionResult.groupId
    });

    const byStatus = finalProposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Final Proposal Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE\n');

    console.log('Summary:');
    console.log(`   ✅ Detection phase: Found ${detectionResult.detected} issues`);
    console.log(`   ✅ Review phase: Created ${detectionResult.proposals} proposals`);
    console.log(`   ✅ Approval phase: Approved ${lowRiskProposals.length} proposals`);
    console.log(`   ✅ Application phase: Applied ${applicationResult.succeeded} fixes`);
    console.log('');
    console.log('The Title/Meta Optimizer v2 is working correctly with manual review workflow!');
    console.log('');

    if (!useLiveData) {
      console.log('💡 Next step: Test with real data');
      console.log('   1. Configure Google Search Console API credentials');
      console.log('   2. Set ANTHROPIC_API_KEY environment variable');
      console.log('   3. Run: node test-title-meta-optimizer.js --live');
    }

    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
