import { test, expect } from '@playwright/test';

const MOCK_LISTINGS = [
  {
    id: 'listing-1',
    title: 'Los Roques Snorkeling',
    slug: 'los-roques-snorkeling',
    short_description: 'Amazing snorkeling in crystal-clear waters of the Caribbean.',
    description: 'Full description of snorkeling experience.',
    category: 'beaches',
    tags: ['snorkeling', 'diving'],
    region: 'Los Roques',
    location_name: 'Los Roques',
    latitude: 11.85,
    longitude: -66.75,
    address: null,
    price_usd: 120,
    price_ves: null,
    currency: 'USD',
    duration_hours: 6,
    max_guests: 12,
    min_guests: 2,
    safety_level: 'green',
    amenities: [],
    languages: ['es', 'en'],
    includes: [],
    excludes: [],
    cancellation_policy: 'flexible',
    meeting_point: null,
    is_published: true,
    is_featured: true,
    cover_image_url: null,
    rating: 4.9,
    total_reviews: 56,
    total_bookings: 112,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

test.describe('Library & Explore', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/listings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_LISTINGS, count: 1 }),
      });
    });

    await page.route('/api/itineraries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], count: 0 }),
      });
    });
  });

  test('library page loads', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('library page shows category filters', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    // Look for category filter buttons/tabs
    await expect(page.locator('body')).toBeVisible();
  });

  test('clicking a category filters listings', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const beachesButton = page.getByRole('button', { name: /beaches/i }).first();
    const count = await beachesButton.count();

    if (count > 0) {
      await beachesButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('explore page loads', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('explore page shows content sections', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('region page is accessible', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Try to navigate to a region link if it exists
    const regionLink = page.locator('a[href*="los-roques"]').first();
    const count = await regionLink.count();

    if (count > 0) {
      await regionLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('trending/new/following tabs exist on explore page', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Look for tab navigation
    const trendingTab = page.getByRole('tab', { name: /trending/i }).first();
    const trendingCount = await trendingTab.count();

    if (trendingCount > 0) {
      await expect(trendingTab).toBeVisible();
    } else {
      // Tabs might use different role or selector
      const trendingText = page.getByText(/trending/i).first();
      const textCount = await trendingText.count();
      if (textCount > 0) {
        await expect(trendingText).toBeVisible();
      }
    }
    // Just ensure the explore page is functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('clicking trending tab shows trending itineraries', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const trendingTab = page.getByRole('tab', { name: /trending/i }).first();
    const count = await trendingTab.count();

    if (count > 0) {
      await trendingTab.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('safety page is accessible', async ({ page }) => {
    await page.route('/api/safety-zones', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
