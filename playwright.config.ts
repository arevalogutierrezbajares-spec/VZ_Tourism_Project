import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3111';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: [['html'], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // Run `npm run dev` before the test suite, or set PLAYWRIGHT_BASE_URL to an
  // already-running server (e.g. in CI: PLAYWRIGHT_BASE_URL=http://localhost:3000).
  webServer: {
    command: 'npm run dev -- --port 3111',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
