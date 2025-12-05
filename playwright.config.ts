import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 *
 * Projects:
 *   - default: All tests (npm run test:e2e)
 *   - fast: Quick essential tests for CI/pre-commit (npm run test:e2e -- --project=fast)
 *   - slow: All tests including long-running ones (npm run test:e2e -- --project=slow)
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3002',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Run headless */
    headless: true,
  },

  /* Configure projects */
  projects: [
    {
      name: 'default',
      testMatch: /e2e-.+\.test\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'fast',
      testMatch: /e2e-(simple|exact|behaviors|workflow|modes)\.test\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'slow',
      testMatch: /e2e-.+\.test\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,  // Increased to 3 minutes for CI compilation
  },
});
