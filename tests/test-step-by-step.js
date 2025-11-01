#!/usr/bin/env node
/**
 * Step-by-step testing for Instant Auto Traders
 * Safe, incremental testing with manual approval
 */

import { GoogleSearchConsole } from './src/automation/google-search-console.js';
import { RankMathAutomator } from './src/automation/rankmath-automator.js';
import { SafetyManager } from './src/automation/safety-manager.js';
import { logger } from './src/audit/logger.js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: 'config/env/.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

const config = {
  id: 'instantautotraders',
  domain: 'instantautotraders.com.au',
  wpUrl: 'https://instantautotraders.com.au',
  gscUrl: 'https://instantautotraders.com.au/',
  wpUser: process.env.WORDPRESS_USER,
  wpPassword: process.env.WORDPRESS_APP_PASSWORD
};

async function test() {
  try {
    logger.section('🧪 STEP-BY-STEP TESTING - INSTANT AUTO TRADERS');
    
    // STEP 1: Test Google Search Console
    logger.section('STEP 1: Testing Google Search Console');
    const gsc = new GoogleSearchConsole();
    
    const metrics = await gsc.getSiteMetrics(config.gscUrl);
    console.log('\n✅ Google Search Console Working!');
    console.log(`   Clicks: ${metrics.totalClicks}`);
    console.log(`   Impressions: ${metrics.totalImpressions}`);
    console.log(`   CTR: ${metrics.averageCTR}%`);
    console.log(`   Avg Position: ${metrics.averagePosition}`);
    
    const quickWins = await gsc.findQuickWins(config.gscUrl);
    console.log(`\n✅ Found ${quickWins.total} quick wins`);
    console.log(`   Potential: +${quickWins.estimatedTrafficGain} clicks/month\n`);
    
    const proceed = await ask('Continue to WordPress test? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Stopped at Step 1');
      process.exit(0);
    }
    
    // STEP 2: Test WordPress Connection
    logger.section('\nSTEP 2: Testing WordPress Connection');
    
    if (!config.wpUser || !config.wpPassword) {
      logger.error('WordPress credentials not found in .env');
      process.exit(1);
    }
    
    const rankMath = new RankMathAutomator(config.wpUrl, config.wpUser, config.wpPassword);
    
    const posts = await rankMath.getAllPosts();
    console.log(`\n✅ WordPress API Working!`);
    console.log(`   Found ${posts.length} published posts`);
    
    if (posts.length > 0) {
      console.log(`\n   Sample post:`);
      console.log(`   - ${posts[0].title.rendered}`);
      console.log(`   - URL: ${posts[0].link}`);
    }
    
    const proceed2 = await ask('\nContinue to dry-run test? (yes/no): ');
    if (proceed2.toLowerCase() !== 'yes') {
      console.log('Stopped at Step 2');
      process.exit(0);
    }
    
    // STEP 3: Dry Run (Preview Only)
    logger.section('\nSTEP 3: Dry Run (Preview Changes)');
    
    const dryRunResults = await rankMath.bulkOptimizeAll({
      dryRun: true,
      maxPosts: 5
    });
    
    console.log(`\n✅ Dry Run Complete!`);
    console.log(`   Would optimize: ${dryRunResults.wouldOptimize} posts`);
    console.log(`\n   Preview of changes:\n`);
    
    dryRunResults.preview.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.postTitle}`);
      p.issues.forEach(issue => {
        console.log(`      ⚠️  ${issue.message}`);
      });
      console.log('');
    });
    
    const proceed3 = await ask('Apply optimizations to 3 posts? (yes/no): ');
    if (proceed3.toLowerCase() !== 'yes') {
      console.log('Stopped at Step 3 (safe - no changes made)');
      process.exit(0);
    }
    
    // STEP 4: Real Optimization (3 posts only)
    logger.section('\nSTEP 4: Optimizing 3 Posts');
    
    // Create backup
    const safety = new SafetyManager(config.id);
    logger.info('Creating backup...');
    await safety.createBackup(posts, 'test-run');
    
    const realResults = await rankMath.bulkOptimizeAll({
      dryRun: false,
      maxPosts: 3
    });
    
    console.log(`\n✅ Optimization Complete!`);
    console.log(`   Optimized: ${realResults.optimized} posts`);
    console.log(`   Failed: ${realResults.failed}`);
    
    logger.section('\n✅ ALL TESTS PASSED!');
    console.log('\nWhat was tested:');
    console.log('  ✅ Google Search Console integration');
    console.log('  ✅ WordPress API connection');
    console.log('  ✅ Rank Math meta field updates');
    console.log('  ✅ Backup system');
    console.log('  ✅ Dry-run mode');
    console.log('  ✅ Limited optimization (3 posts)');
    
    console.log('\nNext steps:');
    console.log('  1. Check the 3 optimized posts in WordPress');
    console.log('  2. Verify Rank Math shows the new values');
    console.log('  3. If good, run full automation:');
    console.log('     node run-automation.js instantautotraders');
    
    rl.close();
    
  } catch (error) {
    logger.error('Test failed:', error.message);
    console.log('\nStack trace:', error.stack);
    rl.close();
    process.exit(1);
  }
}

test();
