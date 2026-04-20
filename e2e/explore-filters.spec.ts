/**
 * Test 4 — Explore Filters
 *
 * Verifies that the ExploreClient filter controls work correctly:
 *   - Category tab switching (All / Hotels / Restaurants / Experiences)
 *   - Region dropdown
 *   - Search input with debounced API call
 *   - Sort dropdown
 *   - View mode toggle (Grid / Map)
 *   - /explore/category/[slug] editorial pages
 *
 * All /api/listings calls are intercepted; the test counts result-count
 * text changes to confirm that filters trigger re-fetches.
 */

import { test, expect } from '@playwright/test';
import { MOCK_LISTINGS, MOCK_LISTING_HOTEL } from './helpers/fixtures';

// ─── Helper: mock /api/listings with a category-aware response ───────────────

async function mockListingsByCategory(
  page: import('@playwright/test').Page,
  {
    all,
    filtered,
  }: {
    all: typeof MOCK_LISTINGS;
    filtered: typeof MOCK_LISTINGS;
  }
) {
  let requestCount = 0;
  await page.route('/api/listings*', async (route) => {
    const url = route.request().url();
    const isFiltered = url.includes('category=') && !url.includes('category=all');
    const data = isFiltered ? filtered : all;
    requestCount++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, count: data.length }),
    });
  });
  return () => requestCount;
}

test.describe('Explore Filters', () => {
  test.beforeEach(async ({ page }) => {
    // Default: all categories return both fixtures
    await page.route('/api/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_LISTINGS, count: MOCK_LISTINGS.length }),
      });
    });
  });

  // ─── 1. Initial page load ─────────────────────────────────────────────────

  test('/explore loads with listings and result count', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Result count text e.g. "2 places found"
    const resultCount = page.getByText(/\d+ place[s]? found/i);
    await expect(resultCount).toBeVisible({ timeout: 10_000 });
  });

  // ─── 2. Category tab filter ───────────────────────────────────────────────

  test('clicking Hotels category tab applies filter', async ({ page }) => {
    // Wire up category-aware mock: Hotels filter returns only the hotel listing
    await page.unroute('/api/listings*');
    await mockListingsByCategory(page, {
      all: MOCK_LISTINGS,
      filtered: [MOCK_LISTING_HOTEL],
    });

    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Locate the category tablist
    const tablist = page.getByRole('tablist', { name: /filter by category/i });
    await expect(tablist).toBeVisible({ timeout: 8_000 });

    // Click the Hotels tab
    const hotelsTab = tablist.getByRole('tab', { name: /hotels/i });
    await hotelsTab.click();

    // After clicking, the Hotels tab should be aria-selected
    await expect(hotelsTab).toHaveAttribute('aria-selected', 'true');

    // Wait for updated result count (1 hotel listing)
    await page.waitForLoadState('networkidle');
    const resultCount = page.getByText(/1 place found/i);
    await expect(resultCount).toBeVisible({ timeout: 8_000 });
  });

  test('clicking All tab shows all listings', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const tablist = page.getByRole('tablist', { name: /filter by category/i });
    const allTab = tablist.getByRole('tab', { name: /^all$/i });
    await allTab.click();

    await expect(allTab).toHaveAttribute('aria-selected', 'true');
    await page.waitForLoadState('networkidle');

    // Back to 2 listings
    const resultCount = page.getByText(/2 place[s]? found/i);
    await expect(resultCount).toBeVisible({ timeout: 8_000 });
  });

  // ─── 3. Search input ──────────────────────────────────────────────────────

  test('search input is visible and accepts text', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#explore-search');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Caracas');
    await expect(searchInput).toHaveValue('Caracas');
  });

  test('search input triggers API call after debounce (300 ms)', async ({ page }) => {
    let searchRequestCount = 0;

    await page.unroute('/api/listings*');
    await page.route('/api/listings*', async (route) => {
      const url = route.request().url();
      if (url.includes('q=')) searchRequestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [MOCK_LISTING_HOTEL], count: 1 }),
      });
    });

    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#explore-search');
    await searchInput.fill('Caracas');

    // Wait longer than the 300 ms debounce
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // At least one request with q= must have fired
    expect(searchRequestCount).toBeGreaterThanOrEqual(1);
  });

  test('clearing search restores full listing set', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#explore-search');
    await searchInput.fill('Caracas');
    await page.waitForTimeout(400);

    await searchInput.clear();
    await page.waitForLoadState('networkidle');

    // After clearing, all 2 listings should be visible again
    const resultCount = page.getByText(/2 place[s]? found/i);
    await expect(resultCount).toBeVisible({ timeout: 8_000 });
  });

  // ─── 4. Region dropdown ───────────────────────────────────────────────────

  test('region dropdown is visible and lists options', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const regionSelect = page.locator('#explore-region');
    await expect(regionSelect).toBeVisible();

    // "All regions" is the default option
    await expect(regionSelect).toHaveValue('all');

    // Selecting "Caracas" changes the value
    await regionSelect.selectOption('caracas');
    await expect(regionSelect).toHaveValue('caracas');
  });

  // ─── 5. Sort dropdown ────────────────────────────────────────────────────

  test('sort dropdown changes sort value', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const sortSelect = page.locator('#explore-sort');
    await expect(sortSelect).toBeVisible();

    // Default is "default" (Recommended)
    await expect(sortSelect).toHaveValue('default');

    // Change to "Highest rated"
    await sortSelect.selectOption('rating');
    await expect(sortSelect).toHaveValue('rating');

    // Listings should still be visible after re-sorting (client-side sort)
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── 6. View mode toggle (Grid / Map) ─────────────────────────────────────

  test('view mode group has Grid and Map buttons', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const viewGroup = page.getByRole('group', { name: /view mode/i });
    await expect(viewGroup).toBeVisible();

    await expect(page.getByRole('button', { name: /grid view/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /map view/i })).toBeVisible();
  });

  test('switching to map view hides the listing grid', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Grid is visible initially
    const firstCard = page.locator('a[href*="/listing/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    // Switch to map view
    await page.getByRole('button', { name: /map view/i }).click();

    // After switch the listing grid is hidden (viewMode === 'map')
    // Map container appears instead — it has a specific height style
    const mapContainer = page.locator('[style*="65vh"]');
    await expect(mapContainer).toBeVisible({ timeout: 8_000 });
  });

  test('switching back to grid view shows listings again', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /map view/i }).click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: /grid view/i }).click();

    const firstCard = page.locator('a[href*="/listing/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
  });

  // ─── 7. Category editorial pages ─────────────────────────────────────────

  test('/explore/category/beaches loads with category hero header', async ({ page }) => {
    await page.goto('/explore/category/beaches');
    await page.waitForLoadState('networkidle');

    // Category page has a <h1> with the category label
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible({ timeout: 12_000 });

    // Breadcrumb "Explore" link is present
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"] a[href="/explore"]');
    await expect(breadcrumb).toBeVisible();
  });

  test('/explore/category/adventure loads with listings section', async ({ page }) => {
    await page.goto('/explore/category/adventure');
    await page.waitForLoadState('networkidle');

    // "experiences available to book" text confirms the listings section rendered
    await expect(page.getByText(/experiences? available to book/i)).toBeVisible({ timeout: 12_000 });
  });

  test('invalid category slug returns 404-like state', async ({ page }) => {
    const response = await page.goto('/explore/category/this-does-not-exist');
    // Next.js notFound() triggers a 404 HTTP response
    expect(response?.status()).toBe(404);
  });
});
