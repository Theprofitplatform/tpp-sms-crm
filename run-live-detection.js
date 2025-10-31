#!/usr/bin/env node

/**
 * Run Live Detection on Real WordPress Site
 * This will detect actual issues and create real proposals
 */

import { NAPAutoFixer } from './src/automation/auto-fixers/nap-fixer.js';
import proposalService from './src/services/proposal-service.js';
import fs from 'fs';
import path from 'path';

console.log('\n🔍 RUNNING LIVE DETECTION ON INSTANTAUTOTRADERS\n');
console.log('=' .repeat(70));

async function runLiveDetection() {
  try {
    // Load client configuration
    console.log('\n📋 Step 1: Loading Client Configuration\n');
    
    const configPath = './clients/clients-config.json';
    const clientsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const clientConfig = clientsConfig.instantautotraders;
    
    // Load WordPress credentials
    const envPath = './clients/instantautotraders.env';
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) envVars[key.trim()] = value.trim();
    });

    console.log('✅ Client: Instant Auto Traders');
    console.log(`   URL: ${clientConfig.url}`);
    console.log(`   WordPress User: ${envVars.WORDPRESS_USER}`);
    console.log(`   Status: ${clientConfig.status}`);

    // Prepare NAP Fixer configuration
    const napConfig = {
      id: 'instantautotraders',
      siteUrl: envVars.WORDPRESS_URL,
      wpUser: envVars.WORDPRESS_USER,
      wpPassword: envVars.WORDPRESS_APP_PASSWORD,
      businessName: 'Instant Auto Traders',
      address: null, // Will be filled if needed
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      phone: '+61 (number from site)', // Will detect variations
      email: 'info@instantautotraders.com.au'
    };

    console.log('\n📋 Step 2: Initializing NAP Fixer Engine\n');
    
    const napFixer = new NAPAutoFixer(napConfig);
    console.log(`✅ Engine initialized: ${napFixer.engineId}`);
    console.log(`   Name: ${napFixer.engineName}`);
    console.log(`   Category: ${napFixer.getCategory()}`);

    console.log('\n🔍 Step 3: Running Detection on WordPress Site\n');
    console.log('   This will:');
    console.log('   • Connect to WordPress');
    console.log('   • Scan all posts and pages');
    console.log('   • Find NAP inconsistencies');
    console.log('   • Create proposals for review');
    console.log('   • Generate visual diffs');
    console.log('   • Save to database');
    console.log('\n   ⏳ Please wait... (may take 30-60 seconds)\n');

    // Run detection
    const startTime = Date.now();
    const result = await napFixer.runDetection();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('✅ DETECTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n   Duration: ${duration} seconds`);
    console.log(`   Issues Found: ${result.detected}`);
    console.log(`   Proposals Created: ${result.proposals}`);
    console.log(`   Group ID: ${result.groupId}`);
    console.log(`   Session ID: ${result.sessionId}`);

    if (result.proposals === 0) {
      console.log('\n✨ Great news! No NAP inconsistencies found!');
      console.log('   Your business information is already consistent across all content.');
      console.log('\n   This means:');
      console.log('   • Business name is consistent');
      console.log('   • Phone numbers are formatted uniformly');
      console.log('   • Email addresses are standardized');
      console.log('   • No action needed!');
      return;
    }

    // Get proposals from database
    console.log('\n📊 Step 4: Retrieving Proposals from Database\n');
    
    const proposals = proposalService.getProposalsByGroup(result.groupId);
    console.log(`✅ Found ${proposals.length} proposals in database\n`);

    // Show first few proposals
    const showCount = Math.min(5, proposals.length);
    console.log(`📋 Showing first ${showCount} proposals:\n`);

    proposals.slice(0, showCount).forEach((p, i) => {
      console.log(`${i + 1}. ${p.fix_description}`);
      console.log(`   Target: ${p.target_title || p.target_type + ' ' + p.target_id}`);
      console.log(`   Field: ${p.field_name}`);
      console.log(`   Risk: ${p.risk_level} | Severity: ${p.severity}`);
      console.log(`   Before: "${p.before_value?.substring(0, 60)}${p.before_value?.length > 60 ? '...' : ''}"`);
      console.log(`   After:  "${p.after_value?.substring(0, 60)}${p.after_value?.length > 60 ? '...' : ''}"`);
      console.log(`   Status: ${p.status}`);
      console.log('');
    });

    if (proposals.length > showCount) {
      console.log(`   ... and ${proposals.length - showCount} more proposals\n`);
    }

    // Show statistics
    console.log('📊 Statistics:\n');
    const stats = proposalService.getStatistics('instantautotraders');
    console.log(`   Total Proposals: ${stats.total_proposals || 0}`);
    console.log(`   Pending: ${stats.pending || 0}`);
    console.log(`   Approved: ${stats.approved || 0}`);
    console.log(`   Applied: ${stats.applied || 0}`);

    // Next steps
    console.log('\n' + '='.repeat(70));
    console.log('🎯 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('\nYou now have REAL proposals ready for review!\n');
    console.log('To review them:\n');
    console.log('   1. Open dashboard: http://localhost:5173');
    console.log('   2. Click "Auto-Fix" in sidebar');
    console.log('   3. Click "View Proposals" button');
    console.log('   4. You\'ll see all ' + proposals.length + ' proposals with visual diffs');
    console.log('   5. Approve ✅ or Reject ❌ each one');
    console.log('   6. Click "Apply All Approved" when ready\n');

    console.log('Or view proposals in browser now:\n');
    console.log('   http://localhost:5173 → Auto-Fix → View Proposals\n');

    console.log('💡 Tips:\n');
    console.log('   • Review each proposal carefully');
    console.log('   • Check the visual diffs');
    console.log('   • Approve only what looks correct');
    console.log('   • You can reject anything you don\'t want');
    console.log('   • Nothing is applied until you click "Apply"\n');

    console.log('✨ Your proposals are waiting for review!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    
    console.log('\n💡 Troubleshooting:\n');
    console.log('   • Check WordPress credentials in clients/instantautotraders.env');
    console.log('   • Verify WordPress site is accessible');
    console.log('   • Check network connection');
    console.log('   • Review logs for details\n');
    
    process.exit(1);
  }
}

runLiveDetection();
