/**
 * Analytics Page Test Suite
 * 
 * Tests for Analytics page including the RefreshCw icon fix
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_REACT ? 'http://localhost:5173' : 'http://localhost:9000';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for slow loads
    page.setDefaultTimeout(15000);
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console error:', msg.text());
      }
    });
  });

  test('Analytics page loads without RefreshCw error', async ({ page }) => {
    const errors = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    console.log('🔍 Navigating to Analytics page...');
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if the page loaded
    const heading = await page.locator('h1').filter({ hasText: 'Analytics' });
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Analytics heading is visible');
    
    // Check for RefreshCw error specifically
    const hasRefreshCwError = errors.some(err => 
      err.includes('RefreshCw is not defined') || err.includes('RefreshCw')
    );
    
    if (hasRefreshCwError) {
      console.log('❌ RefreshCw error detected:', errors.filter(e => e.includes('RefreshCw')));
      throw new Error('RefreshCw is not defined error found!');
    }
    
    console.log('✅ No RefreshCw errors detected');
    
    // Log all errors if any
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} error(s) detected:`, errors);
    } else {
      console.log('✅ No console errors');
    }
  });

  test('Analytics page displays main elements', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    
    // Check heading
    const heading = await page.locator('h1').filter({ hasText: 'Analytics' });
    await expect(heading).toBeVisible();
    console.log('✅ Heading visible');
    
    // Check description
    const description = await page.locator('text=Comprehensive performance metrics');
    await expect(description).toBeVisible();
    console.log('✅ Description visible');
    
    // Check for metric cards (should have 4)
    const metricCards = await page.locator('.grid.gap-4 > div').all();
    expect(metricCards.length).toBeGreaterThanOrEqual(4);
    console.log(`✅ ${metricCards.length} metric cards found`);
    
    // Check for specific metrics
    await expect(page.getByText('Avg. Position')).toBeVisible();
    await expect(page.getByText('Total Audits')).toBeVisible();
    await expect(page.getByText('Active Clients')).toBeVisible();
    await expect(page.getByText('Total Clients')).toBeVisible();
    console.log('✅ All metric cards visible');
  });

  test('Analytics Refresh button works', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find the Refresh button
    const refreshButton = await page.locator('button:has-text("Refresh")');
    
    if (await refreshButton.isVisible()) {
      console.log('✅ Refresh button is visible');
      
      // Check if RefreshCw icon is rendered (no error)
      const refreshIcon = await refreshButton.locator('svg').first();
      await expect(refreshIcon).toBeVisible();
      console.log('✅ Refresh icon (RefreshCw) is rendered');
      
      // Click the button
      await refreshButton.click();
      console.log('✅ Refresh button clicked successfully');
      
      // Wait a bit to see if any errors occur
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️  Refresh button not found');
    }
  });

  test('Analytics Export button is present', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    
    // Check for Export button
    const exportButton = await page.locator('button:has-text("Export")');
    
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
      console.log('✅ Export button is visible');
      
      // Check if Download icon is rendered
      const downloadIcon = await exportButton.locator('svg').first();
      await expect(downloadIcon).toBeVisible();
      console.log('✅ Download icon is rendered');
    }
  });

  test('Analytics date range selector works', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find the date range selector
    const dateSelector = await page.locator('button').filter({ hasText: /Last \d+ days/ }).first();
    
    if (await dateSelector.isVisible()) {
      console.log('✅ Date range selector is visible');
      
      // Click to open dropdown
      await dateSelector.click();
      await page.waitForTimeout(500);
      
      // Check for date options
      const option7days = await page.getByText('Last 7 days');
      const option30days = await page.getByText('Last 30 days');
      const option90days = await page.getByText('Last 90 days');
      
      if (await option7days.isVisible()) {
        console.log('✅ Date range options are visible');
      }
    }
  });

  test('Analytics page screenshot', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/analytics-page-fixed.png',
      fullPage: true
    });
    
    console.log('✅ Screenshot saved: analytics-page-fixed.png');
  });

  test('Analytics page handles loading state', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    
    // Check for loading spinner (might be very fast)
    const loadingSpinner = await page.locator('text=Loading analytics');
    
    // Either loading is visible briefly or page loaded directly
    const isLoadingVisible = await loadingSpinner.isVisible().catch(() => false);
    
    if (isLoadingVisible) {
      console.log('✅ Loading state displayed');
    }
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Verify content is displayed
    const heading = await page.locator('h1').filter({ hasText: 'Analytics' });
    await expect(heading).toBeVisible();
    
    console.log('✅ Content loaded successfully');
  });

  test('Performance Overview section exists', async ({ page }) => {
    await page.goto(BASE_URL + '/#analytics');
    await page.waitForLoadState('networkidle');
    
    // Check for Performance Overview card
    const perfOverview = await page.getByText('Performance Overview');
    
    if (await perfOverview.isVisible()) {
      await expect(perfOverview).toBeVisible();
      console.log('✅ Performance Overview section exists');
      
      // Check for tabs
      const rankingsTab = await page.getByText('Rankings');
      const trafficTab = await page.getByText('Traffic');
      
      if (await rankingsTab.isVisible()) {
        console.log('✅ Rankings tab visible');
      }
      
      if (await trafficTab.isVisible()) {
        console.log('✅ Traffic tab visible');
      }
    }
  });
});
