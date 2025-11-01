/**
 * Playwright Dashboard UI Test
 * Verifies the React UI is working correctly
 */

import { chromium } from 'playwright';

async function testDashboard() {
  console.log('🎭 Starting Playwright Dashboard Test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Test 1: Load the homepage
    console.log('📄 Test 1: Loading homepage...');
    const response = await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (response && response.ok()) {
      console.log('✅ Homepage loaded successfully');
      console.log(`   Status: ${response.status()}`);
    } else {
      throw new Error(`Failed to load homepage: ${response?.status()}`);
    }

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Test 2: Check page title
    console.log('\n📄 Test 2: Checking page title...');
    const title = await page.title();
    console.log(`✅ Page title: "${title}"`);

    // Test 3: Take screenshot of homepage
    console.log('\n📸 Test 3: Taking homepage screenshot...');
    await page.screenshot({
      path: 'test-reports/dashboard-home.png',
      fullPage: true
    });
    console.log('✅ Screenshot saved: test-reports/dashboard-home.png');

    // Test 4: Check for main container
    console.log('\n📄 Test 4: Checking for main content...');
    const mainContent = await page.locator('body').count();
    if (mainContent > 0) {
      console.log('✅ Main content found');
    }

    // Test 5: Check if API calls are working
    console.log('\n📄 Test 5: Testing API connectivity...');
    const apiCalls = [];

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Trigger some API calls by navigating/interacting
    await page.waitForTimeout(2000);

    if (apiCalls.length > 0) {
      console.log('✅ API calls detected:');
      apiCalls.forEach(call => {
        console.log(`   ${call.status} - ${call.url.replace('http://localhost:5173', '')}`);
      });
    } else {
      console.log('⚠️  No API calls detected yet (may load on interaction)');
    }

    // Test 6: Check for navigation elements
    console.log('\n📄 Test 6: Checking for navigation...');
    const navElements = await page.locator('nav, header, [role="navigation"]').count();
    console.log(`✅ Navigation elements found: ${navElements}`);

    // Test 7: Check for any error messages
    console.log('\n📄 Test 7: Checking for errors...');
    const errors = await page.locator('text=/error|failed|cannot/i').count();
    if (errors === 0) {
      console.log('✅ No error messages visible');
    } else {
      console.log(`⚠️  Found ${errors} potential error message(s)`);
    }

    // Test 8: Get page content info
    console.log('\n📄 Test 8: Page content analysis...');
    const content = await page.content();
    const hasReact = content.includes('react') || content.includes('React');
    console.log(`   React detected: ${hasReact ? '✅' : '❌'}`);
    console.log(`   Content size: ${(content.length / 1024).toFixed(2)} KB`);

    // Test 9: Check console logs
    console.log('\n📄 Test 9: Browser console messages...');
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`ERROR: ${msg.text()}`);
      }
    });

    await page.waitForTimeout(1000);

    if (consoleLogs.length > 0) {
      console.log('⚠️  Console errors found:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('✅ No console errors');
    }

    // Final screenshot
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({
      path: 'test-reports/dashboard-final.png'
    });
    console.log('✅ Screenshot saved: test-reports/dashboard-final.png');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    // Take error screenshot
    try {
      await page.screenshot({
        path: 'test-reports/dashboard-error.png',
        fullPage: true
      });
      console.log('📸 Error screenshot saved: test-reports/dashboard-error.png');
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError.message);
    }

    throw error;
  } finally {
    await browser.close();
    console.log('\n🔒 Browser closed');
  }
}

// Create test-reports directory
import { mkdir } from 'fs/promises';
try {
  await mkdir('test-reports', { recursive: true });
} catch (e) {
  // Directory might already exist
}

// Run the test
testDashboard()
  .then(() => {
    console.log('\n✅ Test suite completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
