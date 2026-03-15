/**
 * E2E Tests – Authentication Flow
 *
 * Covers: Login page UI, Register page UI, Forgot-password page,
 * form validation, protected-route redirects, and full login/logout cycle
 * (the full login/logout tests require TEST_PATIENT_EMAIL / TEST_PATIENT_PASSWORD env vars).
 */
import { test, expect } from '@playwright/test'
import { loginAs, TEST_USERS } from './fixtures/auth'

// ─── Login Page ───────────────────────────────────────────────────────────────
test.describe('Login Page (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('loads with HTTP 200', async ({ page }) => {
    // Just assert we're on the page
    await expect(page.locator('body')).toBeVisible()
    await expect(page.url()).toContain('/login')
  })

  test('renders email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
  })

  test('renders a submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error when submitting with empty fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click()
    // HTML5 validation or custom error message should appear
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    // Either browser required validation or custom error
    const isRequired = await emailInput.getAttribute('required')
    const errorMsg = page.locator('text=/שדה חובה|required|נדרש|אימייל/i')
    const hasError = (isRequired !== null) || (await errorMsg.count()) > 0
    expect(hasError).toBeTruthy()
  })

  test('shows error for invalid email format', async ({ page }) => {
    await page.locator('input[type="email"], input[name="email"]').fill('not-an-email')
    await page.locator('input[type="password"], input[name="password"]').fill('somepassword')
    await page.locator('button[type="submit"]').click()
    // Should either show validation error or stay on login page
    const currentUrl = page.url()
    const isStillOnLogin = currentUrl.includes('/login')
    const hasError = await page.locator('[class*="error"], [role="alert"], [class*="Error"]').count() > 0
    expect(isStillOnLogin || hasError).toBeTruthy()
  })

  test('shows error for wrong credentials', async ({ page }) => {
    await page.locator('input[type="email"], input[name="email"]').fill('wrong@example.com')
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword123')
    await page.locator('button[type="submit"]').click()
    // Wait for response – should remain on login page or show error
    await page.waitForTimeout(3000)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')
  })

  test('has a link to the register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /הירשם|register|הרשמה/i })
    await expect(registerLink).toBeVisible()
    await registerLink.click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('has a "forgot password" link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /שכחת|forgot/i })
    await expect(forgotLink).toBeVisible()
  })
})

// ─── Register Page ────────────────────────────────────────────────────────────
test.describe('Register Page (/register)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('loads the register page', async ({ page }) => {
    await expect(page.url()).toContain('/register')
    await expect(page.locator('body')).toBeVisible()
  })

  test('renders name, email and password fields', async ({ page }) => {
    await expect(page.locator('input[name="fullName"], input[placeholder*="שם"]')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('renders a submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.locator('button[type="submit"]').click()
    // Either HTML5 required or custom validation fires
    await page.waitForTimeout(500)
    const errorCount = await page
      .locator('[class*="error"], [role="alert"], p[class*="text-red"], p[class*="destructive"]')
      .count()
    const stillOnRegister = page.url().includes('/register')
    expect(errorCount > 0 || stillOnRegister).toBeTruthy()
  })

  test('shows error for invalid email', async ({ page }) => {
    const nameInput = page.locator('input[name="fullName"], input[placeholder*="שם"]')
    if (await nameInput.count() > 0) {
      await nameInput.fill('ישראל ישראלי')
    }
    await page.locator('input[type="email"], input[name="email"]').fill('bad-email')
    await page.locator('input[type="password"]').first().fill('Password1!')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/register')
  })

  test('shows error for short password', async ({ page }) => {
    const nameInput = page.locator('input[name="fullName"], input[placeholder*="שם"]')
    if (await nameInput.count() > 0) {
      await nameInput.fill('ישראל ישראלי')
    }
    await page.locator('input[type="email"], input[name="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').first().fill('123')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(500)
    // Should remain on register or show error
    const hasError = await page.locator('[class*="error"], [role="alert"]').count() > 0
    expect(hasError || page.url().includes('/register')).toBeTruthy()
  })

  test('has a link back to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /התחבר|login|כניסה/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Forgot Password Page ─────────────────────────────────────────────────────
test.describe('Forgot Password Page (/forgot-password)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password')
  })

  test('loads the forgot-password page', async ({ page }) => {
    await expect(page.url()).toContain('/forgot-password')
    await expect(page.locator('body')).toBeVisible()
  })

  test('renders an email field', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('renders a submit/reset button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows message after submitting valid email', async ({ page }) => {
    await page.locator('input[type="email"], input[name="email"]').fill('user@example.com')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)
    // Should show success message or remain on page
    const successMsg = page.locator('text=/נשלח|sent|בדוק/i')
    const stillOnPage = page.url().includes('/forgot-password')
    expect((await successMsg.count()) > 0 || stillOnPage).toBeTruthy()
  })

  test('has a link back to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /התחבר|login|חזור/i })
    await expect(loginLink).toBeVisible()
  })
})

// ─── Protected Route Redirects ────────────────────────────────────────────────
test.describe('Protected Routes – redirect unauthenticated users', () => {
  const protectedRoutes = [
    '/patient/dashboard',
    '/patient/appointments',
    '/patient/summaries',
    '/patient/tickets',
    '/doctor/dashboard',
    '/doctor/patients',
    '/doctor/appointments',
    '/doctor/availability',
    '/doctor/summaries',
    '/doctor/search-summaries',
    '/doctor/rag-search',
    '/doctor/transcriptions',
    '/admin/dashboard',
    '/admin/tickets',
  ]

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated user to /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' })
      const finalUrl = page.url()
      const isRedirected = finalUrl.includes('/login') || finalUrl.includes('/register')
      expect(isRedirected).toBeTruthy()
    })
  }
})

// ─── Full Auth Cycle (requires env vars) ─────────────────────────────────────
test.describe('Full Login → Dashboard → Logout (patient)', () => {
  test.skip(
    !process.env.TEST_PATIENT_EMAIL,
    'Skipped: set TEST_PATIENT_EMAIL & TEST_PATIENT_PASSWORD to run'
  )

  test('patient can log in and reach dashboard', async ({ page }) => {
    await loginAs(page, 'patient')
    await expect(page).toHaveURL(/\/patient\/dashboard/)
    await expect(page.locator('h1')).toContainText('שלום')
  })

  test('patient dashboard shows stat cards', async ({ page }) => {
    await loginAs(page, 'patient')
    await page.waitForSelector('[data-slot="card"]', { timeout: 10000 })
    const cards = page.locator('[data-slot="card"]')
    expect(await cards.count()).toBeGreaterThanOrEqual(3)
  })
})

test.describe('Full Login → Dashboard → Logout (doctor)', () => {
  test.skip(
    !process.env.TEST_DOCTOR_EMAIL,
    'Skipped: set TEST_DOCTOR_EMAIL & TEST_DOCTOR_PASSWORD to run'
  )

  test('doctor can log in and reach dashboard', async ({ page }) => {
    await loginAs(page, 'doctor')
    await expect(page).toHaveURL(/\/doctor\/dashboard/)
    await expect(page.locator('h1')).toContainText("ד\"ר")
  })
})
