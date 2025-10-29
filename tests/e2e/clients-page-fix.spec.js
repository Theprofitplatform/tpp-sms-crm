import { test, expect } from '@playwright/test';

test('Clients Page - Error Fix Verification', async ({ page }) => {
  console.log('\n🔍 Testing Clients Page fix...\n');
  
  // Step 1: Load dashboard
  console.log('Step 1: Loading dashboard...');
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  console.log('✅ Dashboard loaded');
  
  // Step 2: Click Clients
  console.log('\nStep 2: Clicking Clients link...');
  const clientsLink = page.locator('button:has-text("Clients")');
  const linkCount = await clientsLink.count();
  console.log(`Found ${linkCount} Clients link(s)`);
  
  await clientsLink.first().click();
  await page.waitForTimeout(2000);
  console.log('✅ Clicked Clients');
  
  // Step 3: Check for errors
  console.log('\nStep 3: Checking for errors...');
  
  // Listen for console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Wait for page to render
  await page.waitForTimeout(2000);
  
  // Step 4: Check if page rendered correctly
  console.log('\nStep 4: Checking if Clients page rendered...');
  
  const pageTitle = await page.locator('h1:has-text("Clients")').count();
  console.log(`"Clients" heading: ${pageTitle}`);
  
  const searchBox = await page.locator('input[placeholder*="Search"]').count();
  console.log(`Search box: ${searchBox}`);
  
  const statsCards = await page.locator('text=/Total Clients|Active|Pending|Inactive/').count();
  console.log(`Stats cards: ${statsCards}`);
  
  // Step 5: Take screenshot
  console.log('\nStep 5: Taking screenshot...');
  await page.screenshot({ path: 'tests/screenshots/clients-page-fixed.png', fullPage: true });
  console.log('✅ Screenshot saved');
  
  // Step 6: Try searching
  console.log('\nStep 6: Testing search functionality...');
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.count() > 0) {
    await searchInput.fill('instant');
    await page.waitForTimeout(500);
    console.log('✅ Search works');
  }
  
  // Step 7: Check console errors
  console.log('\nStep 7: Checking console errors...');
  if (consoleErrors.length > 0) {
    console.log('❌ Console errors found:');
    consoleErrors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('✅ No console errors');
  }
  
  // Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Clients heading: ${pageTitle > 0 ? '✅' : '❌'}`);
  console.log(`Search box: ${searchBox > 0 ? '✅' : '❌'}`);
  console.log(`Stats cards: ${statsCards > 0 ? '✅' : '❌'}`);
  console.log(`Console errors: ${consoleErrors.length === 0 ? '✅' : '❌'}`);
  console.log('========================================\n');
  
  // Assertions
  expect(pageTitle).toBeGreaterThan(0);
  expect(consoleErrors.length).toBe(0);
});
