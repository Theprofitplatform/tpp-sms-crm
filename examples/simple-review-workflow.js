/**
 * Simple Review Workflow Example
 *
 * This example shows how to use the manual review workflow in your code.
 * Run with: node examples/simple-review-workflow.js
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api/autofix';
const CLIENT_ID = 'your-client-id'; // Replace with your client ID

/**
 * Example 1: Basic Workflow - Detect, Review, Apply
 */
async function basicWorkflow() {
  console.log('\n📋 Example 1: Basic Workflow\n');

  // Step 1: Detect NAP issues
  console.log('1️⃣ Detecting issues...');
  const detectResponse = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engineId: 'nap-fixer',
      clientId: CLIENT_ID
    })
  });
  const detectData = await detectResponse.json();

  if (!detectData.success) {
    console.error('Detection failed:', detectData.error);
    return;
  }

  const groupId = detectData.result.groupId;
  console.log(`   ✅ Found ${detectData.result.proposals} proposals`);
  console.log(`   Group ID: ${groupId}\n`);

  // Step 2: Get proposals
  console.log('2️⃣ Fetching proposals...');
  const proposalsResponse = await fetch(`${API_BASE}/proposals?groupId=${groupId}&status=pending`);
  const proposalsData = await proposalsResponse.json();

  if (proposalsData.success && proposalsData.proposals.length > 0) {
    console.log(`   ✅ ${proposalsData.count} proposals to review\n`);

    // Show first proposal
    const firstProposal = proposalsData.proposals[0];
    console.log('   First proposal:');
    console.log(`   - ${firstProposal.fix_description}`);
    console.log(`   - Risk: ${firstProposal.risk_level}`);
    console.log(`   - Priority: ${firstProposal.priority}\n`);
  }

  // Step 3: Accept low-risk proposals
  console.log('3️⃣ Accepting low-risk proposals...');
  const approveResponse = await fetch(`${API_BASE}/proposals/accept-low-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      maxRiskLevel: 'low'
    })
  });
  const approveData = await approveResponse.json();

  console.log(`   ✅ Approved ${approveData.approved} low-risk proposals`);
  console.log(`   ⏭️  Skipped ${approveData.skipped} higher-risk proposals\n`);

  // Step 4: Apply approved fixes
  console.log('4️⃣ Applying approved fixes...');
  const applyResponse = await fetch(`${API_BASE}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      engineId: 'nap-fixer',
      clientId: CLIENT_ID
    })
  });
  const applyData = await applyResponse.json();

  if (applyData.success) {
    console.log(`   ✅ Applied ${applyData.result.succeeded} fixes`);
    if (applyData.result.failed > 0) {
      console.log(`   ⚠️ ${applyData.result.failed} fixes failed\n`);
    }
  }

  console.log('✨ Basic workflow complete!\n');
}

/**
 * Example 2: Manual Review Workflow
 */
async function manualReviewWorkflow() {
  console.log('\n📋 Example 2: Manual Review Workflow\n');

  // Step 1: Detect
  console.log('1️⃣ Detecting content issues...');
  const detectResponse = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engineId: 'content-optimizer-v2',
      clientId: CLIENT_ID,
      options: { limit: 5 }
    })
  });
  const detectData = await detectResponse.json();
  const groupId = detectData.result.groupId;

  console.log(`   ✅ Found ${detectData.result.proposals} proposals\n`);

  // Step 2: Get proposals
  const proposalsResponse = await fetch(`${API_BASE}/proposals?groupId=${groupId}&status=pending`);
  const proposalsData = await proposalsResponse.json();

  if (proposalsData.proposals.length === 0) {
    console.log('   No proposals to review\n');
    return;
  }

  // Step 3: Review each proposal manually
  console.log('2️⃣ Reviewing proposals one-by-one...\n');

  for (let i = 0; i < Math.min(3, proposalsData.proposals.length); i++) {
    const proposal = proposalsData.proposals[i];

    console.log(`   Proposal ${i + 1}:`);
    console.log(`   - ${proposal.fix_description}`);
    console.log(`   - Risk: ${proposal.risk_level}, Priority: ${proposal.priority}`);

    // Simulate manual review (in reality, you'd ask user or apply logic)
    const shouldApprove = proposal.risk_level === 'low';

    if (shouldApprove) {
      // Approve
      await fetch(`${API_BASE}/proposals/${proposal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes: 'Looks good',
          reviewedBy: 'script'
        })
      });
      console.log(`   ✅ Approved\n`);
    } else {
      // Reject
      await fetch(`${API_BASE}/proposals/${proposal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes: 'Needs manual review',
          reviewedBy: 'script'
        })
      });
      console.log(`   ✗ Rejected\n`);
    }
  }

  console.log('✨ Manual review complete!\n');
}

/**
 * Example 3: Schema Injection Workflow
 */
async function schemaWorkflow() {
  console.log('\n📋 Example 3: Schema Injection Workflow\n');

  // Step 1: Detect schema opportunities
  console.log('1️⃣ Detecting schema opportunities...');
  const detectResponse = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      engineId: 'schema-injector-v2',
      clientId: CLIENT_ID
    })
  });
  const detectData = await detectResponse.json();
  const groupId = detectData.result.groupId;

  console.log(`   ✅ Found ${detectData.result.proposals} schema opportunities\n`);

  // Step 2: Auto-approve all (schema is low-risk)
  console.log('2️⃣ Auto-approving all schema additions...');
  const approveResponse = await fetch(`${API_BASE}/proposals/accept-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      confirmRisky: true
    })
  });
  const approveData = await approveResponse.json();

  console.log(`   ✅ Approved ${approveData.approved} schema proposals\n`);

  // Step 3: Apply
  console.log('3️⃣ Applying schema markup...');
  const applyResponse = await fetch(`${API_BASE}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      engineId: 'schema-injector-v2',
      clientId: CLIENT_ID
    })
  });
  const applyData = await applyResponse.json();

  console.log(`   ✅ Applied ${applyData.result.succeeded} schema markups\n`);
  console.log('   Next: Test with Google Rich Results Test\n');

  console.log('✨ Schema workflow complete!\n');
}

/**
 * Example 4: Get Statistics
 */
async function getStatistics() {
  console.log('\n📋 Example 4: Get Statistics\n');

  const response = await fetch(`${API_BASE}/statistics?clientId=${CLIENT_ID}`);
  const data = await response.json();

  if (data.success) {
    console.log('   Statistics:');
    console.log(`   - Total proposals: ${data.statistics.totalProposals || 0}`);
    console.log(`   - Applied: ${data.statistics.totalApplied || 0}`);
    console.log(`   - Success rate: ${data.statistics.successRate || 0}%\n`);
  }
}

// Run examples
async function main() {
  console.log('🚀 Manual Review Workflow Examples\n');
  console.log('='.repeat(60));

  try {
    // Run example 1
    await basicWorkflow();

    // Uncomment to run other examples:
    // await manualReviewWorkflow();
    // await schemaWorkflow();
    // await getStatistics();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Start
main();
