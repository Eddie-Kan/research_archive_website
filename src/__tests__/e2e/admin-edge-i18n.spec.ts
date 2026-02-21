import { test, expect } from '@playwright/test';

/**
 * E2E: Edge type dropdown shows localized labels in zh-Hans,
 * not raw tokens like "project_contains" or "related_to".
 */

const RAW_EDGE_TOKENS = [
  'project_contains', 'produced', 'evaluated_on', 'cites',
  'derived_from', 'implements', 'collaborates_with', 'related_to', 'supersedes',
];

test.describe('Edge type localization — zh-Hans', () => {
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

  test('edges page dropdown shows Chinese labels, not raw tokens', async ({ page }) => {
    await page.goto('/zh-Hans/admin/edges', { waitUntil: 'networkidle' });

    const optionTexts = await page.locator('select option').allInnerTexts();
    const optionSet = new Set(optionTexts.map(t => t.trim()).filter(Boolean));

    for (const token of RAW_EDGE_TOKENS) {
      if (optionSet.has(token)) {
        throw new Error(`Raw edge type token "${token}" found in select options`);
      }
    }

    // Should contain Chinese edge type labels
    expect(optionSet.has('相关')).toBe(true);   // related_to
    expect(optionSet.has('引用')).toBe(true);   // cites
    expect(optionSet.has('包含')).toBe(true);   // project_contains
  });

  test('edges page "Direction" label is localized', async ({ page }) => {
    // Navigate to an entity edit page to check the edge manager
    // First get an entity ID
    const entitiesRes = await page.request.get('/api/admin/entities?limit=1');
    const entitiesData = await entitiesRes.json();

    if (entitiesData.data?.length > 0) {
      const entityId = entitiesData.data[0].id;
      await page.goto(`/zh-Hans/admin/entities/${entityId}`, { waitUntil: 'networkidle' });

      // Click the Relations tab
      await page.locator('button', { hasText: '关联关系' }).click();

      const bodyText = await page.locator('body').innerText();

      // Should NOT contain hardcoded English "Direction"
      expect(bodyText).not.toContain('Direction');
      // Should contain Chinese "方向"
      expect(bodyText).toContain('方向');
    }
  });
});
