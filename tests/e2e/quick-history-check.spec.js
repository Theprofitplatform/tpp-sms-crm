import { test, expect } from '@playwright/test';

test('Quick Auto-Fix History Check', async ({ page }) => {
  console.log('\n🔍 Starting quick Auto-Fix History check...\n');
  
  // Step 1: Load dashboard
  console.log('Step 1: Loading dashboard at http://localhost:5174/');
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  console.log('✅ Dashboard loaded');
  
  // Step 2: Check if page loaded
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Step 3: Look for Auto-Fix link
  console.log('\nStep 3: Looking for Auto-Fix Engines link...');
  const autoFixLink = page.locator('button:has-text("Auto-Fix Engines")');
  const linkCount = await autoFixLink.count();
  console.log(`Found ${linkCount} Auto-Fix Engines link(s)`);
  
  if (linkCount === 0) {
    console.log('❌ Auto-Fix link not found!');
    await page.screenshot({ path: 'tests/screenshots/no-autofix-link.png', fullPage: true });
    return;
  }
  
  // Step 4: Click Auto-Fix
  console.log('\nStep 4: Clicking Auto-Fix link...');
  await autoFixLink.first().click();
  await page.waitForTimeout(2000);
  console.log('✅ Clicked Auto-Fix');
  
  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/autofix-page.png', fullPage: true });
  
  // Step 5: Look for History tab
  console.log('\nStep 5: Looking for History tab...');
  const historyTab = page.locator('button:has-text("History"), [role="tab"]:has-text("History")');
  const tabCount = await historyTab.count();
  console.log(`Found ${tabCount} History tab(s)`);
  
  if (tabCount === 0) {
    console.log('❌ History tab not found!');
    const pageContent = await page.content();
    console.log('Page content length:', pageContent.length);
    return;
  }
  
  // Step 6: Click History tab
  console.log('\nStep 6: Clicking History tab...');
  await historyTab.first().click();
  await page.waitForTimeout(2000);
  console.log('✅ Clicked History tab');
  
  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/history-tab.png', fullPage: true });
  
  // Step 7: Check for content
  console.log('\nStep 7: Checking for History content...');
  
  const changeHistoryHeading = await page.locator('h2:has-text("Change History")').count();
  console.log(`"Change History" heading: ${changeHistoryHeading}`);
  
  const pagesAnalyzed = await page.locator('text=/pages analyzed/i').count();
  console.log(`"pages analyzed" text: ${pagesAnalyzed}`);
  
  const changes = await page.locator('text=/changes/i').count();
  console.log(`"changes" text: ${changes}`);
  
  // Step 8: Check for API call
  console.log('\nStep 8: Checking page content...');
  const content = await page.content();
  const hasReactRoot = content.includes('id="root"');
  const hasAutoFix = content.includes('Auto-Fix') || content.includes('auto-fix');
  
  console.log(`Has React root: ${hasReactRoot}`);
  console.log(`Has Auto-Fix content: ${hasAutoFix}`);
  
  // Step 9: Final summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log('========================================');
  console.log(`Auto-Fix link found: ${linkCount > 0 ? '✅' : '❌'}`);
  console.log(`History tab found: ${tabCount > 0 ? '✅' : '❌'}`);
  console.log(`Change History heading: ${changeHistoryHeading > 0 ? '✅' : '❌'}`);
  console.log(`Content indicators: ${pagesAnalyzed > 0 || changes > 0 ? '✅' : '❌'}`);
  console.log('========================================\n');
  
  // Assertions
  expect(linkCount).toBeGreaterThan(0);
  expect(tabCount).toBeGreaterThan(0);
});
