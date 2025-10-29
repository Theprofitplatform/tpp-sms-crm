import { test, expect } from '@playwright/test';

test('Clients Page on Port 5173 - Quick Test', async ({ page }) => {
  console.log('\n🔍 Testing Clients Page on PORT 5173...\n');
  
  // Track errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.push(text);
      console.log('❌ Console error:', text.substring(0, 200));
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Page error:', error.message);
  });
  
  // Load dashboard on port 5173 (the actual dev server)
  console.log('Loading http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('✅ Loaded');
  
  // Click Clients
  console.log('\nClicking Clients button...');
  const clientsBtn = page.locator('button:has-text("Clients")');
  const count = await clientsBtn.count();
  console.log(`Found ${count} Clients button(s)`);
  
  if (count > 0) {
    await clientsBtn.first().click();
    await page.waitForTimeout(3000);
    console.log('✅ Clicked Clients');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/clients-5173.png', fullPage: true });
    
    // Check for content
    const heading = await page.locator('h1').count();
    const totalClients = await page.locator('text=/Total Clients/i').count();
    const searchBox = await page.locator('input').count();
    
    console.log('\n📊 Results:');
    console.log(`  H1 headings: ${heading}`);
    console.log(`  "Total Clients": ${totalClients}`);
    console.log(`  Input boxes: ${searchBox}`);
    console.log(`  Console errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach((err, i) => console.log(`  ${i+1}. ${err.substring(0, 150)}`));
    } else {
      console.log('\n✅ NO CONSOLE ERRORS!');
    }
  }
  
  console.log('\n========================================');
  console.log(`FINAL: ${errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================\n');
  
  expect(errors.length).toBe(0);
});
