#!/usr/bin/env node
/**
 * Test automation on Instant Auto Traders ONLY
 * Safe test before rolling out to all clients
 */

import { MasterSEOAutomator } from './src/automation/master-auto-optimizer.js';
import { logger } from './src/audit/logger.js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: 'config/env/.env' });

// Instant Auto Traders configuration
const config = {
  id: 'instantautotraders',
  domain: 'instantautotraders.com.au',
  wpUrl: 'https://instantautotraders.com.au',
  gscUrl: 'https://instantautotraders.com.au/',
  wpUser: process.env.WORDPRESS_USER || process.env.IAT_WP_USER,
  wpPassword: process.env.WORDPRESS_APP_PASSWORD || process.env.IAT_WP_PASSWORD
};

async function testAutomation() {
  try {
    logger.section('🧪 TESTING AUTOMATION ON INSTANT AUTO TRADERS');
    logger.info('This is a safe test run on one client only\n');

    // Check credentials
    if (!config.wpUser || !config.wpPassword) {
      logger.error('❌ WordPress credentials not found!');
      console.log('\nAdd to config/env/.env:');
      console.log('WORDPRESS_USER=your_username');
      console.log('WORDPRESS_APP_PASSWORD=your_app_password');
      console.log('\nOR:');
      console.log('IAT_WP_USER=your_username');
      console.log('IAT_WP_PASSWORD=your_app_password');
      process.exit(1);
    }

    // Check if AI is enabled
    if (process.env.ANTHROPIC_API_KEY) {
      logger.info('✅ Claude AI enabled (will enhance top 10 posts)');
    } else {
      logger.warn('⚠️  Claude AI not configured (skipping AI enhancement)');
      logger.info('To enable: Add ANTHROPIC_API_KEY to .env');
      logger.info('Get key: https://console.anthropic.com/\n');
    }

    // Initialize and run
    const automator = new MasterSEOAutomator(config);
    
    logger.info('Starting automation...\n');
    
    const results = await automator.runCompleteOptimization({
      skipAI: !process.env.ANTHROPIC_API_KEY, // Skip AI if no key
      limit: 5 // Only AI-enhance 5 posts for testing (not 10)
    });

    // Display final summary
    logger.section('✅ TEST COMPLETED SUCCESSFULLY!');
    logger.info('\nResults:');
    console.log(`  Quick Wins: ${results.summary.keywordOpportunities} keywords`);
    console.log(`  Posts Optimized: ${results.summary.postsOptimized}`);
    console.log(`  Schema Added: ${results.summary.schemaAdded}`);
    console.log(`  AI Enhanced: ${results.summary.aiEnhanced}`);
    console.log(`  Estimated Cost: $${results.summary.estimatedCost}`);
    console.log('');

    logger.info('Next steps:');
    console.log('  1. Check Google Search Console in 1 week for improvements');
    console.log('  2. If results look good, run on other clients:');
    console.log('     node run-automation.js hottyres');
    console.log('     node run-automation.js theprofitplatform');
    console.log('     node run-automation.js sadc');

  } catch (error) {
    logger.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Incorrect authentication')) {
      console.log('\n💡 Fix: Check WordPress credentials');
      console.log('   Make sure you are using APPLICATION PASSWORD, not regular password');
      console.log('   Create at: WP Admin → Users → Profile → Application Passwords');
    } else if (error.message.includes('authentication credentials were not provided')) {
      console.log('\n💡 Fix: Invalid API key');
      console.log('   Check ANTHROPIC_API_KEY in .env file');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Fix: Cannot connect to WordPress');
      console.log('   Check wpUrl is correct:', config.wpUrl);
    }
    
    process.exit(1);
  }
}

// Run test
testAutomation();
