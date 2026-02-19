import { defineConfig } from '@playwright/test'

const ALB_URL = process.env.ALB_URL || 'http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: ALB_URL,
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
