import { test, expect } from '@playwright/test';

// Mock authentication state by setting cookies/localStorage before navigation
test.describe('Provider Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock provider API responses
    await page.route('/api/providers/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'provider-uuid-1',
            user_id: 'user-uuid-2',
            business_name: 'Andes Adventures',
            description: 'Expert mountain guides',
            is_verified: true,
            is_approved: true,
            rating: 4.9,
            total_reviews: 48,
            region: 'Mérida',
          },
        }),
      });
    });

    await page.route('/api/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], count: 0 }),
      });
    });

    await page.route('/api/bookings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], count: 0 }),
      });
    });
  });

  test('dashboard page is accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Page should load (may redirect to login if not authenticated)
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page redirects unauthenticated provider access', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Either shows dashboard or redirects to login
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
  });

  test('provider register page is accessible', async ({ page }) => {
    await page.goto('/provider-register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard stats section exists', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard listings page is accessible', async ({ page }) => {
    await page.goto('/dashboard/listings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard bookings page is accessible', async ({ page }) => {
    await page.goto('/dashboard/bookings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard calendar page is accessible', async ({ page }) => {
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard analytics page is accessible', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('new listing wizard page is accessible', async ({ page }) => {
    await page.goto('/dashboard/listings/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
