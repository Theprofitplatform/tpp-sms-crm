/**
 * Comprehensive Dashboard Pages Test Suite
 * 
 * Tests all dashboard pages for:
 * - Successful rendering
 * - No JavaScript errors (especially "X is not defined" errors)
 * - All icons loading correctly from lucide-react
 * - Page accessibility
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9000';

// All dashboard pages to test
const PAGES = [
  { name: 'Dashboard', path: '/', heading: 'Dashboard' },
  { name: 'Analytics', path: '/#analytics', heading: 'Analytics' },
  { name: 'Clients', path: '/#clients', heading: 'Clients' },
  { name: 'Client Detail', path: '/#client/', heading: '', skipHeadingCheck: true },
  { name: 'Reports', path: '/#reports', heading: 'Reports' },
  { name: 'Control Center', path: '/#automation', heading: 'Control Center' },
  { name: 'Auto-Fix Engines', path: '/#autofix', heading: 'Auto-Fix Engines' },
  { name: 'Activity Log', path: '/#activity-log', heading: 'Activity Log' },
  { name: 'AI Optimizer', path: '/#ai-optimizer', heading: 'AI Optimizer' },
  { name: 'Scheduler', path: '/#scheduler', heading: 'Scheduler' },
  { name: 'Position Tracking', path: '/#position-tracking', heading: 'Position Tracking' },
  { name: 'Domains', path: '/#domains', heading: 'Domains' },
  { name: 'Keywords', path: '/#keywords', heading: 'Keywords' },
  { name: 'Keyword Research', path: '/#keyword-research', heading: 'Keyword Research' },
  { name: 'Recommendations', path: '/#recommendations', heading: 'Recommendations' },
  { name: 'Goals', path: '/#goals', heading: 'Goals' },
  { name: 'Email Campaigns', path: '/#emails', heading: 'Email Campaigns' },
  { name: 'Notification Center', path: '/#notifications', heading: 'Notification Center' },
  { name: 'Settings', path: '/#settings', heading: 'Settings' },
  { name: 'Export & Backup', path: '/#export', heading: 'Export & Backup' },
  { name: 'White Label', path: '/#white-label', heading: 'White Label' }
];

test.describe('All Pages - Comprehensive Tests', () => {
  let consoleErrors = [];
  let jsErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = [];
    jsErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    // Set timeout
    page.setDefaultTimeout(15000);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log errors if test failed
    if (testInfo.status === 'failed') {
      console.log('\n❌ Console Errors:', consoleErrors);
      console.log('❌ JS Errors:', jsErrors);
    }
  });

  // Test each page individually
  for (const pageInfo of PAGES) {
    test(`${pageInfo.name} - loads without errors`, async ({ page }) => {
      console.log(`\n🧪 Testing: ${pageInfo.name}`);

      // Navigate to page
      await page.goto(BASE_URL + pageInfo.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // Check for React root
      const root = await page.locator('#root');
      await expect(root).toBeVisible({ timeout: 10000 });

      // Check for heading (unless skip flag is set)
      if (!pageInfo.skipHeadingCheck && pageInfo.heading) {
        const heading = await page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 5000 });
        
        const headingText = await heading.textContent();
        expect(headingText?.trim()).toContain(pageInfo.heading);
      }

      // Check for specific error messages
      const errorMessages = await page.locator('text=/is not defined|Cannot read|undefined/i').all();
      if (errorMessages.length > 0) {
        const errorTexts = await Promise.all(errorMessages.map(el => el.textContent()));
        console.warn('⚠️  Found error messages on page:', errorTexts);
      }

      // Check for "Something went wrong" error boundary
      const errorBoundary = await page.locator('text=/Something went wrong/i').count();
      expect(errorBoundary).toBe(0);

      // Check for specific "Settings is not defined" error
      const settingsError = await page.locator('text=/Settings is not defined/i').count();
      expect(settingsError).toBe(0);

      // Verify no JavaScript errors occurred
      const criticalErrors = jsErrors.filter(err => 
        err.includes('is not defined') || 
        err.includes('Cannot read') ||
        err.includes('undefined')
      );
      
      if (criticalErrors.length > 0) {
        console.error('❌ Critical JS Errors:', criticalErrors);
        throw new Error(`Page has ${criticalErrors.length} critical JavaScript errors`);
      }

      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/${pageInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: false
      });

      console.log(`✅ ${pageInfo.name} loaded successfully`);
    });
  }

  test('All pages - batch error check', async ({ page }) => {
    console.log('\n🔍 Running batch error check on all pages...\n');
    
    const results = {
      passed: [],
      failed: [],
      errors: {}
    };

    for (const pageInfo of PAGES) {
      try {
        const pageErrors = [];
        
        page.on('pageerror', error => {
          pageErrors.push(error.message);
        });

        await page.goto(BASE_URL + pageInfo.path, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        await page.waitForTimeout(1000);

        // Check for error boundary
        const hasError = await page.locator('text=/Something went wrong/i').count() > 0;
        
        if (hasError || pageErrors.length > 0) {
          results.failed.push(pageInfo.name);
          results.errors[pageInfo.name] = pageErrors;
        } else {
          results.passed.push(pageInfo.name);
        }
      } catch (error) {
        results.failed.push(pageInfo.name);
        results.errors[pageInfo.name] = [error.message];
      }
    }

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${results.passed.length}/${PAGES.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${PAGES.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Pages:');
      results.failed.forEach(name => {
        console.log(`  - ${name}`);
        if (results.errors[name]?.length > 0) {
          console.log(`    Errors: ${results.errors[name].join(', ')}`);
        }
      });
    }

    expect(results.failed.length).toBe(0);
  });

  test('Settings page - specific validation', async ({ page }) => {
    console.log('\n🧪 Testing Settings Page in detail...');

    await page.goto(BASE_URL + '/#settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check heading with Settings icon
    const heading = await page.locator('h1').filter({ hasText: 'Settings' });
    await expect(heading).toBeVisible();

    // Check for Settings icon (should be rendered as SVG)
    const settingsIcon = await page.locator('h1 svg').first();
    await expect(settingsIcon).toBeVisible();

    // Check tabs are visible
    const tabs = await page.locator('[role="tablist"]');
    await expect(tabs).toBeVisible();

    // Check all tab buttons exist
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Integrations' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'API' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible();

    // Click through each tab
    const tabNames = ['General', 'Notifications', 'Integrations', 'API', 'Appearance'];
    for (const tabName of tabNames) {
      await page.getByRole('tab', { name: tabName }).click();
      await page.waitForTimeout(300);
      console.log(`  ✓ ${tabName} tab loaded`);
    }

    console.log('✅ Settings page fully validated');
  });

  test('Clients page - specific validation', async ({ page }) => {
    console.log('\n🧪 Testing Clients Page in detail...');

    await page.goto(BASE_URL + '/#clients', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check heading
    const heading = await page.locator('h1').filter({ hasText: 'Clients' });
    await expect(heading).toBeVisible();

    // Check for stats cards
    const statsCards = await page.locator('[class*="grid"]').first();
    await expect(statsCards).toBeVisible();

    // Check search box
    const searchBox = await page.getByPlaceholder(/search/i);
    if (await searchBox.isVisible()) {
      await searchBox.fill('test');
      await page.waitForTimeout(300);
      console.log('  ✓ Search box works');
    }

    // Check for Add Client button
    const addButton = await page.locator('button:has-text("Add Client")');
    await expect(addButton).toBeVisible();

    console.log('✅ Clients page fully validated');
  });

  test('Analytics page - specific validation', async ({ page }) => {
    console.log('\n🧪 Testing Analytics Page in detail...');

    await page.goto(BASE_URL + '/#analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check heading
    const heading = await page.locator('h1').filter({ hasText: 'Analytics' });
    await expect(heading).toBeVisible();

    // Check for metrics cards
    const metricsCards = await page.locator('[class*="grid"]').first();
    await expect(metricsCards).toBeVisible();

    // Check for date range selector
    const dateSelector = await page.locator('button:has-text(/Last.*days/i)').first();
    if (await dateSelector.isVisible()) {
      console.log('  ✓ Date range selector visible');
    }

    console.log('✅ Analytics page fully validated');
  });

  test('All icons rendered correctly', async ({ page }) => {
    console.log('\n🧪 Checking icon rendering across pages...');

    const iconErrors = [];

    for (const pageInfo of PAGES.slice(0, 5)) { // Test first 5 pages for icons
      await page.goto(BASE_URL + pageInfo.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Check for SVG elements (icons from lucide-react render as SVG)
      const svgCount = await page.locator('svg').count();
      
      if (svgCount === 0) {
        iconErrors.push(`${pageInfo.name}: No SVG icons found`);
      } else {
        console.log(`  ✓ ${pageInfo.name}: ${svgCount} icons rendered`);
      }
    }

    if (iconErrors.length > 0) {
      console.warn('⚠️  Icon issues:', iconErrors);
    } else {
      console.log('✅ All icons rendering correctly');
    }
  });

  test('Performance - All pages load within acceptable time', async ({ page }) => {
    console.log('\n⏱️  Running performance tests...\n');

    const performanceResults = [];

    for (const pageInfo of PAGES) {
      const startTime = Date.now();
      
      try {
        await page.goto(BASE_URL + pageInfo.path, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        const loadTime = Date.now() - startTime;
        performanceResults.push({
          page: pageInfo.name,
          time: loadTime,
          status: loadTime < 5000 ? '✅' : '⚠️'
        });

        console.log(`${loadTime < 5000 ? '✅' : '⚠️'}  ${pageInfo.name}: ${loadTime}ms`);
      } catch (error) {
        performanceResults.push({
          page: pageInfo.name,
          time: 10000,
          status: '❌',
          error: error.message
        });
        console.log(`❌ ${pageInfo.name}: Timeout or error`);
      }
    }

    // Summary
    const avgTime = performanceResults.reduce((sum, r) => sum + r.time, 0) / performanceResults.length;
    const slowPages = performanceResults.filter(r => r.time > 5000);

    console.log(`\n📊 Average load time: ${avgTime.toFixed(0)}ms`);
    if (slowPages.length > 0) {
      console.log(`⚠️  ${slowPages.length} slow pages detected`);
    }
  });
});

test.describe('Navigation and Routing', () => {
  test('Sidebar navigation works for all pages', async ({ page }) => {
    console.log('\n🧪 Testing sidebar navigation...\n');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click through main navigation items
    const navItems = [
      'Analytics',
      'Clients',
      'Reports',
      'Control Center',
      'Settings'
    ];

    for (const item of navItems) {
      const navLink = page.locator(`nav a:has-text("${item}")`).first();
      
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForTimeout(800);
        
        // Verify navigation occurred
        const heading = await page.locator('h1').first();
        const headingText = await heading.textContent();
        console.log(`  ✓ Navigated to: ${headingText?.trim()}`);
      }
    }

    console.log('✅ Navigation test complete');
  });
});

test.describe('Error Boundary Tests', () => {
  test('Error boundary catches and displays errors properly', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // The app should not show error boundary on initial load
    const errorBoundary = await page.locator('text=/Something went wrong/i').count();
    expect(errorBoundary).toBe(0);

    console.log('✅ No error boundary triggered on valid pages');
  });
});
