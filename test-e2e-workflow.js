/**
 * End-to-End Workflow Test
 *
 * Demonstrates complete Manual Review workflow:
 * 1. Detection (all 10 engines)
 * 2. Review & Approval
 * 3. Application
 * 4. Verification
 *
 * Usage:
 *   node test-e2e-workflow.js
 *   node test-e2e-workflow.js --dry-run
 *   node test-e2e-workflow.js --engines=nap-fixer,content-optimizer-v2
 */

import proposalService from './src/services/proposal-service.js';
import fs from 'fs';
import path from 'path';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_ENGINES = process.argv.find(arg => arg.startsWith('--engines='))?.split('=')[1]?.split(',');

// All 10 production engines
const ALL_ENGINES = [
  { id: 'nap-fixer', name: 'NAP Fixer', category: 'Local SEO' },
  { id: 'content-optimizer-v2', name: 'Content Optimizer v2', category: 'Content SEO' },
  { id: 'schema-injector-v2', name: 'Schema Injector v2', category: 'Technical SEO' },
  { id: 'title-meta-optimizer-v2', name: 'Title/Meta Optimizer v2', category: 'On-Page SEO' },
  { id: 'broken-link-detector-v2', name: 'Broken Link Detector v2', category: 'Technical SEO' },
  { id: 'image-optimizer-v2', name: 'Image Optimizer v2', category: 'Performance' },
  { id: 'redirect-checker-v2', name: 'Redirect Checker v2', category: 'Technical SEO' },
  { id: 'internal-link-builder-v2', name: 'Internal Link Builder v2', category: 'Content SEO' },
  { id: 'sitemap-optimizer-v2', name: 'Sitemap Optimizer v2', category: 'Technical SEO' },
  { id: 'robots-txt-manager-v2', name: 'Robots.txt Manager v2', category: 'Technical SEO' }
];

// Test client configuration
const TEST_CLIENT = {
  id: 'test-client',
  siteUrl: process.env.WORDPRESS_URL || 'https://example.com',
  wpUser: process.env.WORDPRESS_USER || 'admin',
  wpPassword: process.env.WORDPRESS_APP_PASSWORD || 'test-password',
  businessName: 'Test Business',
  phone: '+1234567890',
  email: 'test@example.com',
  address: '123 Test Street',
  city: 'Test City',
  state: 'TC',
  country: 'Test Country'
};

// State tracking
const workflowState = {
  sessions: [],
  totalIssues: 0,
  totalApproved: 0,
  totalApplied: 0,
  errors: []
};

/**
 * Logger with color
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    highlight: '\x1b[35m',
    reset: '\x1b[0m'
  };

  const icons = {
    info: 'ℹ️ ',
    success: '✅',
    error: '❌',
    warn: '⚠️ ',
    highlight: '🎯'
  };

  console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
}

/**
 * Section header
 */
function section(title) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  ${title}`);
  console.log('═'.repeat(80) + '\n');
}

/**
 * Load engine
 */
async function loadEngine(engineId) {
  const engineMap = {
    'nap-fixer': './src/automation/auto-fixers/nap-fixer.js',
    'content-optimizer-v2': './src/automation/auto-fixers/content-optimizer-v2.js',
    'schema-injector-v2': './src/automation/auto-fixers/schema-injector-v2.js',
    'title-meta-optimizer-v2': './src/automation/auto-fixers/title-meta-optimizer-v2.js',
    'broken-link-detector-v2': './src/automation/auto-fixers/broken-link-detector-v2.js',
    'image-optimizer-v2': './src/automation/auto-fixers/image-optimizer-v2.js',
    'redirect-checker-v2': './src/automation/auto-fixers/redirect-checker-v2.js',
    'internal-link-builder-v2': './src/automation/auto-fixers/internal-link-builder-v2.js',
    'sitemap-optimizer-v2': './src/automation/auto-fixers/sitemap-optimizer-v2.js',
    'robots-txt-manager-v2': './src/automation/auto-fixers/robots-txt-manager-v2.js'
  };

  const enginePath = engineMap[engineId];
  if (!enginePath) {
    throw new Error(`Engine ${engineId} not found`);
  }

  try {
    const engineModule = await import(enginePath);
    const EngineClass = engineModule.default || engineModule[Object.keys(engineModule)[0]];
    return new EngineClass(TEST_CLIENT);
  } catch (error) {
    throw new Error(`Failed to load engine ${engineId}: ${error.message}`);
  }
}

/**
 * Phase 1: Detection
 */
async function phaseDetection() {
  section('PHASE 1: DETECTION - Running All Auto-Fix Engines');

  const engines = SPECIFIC_ENGINES
    ? ALL_ENGINES.filter(e => SPECIFIC_ENGINES.includes(e.id))
    : ALL_ENGINES;

  log(`Testing ${engines.length} engines...`, 'info');

  for (const engineInfo of engines) {
    console.log(`\n🔍 Running: ${engineInfo.name} (${engineInfo.category})`);

    try {
      const engine = await loadEngine(engineInfo.id);
      const result = await engine.runDetection({ limit: 10 });

      if (result.groupId) {
        workflowState.sessions.push({
          engineId: engineInfo.id,
          engineName: engineInfo.name,
          groupId: result.groupId,
          issuesFound: result.issuesDetected,
          timestamp: new Date().toISOString()
        });

        workflowState.totalIssues += result.issuesDetected;

        log(`Found ${result.issuesDetected} issues (Group: ${result.groupId})`, 'success');
      } else {
        log('No issues detected', 'info');
      }
    } catch (error) {
      log(`ERROR: ${error.message}`, 'error');
      workflowState.errors.push({
        engine: engineInfo.id,
        phase: 'detection',
        error: error.message
      });
    }
  }

  console.log('\n' + '-'.repeat(80));
  log(`Total Issues Detected: ${workflowState.totalIssues} across ${workflowState.sessions.length} engines`, 'highlight');
  console.log('-'.repeat(80));
}

/**
 * Phase 2: Review & Approval
 */
async function phaseReview() {
  section('PHASE 2: REVIEW & APPROVAL - Categorizing and Approving Fixes');

  if (workflowState.sessions.length === 0) {
    log('No issues to review (skipping phase)', 'warn');
    return;
  }

  for (const session of workflowState.sessions) {
    console.log(`\n📋 Reviewing: ${session.engineName}`);
    console.log(`   Group ID: ${session.groupId}`);

    try {
      // Get all proposals for this group
      const proposals = proposalService.getProposals({
        groupId: session.groupId,
        status: 'pending'
      });

      if (proposals.length === 0) {
        log('No pending proposals', 'info');
        continue;
      }

      // Categorize by risk level
      const categorized = {
        low: proposals.filter(p => p.risk_level === 'low'),
        medium: proposals.filter(p => p.risk_level === 'medium'),
        high: proposals.filter(p => p.risk_level === 'high'),
        critical: proposals.filter(p => p.risk_level === 'critical')
      };

      console.log(`   Low Risk: ${categorized.low.length}`);
      console.log(`   Medium Risk: ${categorized.medium.length}`);
      console.log(`   High Risk: ${categorized.high.length}`);
      console.log(`   Critical: ${categorized.critical.length}`);

      // Auto-approve low risk
      if (categorized.low.length > 0) {
        const lowRiskIds = categorized.low.map(p => p.id);
        proposalService.bulkReview(lowRiskIds, {
          action: 'approve',
          notes: 'Auto-approved: Low risk',
          reviewedBy: 'e2e-test'
        });

        workflowState.totalApproved += categorized.low.length;
        log(`Auto-approved ${categorized.low.length} low-risk proposals`, 'success');
      }

      // Show examples of medium/high risk for manual review
      if (categorized.medium.length > 0) {
        console.log(`\n   📝 Sample Medium Risk Proposal:`);
        const sample = categorized.medium[0];
        console.log(`      Issue: ${sample.issue_description.substring(0, 100)}...`);
        console.log(`      Fix: ${sample.fix_description.substring(0, 100)}...`);
        console.log(`      → Would require manual review in production`);
      }

      session.approved = categorized.low.length;
      session.requiresReview = categorized.medium.length + categorized.high.length + categorized.critical.length;

    } catch (error) {
      log(`ERROR reviewing ${session.engineName}: ${error.message}`, 'error');
      workflowState.errors.push({
        engine: session.engineId,
        phase: 'review',
        error: error.message
      });
    }
  }

  console.log('\n' + '-'.repeat(80));
  log(`Total Auto-Approved: ${workflowState.totalApproved} proposals`, 'highlight');
  console.log('-'.repeat(80));
}

/**
 * Phase 3: Application
 */
async function phaseApplication() {
  section('PHASE 3: APPLICATION - Applying Approved Fixes');

  if (DRY_RUN) {
    log('DRY RUN MODE - Skipping actual application', 'warn');
    log('In production, approved fixes would be applied here', 'info');
    return;
  }

  if (workflowState.totalApproved === 0) {
    log('No approved proposals to apply (skipping phase)', 'warn');
    return;
  }

  for (const session of workflowState.sessions) {
    if (!session.approved || session.approved === 0) {
      continue;
    }

    console.log(`\n🚀 Applying: ${session.engineName}`);
    console.log(`   Approved fixes: ${session.approved}`);

    try {
      const engine = await loadEngine(session.engineId);
      const result = await engine.runApplication(session.groupId, {
        dryRun: false
      });

      workflowState.totalApplied += result.applied || 0;
      session.applied = result.applied || 0;
      session.failed = result.failed || 0;

      if (result.applied > 0) {
        log(`Applied ${result.applied} fixes successfully`, 'success');
      }

      if (result.failed > 0) {
        log(`Failed to apply ${result.failed} fixes`, 'error');
      }

    } catch (error) {
      log(`ERROR applying ${session.engineName}: ${error.message}`, 'error');
      workflowState.errors.push({
        engine: session.engineId,
        phase: 'application',
        error: error.message
      });
    }
  }

  console.log('\n' + '-'.repeat(80));
  log(`Total Applied: ${workflowState.totalApplied} fixes`, 'highlight');
  console.log('-'.repeat(80));
}

/**
 * Phase 4: Verification
 */
async function phaseVerification() {
  section('PHASE 4: VERIFICATION - Checking Results');

  // Get overall statistics
  const stats = proposalService.getStatistics(TEST_CLIENT.id);

  console.log('📊 Final Statistics:');
  console.log(`   Total Proposals Created: ${stats.total || 0}`);
  console.log(`   Approved: ${stats.approved || 0}`);
  console.log(`   Rejected: ${stats.rejected || 0}`);
  console.log(`   Applied: ${stats.applied || 0}`);
  console.log(`   Failed: ${stats.failed || 0}`);
  console.log(`   Pending Review: ${stats.pending || 0}`);

  // Session details
  console.log('\n📋 Session Details:');
  for (const session of workflowState.sessions) {
    console.log(`\n   ${session.engineName}:`);
    console.log(`      Group ID: ${session.groupId}`);
    console.log(`      Issues Found: ${session.issuesFound}`);
    console.log(`      Auto-Approved: ${session.approved || 0}`);
    console.log(`      Requires Review: ${session.requiresReview || 0}`);
    console.log(`      Applied: ${session.applied || 0}`);
    console.log(`      Failed: ${session.failed || 0}`);
  }

  // Show errors if any
  if (workflowState.errors.length > 0) {
    console.log('\n⚠️  Errors Encountered:');
    for (const error of workflowState.errors) {
      console.log(`   ${error.engine} (${error.phase}): ${error.error}`);
    }
  }
}

/**
 * Generate Report
 */
function generateReport() {
  section('WORKFLOW COMPLETION REPORT');

  const report = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'production',
    client: TEST_CLIENT.id,
    enginesRun: workflowState.sessions.length,
    summary: {
      totalIssues: workflowState.totalIssues,
      totalApproved: workflowState.totalApproved,
      totalApplied: workflowState.totalApplied,
      errorCount: workflowState.errors.length
    },
    sessions: workflowState.sessions,
    errors: workflowState.errors
  };

  const reportPath = path.join(process.cwd(), `e2e-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('✅ Workflow Complete!');
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Engines Run: ${report.enginesRun}`);
  console.log(`   Issues Detected: ${report.summary.totalIssues}`);
  console.log(`   Auto-Approved: ${report.summary.totalApproved}`);
  console.log(`   Applied: ${report.summary.totalApplied}`);
  console.log(`   Errors: ${report.summary.errorCount}`);

  if (DRY_RUN) {
    log('\n⚠️  DRY RUN MODE - No changes were applied', 'warn');
  } else {
    log('\n✅ Production mode - Changes were applied to WordPress', 'success');
  }

  return report;
}

/**
 * Main Workflow
 */
async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('  🔄 END-TO-END WORKFLOW TEST');
  console.log('═'.repeat(80));
  console.log(`  Client: ${TEST_CLIENT.id}`);
  console.log(`  Site: ${TEST_CLIENT.siteUrl}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  if (SPECIFIC_ENGINES) {
    console.log(`  Engines: ${SPECIFIC_ENGINES.join(', ')}`);
  }
  console.log('═'.repeat(80));

  try {
    // Run all phases
    await phaseDetection();
    await phaseReview();
    await phaseApplication();
    await phaseVerification();

    // Generate report
    const report = generateReport();

    // Exit with appropriate code
    const exitCode = workflowState.errors.length > 0 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run workflow
main();
