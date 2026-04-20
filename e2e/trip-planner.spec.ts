/**
 * Test 5 — AI Trip Planner (/plan)
 *
 * Verifies the PlanningChatPanel + SmartStarters workflow:
 *   1. Chat interface renders on page load
 *   2. SmartStarters vibe buttons are present
 *   3. Selecting a vibe + duration sends a message to the AI
 *   4. Loading / streaming indicator appears
 *   5. AI response eventually populates the itinerary day panel
 *
 * AI streaming is handled by /api/ai/plan-stream (SSE).
 * In tests we intercept that route and return a canned SSE response with
 * valid AIGeneratedDay JSON so we don't depend on Anthropic availability.
 */

import { test, expect } from '@playwright/test';

// ─── Canned SSE response ──────────────────────────────────────────────────────
//
// PlanningChatPanel (POST /api/itineraries/conversation) consumes a
// ReadableStream where each line has the format:
//
//   data: ${JSON.stringify({ type, text?, data? })}\n
//
// Recognised types:
//   "text"       — { type: "text",     text: string }       incremental markdown
//   "day-plan"   — { type: "day-plan", data: AIGeneratedDay } single day added
//   "itinerary"  — { type: "itinerary",data: AIGeneratedDay[] } full plan
//   "done"       — { type: "done" }                          stream complete

function buildSseResponse(): string {
  const line = (payload: object) =>
    `data: ${JSON.stringify(payload)}\n\n`;

  const day1 = {
    day: 1,
    title: 'Arrival in Caracas',
    stops: [
      {
        name: 'El Hatillo',
        type: 'attraction',
        description: 'Charming colonial village on the outskirts of Caracas.',
        estimated_cost_usd: 0,
        duration_minutes: 120,
        latitude: 10.4282,
        longitude: -66.8661,
      },
      {
        name: 'La Candelaria',
        type: 'restaurant',
        description: 'Authentic Venezuelan lunch in a historic neighbourhood.',
        estimated_cost_usd: 15,
        duration_minutes: 90,
        latitude: 10.5072,
        longitude: -66.9177,
      },
    ],
  };

  return (
    line({ type: 'text', text: "Here's your 3-day Venezuela itinerary focused on beach and relaxation:" }) +
    line({ type: 'day-plan', data: day1 }) +
    line({ type: 'text', text: '\n\n**Day 1** is set — enjoy El Hatillo and La Candelaria!' }) +
    line({ type: 'done' })
  );
}

// ─── Intercept helper ─────────────────────────────────────────────────────────
//
// PlanningChatPanel POSTs to /api/itineraries/conversation and reads the
// response as a streamed body (ReadableStream), not EventSource.

async function mockAIPlanStream(page: import('@playwright/test').Page) {
  await page.route('/api/itineraries/conversation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      headers: {
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
      body: buildSseResponse(),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('AI Trip Planner', () => {
  test.beforeEach(async ({ page }) => {
    await mockAIPlanStream(page);
  });

  // ─── 1. Page load ──────────────────────────────────────────────────────────

  test('/plan loads the trip planner interface', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // Top-bar heading
    await expect(
      page.getByRole('heading', { name: /plan your trip/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('/plan renders a chat input area', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // The chat form has aria-label="Trip planning conversation"
    const chatForm = page.locator('[aria-label="Trip planning conversation"]');
    await expect(chatForm).toBeVisible({ timeout: 10_000 });

    // Text input with placeholder "Describe your ideal trip..."
    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await expect(chatInput).toBeVisible();
  });

  test('/plan shows the conversation log area', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // The message thread has role="log" and aria-label="Trip planner conversation"
    const log = page.locator('[role="log"][aria-label="Trip planner conversation"]');
    await expect(log).toBeVisible({ timeout: 10_000 });
  });

  // ─── 2. SmartStarters ─────────────────────────────────────────────────────

  test('SmartStarters "What kind of trip?" prompt is visible', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // SmartStarters renders this heading when itinerary has 0 days
    await expect(page.getByText(/what kind of trip\?/i)).toBeVisible({ timeout: 10_000 });
  });

  test('SmartStarters vibe buttons are present', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // At least one of the 6 vibe buttons must be visible
    const beachBtn = page.getByRole('button', { name: /beach & chill/i });
    await expect(beachBtn).toBeVisible({ timeout: 10_000 });
  });

  test('SmartStarters duration buttons are present', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // Duration buttons: 3 days, 5 days, 1 week, 10 days
    const threeDaysBtn = page.getByRole('button', { name: /3 days/i });
    await expect(threeDaysBtn).toBeVisible({ timeout: 10_000 });
  });

  // ─── 3. Sending a message via SmartStarters ───────────────────────────────

  test('clicking a vibe then a duration auto-sends a message', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    // Click "Beach & Chill" vibe
    const beachBtn = page.getByRole('button', { name: /beach & chill/i });
    await beachBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await beachBtn.click();

    // Click "3 days" duration — this auto-sends the combined message
    const threeDaysBtn = page.getByRole('button', { name: /3 days/i });
    await threeDaysBtn.click();

    // A user message bubble should appear in the conversation log
    const log = page.locator('[role="log"]');
    await expect(log).toContainText(/beach|3.day/i, { timeout: 8_000 });
  });

  // ─── 4. Typing and sending a custom message ───────────────────────────────

  test('typing a custom message and clicking Send adds it to the chat', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await chatInput.waitFor({ state: 'visible', timeout: 10_000 });
    await chatInput.fill('Plan a 3-day beach trip in Venezuela.');

    // Submit via the Send button (aria-label="Send message")
    const sendBtn = page.getByRole('button', { name: /send message/i });
    await sendBtn.click();

    // Message appears in the conversation log
    const log = page.locator('[role="log"]');
    await expect(log).toContainText(/3-day beach trip/i, { timeout: 8_000 });
  });

  // ─── 5. AI loading state ─────────────────────────────────────────────────

  test('AI thinking indicator appears after sending a message', async ({ page }) => {
    // Use a slow mock so the loading state is observable
    const resolver: { fn: (() => void) | null } = { fn: null };
    await page.unroute('/api/itineraries/conversation');
    await page.route('/api/itineraries/conversation', async (route) => {
      await new Promise<void>((resolve) => { resolver.fn = resolve; });
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: buildSseResponse(),
      });
    });

    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await chatInput.waitFor({ state: 'visible', timeout: 10_000 });
    await chatInput.fill('Plan a trip.');

    await page.getByRole('button', { name: /send message/i }).click();

    // The AI thinking indicator has aria-label="AI is thinking"
    const thinkingIndicator = page.locator('[aria-label="AI is thinking"]');
    await expect(thinkingIndicator).toBeVisible({ timeout: 6_000 });

    // Unblock the route so the test can finish cleanly
    resolver.fn?.();
  });

  // ─── 6. AI response populates itinerary panel ────────────────────────────

  test('AI response appears in the chat after streaming completes', async ({ page }) => {
    // Use normal (unblocked) mock
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await chatInput.waitFor({ state: 'visible', timeout: 10_000 });
    await chatInput.fill('I want a 3-day trip focused on beach and relaxation in Venezuela.');

    await page.getByRole('button', { name: /send message/i }).click();

    // The mocked SSE response contains "3-day Venezuela itinerary"
    const log = page.locator('[role="log"]');
    await expect(log).toContainText(/itinerary|day 1|caracas|el hatillo/i, { timeout: 30_000 });
  });

  test('itinerary day panel updates with Day 1 after AI response', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    const chatInput = page.getByPlaceholder(/describe your ideal trip/i);
    await chatInput.waitFor({ state: 'visible', timeout: 10_000 });
    await chatInput.fill('3-day beach trip in Venezuela');
    await page.getByRole('button', { name: /send message/i }).click();

    // After the day_plan SSE event is processed, ItineraryDaySection
    // renders "Day 1" in the right panel / mobile sheet.
    await expect(page.getByText(/day 1|arrival in caracas/i)).toBeVisible({ timeout: 30_000 });
  });

  // ─── 7. Back navigation ───────────────────────────────────────────────────

  test('"Back to Explore" link navigates to /map', async ({ page }) => {
    await page.goto('/plan');
    await page.waitForLoadState('domcontentloaded');

    const backLink = page.getByRole('link', { name: /back to explore/i });
    await expect(backLink).toBeVisible({ timeout: 10_000 });

    await backLink.click();
    await page.waitForURL(/\/map/, { timeout: 8_000 });
    expect(page.url()).toContain('/map');
  });
});
