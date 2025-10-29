/**
 * Quick Dashboard Check
 * Fast smoke tests for critical pages
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9000';

test.describe('Quick Dashboard Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(5000);
  });

  test('Dashboard loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#root')).toBeVisible();
    console.log('✅ Dashboard loaded');
  });

  test('Activity Log page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForTimeout(2000);
    
    const heading = await page.locator('h1').filter({ hasText: 'Activity Log' });
    await expect(heading).toBeVisible();
    
    // Check stats cards
    await expect(page.getByText('Total Activities')).toBeVisible();
    await expect(page.getByText('Successful')).toBeVisible();
    await expect(page.getByText('Failed')).toBeVisible();
    
    // Check filters
    await expect(page.getByPlaceholder('Search activities...')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/screenshots/activity-log.png' });
    console.log('✅ Activity Log page verified');
  });

  test('Auto-Fix page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/#autofix');
    await page.waitForTimeout(2000);
    
    const heading = await page.locator('h1').filter({ hasText: 'Auto-Fix' });
    await expect(heading).toBeVisible();
    console.log('✅ Auto-Fix page loaded');
  });

  test('Clients page loads', async ({ page }) => {
    await page.goto(BASE_URL + '/#clients');
    await page.waitForTimeout(2000);
    
    const heading = await page.locator('h1').filter({ hasText: 'Clients' });
    await expect(heading).toBeVisible();
    console.log('✅ Clients page loaded');
  });

  test('Navigation to Activity Log works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    
    // Click Activity Log in sidebar
    const link = page.getByText('Activity Log').first();
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForTimeout(1500);
      
      expect(page.url()).toContain('activity-log');
      await expect(page.locator('h1').filter({ hasText: 'Activity Log' })).toBeVisible();
      console.log('✅ Navigation to Activity Log works');
    }
  });
});
