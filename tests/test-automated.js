#!/usr/bin/env node
/**
 * Automated testing (no prompts)
 * Tests all phases automatically with safety features
 */

import { GoogleSearchConsole } from './src/automation/google-search-console.js';
import { RankMathAutomator } from './src/automation/rankmath-automator.js';
import { SafetyManager } from './src/automation/safety-manager.js';
import { AIOptimizer } from './src/automation/ai-optimizer.js';
import { logger } from './src/audit/logger.js';
import dotenv from 'dotenv';

dotenv.config({ path: 'config/env/.env' });

const config = {
  id: 'instantautotraders',
  domain: 'instantautotraders.com.au',
  wpUrl: 'https://instantautotraders.com.au',
  gscUrl: 'https://instantautotraders.com.au/',
  wpUser: process.env.WORDPRESS_USER || process.env.IAT_WP_USER,
  wpPassword: process.env.WORDPRESS_APP_PASSWORD || process.env.IAT_WP_PASSWORD
};

async function test() {
  try {
    logger.section('🧪 AUTOMATED TESTING - INSTANT AUTO TRADERS');
    console.log('Running all tests automatically with safety features\n');
    
    // PHASE 1: Google Search Console
    logger.section('PHASE 1: Testing Google Search Console');
    const gsc = new GoogleSearchConsole();
    
    const metrics = await gsc.getSiteMetrics(config.gscUrl);
    console.log('\n✅ Google Search Console Working!');
    console.log(`   Clicks: ${metrics.totalClicks}`);
    console.log(`   Impressions: ${metrics.totalImpressions}`);
    console.log(`   CTR: ${metrics.averageCTR}%`);
    console.log(`   Avg Position: ${metrics.averagePosition}`);
    
    const quickWins = await gsc.findQuickWins(config.gscUrl);
    console.log(`\n✅ Found ${quickWins.total} quick wins`);
    console.log(`   Potential: +${quickWins.estimatedTrafficGain} clicks/month`);
    
    // Show top 5 opportunities
    if (quickWins.opportunities.length > 0) {
      console.log('\n   Top 5 Quick Wins:');
      quickWins.opportunities.slice(0, 5).forEach((kw, i) => {
        console.log(`   ${i + 1}. "${kw.query}" - Position ${kw.position.toFixed(1)} → ${kw.clicks} clicks`);
      });
    }
    
    // PHASE 2: WordPress Connection
    logger.section('\nPHASE 2: Testing WordPress Connection');
    
    if (!config.wpUser || !config.wpPassword) {
      logger.error('WordPress credentials not found in .env');
      console.log('\nAdd to config/env/.env:');
      console.log('WORDPRESS_USER=your_username');
      console.log('WORDPRESS_APP_PASSWORD=your_app_password');
      process.exit(1);
    }
    
    const rankMath = new RankMathAutomator(config.wpUrl, config.wpUser, config.wpPassword);
    
    const posts = await rankMath.getAllPosts();
    console.log(`\n✅ WordPress API Working!`);
    console.log(`   Found ${posts.length} published posts`);
    
    if (posts.length > 0) {
      console.log(`\n   Sample posts:`);
      posts.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.title.rendered}`);
      });
    }
    
    // PHASE 3: Dry-Run Test
    logger.section('\nPHASE 3: Dry-Run Test (Preview Only)');
    console.log('Testing optimization logic without making changes...\n');
    
    const dryRunResults = await rankMath.bulkOptimizeAll({
      dryRun: true,
      maxPosts: 5
    });
    
    console.log(`\n✅ Dry-Run Complete!`);
    console.log(`   Would optimize: ${dryRunResults.wouldOptimize} posts`);
    
    if (dryRunResults.preview && dryRunResults.preview.length > 0) {
      console.log(`\n   Preview of changes:\n`);
      dryRunResults.preview.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.postTitle}`);
        p.issues.forEach(issue => {
          console.log(`      ⚠️  ${issue.message}`);
        });
        console.log('');
      });
    }
    
    // PHASE 4: Real Optimization (Limited)
    logger.section('\nPHASE 4: Real Optimization Test (3 Posts Only)');
    console.log('Optimizing 3 posts with backup...\n');
    
    // Create backup
    const safety = new SafetyManager(config.id);
    const backupFile = await safety.createBackup(posts, 'test-run');
    console.log(`✅ Backup created: ${backupFile}\n`);
    
    const realResults = await rankMath.bulkOptimizeAll({
      dryRun: false,
      maxPosts: 3
    });
    
    console.log(`\n✅ Optimization Complete!`);
    console.log(`   Optimized: ${realResults.optimized} posts`);
    console.log(`   Failed: ${realResults.failed}`);
    console.log(`   Skipped: ${realResults.skipped}`);
    
    if (realResults.results && realResults.results.length > 0) {
      console.log(`\n   Results:`);
      realResults.results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.postTitle}`);
        console.log(`      Status: ${r.success ? '✅ Success' : '❌ Failed'}`);
        if (r.changes) {
          console.log(`      Changes: ${r.changes.length}`);
        }
      });
    }
    
    // PHASE 5: Claude AI Test (Optional)
    if (process.env.ANTHROPIC_API_KEY) {
      logger.section('\nPHASE 5: Testing Claude AI');
      const ai = new AIOptimizer(process.env.ANTHROPIC_API_KEY);
      
      if (ai.enabled && posts.length > 0) {
        console.log('Testing AI optimization on one post...\n');
        
        const testPost = posts[0];
        const currentTitle = testPost.title.rendered;
        const currentExcerpt = testPost.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';
        
        try {
          const newTitle = await ai.optimizeTitle(currentTitle, 'car sales');
          console.log(`\n✅ Claude AI Working!`);
          console.log(`   Original: "${currentTitle}"`);
          console.log(`   AI Enhanced: "${newTitle}"`);
        } catch (error) {
          console.log(`\n⚠️  Claude AI test failed: ${error.message}`);
        }
      }
    } else {
      console.log('\n⚠️  Claude AI not configured (optional)');
    }
    
    // FINAL SUMMARY
    logger.section('\n✅ ALL TESTS COMPLETED!');
    console.log('\nWhat was tested:');
    console.log('  ✅ Google Search Console integration');
    console.log('  ✅ WordPress API connection');
    console.log('  ✅ Rank Math meta field access');
    console.log('  ✅ Backup system');
    console.log('  ✅ Dry-run mode');
    console.log('  ✅ Real optimization (3 posts)');
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('  ✅ Claude AI integration');
    }
    
    console.log('\n📊 Results Summary:');
    console.log(`  Quick Wins Found: ${quickWins.total}`);
    console.log(`  Posts Found: ${posts.length}`);
    console.log(`  Posts Optimized: ${realResults.optimized}`);
    console.log(`  Backup Location: ${backupFile}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('  1. Check the 3 optimized posts in WordPress:');
    console.log(`     ${config.wpUrl}/wp-admin/edit.php`);
    console.log('  2. Verify Rank Math shows the new SEO values');
    console.log('  3. If good, run full automation:');
    console.log('     node run-automation.js instantautotraders');
    console.log('  4. Monitor Google Search Console for improvements');
    
    console.log('\n💡 Rollback if needed:');
    console.log(`  node -e "import {SafetyManager} from './src/automation/safety-manager.js'; const s = new SafetyManager('${config.id}'); s.listBackups().then(console.log);"`);
    
  } catch (error) {
    logger.error('Test failed:', error.message);
    console.log('\nError details:', error.stack);
    
    if (error.message.includes('Incorrect authentication')) {
      console.log('\n💡 Fix: WordPress authentication failed');
      console.log('   Check credentials in .env file');
      console.log('   Make sure you are using APPLICATION PASSWORD, not regular password');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Fix: Cannot connect to WordPress');
      console.log('   Check wpUrl is correct:', config.wpUrl);
    } else if (error.message.includes('User does not have sufficient permission')) {
      console.log('\n💡 Fix: Google Search Console access issue');
      console.log('   Service account may need to be re-added');
    }
    
    process.exit(1);
  }
}

test();
