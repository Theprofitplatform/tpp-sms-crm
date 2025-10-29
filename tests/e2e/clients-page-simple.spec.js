import { test, expect } from '@playwright/test';

test('Clients Page - Simple Test', async ({ page }) => {
  console.log('\n🧪 Testing Clients Page...\n');
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Console error:', msg.text());
    }
  });
  
  // Track page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  // Step 1: Load dashboard
  console.log('Step 1: Loading dashboard...');
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  console.log('✅ Dashboard loaded');
  
  // Take initial screenshot
  await page.screenshot({ path: 'tests/screenshots/dashboard-loaded.png' });
  
  // Step 2: Find and click Clients button
  console.log('\nStep 2: Finding Clients button...');
  
  // Wait for sidebar to be present
  await page.waitForSelector('aside', { timeout: 5000 });
  
  // Look for Clients button in sidebar
  const clientsButton = page.locator('button:has-text("Clients")');
  const buttonCount = await clientsButton.count();
  console.log(`Found ${buttonCount} Clients button(s)`);
  
  if (buttonCount === 0) {
    console.log('❌ Clients button not found!');
    await page.screenshot({ path: 'tests/screenshots/no-clients-button.png', fullPage: true });
    
    // Check what's in the sidebar
    const sidebarText = await page.locator('aside').textContent();
    console.log('Sidebar content:', sidebarText.substring(0, 200));
    
    throw new Error('Clients button not found in sidebar');
  }
  
  // Click the button
  console.log('Clicking Clients button...');
  await clientsButton.first().click();
  await page.waitForTimeout(2000);
  console.log('✅ Clicked Clients button');
  
  // Take screenshot after click
  await page.screenshot({ path: 'tests/screenshots/after-clients-click.png', fullPage: true });
  
  // Step 3: Wait for content to render
  console.log('\nStep 3: Waiting for page content...');
  await page.waitForTimeout(2000);
  
  // Step 4: Check what's on the page
  console.log('\nStep 4: Checking page content...');
  
  // Get all text content
  const bodyText = await page.locator('body').textContent();
  console.log('\nPage contains (first 500 chars):');
  console.log(bodyText.substring(0, 500));
  
  // Check for various elements
  const checks = {
    'h1 with "Clients"': await page.locator('h1:has-text("Clients")').count(),
    'text "Manage all your"': await page.locator('text=/Manage all/i').count(),
    'text "Total Clients"': await page.locator('text=/Total Clients/i').count(),
    'Search input': await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').count(),
    'Any button': await page.locator('button').count(),
    'Any card': await page.locator('[class*="card"]').count(),
  };
  
  console.log('\nElement counts:');
  Object.entries(checks).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} ${count > 0 ? '✅' : '❌'}`);
  });
  
  // Step 5: Check console errors
  console.log('\nStep 5: Console error check...');
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors:`);
    errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 200)}`);
    });
  } else {
    console.log('✅ No console errors!');
  }
  
  // Final screenshot
  await page.screenshot({ path: 'tests/screenshots/clients-final.png', fullPage: true });
  
  // Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Clients button found: ${buttonCount > 0 ? '✅' : '❌'}`);
  console.log(`Clients heading found: ${checks['h1 with "Clients"'] > 0 ? '✅' : '❌'}`);
  console.log(`Total Clients text: ${checks['text "Total Clients"'] > 0 ? '✅' : '❌'}`);
  console.log(`Search box: ${checks['Search input'] > 0 ? '✅' : '❌'}`);
  console.log(`Console errors: ${errors.length === 0 ? '✅' : '❌'}`);
  console.log('========================================\n');
  
  // Assertions
  expect(errors.length).toBe(0); // No console errors
  expect(buttonCount).toBeGreaterThan(0); // Clients button exists
});
