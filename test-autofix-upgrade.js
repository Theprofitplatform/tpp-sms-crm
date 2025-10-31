#!/usr/bin/env node

/**
 * Auto-Fix Engine Upgrade - Test Suite
 * 
 * Tests all new engines and services to ensure they work correctly
 */

import { MetaDescriptionOptimizer } from './src/automation/auto-fixers/meta-description-optimizer.js';
import { BrokenLinkDetector } from './src/automation/auto-fixers/broken-link-detector.js';
import { DuplicateContentDetector } from './src/automation/auto-fixers/duplicate-content-detector.js';
import { CoreWebVitalsOptimizer } from './src/automation/auto-fixers/core-web-vitals-optimizer.js';
import { AccessibilityFixer } from './src/automation/auto-fixers/accessibility-fixer.js';
import aiSuggestions from './src/services/ai-content-suggestions.js';
import autofixQueue from './src/services/autofix-queue.js';
import cache from './src/services/redis-cache.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './config/env/.env' });

class AutoFixTestSuite {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: []
    };

    this.testConfig = {
      id: 'test-client',
      siteUrl: process.env.WORDPRESS_URL || 'https://instantautotraders.com.au',
      wpUser: process.env.WORDPRESS_USER || 'Claude',
      wpPassword: process.env.WORDPRESS_APP_PASSWORD,
      businessName: 'Test Business',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      phone: '+61 2 1234 5678',
      email: 'test@example.com'
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log('─'.repeat(70));

    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;

      console.log(`✅ PASSED (${duration}ms)`);
      this.results.passed.push({ name, duration });
      return true;

    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      this.results.failed.push({ name, error: error.message });
      return false;
    }
  }

  async testMetaDescriptionOptimizer() {
    await this.runTest('Meta Description Optimizer', async () => {
      const optimizer = new MetaDescriptionOptimizer(this.testConfig);
      
      // Test analysis
      const testItem = {
        id: 1,
        title: { rendered: 'Test Page' },
        excerpt: { rendered: '' },
        yoast_head_json: {},
        link: 'https://example.com/test'
      };

      const analysis = await optimizer.analyzeMetaDescription(testItem);
      
      if (!analysis.needsOptimization) {
        throw new Error('Should need optimization for empty description');
      }

      // Test description generation
      const description = optimizer.generateDescription(testItem, analysis);
      
      if (description.length < 120 || description.length > 160) {
        throw new Error(`Description length ${description.length} not in range 120-160`);
      }

      console.log(`   Generated: "${description}"`);
    });
  }

  async testBrokenLinkDetector() {
    await this.runTest('Broken Link Detector', async () => {
      const detector = new BrokenLinkDetector(this.testConfig);

      // Test link checking
      const validUrl = 'https://google.com';
      const status = await detector.checkLink(validUrl, 5000);

      if (status !== 200) {
        throw new Error(`Expected 200 for ${validUrl}, got ${status}`);
      }

      console.log(`   ✓ Link check working (got status ${status})`);

      // Test broken link detection
      const brokenUrl = 'https://httpstat.us/404';
      const brokenStatus = await detector.checkLink(brokenUrl, 5000);

      if (brokenStatus !== 404) {
        throw new Error(`Expected 404, got ${brokenStatus}`);
      }

      console.log(`   ✓ Broken link detection working`);
    });
  }

  async testDuplicateContentDetector() {
    await this.runTest('Duplicate Content Detector', async () => {
      const detector = new DuplicateContentDetector(this.testConfig);

      // Test similarity calculation
      const text1 = 'The quick brown fox jumps over the lazy dog';
      const text2 = 'The quick brown fox jumps over the lazy dog';
      const text3 = 'A completely different sentence with no overlap';

      const similarity1 = detector.calculateSimilarity(text1, text2);
      const similarity2 = detector.calculateSimilarity(text1, text3);

      if (similarity1 !== 1.0) {
        throw new Error(`Identical texts should have similarity 1.0, got ${similarity1}`);
      }

      if (similarity2 >= 0.5) {
        throw new Error(`Different texts should have low similarity, got ${similarity2}`);
      }

      console.log(`   ✓ Identical texts: ${similarity1}`);
      console.log(`   ✓ Different texts: ${similarity2.toFixed(2)}`);
    });
  }

  async testCoreWebVitalsOptimizer() {
    await this.runTest('Core Web Vitals Optimizer', async () => {
      const optimizer = new CoreWebVitalsOptimizer(this.testConfig);

      // Test HTML parsing and analysis
      const testContent = {
        id: 1,
        title: { rendered: 'Test Page' },
        content: {
          rendered: `
            <img src="test1.jpg">
            <img src="test2.jpg" loading="lazy">
            <img src="test3.jpg" width="800" height="600">
            <script src="test.js"></script>
            <script>console.log('inline');</script>
          `
        },
        link: 'https://example.com/test'
      };

      const analysis = await optimizer.analyzePage(testContent);

      if (analysis.issues.length === 0) {
        throw new Error('Should detect issues in test content');
      }

      const categories = new Set(analysis.issues.map(i => i.category));
      console.log(`   ✓ Detected issues in categories: ${[...categories].join(', ')}`);
      console.log(`   ✓ Total issues: ${analysis.issues.length}`);
    });
  }

  async testAccessibilityFixer() {
    await this.runTest('Accessibility Fixer', async () => {
      const fixer = new AccessibilityFixer(this.testConfig);

      // Test HTML parsing and analysis
      const testContent = {
        id: 1,
        title: { rendered: 'Test Page' },
        content: {
          rendered: `
            <img src="test.jpg">
            <img src="test2.jpg" alt="image of something">
            <a href="#">click here</a>
            <a href="#" target="_blank">Opens new window</a>
            <input type="text" name="email">
            <h1>Title</h1>
            <h3>Subheading</h3>
          `
        },
        link: 'https://example.com/test'
      };

      const analysis = await fixer.analyzePage(testContent);

      if (analysis.issues.length === 0) {
        throw new Error('Should detect accessibility issues in test content');
      }

      const categories = new Set(analysis.issues.map(i => i.category));
      console.log(`   ✓ Detected issues in categories: ${[...categories].join(', ')}`);
      console.log(`   ✓ Total issues: ${analysis.issues.length}`);
    });
  }

  async testAISuggestions() {
    await this.runTest('AI Content Suggestions', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('   ⚠️  Skipping (no OpenAI API key)');
        this.results.skipped.push({ name: 'AI Content Suggestions', reason: 'No API key' });
        return;
      }

      const testContent = 'This is a short test content about car trading in Sydney.';
      const context = {
        title: 'Car Trading Sydney',
        url: 'https://example.com/car-trading',
        targetKeyword: 'car trading',
        industry: 'Automotive'
      };

      const analysis = await aiSuggestions.analyzeContent(testContent, context);

      if (!analysis.success) {
        throw new Error('AI analysis failed');
      }

      console.log(`   ✓ Content Quality: ${analysis.suggestions.contentQualityScore}/100`);
      console.log(`   ✓ SEO Score: ${analysis.suggestions.seoScore}/100`);
      console.log(`   ✓ Readability: ${analysis.suggestions.readabilityScore}/100`);
      console.log(`   ✓ Model: ${analysis.model}`);
    });
  }

  async testJobQueue() {
    await this.runTest('Job Queue System', async () => {
      try {
        // Test adding job
        const job = await autofixQueue.addJob(
          'Test Engine',
          'test-client',
          {
            priority: 5,
            dryRun: true,
            testParam: 'test-value'
          }
        );

        if (!job.jobId) {
          throw new Error('Job should have an ID');
        }

        console.log(`   ✓ Job created: ${job.jobId}`);

        // Test getting job status
        const status = await autofixQueue.getJobStatus(job.jobId);

        if (!status.found) {
          throw new Error('Job should be found');
        }

        console.log(`   ✓ Job status: ${status.state}`);

        // Test queue stats
        const stats = await autofixQueue.getQueueStats();

        console.log(`   ✓ Queue stats: ${stats.waiting} waiting, ${stats.active} active`);

        // Clean up: cancel the test job
        await autofixQueue.cancelJob(job.jobId);
        console.log(`   ✓ Test job cleaned up`);

      } catch (error) {
        if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
          console.log('   ⚠️  Skipping (Redis not available)');
          this.results.skipped.push({ name: 'Job Queue System', reason: 'Redis not available' });
        } else {
          throw error;
        }
      }
    });
  }

  async testRedisCache() {
    await this.runTest('Redis Cache', async () => {
      try {
        // Test basic cache operations
        const testKey = 'test:key:' + Date.now();
        const testValue = { data: 'test-value', timestamp: Date.now() };

        // Set
        const setResult = await cache.set(testKey, testValue, 60);
        
        if (!setResult) {
          throw new Error('Cache set should return true');
        }

        console.log(`   ✓ Cache set successful`);

        // Get
        const getValue = await cache.get(testKey);
        
        if (!getValue || getValue.data !== testValue.data) {
          throw new Error('Cache get should return the same value');
        }

        console.log(`   ✓ Cache get successful`);

        // Exists
        const exists = await cache.exists(testKey);
        
        if (!exists) {
          throw new Error('Key should exist');
        }

        console.log(`   ✓ Cache exists check successful`);

        // Delete
        await cache.del(testKey);
        const afterDelete = await cache.get(testKey);
        
        if (afterDelete !== null) {
          throw new Error('Key should be deleted');
        }

        console.log(`   ✓ Cache delete successful`);

      } catch (error) {
        if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
          console.log('   ⚠️  Skipping (Redis not available)');
          this.results.skipped.push({ name: 'Redis Cache', reason: 'Redis not available' });
        } else {
          throw error;
        }
      }
    });
  }

  async run() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║        🧪 AUTO-FIX ENGINE UPGRADE - TEST SUITE 🧪            ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const startTime = Date.now();

    // Run all tests
    await this.testMetaDescriptionOptimizer();
    await this.testBrokenLinkDetector();
    await this.testDuplicateContentDetector();
    await this.testCoreWebVitalsOptimizer();
    await this.testAccessibilityFixer();
    await this.testAISuggestions();
    await this.testJobQueue();
    await this.testRedisCache();

    const totalTime = Date.now() - startTime;

    this.printSummary(totalTime);

    // Cleanup
    try {
      await autofixQueue.close();
      await cache.close();
    } catch (error) {
      // Ignore cleanup errors
    }

    // Exit with appropriate code
    process.exit(this.results.failed.length > 0 ? 1 : 0);
  }

  printSummary(totalTime) {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║                    📊 TEST RESULTS 📊                        ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const total = this.results.passed.length + this.results.failed.length + this.results.skipped.length;

    console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`📋 Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.results.passed.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    console.log(`⏭️  Skipped: ${this.results.skipped.length}`);

    if (this.results.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      this.results.passed.forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.failed.forEach(test => {
        console.log(`   • ${test.name}`);
        console.log(`     Error: ${test.error}`);
      });
    }

    if (this.results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Tests:');
      this.results.skipped.forEach(test => {
        console.log(`   • ${test.name} (${test.reason})`);
      });
    }

    console.log('\n' + '═'.repeat(70));

    if (this.results.failed.length === 0) {
      console.log('\n🎉 ALL TESTS PASSED! 🎉');
      console.log('\nYour auto-fix engine upgrade is working correctly!\n');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('\nPlease review the errors above and fix them.\n');
    }

    console.log('═'.repeat(70) + '\n');
  }
}

// Run test suite
const testSuite = new AutoFixTestSuite();
testSuite.run().catch(error => {
  console.error('\n❌ Test suite crashed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
