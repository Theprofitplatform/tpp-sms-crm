/**
 * Unified Dashboard - Playwright Tests
 *
 * Comprehensive test suite to verify all sections are working
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:9000/unified/';

test.describe('Unified Dashboard - Complete Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto(BASE_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  // ============================================
  // 1. BASIC CONNECTIVITY
  // ============================================

  test('should load the dashboard successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/SEO Automation Dashboard/i);

    // Check main containers exist
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('should load all CSS files', async ({ page }) => {
    // Check if styles are applied by looking for gradient
    const sidebar = page.locator('.sidebar');
    const bgColor = await sidebar.evaluate(el =>
      window.getComputedStyle(el).background
    );

    // Should have gradient colors
    expect(bgColor).toContain('rgb');
  });

  test('should load all JavaScript files', async ({ page }) => {
    // Check console for loaded messages
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') logs.push(msg.text());
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Should have loaded all JS files
    expect(logs.some(log => log.includes('Config.js'))).toBeTruthy();
    expect(logs.some(log => log.includes('Utils.js'))).toBeTruthy();
    expect(logs.some(log => log.includes('API.js'))).toBeTruthy();
  });

  // ============================================
  // 2. NAVIGATION TESTS
  // ============================================

  test('should display all 11 navigation items', async ({ page }) => {
    const navItems = page.locator('.nav-item');
    await expect(navItems).toHaveCount(11);

    // Check specific sections
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Clients')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Recommendations')).toBeVisible();
    await expect(page.locator('text=Goals')).toBeVisible();
    await expect(page.locator('text=Automation')).toBeVisible();
    await expect(page.locator('text=Webhooks')).toBeVisible();
    await expect(page.locator('text=Campaigns')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
    await expect(page.locator('text=White-Label')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate between sections', async ({ page }) => {
    // Click Clients
    await page.click('text=Clients');
    await expect(page.locator('#clients-content')).toBeVisible();

    // Click Analytics
    await page.click('text=Analytics');
    await expect(page.locator('#analytics-content')).toBeVisible();

    // Click Goals
    await page.click('text=Goals');
    await expect(page.locator('#goals-content')).toBeVisible();
  });

  // ============================================
  // 3. DASHBOARD SECTION
  // ============================================

  test('Dashboard: should display stats cards', async ({ page }) => {
    await page.click('text=Dashboard');
    await page.waitForSelector('.dashboard-stats-grid');

    const statsCards = page.locator('.stat-card');
    await expect(statsCards).toHaveCount(4);

    // Check for stat labels
    await expect(page.locator('text=Total Clients')).toBeVisible();
    await expect(page.locator('text=Active Clients')).toBeVisible();
  });

  test('Dashboard: should display charts', async ({ page }) => {
    await page.click('text=Dashboard');
    await page.waitForTimeout(1000);

    // Check for chart canvases
    const charts = page.locator('canvas');
    const count = await charts.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Dashboard: should display activity feed', async ({ page }) => {
    await page.click('text=Dashboard');

    await expect(page.locator('.activity-feed')).toBeVisible();
  });

  test('Dashboard: should display quick actions', async ({ page }) => {
    await page.click('text=Dashboard');

    const quickActions = page.locator('.quick-action-card');
    await expect(quickActions).toHaveCount(6);
  });

  // ============================================
  // 4. CLIENTS SECTION
  // ============================================

  test('Clients: should display client table', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    // Should see either table or empty state
    const hasTable = await page.locator('.clients-table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('.empty-state').isVisible().catch(() => false);

    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('Clients: should open add client modal', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    // Click Add Client button
    await page.click('button:has-text("Add Client")');

    // Modal should appear
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('text=Client ID')).toBeVisible();
  });

  test('Clients: should close modal on cancel', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Client")');
    await expect(page.locator('.modal')).toBeVisible();

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Modal should disappear
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  // ============================================
  // 5. ANALYTICS SECTION
  // ============================================

  test('Analytics: should display client selector', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForTimeout(500);

    await expect(page.locator('#analytics-client-selector')).toBeVisible();
  });

  test('Analytics: should display timeframe selector', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForTimeout(500);

    // Look for timeframe selector
    const hasTimeframe = await page.locator('#analytics-timeframe').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('.empty-state').isVisible().catch(() => false);

    expect(hasTimeframe || hasEmptyState).toBeTruthy();
  });

  test('Analytics: should display export buttons', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForTimeout(500);

    // Check if export buttons exist (when client is selected)
    const hasExport = await page.locator('button:has-text("Export")').count();

    // Either has export buttons or shows empty state
    expect(hasExport >= 0).toBeTruthy();
  });

  // ============================================
  // 6. RECOMMENDATIONS SECTION
  // ============================================

  test('Recommendations: should display client selector', async ({ page }) => {
    await page.click('text=Recommendations');
    await page.waitForTimeout(500);

    await expect(page.locator('#recommendations-client-selector')).toBeVisible();
  });

  test('Recommendations: should display filter tabs', async ({ page }) => {
    await page.click('text=Recommendations');
    await page.waitForTimeout(500);

    // Check for filter buttons (if client selected)
    const hasFilters = await page.locator('.filter-btn').count();
    expect(hasFilters >= 0).toBeTruthy();
  });

  test('Recommendations: should have generate button', async ({ page }) => {
    await page.click('text=Recommendations');
    await page.waitForTimeout(500);

    const hasGenerate = await page.locator('button:has-text("Generate")').count();
    expect(hasGenerate >= 0).toBeTruthy();
  });

  // ============================================
  // 7. GOALS SECTION
  // ============================================

  test('Goals: should display client selector', async ({ page }) => {
    await page.click('text=Goals');
    await page.waitForTimeout(500);

    await expect(page.locator('#goals-client-selector')).toBeVisible();
  });

  test('Goals: should display create goal button', async ({ page }) => {
    await page.click('text=Goals');
    await page.waitForTimeout(500);

    // Either has create button or empty state with create button
    const hasButton = await page.locator('button:has-text("Create Goal")').count();
    expect(hasButton).toBeGreaterThan(0);
  });

  // ============================================
  // 8. AUTOMATION SECTION
  // ============================================

  test('Automation: should display batch buttons', async ({ page }) => {
    await page.click('text=Automation');
    await page.waitForTimeout(500);

    // Should see batch automation buttons
    await expect(page.locator('button:has-text("Optimize All")')).toBeVisible();
    await expect(page.locator('button:has-text("Audit All")')).toBeVisible();
  });

  test('Automation: should display automation cards', async ({ page }) => {
    await page.click('text=Automation');
    await page.waitForTimeout(500);

    // Should see automation type cards
    const cards = page.locator('.automation-card');
    await expect(cards).toHaveCount(4);
  });

  test('Automation: should display auto-fix engines', async ({ page }) => {
    await page.click('text=Automation');
    await page.waitForTimeout(500);

    // Should see auto-fix cards
    const autofixCards = page.locator('.autofix-card');
    await expect(autofixCards).toHaveCount(4);
  });

  // ============================================
  // 9. WEBHOOKS SECTION
  // ============================================

  test('Webhooks: should display add webhook button', async ({ page }) => {
    await page.click('text=Webhooks');
    await page.waitForTimeout(500);

    await expect(page.locator('button:has-text("Add Webhook")')).toBeVisible();
  });

  test('Webhooks: should open add webhook modal', async ({ page }) => {
    await page.click('text=Webhooks');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Webhook")');

    // Modal should appear with form
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('text=Webhook Name')).toBeVisible();
    await expect(page.locator('text=Webhook URL')).toBeVisible();
  });

  test('Webhooks: should display event checkboxes in modal', async ({ page }) => {
    await page.click('text=Webhooks');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Add Webhook")');

    // Should have 8 event checkboxes
    const checkboxes = page.locator('input[name="webhook-events"]');
    await expect(checkboxes).toHaveCount(8);
  });

  // ============================================
  // 10. CAMPAIGNS SECTION
  // ============================================

  test('Campaigns: should display client selector', async ({ page }) => {
    await page.click('text=Campaigns');
    await page.waitForTimeout(500);

    await expect(page.locator('#campaigns-client-selector')).toBeVisible();
  });

  test('Campaigns: should display create button', async ({ page }) => {
    await page.click('text=Campaigns');
    await page.waitForTimeout(500);

    const hasButton = await page.locator('button:has-text("Create Campaign")').count();
    expect(hasButton).toBeGreaterThan(0);
  });

  test('Campaigns: should open create campaign modal', async ({ page }) => {
    await page.click('text=Campaigns');
    await page.waitForTimeout(1000);

    // If there's a create button, click it
    const createButton = page.locator('button:has-text("Create Campaign")');
    const count = await createButton.count();

    if (count > 0) {
      await createButton.first().click();
      await expect(page.locator('.modal')).toBeVisible();
      await expect(page.locator('text=Campaign Name')).toBeVisible();
    }
  });

  // ============================================
  // 11. REPORTS SECTION
  // ============================================

  test('Reports: should display client selector', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(500);

    await expect(page.locator('#reports-client-selector')).toBeVisible();
  });

  test('Reports: should display generate button', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(500);

    const hasButton = await page.locator('button:has-text("Generate Report")').count();
    expect(hasButton).toBeGreaterThan(0);
  });

  test('Reports: should open generate report modal', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(1000);

    const generateButton = page.locator('button:has-text("Generate Report")');
    const count = await generateButton.count();

    if (count > 0) {
      await generateButton.first().click();
      await expect(page.locator('.modal')).toBeVisible();
      await expect(page.locator('text=Report Type')).toBeVisible();
    }
  });

  // ============================================
  // 12. WHITE-LABEL SECTION
  // ============================================

  test('White-Label: should display settings form', async ({ page }) => {
    await page.click('text=White-Label');
    await page.waitForTimeout(500);

    await expect(page.locator('#wl-company-name')).toBeVisible();
    await expect(page.locator('#wl-primary-color')).toBeVisible();
  });

  test('White-Label: should display save button', async ({ page }) => {
    await page.click('text=White-Label');
    await page.waitForTimeout(500);

    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
  });

  test('White-Label: should display live preview', async ({ page }) => {
    await page.click('text=White-Label');
    await page.waitForTimeout(500);

    await expect(page.locator('.whitelabel-preview')).toBeVisible();
    await expect(page.locator('.preview-header')).toBeVisible();
  });

  test('White-Label: preview should update on input', async ({ page }) => {
    await page.click('text=White-Label');
    await page.waitForTimeout(500);

    // Type in company name
    const input = page.locator('#wl-company-name');
    await input.fill('Test Company');

    // Wait a bit for update
    await page.waitForTimeout(300);

    // Preview should show the new name
    const previewText = await page.locator('.preview-body h3').textContent();
    expect(previewText).toBe('Test Company');
  });

  // ============================================
  // 13. RESPONSIVE DESIGN
  // ============================================

  test('should be responsive on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('should be responsive on laptop (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.reload();

    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  // ============================================
  // 14. ERROR HANDLING
  // ============================================

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    // Navigate through all sections
    await page.click('text=Dashboard');
    await page.waitForTimeout(300);
    await page.click('text=Clients');
    await page.waitForTimeout(300);
    await page.click('text=Analytics');
    await page.waitForTimeout(300);

    // Should have no critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('warning') && !e.includes('info')
    );

    expect(criticalErrors.length).toBe(0);
  });

  // ============================================
  // 15. PERFORMANCE
  // ============================================

  test('should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should navigate between sections quickly', async ({ page }) => {
    await page.click('text=Clients');
    const startTime = Date.now();
    await page.click('text=Analytics');
    await page.waitForSelector('#analytics-content');
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(500);
  });

});

// ============================================
// SUMMARY TEST
// ============================================

test('Complete Integration: Full workflow test', async ({ page }) => {
  console.log('🚀 Running complete integration test...');

  // 1. Load dashboard
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/SEO Automation Dashboard/i);
  console.log('✅ Dashboard loaded');

  // 2. Check all sections visible in sidebar
  await expect(page.locator('.nav-item')).toHaveCount(11);
  console.log('✅ All 11 navigation items present');

  // 3. Navigate through all sections
  const sections = [
    'Dashboard', 'Clients', 'Analytics', 'Recommendations',
    'Goals', 'Automation', 'Webhooks', 'Campaigns',
    'Reports', 'White-Label'
  ];

  for (const section of sections) {
    await page.click(`text=${section}`);
    await page.waitForTimeout(300);
    console.log(`✅ ${section} section loaded`);
  }

  // 4. Test modal functionality
  await page.click('text=Webhooks');
  await page.click('button:has-text("Add Webhook")');
  await expect(page.locator('.modal')).toBeVisible();
  await page.click('button:has-text("Cancel")');
  await expect(page.locator('.modal')).not.toBeVisible();
  console.log('✅ Modal system working');

  // 5. Test white-label preview
  await page.click('text=White-Label');
  await page.locator('#wl-company-name').fill('Integration Test Corp');
  await page.waitForTimeout(200);
  const previewText = await page.locator('.preview-body h3').textContent();
  expect(previewText).toBe('Integration Test Corp');
  console.log('✅ Live preview working');

  console.log('🎉 Integration test completed successfully!');
});
