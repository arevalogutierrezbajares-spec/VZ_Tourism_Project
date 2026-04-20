/**
 * Shared auth helpers for E2E tests.
 *
 * The VAV platform supports three auth paths:
 *   1. Demo login — sets Zustand store in-memory; no Supabase round-trip
 *   2. Real email/password — requires live Supabase
 *   3. Mocked Supabase token — inject via page.route() for CI
 */

import type { Page } from '@playwright/test';

/**
 * Click the "Try Demo Account" button on /login and wait for redirect.
 * The demo auth sets the Zustand auth store directly (no network call).
 */
export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const demoBtn = page.getByRole('button', { name: /try demo account/i });
  await demoBtn.waitFor({ state: 'visible', timeout: 8_000 });
  await demoBtn.click();

  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

/**
 * Login with real credentials (requires SUPABASE to be configured).
 * Falls back gracefully if auth is not configured.
 */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const submitBtn = page.getByRole('button', { name: /sign in/i });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  // Wait up to 10 s for either a redirect or an error toast
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mock Supabase token exchange so the server-side middleware accepts the session.
 * Intercepts /auth/v1/token and returns a fake JWT payload.
 * Use this in tests that need a provider session without a live Supabase project.
 */
export async function mockProviderAuth(page: Page): Promise<void> {
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'test-provider-token',
        refresh_token: 'test-provider-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'provider-user-001',
          email: process.env.TEST_PROVIDER_EMAIL || 'provider@test.vzexplorer.com',
          role: 'provider',
        },
      }),
    });
  });
}

/**
 * Mock the /api/providers/me endpoint so provider dashboard pages
 * do not need a real database row.
 */
export async function mockProviderProfile(page: Page): Promise<void> {
  await page.route('/api/providers/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'provider-uuid-test',
          user_id: 'provider-user-001',
          business_name: 'Andes Adventures Test',
          description: 'Expert mountain guides for E2E testing',
          is_verified: true,
          is_approved: true,
          rating: 4.9,
          total_reviews: 48,
          region: 'Mérida',
        },
      }),
    });
  });
}
