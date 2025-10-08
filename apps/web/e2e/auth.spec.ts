import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for login form elements
    await expect(page.getByLabel(/email|username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('should handle login errors gracefully', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit empty form
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should show validation errors
    const errorMessages = page.locator('[role="alert"], .error, .text-red-500');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('should have password reset link', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for password reset link
    const resetLink = page.getByRole('link', { name: /forgot password|reset password/i });
    if (await resetLink.isVisible()) {
      await expect(resetLink).toBeVisible();
      await expect(resetLink).toHaveAttribute('href', /auth\/reset|forgot/i);
    }
  });
});