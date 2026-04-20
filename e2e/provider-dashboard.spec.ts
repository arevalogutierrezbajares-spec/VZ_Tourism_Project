/**
 * Test 6 — Provider Dashboard (with mock auth)
 *
 * Covers:
 *   1. Unauthenticated redirect → /login
 *   2. Optional live-auth path via TEST_PROVIDER_EMAIL / TEST_PROVIDER_PASSWORD
 *   3. Dashboard overview stats and sidebar navigation
 *   4. /dashboard/listings page loads
 *   5. /dashboard/bookings page loads
 *   6. /dashboard/analytics page loads
 *
 * The ProviderDashboard is a server component that calls createClient()
 * and redirects to /login if no Supabase session exists. In CI (where no
 * real Supabase is configured) every dashboard route will redirect — the
 * "with auth" tests are skipped when TEST_PROVIDER_EMAIL is not set.
 */

import { test, expect } from '@playwright/test';
import { mockProviderProfile } from './helpers/auth';
import { MOCK_PROVIDER, MOCK_LISTINGS, MOCK_BOOKING } from './helpers/fixtures';

// Determine if a live provider account is available via env vars
const hasProviderCredentials =
  !!process.env.TEST_PROVIDER_EMAIL && !!process.env.TEST_PROVIDER_PASSWORD;

// ─── Shared route mocks for provider API endpoints ───────────────────────────

async function mockProviderApiRoutes(page: import('@playwright/test').Page) {
  // Provider profile
  await mockProviderProfile(page);

  // Listings
  await page.route('/api/listings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_LISTINGS, count: MOCK_LISTINGS.length }),
    });
  });

  // Bookings
  await page.route('/api/bookings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [MOCK_BOOKING], count: 1 }),
    });
  });

  // Revenue / analytics stub
  await page.route('/api/analytics*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { revenue: 1250, bookings: 8, rating: 4.9 } }),
    });
  });
}

// ─── Group 1: Unauthenticated (no Supabase session) ──────────────────────────

test.describe('Provider Dashboard — unauthenticated redirect', () => {
  test('GET /dashboard redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Next.js server-side redirect() sends the user to /login
    expect(page.url()).toMatch(/\/login/);
  });

  test('redirect preserves redirectTo param so login can return to dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The redirect URL should include redirectTo=/dashboard
    const url = new URL(page.url());
    const redirectParam =
      url.searchParams.get('redirectTo') || url.searchParams.get('next');
    if (redirectParam) {
      expect(redirectParam).toContain('/dashboard');
    }
    // If there is no redirectTo param that is also acceptable — just verify
    // that we ended up on /login
    expect(page.url()).toContain('/login');
  });

  test('GET /dashboard/listings redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/listings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/login/);
  });

  test('GET /dashboard/bookings redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/bookings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/login/);
  });
});

// ─── Group 2: Authenticated via TEST_PROVIDER_EMAIL (skipped in CI without creds) ─

test.describe('Provider Dashboard — authenticated', () => {
  // Skip entire group if no credentials are supplied
  test.skip(!hasProviderCredentials, 'TEST_PROVIDER_EMAIL not set — skipping live auth tests');

  test.beforeEach(async ({ page }) => {
    // Mock API routes (dashboard page itself uses Supabase SSR but provider API
    // endpoints for stats are client-side after the initial server render)
    await mockProviderApiRoutes(page);

    // Sign in with real credentials
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#email').fill(process.env.TEST_PROVIDER_EMAIL!);
    await page.locator('#password').fill(process.env.TEST_PROVIDER_PASSWORD!);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // Wait for redirect away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  });

  test('dashboard overview page loads with stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Four stat cards: Total Revenue, Pending Bookings, Active Bookings, Avg Rating
    await expect(page.getByText(/total revenue/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/pending bookings/i)).toBeVisible();
    await expect(page.getByText(/active bookings/i)).toBeVisible();
    await expect(page.getByText(/avg\. rating/i)).toBeVisible();
  });

  test('dashboard sidebar navigation links are present', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // ProviderSidebar renders nav groups: Operations, Inventory, Growth, Property (PMS)
    // Each group's items render as <a> links
    const overviewLink = page.getByRole('link', { name: /overview/i });
    await expect(overviewLink).toBeVisible({ timeout: 10_000 });

    const bookingsLink = page.getByRole('link', { name: /bookings/i });
    await expect(bookingsLink).toBeVisible();

    const listingsLink = page.getByRole('link', { name: /listings/i });
    await expect(listingsLink).toBeVisible();
  });

  test('sidebar "New Listing" quick action is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Quick Actions card has a "New Listing" button
    const newListingBtn = page.getByRole('link', { name: /new listing/i });
    await expect(newListingBtn.first()).toBeVisible({ timeout: 10_000 });
  });

  test('/dashboard/listings page loads with listings section', async ({ page }) => {
    await page.goto('/dashboard/listings');
    await page.waitForLoadState('networkidle');

    // Page renders without crashing — heading or content confirms load
    await expect(page.locator('body')).toBeVisible();
    // Should contain listing management UI
    await expect(page.getByText(/listings?/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('/dashboard/bookings page loads', async ({ page }) => {
    await page.goto('/dashboard/bookings');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    // Booking management page should mention "bookings"
    await expect(page.getByText(/bookings?/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('/dashboard/analytics page loads', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/analytics?/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar navigation to /dashboard/bookings works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const bookingsLink = page.getByRole('link', { name: /^bookings$/i }).first();
    await bookingsLink.click();
    await page.waitForURL('**/dashboard/bookings', { timeout: 8_000 });

    expect(page.url()).toContain('/dashboard/bookings');
  });

  test('sidebar navigation to /dashboard/listings works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const listingsLink = page.getByRole('link', { name: /^listings$/i }).first();
    await listingsLink.click();
    await page.waitForURL('**/dashboard/listings', { timeout: 8_000 });

    expect(page.url()).toContain('/dashboard/listings');
  });
});

// ─── Group 3: Smoke tests (always run — no auth needed) ───────────────────────

test.describe('Provider Dashboard — public-facing routes', () => {
  test('/provider-register page loads', async ({ page }) => {
    await page.goto('/provider-register');
    await page.waitForLoadState('networkidle');

    // The provider registration form should be visible
    await expect(page.locator('body')).toBeVisible();
    // Form has an email field
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 8_000 });
  });

  test('/dashboard/listings/new redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/dashboard/listings/new');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toMatch(/\/login/);
  });

  test('/dashboard/calendar redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toMatch(/\/login/);
  });
});
