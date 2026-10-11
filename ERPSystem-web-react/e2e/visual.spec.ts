import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('Login Page Visual Snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});
