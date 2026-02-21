import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Create Note — happy path.
 * Fills minimal fields, submits, and asserts the entity is created
 * with auto-populated defaults for links, authorship, related_entities, body_mdx_id.
 */

test.describe('Admin Create Note — happy path', () => {
  let sessionCookie: string | undefined;

  test.beforeEach(async ({ page }) => {
    const res = await page.request.post('/api/admin/auth', {
      data: { password: process.env.ADMIN_PASSWORD || 'test123' },
    });
    if (res.ok()) {
      const cookies = res.headers()['set-cookie'];
      if (cookies) {
        const match = cookies.match(/ek-admin-session=([^;]+)/);
        if (match) {
          sessionCookie = match[1];
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

  test('create a note with minimal fields and verify defaults', async ({ page, request }) => {
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
    await page.waitForURL(/\/admin\/entities\/[a-z0-9]+/, { timeout: 10000 });

    // Extract the entity ID from the URL
    const url = page.url();
    const idMatch = url.match(/\/entities\/([a-z0-9]+)$/);
    expect(idMatch).toBeTruthy();
    const entityId = idMatch![1];

    // Fetch the entity via API and verify defaults were applied
    const entityRes = await request.get(`/api/admin/entities/${entityId}`, {
      headers: sessionCookie ? { Cookie: `ek-admin-session=${sessionCookie}` } : {},
    });
    expect(entityRes.ok()).toBe(true);

    const entity = await entityRes.json();

    // Verify auto-populated defaults
    expect(entity.type).toBe('note');
    expect(entity.status).toBe('active');
    expect(entity.visibility).toBe('private');

    // These are the fields that previously caused validation failures
    // They should now be auto-populated by applyEntityDefaults
    expect(entity.links).toEqual([]);
    expect(entity.authorship).toBeDefined();
    expect(entity.authorship.contributors).toEqual([]);
    expect(entity.related_entities).toEqual([]);
    expect(entity.body_mdx_id).toBe(`${entityId}.body`);

    // Clean up: delete the test entity
    await request.delete(`/api/admin/entities/${entityId}`, {
      headers: sessionCookie ? { Cookie: `ek-admin-session=${sessionCookie}` } : {},
    });
  });
});
