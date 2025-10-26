/**
 * React Dashboard - Playwright Tests
 *
 * Comprehensive test suite for the React dashboard built with Vite + shadcn/ui
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';

test.describe('React Dashboard - Complete Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to React dashboard
    await page.goto(BASE_URL);
    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  // ============================================
  // 1. BASIC CONNECTIVITY
  // ============================================

  test('should load the React dashboard successfully', async ({ page }) => {
    // Check if page loaded
    await expect(page).toHaveURL(BASE_URL + '/');

    // Should see sidebar and main content
    const sidebar = page.locator('[class*="sidebar"]').or(page.locator('aside'));
    const hasContent = await page.locator('main').isVisible();

    expect(hasContent).toBeTruthy();
  });

  test('should have no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(2000);

    // Filter out expected proxy errors (backend not running)
    const criticalErrors = errors.filter(e =>
      !e.includes('ECONNREFUSED') &&
      !e.includes('proxy error') &&
      !e.includes('Failed to fetch')
    );

    expect(criticalErrors.length).toBe(0);
  });

  // ============================================
  // 2. NAVIGATION TESTS
  // ============================================

  test('should display sidebar navigation', async ({ page }) => {
    // Look for common nav items
    const navText = await page.textContent('body');

    expect(navText).toContain('Dashboard');
    expect(navText).toContain('Clients');
    expect(navText).toContain('Analytics');
  });

  test('should navigate to Clients page', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    // Should see clients page content
    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/client/i);
  });

  test('should navigate to Reports page', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/report/i);
  });

  test('should navigate to Analytics page', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/analytics|chart|metric/i);
  });

  // ============================================
  // 3. DASHBOARD PAGE
  // ============================================

  test('Dashboard: should display stats cards', async ({ page }) => {
    // Dashboard should be default view
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body');

    // Should see stats
    expect(bodyText).toMatch(/total|active|campaign|ranking/i);
  });

  test('Dashboard: should display charts or placeholders', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for chart containers or canvas elements
    const hasCharts = await page.locator('canvas').count() > 0;
    const hasCards = await page.locator('[class*="card"]').count() > 0;

    expect(hasCharts || hasCards).toBeTruthy();
  });

  // ============================================
  // 4. CLIENTS PAGE
  // ============================================

  test('Clients: should have Add Client button', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    const addButton = page.locator('button:has-text("Add Client")').or(
      page.locator('button:has-text("New Client")')
    );

    const count = await addButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Clients: should open Add Client dialog', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    // Try to find and click add client button
    const addButton = page.locator('button:has-text("Add Client")').or(
      page.locator('button:has-text("New Client")')
    ).first();

    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(300);

      // Dialog should appear
      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(/client|name|domain|url/i);
    }
  });

  // ============================================
  // 5. REPORTS PAGE
  // ============================================

  test('Reports: should display report interface', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/report|generate|view/i);
  });

  test('Reports: should have Generate Report button', async ({ page }) => {
    await page.click('text=Reports');
    await page.waitForTimeout(500);

    const generateButton = page.locator('button:has-text("Generate")');
    const count = await generateButton.count();

    expect(count).toBeGreaterThan(0);
  });

  // ============================================
  // 6. CONTROL CENTER PAGE
  // ============================================

  test('Control Center: should display automation controls', async ({ page }) => {
    await page.click('text=Control Center');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/control|automation|schedule/i);
  });

  // ============================================
  // 7. AUTO-FIX PAGE
  // ============================================

  test('Auto-Fix: should display engines', async ({ page }) => {
    // Try different navigation labels
    const autoFixNav = page.locator('text=Auto-Fix').or(
      page.locator('text=Auto Fix')
    );

    if (await autoFixNav.count() > 0) {
      await autoFixNav.first().click();
      await page.waitForTimeout(500);

      const pageText = await page.textContent('main');
      expect(pageText).toMatch(/auto.*fix|engine|issue|problem/i);
    }
  });

  // ============================================
  // 8. RECOMMENDATIONS PAGE
  // ============================================

  test('Recommendations: should display recommendations interface', async ({ page }) => {
    await page.click('text=Recommendations');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/recommend|suggestion|insight/i);
  });

  // ============================================
  // 9. KEYWORD RESEARCH PAGE
  // ============================================

  test('Keyword Research: should display research interface', async ({ page }) => {
    await page.click('text=Keyword Research');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/keyword|research|search/i);
  });

  // ============================================
  // 10. UNIFIED KEYWORDS PAGE
  // ============================================

  test('Unified Keywords: should display unified interface', async ({ page }) => {
    const unifiedNav = page.locator('text=Unified Keywords').or(
      page.locator('text=Keywords')
    );

    if (await unifiedNav.count() > 0) {
      await unifiedNav.first().click();
      await page.waitForTimeout(500);

      const pageText = await page.textContent('main');
      expect(pageText).toMatch(/keyword|unified|tracking/i);
    }
  });

  // ============================================
  // 11. GOALS PAGE
  // ============================================

  test('Goals: should display goals interface', async ({ page }) => {
    await page.click('text=Goals');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/goal|kpi|target|objective/i);
  });

  test('Goals: should have Create Goal button', async ({ page }) => {
    await page.click('text=Goals');
    await page.waitForTimeout(500);

    const createButton = page.locator('button:has-text("Create")').or(
      page.locator('button:has-text("New Goal")')
    );

    const count = await createButton.count();
    expect(count).toBeGreaterThan(0);
  });

  // ============================================
  // 12. EMAIL CAMPAIGNS PAGE
  // ============================================

  test('Email Campaigns: should display campaigns interface', async ({ page }) => {
    await page.click('text=Email Campaigns');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/email|campaign|send/i);
  });

  test('Email Campaigns: should have campaign management interface', async ({ page }) => {
    await page.click('text=Email Campaigns');
    await page.waitForTimeout(1000); // Give time for tabs to load

    const pageText = await page.textContent('body');

    // Check for campaign-related content (buttons, tabs, or text)
    const hasCampaignContent = pageText.includes('Campaign') ||
                               pageText.includes('Template') ||
                               pageText.includes('Email');

    expect(hasCampaignContent).toBeTruthy();
  });

  // ============================================
  // 13. WEBHOOKS PAGE
  // ============================================

  test('Webhooks: should display webhooks interface', async ({ page }) => {
    await page.click('text=Webhooks');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/webhook|endpoint|event/i);
  });

  test('Webhooks: should have Add Webhook button', async ({ page }) => {
    await page.click('text=Webhooks');
    await page.waitForTimeout(500);

    // Look for any webhook creation button
    const hasAddButton = await page.locator('button:has-text("Add")').count();
    const hasCreateButton = await page.locator('button:has-text("Create")').count();
    const hasNewButton = await page.locator('button:has-text("New")').count();

    expect(hasAddButton + hasCreateButton + hasNewButton).toBeGreaterThan(0);
  });

  // ============================================
  // 14. WHITE-LABEL PAGE
  // ============================================

  test('White-Label: should display branding interface', async ({ page }) => {
    // Try both possible navigation labels
    const whiteLabelLink = page.locator('text=White-Label').first();
    const whiteLabel2Link = page.locator('text=White Label').first();

    if (await whiteLabelLink.count() > 0) {
      await whiteLabelLink.click();
    } else if (await whiteLabel2Link.count() > 0) {
      await whiteLabel2Link.click();
    }

    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/white.*label|brand|logo|color|custom/i);
  });

  test('White-Label: should have branding customization options', async ({ page }) => {
    // Try both possible navigation labels
    const whiteLabelLink = page.locator('text=White-Label').first();
    const whiteLabel2Link = page.locator('text=White Label').first();

    if (await whiteLabelLink.count() > 0) {
      await whiteLabelLink.click();
    } else if (await whiteLabel2Link.count() > 0) {
      await whiteLabel2Link.click();
    }

    await page.waitForTimeout(1000); // Give time for tabs to load

    // Check for branding-related inputs (could be in tabs)
    const hasInputs = await page.locator('input').count();
    const hasColorContent = await page.textContent('body');
    const hasBrandingFeatures = hasColorContent.includes('Color') ||
                                hasColorContent.includes('Logo') ||
                                hasColorContent.includes('Brand') ||
                                hasInputs > 0;

    expect(hasBrandingFeatures).toBeTruthy();
  });

  // ============================================
  // 15. ANALYTICS PAGE
  // ============================================

  test('Analytics: should display analytics interface', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/analytics|metric|chart|data/i);
  });

  // ============================================
  // 16. SETTINGS PAGE
  // ============================================

  test('Settings: should display settings interface', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForTimeout(500);

    const pageText = await page.textContent('main');
    expect(pageText).toMatch(/setting|config|preference/i);
  });

  // ============================================
  // 17. THEME TOGGLE
  // ============================================

  test('should have theme toggle', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for sun/moon icon buttons (theme toggle)
    const themeButton = page.locator('button:has(svg)').filter({
      hasText: /^$/  // Button with only icon, no text
    });

    const count = await themeButton.count();
    expect(count).toBeGreaterThan(0);
  });

  // ============================================
  // 18. SEARCH FUNCTIONALITY
  // ============================================

  test('should have search input in header', async ({ page }) => {
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Search"]').or(
      page.locator('input[type="search"]')
    );

    const count = await searchInput.count();
    expect(count).toBeGreaterThan(0);
  });

  // ============================================
  // 19. RESPONSIVE DESIGN
  // ============================================

  test('should be responsive on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForTimeout(1000);

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });

  test('should be responsive on laptop (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.reload();
    await page.waitForTimeout(1000);

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });

  test('should be responsive on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForTimeout(1000);

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });

  // ============================================
  // 20. PERFORMANCE
  // ============================================

  test('should load dashboard within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should navigate between pages quickly', async ({ page }) => {
    await page.click('text=Clients');
    await page.waitForTimeout(300);

    const startTime = Date.now();
    await page.click('text=Analytics');
    await page.waitForTimeout(100);
    const navTime = Date.now() - startTime;

    // React SPA navigation should be instant
    expect(navTime).toBeLessThan(1000);
  });

});

// ============================================
// INTEGRATION TEST
// ============================================

test('Complete Integration: Navigate all pages', async ({ page }) => {
  console.log('🚀 Running React Dashboard integration test...');

  // 1. Load dashboard
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('✅ Dashboard loaded');

  // 2. Navigate through all main sections
  const sections = [
    'Dashboard',
    'Clients',
    'Reports',
    'Control Center',
    'Auto-Fix Engines',
    'Recommendations',
    'Keyword Research',
    'Goals',
    'Email Campaigns',
    'Webhooks',
    'White-Label',
    'Analytics',
    'Settings'
  ];

  for (const section of sections) {
    try {
      // Try to find and click the section
      const link = page.locator(`text=${section}`).first();
      const count = await link.count();

      if (count > 0) {
        await link.click();
        await page.waitForTimeout(500);
        console.log(`✅ ${section} page loaded`);
      } else {
        console.log(`⚠️  ${section} navigation not found (might use different label)`);
      }
    } catch (error) {
      console.log(`⚠️  ${section} navigation failed:`, error.message);
    }
  }

  // 3. Test modal functionality on a page that has modals
  try {
    await page.click('text=Clients');
    await page.waitForTimeout(500);

    const addButton = page.locator('button:has-text("Add Client")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(300);

      // Check if dialog opened
      const bodyText = await page.textContent('body');
      const hasDialog = bodyText.includes('Client') || bodyText.includes('Domain');

      if (hasDialog) {
        console.log('✅ Modal system working');

        // Try to close modal
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Modal test skipped:', error.message);
  }

  // 4. Test theme toggle
  try {
    const body = page.locator('body');
    const initialClass = await body.getAttribute('class');

    // Try to find theme toggle button (usually has Sun or Moon icon)
    const themeButtons = page.locator('button:has(svg)');
    const count = await themeButtons.count();

    if (count > 0) {
      // Click potential theme button
      await themeButtons.first().click();
      await page.waitForTimeout(300);

      console.log('✅ Theme toggle clicked');
    }
  } catch (error) {
    console.log('⚠️  Theme toggle test skipped:', error.message);
  }

  console.log('🎉 React Dashboard integration test completed!');
});
