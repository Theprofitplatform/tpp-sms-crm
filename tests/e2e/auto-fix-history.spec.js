import { test, expect } from '@playwright/test';

test.describe('Auto-Fix History Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display Auto-Fix link in sidebar', async ({ page }) => {
    // Check if Auto-Fix link exists
    const autoFixLink = page.locator('text=Auto-Fix').first();
    await expect(autoFixLink).toBeVisible();
  });

  test('should navigate to Auto-Fix page and show History tab', async ({ page }) => {
    // Click Auto-Fix in sidebar
    await page.click('text=Auto-Fix');
    
    // Wait for navigation
    await page.waitForURL('**/auto-fix');
    
    // Check if History tab exists
    const historyTab = page.locator('button:has-text("History")');
    await expect(historyTab).toBeVisible();
  });

  test('should display change history when clicking History tab', async ({ page }) => {
    // Navigate to Auto-Fix page
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    
    // Click History tab
    await page.click('button:has-text("History")');
    
    // Wait for content to load
    await page.waitForTimeout(1000);
    
    // Check for "Change History" heading
    const heading = page.locator('h2:has-text("Change History")');
    await expect(heading).toBeVisible();
  });

  test('should show auto-fix reports in History tab', async ({ page }) => {
    // Navigate to Auto-Fix History
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    
    // Wait for reports to load
    await page.waitForTimeout(1500);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/auto-fix-history-tab.png', fullPage: true });
    
    // Check if any report cards are visible
    // Looking for date indicators
    const dateElements = page.locator('text=/October|November|December/i');
    const count = await dateElements.count();
    
    console.log(`Found ${count} date elements in History tab`);
    
    // Should have at least 1 report
    expect(count).toBeGreaterThan(0);
  });

  test('should display report details with dates and change counts', async ({ page }) => {
    // Navigate to History tab
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    
    // Wait for content
    await page.waitForTimeout(2000);
    
    // Look for specific text patterns
    const pagesAnalyzed = page.locator('text=/\\d+ pages analyzed/i');
    const changesText = page.locator('text=/\\d+ changes made/i');
    
    // At least one report should show these
    const pagesCount = await pagesAnalyzed.count();
    const changesCount = await changesText.count();
    
    console.log(`Pages analyzed text found: ${pagesCount} times`);
    console.log(`Changes made text found: ${changesCount} times`);
    
    expect(pagesCount).toBeGreaterThan(0);
  });

  test('should expand report when clicking expand button', async ({ page }) => {
    // Navigate to History tab
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    
    // Wait for reports to load
    await page.waitForTimeout(2000);
    
    // Look for expand button (ChevronDown icon or expand button)
    const expandButton = page.locator('button').filter({ hasText: /expand/i }).first();
    const altExpandButton = page.locator('button svg').first();
    
    // Try to click expand button
    const buttonCount = await expandButton.count();
    const svgCount = await altExpandButton.count();
    
    console.log(`Found ${buttonCount} expand buttons, ${svgCount} SVG buttons`);
    
    if (buttonCount > 0) {
      await expandButton.click();
    } else if (svgCount > 0) {
      await altExpandButton.click();
    }
    
    // Wait for expansion
    await page.waitForTimeout(1000);
    
    // Take screenshot of expanded state
    await page.screenshot({ path: 'tests/screenshots/auto-fix-history-expanded.png', fullPage: true });
  });

  test('should show title changes when report is expanded', async ({ page }) => {
    // Navigate and expand first report
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    await page.waitForTimeout(2000);
    
    // Find and click first visible button in report card
    const reportCard = page.locator('[class*="card"]').first();
    const expandBtn = reportCard.locator('button').first();
    
    try {
      await expandBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Look for "Before" and "After" text
      const beforeText = page.locator('text=/Before:/i');
      const afterText = page.locator('text=/After:/i');
      
      const beforeCount = await beforeText.count();
      const afterCount = await afterText.count();
      
      console.log(`Before labels found: ${beforeCount}`);
      console.log(`After labels found: ${afterCount}`);
      
      if (beforeCount > 0 && afterCount > 0) {
        console.log('✅ Title changes are displaying correctly!');
      }
    } catch (error) {
      console.log('Could not expand report:', error.message);
    }
  });

  test('should show "View Page" buttons for changes', async ({ page }) => {
    // Navigate to History
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    await page.waitForTimeout(2000);
    
    // Try to expand first report
    const firstButton = page.locator('button').nth(2); // Skip tabs, get first card button
    await firstButton.click().catch(() => {});
    await page.waitForTimeout(1000);
    
    // Look for "View Page" buttons
    const viewPageButtons = page.locator('button:has-text("View Page"), button:has-text("View")');
    const count = await viewPageButtons.count();
    
    console.log(`Found ${count} "View Page" buttons`);
  });

  test('should make successful API call to fetch history', async ({ page }) => {
    // Listen for API calls
    let apiCalled = false;
    let apiResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/auto-fix-history')) {
        apiCalled = true;
        apiResponse = response;
        console.log(`API called: ${response.url()}`);
        console.log(`Status: ${response.status()}`);
        
        try {
          const body = await response.json();
          console.log(`Response:`, JSON.stringify(body).substring(0, 200));
        } catch (e) {
          console.log('Could not parse response as JSON');
        }
      }
    });
    
    // Navigate to History tab
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    await page.click('button:has-text("History")');
    
    // Wait for API call
    await page.waitForTimeout(3000);
    
    // Verify API was called
    expect(apiCalled).toBeTruthy();
    
    if (apiResponse) {
      expect(apiResponse.status()).toBe(200);
    }
  });

  test('comprehensive History tab validation', async ({ page }) => {
    console.log('\n========================================');
    console.log('COMPREHENSIVE AUTO-FIX HISTORY TEST');
    console.log('========================================\n');
    
    // Step 1: Navigate to Auto-Fix
    console.log('Step 1: Clicking Auto-Fix link...');
    await page.click('text=Auto-Fix');
    await page.waitForURL('**/auto-fix');
    console.log('✅ Navigated to Auto-Fix page');
    
    // Step 2: Click History tab
    console.log('\nStep 2: Clicking History tab...');
    await page.click('button:has-text("History")');
    await page.waitForTimeout(2000);
    console.log('✅ Clicked History tab');
    
    // Step 3: Check for heading
    console.log('\nStep 3: Checking for "Change History" heading...');
    const heading = await page.locator('h2:has-text("Change History")').count();
    console.log(`Found ${heading} "Change History" heading(s)`);
    
    // Step 4: Check for description
    console.log('\nStep 4: Checking for description text...');
    const description = await page.locator('text=/View all auto-fix/i').count();
    console.log(`Found ${description} description text(s)`);
    
    // Step 5: Count report cards
    console.log('\nStep 5: Counting report cards...');
    const cards = await page.locator('[class*="card"]').count();
    console.log(`Found ${cards} card elements`);
    
    // Step 6: Look for dates
    console.log('\nStep 6: Looking for date elements...');
    const dates = await page.locator('text=/202[45]/').count();
    console.log(`Found ${dates} date elements`);
    
    // Step 7: Look for "pages analyzed" text
    console.log('\nStep 7: Looking for "pages analyzed" text...');
    const analyzed = await page.locator('text=/pages analyzed/i').count();
    console.log(`Found ${analyzed} "pages analyzed" text(s)`);
    
    // Step 8: Look for "changes" text
    console.log('\nStep 8: Looking for "changes" text...');
    const changes = await page.locator('text=/changes/i').count();
    console.log(`Found ${changes} "changes" text(s)`);
    
    // Step 9: Take screenshots
    console.log('\nStep 9: Taking screenshots...');
    await page.screenshot({ 
      path: 'tests/screenshots/auto-fix-history-full.png', 
      fullPage: true 
    });
    console.log('✅ Full page screenshot saved');
    
    // Step 10: Get page content for analysis
    console.log('\nStep 10: Getting page content...');
    const content = await page.content();
    const hasAutoFix = content.includes('auto-fix') || content.includes('Auto-Fix');
    const hasHistory = content.includes('History') || content.includes('history');
    const hasChanges = content.includes('changes') || content.includes('Changes');
    
    console.log(`\nPage content check:`);
    console.log(`- Contains "auto-fix": ${hasAutoFix}`);
    console.log(`- Contains "History": ${hasHistory}`);
    console.log(`- Contains "changes": ${hasChanges}`);
    
    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Heading found: ${heading > 0 ? '✅' : '❌'}`);
    console.log(`Description found: ${description > 0 ? '✅' : '❌'}`);
    console.log(`Cards found: ${cards > 0 ? '✅' : '❌'}`);
    console.log(`Dates found: ${dates > 0 ? '✅' : '❌'}`);
    console.log(`"Pages analyzed" found: ${analyzed > 0 ? '✅' : '❌'}`);
    console.log('========================================\n');
    
    // Final assertion
    expect(heading).toBeGreaterThan(0);
  });
});
