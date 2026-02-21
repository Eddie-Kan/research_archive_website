import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Create Note — happy path.
 * Fills minimal fields, submits, and asserts the entity is created
 * with auto-populated defaults for links, authorship, related_entities, body_mdx_id.
 */

test.describe('Admin Create Note — happy path', () => {
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

  test('create a note with minimal fields and verify defaults', async ({ page }) => {
    await page.goto('/en/admin/entities/new', { waitUntil: 'networkidle' });

    // Type should default to "note" — verify
    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toHaveValue('note');

    // Fill title (EN)
    const titleInputs = page.locator('input[required]');
    const firstTitleInput = titleInputs.first();
    await firstTitleInput.fill('Test Note from E2E');

    // Fill summary (EN) — first textarea
    const summaryTextarea = page.locator('textarea').first();
    await summaryTextarea.fill('Automated test summary');

    // Submit the form
    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();

    // Wait for navigation to the edit page (success redirect)
    // Use negative lookahead to avoid matching the current /entities/new URL
    await page.waitForURL(/\/admin\/entities\/(?!new)[a-z0-9]+/, { timeout: 10000 });

    // Extract the entity ID from the URL
    const url = page.url();
    const idMatch = url.match(/\/entities\/(?!new)([a-z0-9]+)$/);
    expect(idMatch).toBeTruthy();
    const entityId = idMatch![1];

    // Fetch the entity via API and verify defaults were applied
    const entity = await page.evaluate(async (id) => {
      const res = await fetch(`/api/admin/entities/${id}`);
      if (!res.ok) throw new Error(`GET entity failed: ${res.status}`);
      return res.json();
    }, entityId);

    // The API returns a DB row; nested fields live in raw_metadata JSON
    const meta = entity.raw_metadata ? JSON.parse(entity.raw_metadata) : entity;

    // Verify auto-populated defaults
    expect(meta.type).toBe('note');
    expect(meta.status).toBe('active');
    expect(meta.visibility).toBe('private');

    // These fields are auto-populated by applyEntityDefaults
    expect(meta.links).toEqual([]);
    expect(meta.authorship).toBeDefined();
    expect(meta.authorship.contributors).toEqual([]);
    expect(meta.related_entities).toEqual([]);
    expect(meta.body_mdx_id).toBe(`${entityId}.body`);

    // Clean up: delete the test entity
    await page.evaluate(async (id) => {
      await fetch(`/api/admin/entities/${id}`, { method: 'DELETE' });
    }, entityId);
  });
});
