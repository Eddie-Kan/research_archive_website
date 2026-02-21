import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Dashboard displays non-zero stats when entities exist.
 * Verifies the API response shape mismatch fix (snake_case fields).
 */

test.describe('Admin Dashboard — stats display', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/admin/auth/setup', {
      data: { password: process.env.ADMIN_PASSWORD || 'test123' },
    });
    const res = await page.request.post('/api/admin/auth', {
      data: { password: process.env.ADMIN_PASSWORD || 'test123' },
    });
    if (res.ok()) {
      const cookies = res.headers()['set-cookie'];
      if (cookies) {
        const match = cookies.match(/ek-admin-session=([^;]+)/);
        if (match) {
          await page.context().addCookies([{
            name: 'ek-admin-session',
            value: match[1],
            domain: 'localhost',
            path: '/',
          }]);
        }
      }
    }
  });

  test('dashboard shows entity count > 0 when entities exist', async ({ page }) => {
    // First verify entities exist via API
    const entitiesRes = await page.request.get('/api/admin/entities?limit=1');
    const entitiesData = await entitiesRes.json();
    const hasEntities = (entitiesData.data?.length || 0) > 0;

    await page.goto('/en/admin', { waitUntil: 'networkidle' });

    if (hasEntities) {
      // The total entities card should show a number > 0
      const totalText = await page.locator('.text-2xl.font-bold').first().innerText();
      expect(Number(totalText)).toBeGreaterThan(0);
    }

    // Should NOT show the error state
    await expect(page.locator('text=An error occurred')).not.toBeVisible();
  });

  test('dashboard entity type breakdown shows localized labels', async ({ page }) => {
    await page.goto('/en/admin', { waitUntil: 'networkidle' });

    const bodyText = await page.locator('body').innerText();

    // Should NOT contain raw snake_case type identifiers in the breakdown
    // (they should be localized via entityTypeLabel)
    expect(bodyText).not.toContain('lit_review');
    expect(bodyText).not.toContain('material_system');
  });
});
