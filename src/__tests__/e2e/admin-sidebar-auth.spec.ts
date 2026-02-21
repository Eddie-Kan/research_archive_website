import { test, expect } from '@playwright/test';

/**
 * E2E: Admin sidebar visibility is driven by authentication state.
 *
 * - Logged out: admin nav items hidden, "Log in" link visible, admin routes redirect to login.
 * - Logged in: admin nav items visible, "Log in" link hidden, admin routes accessible.
 */

const ADMIN_NAV_TEXTS_EN = ['Dashboard', 'Entities', 'Edges', 'Backup', 'Settings'];

test.describe('Sidebar auth visibility — logged out', () => {
  test('sidebar shows "Log in" and hides admin items when not authenticated', async ({ page }) => {
    // Clear any existing session cookie
    await page.context().clearCookies();

    await page.goto('/en', { waitUntil: 'networkidle' });

    const sidebar = page.locator('aside[role="navigation"]');
    await expect(sidebar).toBeVisible();

    // Should show "Log in" link
    await expect(sidebar.locator('text=Log in')).toBeVisible();

    // Should NOT show admin nav items
    for (const label of ADMIN_NAV_TEXTS_EN) {
      await expect(sidebar.locator(`text=${label}`)).not.toBeVisible();
    }

    // Should NOT show "Logout" button
    await expect(sidebar.locator('text=Logout')).not.toBeVisible();
  });

  test('navigating to admin route while logged out redirects to login', async ({ page }) => {
    await page.context().clearCookies();

    const response = await page.goto('/en/admin', { waitUntil: 'networkidle' });

    // Should have been redirected to login page
    expect(page.url()).toContain('/admin/login');
  });

  test('navigating to admin/entities while logged out redirects to login', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/en/admin/entities', { waitUntil: 'networkidle' });

    expect(page.url()).toContain('/admin/login');
  });

  test('admin API returns 401 when not authenticated', async ({ request }) => {
    const res = await request.get('/api/admin/entities', {
      headers: { Cookie: '' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Sidebar auth visibility — logged in', () => {
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

  test('sidebar shows admin items and hides "Log in" when authenticated', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });

    const sidebar = page.locator('aside[role="navigation"]');
    await expect(sidebar).toBeVisible();

    // Should NOT show "Log in" link
    await expect(sidebar.locator('text=Log in')).not.toBeVisible();

    // Should show admin nav items
    for (const label of ADMIN_NAV_TEXTS_EN) {
      await expect(sidebar.locator(`text=${label}`)).toBeVisible();
    }

    // Should show "Logout" button
    await expect(sidebar.locator('text=Logout')).toBeVisible();
  });

  test('admin route is accessible when authenticated', async ({ page }) => {
    await page.goto('/en/admin', { waitUntil: 'networkidle' });

    // Should NOT have been redirected to login
    expect(page.url()).not.toContain('/login');

    // Should see the dashboard heading
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('auth status API returns authenticated: true', async ({ page }) => {
    const res = await page.request.get('/api/admin/auth');
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.authenticated).toBe(true);
  });
});

test.describe('Sidebar auth visibility — zh-Hans locale', () => {
  test('sidebar shows "登录" when not authenticated in Chinese', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/zh-Hans', { waitUntil: 'networkidle' });

    const sidebar = page.locator('aside[role="navigation"]');
    await expect(sidebar.locator('text=登录')).toBeVisible();
  });
});
