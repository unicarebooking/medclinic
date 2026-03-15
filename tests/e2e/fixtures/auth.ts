/**
 * Auth Fixtures & Helpers for E2E Tests
 * Provides shared login/logout utilities and test user credentials.
 *
 * Set environment variables for real test accounts:
 *   TEST_PATIENT_EMAIL, TEST_PATIENT_PASSWORD
 *   TEST_DOCTOR_EMAIL, TEST_DOCTOR_PASSWORD
 *   TEST_ADMIN_EMAIL,  TEST_ADMIN_PASSWORD
 */
import { Page, expect } from '@playwright/test'

export const TEST_USERS = {
  patient: {
    email: process.env.TEST_PATIENT_EMAIL || 'patient@test.com',
    password: process.env.TEST_PATIENT_PASSWORD || 'Test1234!',
  },
  doctor: {
    email: process.env.TEST_DOCTOR_EMAIL || 'doctor@test.com',
    password: process.env.TEST_DOCTOR_PASSWORD || 'Test1234!',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Test1234!',
  },
}

/** Login via the login page UI */
export async function loginAs(page: Page, role: keyof typeof TEST_USERS) {
  const { email, password } = TEST_USERS[role]
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"], input[name="email"]').fill(email)
  await page.locator('input[type="password"], input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  // Wait for redirect away from login (Supabase auth can be slow)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
  await page.waitForLoadState('networkidle')
}

/** Logout via the header dropdown */
export async function logout(page: Page) {
  // Try clicking the user avatar/menu in the header
  const avatarButton = page.locator('button').filter({ hasText: /התנתק|יציאה|logout/i }).first()
  if (await avatarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await avatarButton.click()
  } else {
    // Navigate to login directly as fallback
    await page.goto('/login')
  }
}

/** Assert the page redirected to login (not authenticated) */
export async function expectRedirectToLogin(page: Page, protectedUrl: string) {
  const response = await page.goto(protectedUrl, { waitUntil: 'networkidle' })
  const finalUrl = page.url()
  const isRedirected =
    finalUrl.includes('/login') ||
    finalUrl.includes('/register') ||
    (response?.status() ?? 200) >= 300
  expect(isRedirected || finalUrl.includes('/login')).toBeTruthy()
}
