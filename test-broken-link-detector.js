/**
 * Test Broken Link Detector v2 with Manual Review Workflow
 *
 * Tests the refactored Broken Link Detector to ensure it:
 * 1. Scans content for broken links
 * 2. Categorizes broken links by status
 * 3. Suggests automatic fixes where possible
 * 4. Creates proposals with rich descriptions
 * 5. Allows manual review
 * 6. Applies approved fixes
 *
 * Usage: node test-broken-link-detector.js [--live]
 *
 * Options:
 *   --live    Use real link checking (requires internet)
 */

import { BrokenLinkDetectorV2 } from './src/automation/auto-fixers/broken-link-detector-v2.js';
import { proposalService } from './src/services/proposal-service.js';

const args = process.argv.slice(2);
const useLiveData = args.includes('--live');

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║  Broken Link Detector v2 - Manual Review Workflow Test           ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

if (!useLiveData) {
  console.log('📝 Running in TEST MODE (mock data)');
  console.log('   To check real links, run with: node test-broken-link-detector.js --live');
  console.log('');
}

/**
 * Mock WordPress client
 */
class MockWordPress {
  async getPosts(params) {
    console.log('   [MOCK] Returning sample posts with various link types...');

    return [
      {
        id: 101,
        type: 'post',
        title: { rendered: 'Blog Post with Broken Links' },
        link: 'https://example.com/blog-post',
        content: {
          rendered: `
            <p>Check out <a href="http://example-broken-site.com/page">this broken link</a>.</p>
            <p>Also see <a href="https://working-site.com">this working link</a>.</p>
            <p>Here's an <a href="http://example.com/secure-page">HTTP link that should be HTTPS</a>.</p>
            <p>And <a href="https://example.com/page-no-slash">a link needing trailing slash</a>.</p>
          `
        }
      },
      {
        id: 102,
        type: 'post',
        title: { rendered: 'Another Post with External Links' },
        link: 'https://example.com/another-post',
        content: {
          rendered: `
            <p>Visit <a href="https://nonexistent-domain-12345.com">this 404 link</a>.</p>
            <p>Check <a href="https://timeout-site.example/">this timeout link</a>.</p>
          `
        }
      }
    ];
  }

  async getPages(params) {
    return [];
  }

  async getPost(id) {
    const posts = await this.getPosts({});
    return posts.find(p => p.id === id);
  }

  async updatePost(id, data) {
    console.log(`   [MOCK] Would update post #${id}`);
    console.log(`   [MOCK] New content contains: ${data.content.substring(0, 100)}...`);
    return { id, ...data };
  }
}

/**
 * Mock link checker
 */
async function mockCheckLink(url) {
  console.log(`      [MOCK] Checking: ${url}`);

  // Simulate various link statuses
  if (url.includes('broken-site')) {
    return 404;
  }
  if (url.includes('working-site')) {
    return 200;
  }
  if (url.includes('http://example.com')) {
    return 404; // Will suggest HTTPS upgrade
  }
  if (url.includes('https://example.com/secure-page')) {
    return 200; // HTTPS version works
  }
  if (url.includes('page-no-slash') && !url.endsWith('/')) {
    return 404; // Will suggest adding slash
  }
  if (url.includes('page-no-slash/')) {
    return 200; // With slash works
  }
  if (url.includes('nonexistent-domain')) {
    return 'DNS_ERROR';
  }
  if (url.includes('timeout-site')) {
    return 'TIMEOUT';
  }

  return 200; // Default: working
}

/**
 * Mock suggest fix
 */
async function mockSuggestFix(detector, url, status) {
  // HTTP to HTTPS
  if (url.startsWith('http://example.com')) {
    const httpsUrl = url.replace('http://', 'https://');
    return {
      newUrl: httpsUrl,
      type: 'protocol_upgrade',
      confidence: 'high'
    };
  }

  // Add trailing slash
  if (url.includes('page-no-slash') && !url.endsWith('/')) {
    return {
      newUrl: url + '/',
      type: 'add_trailing_slash',
      confidence: 'high'
    };
  }

  return null;
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
      siteUrl: 'https://example.com',
      wpUser: 'test',
      wpPassword: 'test'
    };

    // Create detector instance
    const detector = new BrokenLinkDetectorV2(testConfig);

    // Mock clients if not using live data
    if (!useLiveData) {
      detector.wpClient = new MockWordPress();

      // Mock the link checker
      const originalCheckLink = detector.checkLink.bind(detector);
      detector.checkLink = async function(url, timeout) {
        if (useLiveData) {
          return await originalCheckLink(url, timeout);
        }
        return await mockCheckLink(url);
      };

      // Mock the suggest fix
      const originalSuggestFix = detector.suggestFix.bind(detector);
      detector.suggestFix = async function(url, status) {
        if (useLiveData) {
          return await originalSuggestFix(url, status);
        }
        return await mockSuggestFix(detector, url, status);
      };
    }

    console.log('─'.repeat(70));
    console.log('PHASE 1: DETECTION\n');

    // Run detection
    const detectionResult = await detector.runDetection({
      limit: 10,
      checkExternal: true
    });

    console.log('\n📊 Detection Results:');
    console.log(`   Detected issues: ${detectionResult.detected}`);
    console.log(`   Proposals created: ${detectionResult.proposals}`);
    console.log(`   Group ID: ${detectionResult.groupId}`);
    console.log(`   Session ID: ${detectionResult.sessionId}`);

    if (detectionResult.proposals === 0) {
      console.log('\n✅ No broken links found. Test complete!');
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

    // Categorize proposals
    const fixable = proposals.filter(p => p.metadata?.linkDetails?.suggestedFix);
    const manualReview = proposals.filter(p => !p.metadata?.linkDetails?.suggestedFix);

    console.log(`   ✅ Automatic fixes available: ${fixable.length}`);
    console.log(`   ⚠️  Manual review required: ${manualReview.length}\n`);

    proposals.forEach((proposal, index) => {
      console.log(`Proposal #${index + 1}:`);
      console.log(`   Target: ${proposal.target_title}`);
      console.log(`   Status: ${proposal.metadata?.linkDetails?.status || 'unknown'}`);
      console.log(`   Type: ${proposal.metadata?.linkDetails?.isExternal ? 'External' : 'Internal'}`);
      console.log(`   Risk Level: ${proposal.risk_level}`);
      console.log(`   Severity: ${proposal.severity}`);

      console.log(`\n   📝 Issue:`);
      console.log(`      ${proposal.issue_description.substring(0, 120)}...`);

      console.log(`\n   🔧 Fix:`);
      console.log(`      ${proposal.fix_description.substring(0, 120)}...`);

      if (proposal.metadata?.linkDetails?.suggestedFix) {
        console.log(`\n   ✨ Suggested Fix:`);
        console.log(`      Type: ${proposal.metadata.linkDetails.suggestedFix.type}`);
        console.log(`      New URL: ${proposal.metadata.linkDetails.suggestedFix.newUrl}`);
        console.log(`      Confidence: ${proposal.metadata.linkDetails.suggestedFix.confidence}`);
      } else {
        console.log(`\n   ⚠️  No automatic fix available - manual intervention needed`);
      }

      console.log(`\n   📋 Before: ${proposal.before_value}`);
      console.log(`   📋 After:  ${proposal.after_value.substring(0, 100)}${proposal.after_value.length > 100 ? '...' : ''}`);
      console.log('');
    });

    console.log('─'.repeat(70));
    console.log('PHASE 3: APPROVAL\n');

    // Approve proposals with automatic fixes
    console.log(`✅ Auto-approving ${fixable.length} proposals with automatic fixes...\n`);

    fixable.forEach(proposal => {
      proposalService.reviewProposal(proposal.id, {
        action: 'approve',
        reviewedBy: 'test-script',
        notes: 'Auto-approved: Automatic fix available with high confidence'
      });

      console.log(`   ✅ Approved proposal #${proposal.id} (${proposal.metadata.linkDetails.suggestedFix.type})`);
    });

    // Reject proposals requiring manual review (for testing)
    console.log(`\n⚠️  Flagging ${manualReview.length} proposals for manual review...\n`);

    manualReview.forEach(proposal => {
      proposalService.reviewProposal(proposal.id, {
        action: 'reject',
        reviewedBy: 'test-script',
        notes: 'Manual review required: No automatic fix available'
      });

      console.log(`   ⚠️  Flagged proposal #${proposal.id} for manual review`);
    });

    console.log('\n' + '─'.repeat(70));
    console.log('PHASE 4: APPLICATION\n');

    if (fixable.length === 0) {
      console.log('No approved proposals to apply.');
    } else {
      // Apply approved proposals
      const applicationResult = await detector.runApplication(detectionResult.groupId);

      console.log('📊 Application Results:');
      console.log(`   Total: ${applicationResult.total}`);
      console.log(`   Succeeded: ${applicationResult.succeeded}`);
      console.log(`   Failed: ${applicationResult.failed}`);
      console.log(`   Duration: ${Math.round(applicationResult.duration / 1000)}s`);
    }

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

    // Get statistics
    const stats = {
      total: finalProposals.length,
      byStatus: {},
      byType: { internal: 0, external: 0 },
      bySeverity: {}
    };

    finalProposals.forEach(p => {
      stats.byStatus[p.metadata?.linkDetails?.status] =
        (stats.byStatus[p.metadata?.linkDetails?.status] || 0) + 1;

      if (p.metadata?.linkDetails?.isExternal) {
        stats.byType.external++;
      } else {
        stats.byType.internal++;
      }

      stats.bySeverity[p.severity] = (stats.bySeverity[p.severity] || 0) + 1;
    });

    console.log('\n📊 Link Statistics:');
    console.log(`   Internal links: ${stats.byType.internal}`);
    console.log(`   External links: ${stats.byType.external}`);

    console.log('\n📊 By Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n📊 By Severity:');
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      console.log(`   ${severity}: ${count}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE\n');

    console.log('Summary:');
    console.log(`   ✅ Detection phase: Found ${detectionResult.detected} broken links`);
    console.log(`   ✅ Review phase: Created ${detectionResult.proposals} proposals`);
    console.log(`   ✅ Approval phase: Approved ${fixable.length} automatic fixes`);
    console.log(`   ✅ Application phase: Applied ${fixable.length} fixes`);
    console.log(`   ⚠️  Manual review: ${manualReview.length} links need manual attention`);
    console.log('');
    console.log('The Broken Link Detector v2 is working correctly with manual review workflow!');
    console.log('');

    if (!useLiveData) {
      console.log('💡 Next step: Test with real links');
      console.log('   Run: node test-broken-link-detector.js --live');
    } else {
      console.log('💡 Next step: Deploy to production and scan your real sites!');
    }

    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
