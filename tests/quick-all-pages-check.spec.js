/**
 * Quick All Pages Check
 * 
 * Fast test to verify all pages load without critical errors
 * Specifically checking for "Settings is not defined" and similar issues
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9000';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Analytics', path: '/#analytics' },
  { name: 'Clients', path: '/#clients' },
  { name: 'Reports', path: '/#reports' },
  { name: 'Control Center', path: '/#automation' },
  { name: 'Auto-Fix', path: '/#autofix' },
  { name: 'Activity Log', path: '/#activity-log' },
  { name: 'AI Optimizer', path: '/#ai-optimizer' },
  { name: 'Scheduler', path: '/#scheduler' },
  { name: 'Position Tracking', path: '/#position-tracking' },
  { name: 'Domains', path: '/#domains' },
  { name: 'Keywords', path: '/#keywords' },
  { name: 'Settings', path: '/#settings' },
  { name: 'Notifications', path: '/#notifications' },
  { name: 'Export', path: '/#export' }
];

test.describe('Quick All Pages Check', () => {
  test('All pages load without critical errors', async ({ page }) => {
    console.log('\n🚀 Running quick check on all pages...\n');

    const results = {
      passed: [],
      failed: [],
      errors: {}
    };

    for (const pageInfo of PAGES) {
      const pageErrors = [];
      const consoleErrors = [];

      // Capture errors
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
          consoleErrors.push(msg.text());
        }
      });

      try {
        // Navigate with shorter timeout
        await page.goto(BASE_URL + pageInfo.path, { 
          waitUntil: 'domcontentloaded',
          timeout: 8000 
        });
        
        // Wait a bit for React to render
        await page.waitForTimeout(2000);

        // Check for critical error messages
        const errorBoundary = await page.locator('text=/Something went wrong/i').count();
        const settingsError = await page.locator('text=/Settings is not defined/i').count();
        const notDefinedErrors = await page.locator('text=/is not defined/i').count();

        // Check if page rendered
        const hasHeading = await page.locator('h1').count() > 0;

        if (errorBoundary > 0 || settingsError > 0 || notDefinedErrors > 0 || !hasHeading) {
          results.failed.push(pageInfo.name);
          results.errors[pageInfo.name] = {
            errorBoundary: errorBoundary > 0,
            settingsError: settingsError > 0,
            notDefinedErrors: notDefinedErrors > 0,
            noHeading: !hasHeading,
            pageErrors,
            consoleErrors
          };
          console.log(`❌ ${pageInfo.name}: FAILED`);
        } else {
          results.passed.push(pageInfo.name);
          console.log(`✅ ${pageInfo.name}: OK`);
        }
      } catch (error) {
        results.failed.push(pageInfo.name);
        results.errors[pageInfo.name] = { error: error.message };
        console.log(`❌ ${pageInfo.name}: ERROR - ${error.message}`);
      }

      // Remove listeners to prevent memory leaks
      page.removeAllListeners('pageerror');
      page.removeAllListeners('console');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}/${PAGES.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${PAGES.length}`);
    
    if (results.passed.length > 0) {
      console.log('\n✅ Passed Pages:');
      results.passed.forEach(name => console.log(`   - ${name}`));
    }

    if (results.failed.length > 0) {
      console.log('\n❌ Failed Pages:');
      results.failed.forEach(name => {
        console.log(`   - ${name}`);
        const error = results.errors[name];
        if (error) {
          if (error.errorBoundary) console.log('      • Error Boundary triggered');
          if (error.settingsError) console.log('      • Settings is not defined');
          if (error.notDefinedErrors) console.log('      • "is not defined" error found');
          if (error.noHeading) console.log('      • No heading rendered');
          if (error.error) console.log(`      • ${error.error}`);
          if (error.pageErrors?.length > 0) {
            console.log(`      • JS Errors: ${error.pageErrors.join(', ')}`);
          }
        }
      });
    }
    console.log('='.repeat(60) + '\n');

    // Test passes if all pages loaded without critical errors
    expect(results.failed.length).toBe(0);
  });

  test('Settings page - specific check', async ({ page }) => {
    console.log('\n🔍 Checking Settings page specifically...');

    await page.goto(BASE_URL + '/#settings', { 
      waitUntil: 'domcontentloaded',
      timeout: 8000 
    });
    await page.waitForTimeout(2000);

    // Check for "Settings is not defined" error
    const settingsError = await page.locator('text=/Settings is not defined/i').count();
    expect(settingsError, '"Settings is not defined" error found!').toBe(0);

    // Check if page rendered
    const heading = await page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Check that page loaded (heading exists and is not empty)
    const headingText = await heading.textContent();
    expect(headingText?.trim().length, 'Heading is empty').toBeGreaterThan(0);

    // Check for Settings icon (lucide-react icon should render as SVG)
    const settingsIcon = await page.locator('h1 svg').count();
    expect(settingsIcon, 'Settings icon not found').toBeGreaterThan(0);

    console.log('✅ Settings page OK - No errors found');
  });

  test('Clients page - specific check', async ({ page }) => {
    console.log('\n🔍 Checking Clients page specifically...');

    await page.goto(BASE_URL + '/#clients', { 
      waitUntil: 'domcontentloaded',
      timeout: 8000 
    });
    await page.waitForTimeout(2000);

    // Check for errors
    const errors = await page.locator('text=/is not defined/i').count();
    expect(errors, '"is not defined" error found!').toBe(0);

    // Check if page rendered
    const heading = await page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    console.log('✅ Clients page OK - No errors found');
  });

  test('Analytics page - specific check', async ({ page }) => {
    console.log('\n🔍 Checking Analytics page specifically...');

    await page.goto(BASE_URL + '/#analytics', { 
      waitUntil: 'domcontentloaded',
      timeout: 8000 
    });
    await page.waitForTimeout(2000);

    // Check for errors
    const errors = await page.locator('text=/is not defined/i').count();
    expect(errors, '"is not defined" error found!').toBe(0);

    // Check if page rendered
    const heading = await page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    console.log('✅ Analytics page OK - No errors found');
  });
});
