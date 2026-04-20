/**
 * Test 1 — Demo Login + Basic Navigation
 *
 * Verifies that a user can sign in with the "Try Demo Account" shortcut
 * (no Supabase credentials required) and successfully navigate the core
 * tourist routes: /explore, /trips, and /plan.
 */

import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers/auth';
import { MOCK_LISTINGS, MOCK_ITINERARY } from './helpers/fixtures';

test.describe('Demo Login + Basic Navigation', () => {
  // ─── Setup: mock API calls that every page in this suite hits ───────────────

  test.beforeEach(async ({ page }) => {
    // Mock the listings API so /explore is not empty
    await page.route('/api/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_LISTINGS, count: MOCK_LISTINGS.length }),
      });
    });

    // Mock itineraries so /trips shows saved trips
    await page.route('/api/itineraries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [MOCK_ITINERARY], count: 1 }),
      });
    });
  });

  // ─── Test: demo login flow ───────────────────────────────────────────────────

  test('demo login button is visible on /login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // The "Try Demo Account" amber button must be present
    const demoBtn = page.getByRole('button', { name: /try demo account/i });
    await expect(demoBtn).toBeVisible();
  });

  test('clicking demo login signs in without Supabase and redirects', async ({ page }) => {
    await loginAsDemo(page);

    // After demo login, we should be away from /login
    expect(page.url()).not.toContain('/login');

    // The page body should be visible (not a blank crash)
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Test: /explore page after demo login ────────────────────────────────────

  test('/explore loads and shows listing grid after demo login', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Page heading "Browse Venezuela" confirms the page loaded correctly
    await expect(page.getByRole('heading', { name: /browse venezuela/i })).toBeVisible();

    // Category cards (Hotels, Gastronomy, Experiences) should be present
    await expect(page.getByRole('link', { name: /hotels & stays/i })).toBeVisible();

    // The listing grid rendered at least one card (mocked API returns 2 listings)
    const cards = page.locator('a[href*="/listing/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('/explore shows category filter tabs', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Category tablist with All / Hotels / Restaurants / Experiences tabs
    const tablist = page.getByRole('tablist', { name: /filter by category/i });
    await expect(tablist).toBeVisible();

    const allTab = tablist.getByRole('tab', { name: /all/i });
    await expect(allTab).toBeVisible();
    // The "All" tab should be selected by default
    await expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  // ─── Test: /trips page ──────────────────────────────────────────────────────

  test('/trips page loads for authenticated demo user', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/trips');
    await page.waitForLoadState('networkidle');

    // The page should render without a hard crash
    await expect(page.locator('body')).toBeVisible();

    // /trips is a tabbed dashboard — check at least one tab is present
    // (Upcoming, Past, Itineraries, Saved)
    const tabButtons = page.getByRole('button').filter({ hasText: /upcoming|past|itineraries|saved/i });
    const count = await tabButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ─── Test: /plan page ───────────────────────────────────────────────────────

  test('/plan page loads AI planner interface', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // The minimal top-bar heading
    await expect(page.getByRole('heading', { name: /plan your trip/i })).toBeVisible({ timeout: 10_000 });
  });

  test('/plan page shows SmartStarters when no days exist yet', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // SmartStarters render a "What kind of trip?" prompt and vibe buttons
    // when the itinerary has zero days — they are visible in the right panel
    // on desktop and inside the mobile sheet.
    const vibePrompt = page.getByText(/what kind of trip/i);
    // May be hidden inside mobile sheet on small viewports — check either visible or in DOM
    const exists = (await vibePrompt.count()) > 0;
    expect(exists).toBeTruthy();
  });

  test('/plan page chat input is accessible', async ({ page }) => {
    await loginAsDemo(page);

    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // The chat form's text input has placeholder "Describe your ideal trip..."
    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await expect(chatInput).toBeVisible({ timeout: 10_000 });
  });
});
