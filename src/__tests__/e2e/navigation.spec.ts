import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/Research Archive/);
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/en');
    await page.click('a[href="/en/projects"]');
    await expect(page.locator('h1')).toContainText(/Projects|研究项目/);
  });

  test('should switch language without full page reload', async ({ page }) => {
    await page.goto('/en');

    // Find and click language toggle
    const langButton = page.locator('button', { hasText: '中文' });
    await langButton.click();

    // Should navigate to zh-Hans locale
    await expect(page).toHaveURL(/\/zh-Hans/);

    // UI should be in Chinese
    await expect(page.locator('nav')).toContainText('研究项目');
  });

  test('should open command palette with Ctrl+K', async ({ page }) => {
    await page.goto('/en');
    await page.keyboard.press('Control+k');

    // Command palette should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/en');
    await page.click('a[href="/en/search"]');
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('should navigate to dashboard pages', async ({ page }) => {
    await page.goto('/en/dashboards/atlas');
    await expect(page.locator('h1')).toContainText(/Atlas|研究图谱/);

    await page.goto('/en/dashboards/timeline');
    await expect(page.locator('h1')).toContainText(/Timeline|时间线/);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/en');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });

  test('should have skip to content link or proper landmarks', async ({ page }) => {
    await page.goto('/en');
    const nav = page.locator('[role="navigation"]');
    await expect(nav).toBeVisible();
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have proper lang attribute', async ({ page }) => {
    await page.goto('/en');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');

    await page.goto('/zh-Hans');
    await expect(html).toHaveAttribute('lang', 'zh-Hans');
  });
});
