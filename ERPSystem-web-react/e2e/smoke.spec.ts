import { test, expect } from '@playwright/test';

test.describe('ERP Frontend Smoke Tests', () => {
  test('Application opens successfully and renders login page', async ({ page }) => {
    await page.goto('/login');

    // 1. Verify URL
    await expect(page).toHaveURL(/.*login/);

    // 2. Verify Page Title / Branding
    const brandHeading = page.locator('h2');
    await expect(brandHeading).toContainText('ERP Enterprise Edition');

    // 3. Verify Login Form Inputs
    const usernameInput = page.locator('#loginName');
    await expect(usernameInput).toBeVisible();

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
  });
});
