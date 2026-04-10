import { test, expect } from '@playwright/test';

test.describe('Itinerary Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the itineraries API
    await page.route('/api/itineraries*', async (route, request) => {
      const url = new URL(request.url());
      const isInfluencer = url.searchParams.get('influencer_picks') === 'true';

      const mockItineraries = [
        {
          id: 'itin-1',
          title: 'Los Roques Island Hopping',
          description: 'Crystal-clear waters and secluded islands.',
          cover_image_url: null,
          total_days: 5,
          estimated_cost_usd: 1200,
          regions: ['Los Roques'],
          tags: ['beach', 'snorkeling'],
          likes: 50,
          saves: 100,
          views: 500,
          is_public: true,
          is_influencer_pick: true,
          referral_code: 'test-ref',
          is_template: false,
          recommendation_count: 150,
          user: { full_name: 'Valentina Rojas', avatar_url: null, role: 'creator' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          start_date: null,
          end_date: null,
          user_id: 'user-1',
        },
        {
          id: 'itin-2',
          title: 'Mérida Andes Trek',
          description: 'Cloud forests and colonial villages.',
          cover_image_url: null,
          total_days: 7,
          estimated_cost_usd: 680,
          regions: ['Mérida'],
          tags: ['hiking', 'adventure'],
          likes: 30,
          saves: 70,
          views: 300,
          is_public: true,
          is_influencer_pick: false,
          referral_code: null,
          is_template: false,
          recommendation_count: 100,
          user: { full_name: 'Ben Thompson', avatar_url: null, role: 'creator' },
          created_at: '2026-01-02T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          start_date: null,
          end_date: null,
          user_id: 'user-2',
        },
      ];

      const region = url.searchParams.get('region');
      let filtered = mockItineraries;
      if (region) {
        filtered = mockItineraries.filter((i) =>
          i.regions.some((r) => r === region)
        );
      }
      if (isInfluencer) {
        filtered = mockItineraries.filter((i) => i.is_influencer_pick);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: filtered, count: filtered.length }),
      });
    });
  });

  test('renders itineraries page with grid', async ({ page }) => {
    await page.goto('/itineraries');

    await expect(page.getByText('Discover Venezuela Itineraries')).toBeVisible();
    await expect(page.getByText('Los Roques Island Hopping')).toBeVisible();
    await expect(page.getByText('Mérida Andes Trek')).toBeVisible();
  });

  test('shows Book This Trip and Customize buttons', async ({ page }) => {
    await page.goto('/itineraries');

    const bookButtons = page.getByRole('link', { name: 'Book This Trip' });
    await expect(bookButtons.first()).toBeVisible();

    const customizeButtons = page.getByRole('button', { name: 'Customize' });
    await expect(customizeButtons.first()).toBeVisible();
  });

  test('filter chips are visible', async ({ page }) => {
    await page.goto('/itineraries');

    await expect(page.getByText('3-5 days')).toBeVisible();
    await expect(page.getByText('7 days')).toBeVisible();
    await expect(page.getByText('Under $500')).toBeVisible();
  });

  test('Book This Trip links to itinerary detail', async ({ page }) => {
    await page.goto('/itineraries');

    const bookLink = page.getByRole('link', { name: 'Book This Trip' }).first();
    const href = await bookLink.getAttribute('href');
    expect(href).toContain('/itinerary/');
  });

  test('social proof banner shows stats', async ({ page }) => {
    await page.goto('/itineraries');

    await expect(page.getByText('Curated Itineraries')).toBeVisible();
    await expect(page.getByText('Regions Covered')).toBeVisible();
  });

  test('AI CTA section is present', async ({ page }) => {
    await page.goto('/itineraries');

    await expect(page.getByText(/Can't find the perfect itinerary/)).toBeVisible();
    await expect(page.getByText('Build My Itinerary with AI')).toBeVisible();
  });
});
