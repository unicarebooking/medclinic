import { defineConfig, devices } from '@playwright/test'

/**
 * Base URL priority:
 *  1. BASE_URL env var  (explicit override)
 *  2. ALB_URL env var   (AWS load-balancer)
 *  3. http://localhost:3000 (local dev)
 */
const BASE_URL =
  process.env.BASE_URL ||
  process.env.ALB_URL ||
  'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',

  /* Maximum time one test can run */
  timeout: 60_000,

  /* Retry twice to handle auth flakiness */
  retries: process.env.CI ? 2 : 2,

  /* Limit parallelism to avoid Supabase auth rate limits across concurrent tests */
  workers: process.env.CI ? 2 : 2,
  fullyParallel: true,

  /* Reporter: html report + summary in terminal */
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    headless: true,

    /* Capture screenshots and traces only when a test fails */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    /* Always run in RTL locale to match the app */
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',

    /* Generous navigation timeout for slow cloud environments */
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
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
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Output folder for test artefacts */
  outputDir: 'test-results',
})
