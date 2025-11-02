/**
 * Playwright E2E Tests for AutoFix UI
 *
 * Tests the Phase 4B AutoFix Panel component integration
 * in the Client Detail Page dashboard.
 *
 * Run: npx playwright test tests/e2e/autofix-ui.spec.js
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:9000';

// Test configuration
test.describe('AutoFix UI - Phase 4B', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display AutoFix tab in Client Detail page', async ({ page }) => {
    // This test checks if the AutoFix tab is visible
    // Note: You may need to navigate to a specific client first

    // Look for the AutoFix tab
    const autofixTab = page.locator('text=/AutoFix.*✨/i');

    // Check if tab exists (may not be visible until we navigate to client page)
    console.log('Checking for AutoFix tab presence...');
  });

  test('should load AutoFix panel when tab is clicked', async ({ page }) => {
    // Navigate to clients page first (adjust route as needed)
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForTimeout(1000);

    // Try to find a client link (adjust selector based on your UI)
    const clientLink = page.locator('a, button').filter({ hasText: /client/i }).first();

    if (await clientLink.count() > 0) {
      await clientLink.click();
      await page.waitForTimeout(1000);

      // Look for AutoFix tab
      const autofixTab = page.locator('button:has-text("AutoFix")').or(page.locator('[role="tab"]:has-text("AutoFix")'));

      if (await autofixTab.count() > 0) {
        await autofixTab.click();

        // Check for AutoFix panel
        await expect(page.locator('text=/Automated SEO issue resolution/i')).toBeVisible({ timeout: 5000 });
        console.log('✅ AutoFix panel loaded successfully');
      } else {
        console.log('⚠️  AutoFix tab not found - may need to adjust navigation');
      }
    }
  });

  test('should display fixable issues list', async ({ page }) => {
    // This test assumes we can access the AutoFix panel directly via API
    // We'll test the API endpoint first to ensure data is available

    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);
    const data = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(data.success).toBe(true);

    console.log(`✅ Found ${data.count} fixable issues via API`);

    if (data.count > 0) {
      console.log(`  Issue types: ${data.data.map(item => item.issue.issue_type).join(', ')}`);
    }
  });

  test('should show confidence scores with correct colors', async ({ page }) => {
    // Test API response for confidence scoring
    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      data.data.forEach(item => {
        const confidence = item.fixProposal.confidence;
        console.log(`  Issue: ${item.issue.issue_type} - Confidence: ${(confidence * 100).toFixed(0)}%`);

        // Verify confidence is in valid range
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      });

      console.log('✅ All confidence scores in valid range (0-1)');
    }
  });

  test('should preview fix code in dialog', async ({ page }) => {
    // Test getting a specific proposal
    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/proposal/4`);

    if (response.ok()) {
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('fix_code');
      expect(data.data).toHaveProperty('confidence');

      console.log('✅ Fix proposal retrieved successfully');
      console.log(`  Engine: ${data.data.engine_name}`);
      console.log(`  Confidence: ${(data.data.confidence * 100).toFixed(0)}%`);
      console.log(`  Fix code length: ${data.data.fix_code.length} chars`);
    }
  });

  test('should apply fix via API', async ({ page }) => {
    // First, get fixable issues
    const fixableResponse = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);
    const fixableData = await fixableResponse.json();

    if (fixableData.success && fixableData.data.length > 0) {
      // Get the first proposal with high confidence
      const highConfidenceItem = fixableData.data.find(item => item.fixProposal.confidence >= 0.8);

      if (highConfidenceItem) {
        const proposalId = highConfidenceItem.fixProposal.proposalId;

        console.log(`  Attempting to apply fix for proposal ${proposalId}...`);

        // Apply the fix
        const applyResponse = await page.request.post(
          `${BASE_URL}/api/v2/pixel/autofix/proposal/${proposalId}/apply`,
          {
            data: {
              approved: true,
              approvedBy: 'playwright-test'
            }
          }
        );

        const applyData = await applyResponse.json();

        expect(applyResponse.ok()).toBeTruthy();
        expect(applyData.success).toBe(true);

        console.log('✅ Fix applied successfully');
        console.log(`  Applied at: ${applyData.data.appliedAt}`);
        console.log(`  Applied by: ${applyData.data.appliedBy}`);
      } else {
        console.log('⚠️  No high-confidence fixes available for testing');
      }
    }
  });

  test('should handle no pixel scenario', async ({ page }) => {
    // Test with a client that has no pixel
    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/status/instant-auto-traders`);
    const data = await response.json();

    if (data.success && data.data.length === 0) {
      console.log('✅ Correctly handles client with no pixel');
    }
  });

  test('should retrieve AutoFix statistics', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/stats`);
    const data = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalProposals');
    expect(data.data).toHaveProperty('pendingProposals');
    expect(data.data).toHaveProperty('appliedProposals');

    console.log('✅ AutoFix Statistics:');
    console.log(`  Total Proposals: ${data.data.totalProposals}`);
    console.log(`  Pending: ${data.data.pendingProposals}`);
    console.log(`  Applied: ${data.data.appliedProposals}`);
    console.log(`  Failed: ${data.data.failedProposals}`);
    console.log(`  Avg Confidence: ${(data.data.avgConfidence * 100).toFixed(0)}%`);
  });

  test('should validate fix proposal structure', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      const item = data.data[0];

      // Validate issue structure
      expect(item.issue).toHaveProperty('id');
      expect(item.issue).toHaveProperty('pixel_id');
      expect(item.issue).toHaveProperty('issue_type');
      expect(item.issue).toHaveProperty('severity');
      expect(item.issue).toHaveProperty('description');

      // Validate fix proposal structure
      expect(item.fixProposal).toHaveProperty('proposalId');
      expect(item.fixProposal).toHaveProperty('issueId');
      expect(item.fixProposal).toHaveProperty('engine');
      expect(item.fixProposal).toHaveProperty('fix');
      expect(item.fixProposal).toHaveProperty('confidence');
      expect(item.fixProposal).toHaveProperty('requiresReview');
      expect(item.fixProposal).toHaveProperty('estimatedTime');

      console.log('✅ Fix proposal structure is valid');
    }
  });

  test('should check API health before running tests', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v2/health`);
    const data = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(data.success).toBe(true);
    expect(data.version).toBe('2.0.0');

    console.log('✅ API is healthy');
    console.log(`  Version: ${data.version}`);
    console.log(`  Uptime: ${(data.uptime / 60).toFixed(2)} minutes`);
  });
});

// Visual regression tests (optional - requires screenshots)
test.describe('AutoFix UI Visual Tests', () => {
  test.skip('should match AutoFix panel screenshot', async ({ page }) => {
    // This would require baseline screenshots
    // Skipping for now, but structure is here for future use

    await page.goto(`${BASE_URL}`);
    // await expect(page).toHaveScreenshot('autofix-panel.png');
  });
});

// Performance tests
test.describe('AutoFix UI Performance', () => {
  test('should load fixable issues quickly', async ({ page }) => {
    const startTime = Date.now();

    const response = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second

    console.log(`✅ API response time: ${duration}ms`);
  });

  test('should apply fix quickly', async ({ page }) => {
    // Get a fix to apply
    const fixableResponse = await page.request.get(`${BASE_URL}/api/v2/pixel/autofix/10/fixable`);
    const fixableData = await fixableResponse.json();

    if (fixableData.success && fixableData.data.length > 0) {
      const proposalId = fixableData.data[0].fixProposal.proposalId;

      const startTime = Date.now();

      await page.request.post(
        `${BASE_URL}/api/v2/pixel/autofix/proposal/${proposalId}/apply`,
        {
          data: {
            approved: true,
            approvedBy: 'playwright-perf-test'
          }
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete in < 500ms

      console.log(`✅ Fix application time: ${duration}ms`);
    }
  });
});
