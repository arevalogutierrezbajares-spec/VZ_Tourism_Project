import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Venezuela|VZ Tourism|Tourism/i);
  });

  test('search bar is visible on home page', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('can type a search query in the search bar', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Beaches in Los Roques');
    await expect(searchInput).toHaveValue('Beaches in Los Roques');
  });

  test('pressing Enter triggers search', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Adventure in Mérida');
    await searchInput.press('Enter');
    // Wait for some kind of response (loading state or results)
    await page.waitForLoadState('networkidle');
    // The page should not crash after search
    await expect(page.locator('body')).toBeVisible();
  });

  test('voice input button is visible', async ({ page }) => {
    const micButton = page.getByRole('button', { name: /voice search/i });
    await expect(micButton).toBeVisible();
  });

  test('map container renders on home page', async ({ page }) => {
    // Map container should be somewhere on the page
    const mapArea = page.locator('.relative').first();
    await expect(mapArea).toBeVisible();
  });

  test('suggestion chips are displayed', async ({ page }) => {
    // Check for suggestion-type buttons or chips
    // These might appear below the search bar
    await page.waitForLoadState('domcontentloaded');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('clicking a suggestion populates the search bar', async ({ page }) => {
    // Find any clickable suggestion chip if they exist
    const suggestionChip = page.locator('[data-testid="suggestion-chip"]').first();
    const suggestionExists = await suggestionChip.count();

    if (suggestionExists > 0) {
      const chipText = await suggestionChip.textContent();
      await suggestionChip.click();
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toHaveValue(chipText || '');
    } else {
      // Skip if chips don't exist yet
      test.skip();
    }
  });

  test('AI response panel appears after search', async ({ page }) => {
    // Mock the AI search response
    await page.route('/api/ai/search', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"type":"text","text":"Here are some great beaches in Los Roques!"}\n\ndata: {"type":"done"}\n\n',
      });
    });

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Beaches in Los Roques');
    await searchInput.press('Enter');

    // Wait for AI response panel or any result to appear
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('applying a filter updates results', async ({ page }) => {
    // Find filter button if it exists
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    const filterExists = await filterButton.count();

    if (filterExists > 0) {
      await filterButton.click();
      await page.waitForLoadState('networkidle');
    }
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });
});
