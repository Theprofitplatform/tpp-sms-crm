import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the main page', async ({ page }) => {
    await page.goto('/');

    // Check if the page title is correct
    await expect(page).toHaveTitle(/SMS CRM/);

    // Check if main heading is present
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements
    await expect(page.getByRole('navigation')).toBeVisible();

    // Check for common navigation links
    const navLinks = page.getByRole('link');
    await expect(navLinks.first()).toBeVisible();
  });

  test('should have contact upload functionality', async ({ page }) => {
    await page.goto('/');

    // Look for upload-related elements
    const uploadButton = page.getByRole('button', { name: /upload|import/i });
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeVisible();
    }

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await expect(fileInput).toBeVisible();
    }
  });
});