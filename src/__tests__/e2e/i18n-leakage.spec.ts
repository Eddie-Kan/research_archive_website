import { test, expect } from '@playwright/test';

/**
 * E2E test: crawl key routes and assert no raw translation keys
 * or ⟦MISSING:⟧ sentinels appear in the rendered page text.
 */

// Patterns that should never appear in rendered UI text
const LEAKED_KEY_PATTERN = /(?:^|\s)(?:nav|common|entity|search|filters|stats|actions|dashboards|dashboard|export|backup|project|accessibility|status|visibility)\.\w+/;
const SENTINEL_PATTERN = /⟦MISSING:/;

const ROUTES = [
  '/en',
  '/zh-Hans',
  '/en/projects',
  '/en/publications',
  '/en/experiments',
  '/en/datasets',
  '/en/notes',
  '/en/ideas',
];

for (const route of ROUTES) {
  test(`no i18n leakage on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });

    // Get all visible text content from the page body
    const bodyText = await page.locator('body').innerText();

    // Assert no leaked translation keys
    expect(bodyText).not.toMatch(LEAKED_KEY_PATTERN);

    // Assert no missing-key sentinels
    expect(bodyText).not.toMatch(SENTINEL_PATTERN);
  });
}
