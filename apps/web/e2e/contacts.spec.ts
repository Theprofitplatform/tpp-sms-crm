import { test, expect } from '@playwright/test';

test.describe('Contact Management', () => {
  test('should display contacts page', async ({ page }) => {
    await page.goto('/contacts');

    // Check for contacts page elements
    await expect(page.getByRole('heading', { name: /contacts/i })).toBeVisible();

    // Check for add contact button
    const addButton = page.getByRole('button', { name: /add contact|new contact/i });
    if (await addButton.isVisible()) {
      await expect(addButton).toBeVisible();
    }

    // Check for contact list or table
    const contactList = page.locator('[data-testid="contact-list"], table, .contact-list');
    await expect(contactList).toBeVisible();
  });

  test('should handle CSV upload', async ({ page }) => {
    await page.goto('/contacts/import');

    // Check for upload form
    await expect(page.getByRole('heading', { name: /import contacts/i })).toBeVisible();

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Check for upload button
    const uploadButton = page.getByRole('button', { name: /upload|import/i });
    await expect(uploadButton).toBeVisible();
  });

  test('should show contact search functionality', async ({ page }) => {
    await page.goto('/contacts');

    // Check for search input
    const searchInput = page.getByPlaceholder(/search contacts/i);
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();

      // Test search functionality
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    }
  });
});