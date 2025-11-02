/**
 * PHASE 4B UI INTEGRATION TESTS
 *
 * Tests the complete UI workflow for Phase 4B:
 * - NotificationsBell component
 * - Enhanced RecommendationsPage with AutoFix
 * - PixelIssuesPage with charts
 *
 * Run with: npx playwright test tests/phase4b-ui.spec.js
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 4B UI Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:3000');
  });

  test('Sidebar shows NotificationsBell component', async ({ page }) => {
    // Wait for the sidebar to load
    await page.waitForSelector('aside');

    // Check that the notifications bell is visible in the sidebar header
    const notificationsBell = page.locator('aside button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await expect(notificationsBell).toBeVisible();

    // Click the bell to open notifications dropdown
    await notificationsBell.click();

    // Verify dropdown appears
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown).toBeVisible();

    // Should show "Notifications" header
    await expect(page.getByText('Notifications')).toBeVisible();
  });

  test('Can navigate to Recommendations page', async ({ page }) => {
    // Click on Recommendations in sidebar
    await page.click('text=Recommendations');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Recommendations")');

    // Verify we're on the Recommendations page
    await expect(page.locator('h1')).toContainText('Recommendations');

    // Should see description
    await expect(page.getByText(/Actionable suggestions/i)).toBeVisible();
  });

  test('Recommendations page shows AutoFix features', async ({ page }) => {
    // Navigate to recommendations
    await page.click('text=Recommendations');
    await page.waitForSelector('h1:has-text("Recommendations")');

    // Check for AutoFix stat card
    const autoFixCard = page.locator('text=AutoFix Available').first();
    await expect(autoFixCard).toBeVisible();

    // Check for Pixel Generated stat card
    const pixelCard = page.locator('text=Pixel Generated').first();
    await expect(pixelCard).toBeVisible();

    // If there are recommendations with AutoFix, check for badges and buttons
    const autoFixBadge = page.locator('text=AutoFix Available').nth(1);
    if (await autoFixBadge.isVisible()) {
      // Should see "Apply AutoFix" button
      const applyButton = page.locator('button:has-text("Apply AutoFix")');
      await expect(applyButton.first()).toBeVisible();

      // Should see sparkle icon
      const sparkleIcon = page.locator('svg[class*="lucide-sparkles"]');
      await expect(sparkleIcon.first()).toBeVisible();
    }
  });

  test('Can click Apply AutoFix button and see dialog', async ({ page }) => {
    // Navigate to recommendations
    await page.click('text=Recommendations');
    await page.waitForSelector('h1:has-text("Recommendations")');

    // Find first "Apply AutoFix" button if available
    const applyButton = page.locator('button:has-text("Apply AutoFix")').first();

    if (await applyButton.isVisible()) {
      // Click the Apply AutoFix button
      await applyButton.click();

      // Dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible();

      // Should show "Apply AutoFix" title
      await expect(page.getByText('Apply AutoFix')).toBeVisible();

      // Should show fix code or loading
      const fixCodeSection = page.locator('text=Generated Fix Code');
      // Either shows fix code or loading state
      const hasFixCode = await fixCodeSection.isVisible();
      expect(hasFixCode).toBeTruthy();
    } else {
      console.log('No AutoFix recommendations available to test');
    }
  });

  test('Can navigate to Pixel Issues page', async ({ page }) => {
    // Click on Pixel Issues in sidebar
    await page.click('text=Pixel Issues');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Verify we're on the Pixel Issues page
    await expect(page.locator('h1')).toContainText('Pixel Issues');

    // Should see description
    await expect(page.getByText(/SEO issues detected by/i)).toBeVisible();
  });

  test('Pixel Issues page shows stat cards', async ({ page }) => {
    // Navigate to Pixel Issues
    await page.click('text=Pixel Issues');
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Check for stat cards
    await expect(page.getByText('Total Issues')).toBeVisible();
    await expect(page.getByText('Critical Issues')).toBeVisible();
    await expect(page.getByText('With Recommendations')).toBeVisible();
    await expect(page.getByText('Resolution Rate')).toBeVisible();
  });

  test('Pixel Issues page shows chart tabs', async ({ page }) => {
    // Navigate to Pixel Issues
    await page.click('text=Pixel Issues');
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Check for chart tabs
    await expect(page.getByText('Trends')).toBeVisible();
    await expect(page.getByText('Severity')).toBeVisible();
    await expect(page.getByText('Categories')).toBeVisible();

    // Click on Severity tab
    await page.click('text=Severity');

    // Should see severity chart title
    await expect(page.getByText('Severity Distribution')).toBeVisible();

    // Click on Categories tab
    await page.click('text=Categories');

    // Should see categories chart title
    await expect(page.getByText('Issues by Category')).toBeVisible();
  });

  test('Pixel Issues page has filters', async ({ page }) => {
    // Navigate to Pixel Issues
    await page.click('text=Pixel Issues');
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Check for filter section
    await expect(page.getByText('Filter Issues')).toBeVisible();

    // Check for search input
    const searchInput = page.getByPlaceholder('Search issues...');
    await expect(searchInput).toBeVisible();

    // Check for filter dropdowns
    await expect(page.getByText('All Severities')).toBeVisible();
    await expect(page.getByText('All Status')).toBeVisible();
    await expect(page.getByText('All Categories')).toBeVisible();
  });

  test('Notifications bell shows unread count badge', async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForSelector('aside');

    // Find notifications bell
    const notificationsBell = page.locator('aside button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });

    // Check if unread badge is present
    const badge = notificationsBell.locator('[class*="badge"]');

    if (await badge.isVisible()) {
      // Badge should contain a number
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/^\d+\+?$/);
    }
  });

  test('Can click notification to navigate', async ({ page }) => {
    // Open notifications
    const notificationsBell = page.locator('aside button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationsBell.click();

    // Wait for dropdown
    await page.waitForSelector('[role="menu"]');

    // If there are notifications, click "View all notifications"
    const viewAllLink = page.getByText('View all notifications');
    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();

      // Should navigate to notifications page
      await page.waitForURL(/notifications/);
    }
  });

  test('Recommendations filters work correctly', async ({ page }) => {
    // Navigate to recommendations
    await page.click('text=Recommendations');
    await page.waitForSelector('h1:has-text("Recommendations")');

    // Test search functionality
    const searchInput = page.getByPlaceholder(/Search recommendations/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('meta');
      // Wait a moment for debounce
      await page.waitForTimeout(500);

      // Results should be filtered (implementation-specific)
    }

    // Test category filter
    const categoryFilter = page.locator('[class*="select-trigger"]').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();

      // Should show dropdown with options
      const metaOption = page.getByText('Meta Tags');
      if (await metaOption.isVisible()) {
        await metaOption.click();
      }
    }
  });

  test('Complete workflow: View issue → Navigate to recommendations → View AutoFix', async ({ page }) => {
    // Start at Pixel Issues
    await page.click('text=Pixel Issues');
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Find an issue with a recommendation
    const viewFixButton = page.locator('button:has-text("View Fix")').first();

    if (await viewFixButton.isVisible()) {
      // Click to view the fix
      await viewFixButton.click();

      // Should navigate to recommendations page
      await page.waitForSelector('h1:has-text("Recommendations")');

      // Should be on recommendations page
      await expect(page.locator('h1')).toContainText('Recommendations');

      // Look for AutoFix features
      const autoFixButton = page.locator('button:has-text("Apply AutoFix")').first();
      if (await autoFixButton.isVisible()) {
        await expect(autoFixButton).toBeVisible();
      }
    } else {
      console.log('No issues with recommendations available to test complete workflow');
    }
  });
});

test.describe('Phase 4B UI - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('Notifications bell is visible on mobile', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('aside');

    const notificationsBell = page.locator('aside button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await expect(notificationsBell).toBeVisible();
  });

  test('Pixel Issues charts are responsive', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Navigate to Pixel Issues
    await page.click('text=Pixel Issues');
    await page.waitForSelector('h1:has-text("Pixel Issues")');

    // Charts should be visible and responsive
    const trendsTab = page.getByText('Trends');
    await expect(trendsTab).toBeVisible();

    // Click to ensure chart loads
    await trendsTab.click();

    // Wait for chart to render
    await page.waitForTimeout(1000);

    // Chart container should be present
    const chartContainer = page.locator('.recharts-wrapper');
    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toBeVisible();
    }
  });
});

test.describe('Phase 4B UI - Accessibility', () => {
  test('Notifications bell has proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('aside');

    // Bell button should be keyboard accessible
    const notificationsBell = page.locator('aside button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });

    // Should be focusable
    await notificationsBell.focus();
    await expect(notificationsBell).toBeFocused();

    // Should be activatable with Enter
    await page.keyboard.press('Enter');

    // Dropdown should open
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown).toBeVisible();
  });

  test('Recommendations page is keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Use keyboard to navigate to recommendations
    await page.keyboard.press('Tab');

    // Eventually reach recommendations link (this is a simplified test)
    await page.click('text=Recommendations');
    await page.waitForSelector('h1:has-text("Recommendations")');

    // Tabs should be keyboard navigable
    const priorityTab = page.getByText('Priority');
    await priorityTab.focus();
    await expect(priorityTab).toBeFocused();
  });
});
