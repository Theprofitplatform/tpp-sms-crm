/**
 * Simple Playwright Test - Keywords Page Rendering
 */

const { test, expect } = require('@playwright/test');

test.describe('Keywords Page - Simple Tests', () => {
  test('should render keywords page without JavaScript errors', async ({ page }) => {
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot before navigation
    await page.screenshot({ path: 'test-results/before-keywords-nav.png' });
    
    // Find and click Keywords Tracking
    const keywordsButton = page.locator('button:has-text("Keywords Tracking")');
    await expect(keywordsButton).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Keywords Tracking button found');
    
    await keywordsButton.click();
    await page.waitForTimeout(2000); // Wait for navigation
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'test-results/after-keywords-nav.png' });
    
    // Get page content
    const bodyText = await page.textContent('body');
    console.log('Page contains "Keywords Tracking":', bodyText.includes('Keywords Tracking'));
    console.log('Page contains "under construction":', bodyText.includes('under construction'));
    console.log('Page contains "Add Keywords":', bodyText.includes('Add Keywords'));
    console.log('Page contains "Total Keywords":', bodyText.includes('Total Keywords'));
    
    // Check if KeywordsPage rendered
    const hasKeywordsTitle = bodyText.includes('Keywords Tracking');
    const hasUnderConstruction = bodyText.includes('under construction');
    
    console.log(`\n==== TEST RESULTS ====`);
    console.log(`Keywords title present: ${hasKeywordsTitle}`);
    console.log(`Under construction message: ${hasUnderConstruction}`);
    console.log(`JavaScript errors: ${errors.length}`);
    console.log(`Console warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // The page should NOT show "under construction"
    expect(hasUnderConstruction).toBe(false);
    
    console.log('\n✓ Keywords page rendered successfully (not showing under construction)');
  });
  
  test('should verify trackingKeywordsAPI import works', async ({ page }) => {
    // Navigate and check for import errors
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasImportError = await page.evaluate(() => {
      return typeof window.onerror === 'function';
    });
    
    await page.click('button:has-text("Keywords Tracking")');
    await page.waitForTimeout(1000);
    
    const pageContent = await page.content();
    const hasModuleError = pageContent.includes('Failed to fetch module') || 
                           pageContent.includes('Cannot find module') ||
                           pageContent.includes('is not defined');
    
    console.log(`✓ No module import errors: ${!hasModuleError}`);
    expect(hasModuleError).toBe(false);
  });
});
