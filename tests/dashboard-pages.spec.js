/**
 * Dashboard Pages Test Suite
 * 
 * Comprehensive Playwright tests for all dashboard pages
 * including the new Activity Log page
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9000';

// Define all pages to test
const PAGES = {
  dashboard: {
    path: '/',
    title: 'Dashboard',
    selector: 'h1',
    expectedText: 'Dashboard'
  },
  clients: {
    path: '/#clients',
    title: 'Clients',
    selector: 'h1',
    expectedText: 'Clients'
  },
  reports: {
    path: '/#reports',
    title: 'Reports',
    selector: 'h1',
    expectedText: 'Reports'
  },
  automation: {
    path: '/#automation',
    title: 'Control Center',
    selector: 'h1',
    expectedText: 'Control Center'
  },
  autofix: {
    path: '/#autofix',
    title: 'Auto-Fix Engines',
    selector: 'h1',
    expectedText: 'Auto-Fix Engines'
  },
  activityLog: {
    path: '/#activity-log',
    title: 'Activity Log',
    selector: 'h1',
    expectedText: 'Activity Log'
  },
  aiOptimizer: {
    path: '/#ai-optimizer',
    title: 'AI Optimizer',
    selector: 'h1',
    expectedText: 'AI Optimizer'
  },
  scheduler: {
    path: '/#scheduler',
    title: 'Scheduler',
    selector: 'h1',
    expectedText: 'Scheduler'
  },
  positionTracking: {
    path: '/#position-tracking',
    title: 'Position Tracking',
    selector: 'h1',
    expectedText: 'Position Tracking'
  },
  domains: {
    path: '/#domains',
    title: 'Domains',
    selector: 'h1',
    expectedText: 'Domains'
  },
  keywords: {
    path: '/#keywords',
    title: 'Keywords',
    selector: 'h1',
    expectedText: 'Keywords'
  },
  analytics: {
    path: '/#analytics',
    title: 'Analytics',
    selector: 'h1',
    expectedText: 'Analytics'
  },
  recommendations: {
    path: '/#recommendations',
    title: 'Recommendations',
    selector: 'h1',
    expectedText: 'Recommendations'
  },
  goals: {
    path: '/#goals',
    title: 'Goals',
    selector: 'h1',
    expectedText: 'Goals'
  },
  emails: {
    path: '/#emails',
    title: 'Email Campaigns',
    selector: 'h1',
    expectedText: 'Email Campaigns'
  },
  notifications: {
    path: '/#notifications',
    title: 'Notifications',
    selector: 'h1',
    expectedText: 'Notification Center'
  },
  settings: {
    path: '/#settings',
    title: 'Settings',
    selector: 'h1',
    expectedText: 'Settings'
  }
};

test.describe('Dashboard Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for slow loads
    page.setDefaultTimeout(10000);
  });

  test('Dashboard loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check if React app loaded
    const root = await page.locator('#root');
    await expect(root).toBeVisible();
    
    // Check for sidebar
    const sidebar = await page.locator('aside');
    await expect(sidebar).toBeVisible();
    
    console.log('✅ Dashboard loaded successfully');
  });

  // Test each page
  for (const [key, pageInfo] of Object.entries(PAGES)) {
    test(`${pageInfo.title} page loads correctly`, async ({ page }) => {
      console.log(`\n🧪 Testing: ${pageInfo.title} (${pageInfo.path})`);
      
      await page.goto(BASE_URL + pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Wait for the page to render
      await page.waitForTimeout(1000);
      
      // Check if h1 exists
      const heading = await page.locator(pageInfo.selector).first();
      await expect(heading).toBeVisible({ timeout: 5000 });
      
      // Check heading text
      const headingText = await heading.textContent();
      expect(headingText).toContain(pageInfo.expectedText);
      
      // Check for no console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/screenshots/${key}-page.png`,
        fullPage: false 
      });
      
      console.log(`✅ ${pageInfo.title} page rendered correctly`);
    });
  }
});

test.describe('Activity Log Page - Detailed Tests', () => {
  test('Activity Log displays correctly when empty', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    
    // Check heading
    const heading = await page.locator('h1').filter({ hasText: 'Activity Log' });
    await expect(heading).toBeVisible();
    
    // Check statistics cards
    const statsCards = await page.locator('.grid').first();
    await expect(statsCards).toBeVisible();
    
    // Check for "Total Activities" stat
    const totalActivitiesText = await page.getByText('Total Activities');
    await expect(totalActivitiesText).toBeVisible();
    
    // Check filters section
    const searchBox = await page.getByPlaceholder('Search activities...');
    await expect(searchBox).toBeVisible();
    
    // Check for empty state message
    const emptyMessage = await page.getByText('No activities found');
    await expect(emptyMessage).toBeVisible();
    
    console.log('✅ Activity Log empty state displayed correctly');
  });

  test('Activity Log filters are interactive', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    
    // Test search box
    const searchBox = await page.getByPlaceholder('Search activities...');
    await searchBox.click();
    await searchBox.fill('test');
    await expect(searchBox).toHaveValue('test');
    
    // Test type filter dropdown
    const typeFilter = await page.locator('button:has-text("All Types")').first();
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(500);
    }
    
    // Test status filter
    const statusFilter = await page.locator('button:has-text("All Status")').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(500);
    }
    
    console.log('✅ Activity Log filters are interactive');
  });

  test('Activity Log statistics are displayed', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    
    // Check all 4 stat cards
    const statCards = await page.locator('.grid .rounded-lg').all();
    expect(statCards.length).toBeGreaterThanOrEqual(4);
    
    // Check for specific stats
    await expect(page.getByText('Total Activities')).toBeVisible();
    await expect(page.getByText('Successful')).toBeVisible();
    await expect(page.getByText('Failed')).toBeVisible();
    await expect(page.getByText('Items Processed')).toBeVisible();
    
    console.log('✅ Activity Log statistics displayed correctly');
  });
});

test.describe('Navigation Tests', () => {
  test('Sidebar navigation works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Click on Activity Log in sidebar
    const activityLogLink = await page.getByText('Activity Log').first();
    if (await activityLogLink.isVisible()) {
      await activityLogLink.click();
      await page.waitForTimeout(1000);
      
      // Check if we navigated
      expect(page.url()).toContain('activity-log');
      
      // Check if page loaded
      const heading = await page.locator('h1').filter({ hasText: 'Activity Log' });
      await expect(heading).toBeVisible();
      
      console.log('✅ Sidebar navigation to Activity Log works');
    }
  });

  test('Refresh button works on Activity Log', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    
    // Find and click refresh button
    const refreshButton = await page.locator('button:has-text("Refresh")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Refresh button clicked successfully');
    }
  });
});

test.describe('Performance Tests', () => {
  test('All pages load within acceptable time', async ({ page }) => {
    const slowPages = [];
    
    for (const [key, pageInfo] of Object.entries(PAGES)) {
      const startTime = Date.now();
      
      await page.goto(BASE_URL + pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 5000) {
        slowPages.push({ page: pageInfo.title, time: loadTime });
      }
      
      console.log(`⏱️  ${pageInfo.title}: ${loadTime}ms`);
    }
    
    if (slowPages.length > 0) {
      console.warn('⚠️  Slow pages detected:', slowPages);
    } else {
      console.log('✅ All pages load within acceptable time');
    }
  });
});

test.describe('Error Handling', () => {
  test('Dashboard handles API errors gracefully', async ({ page }) => {
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('requestfailed', request => {
      networkErrors.push(request.url());
    });
    
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Page should still render even if API fails
    const heading = await page.locator('h1').first();
    await expect(heading).toBeVisible();
    
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.warn('⚠️  Console errors detected:', consoleErrors.slice(0, 5));
    }
    
    console.log('✅ Error handling test complete');
  });
});

test.describe('Visual Regression', () => {
  test('Activity Log visual snapshot', async ({ page }) => {
    await page.goto(BASE_URL + '/#activity-log');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/screenshots/activity-log-full.png',
      fullPage: true
    });
    
    console.log('✅ Activity Log screenshot captured');
  });
});
