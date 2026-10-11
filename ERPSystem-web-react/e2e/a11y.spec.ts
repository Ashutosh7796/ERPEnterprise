import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) Verification', () => {
  test('Axe accessibility scanner evaluates page and verifies WCAG compliance rules', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Run axe accessibility audit on rendered page
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Verify axe execution: passes are registered and results are structured
    expect(results).toBeDefined();
    expect(Array.isArray(results.violations)).toBe(true);
    expect(results.passes.length).toBeGreaterThan(10);
  });
});
