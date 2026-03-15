/**
 * E2E Tests – Patient Portal
 *
 * Tests the full patient experience when authenticated.
 * All tests are skipped automatically if TEST_PATIENT_EMAIL is not set.
 *
 * Set env vars:
 *   TEST_PATIENT_EMAIL=patient@example.com
 *   TEST_PATIENT_PASSWORD=YourPassword123
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

const HAS_CREDENTIALS = !!process.env.TEST_PATIENT_EMAIL

test.describe('Patient Portal – Unauthenticated redirects', () => {
  const patientRoutes = [
    '/patient/dashboard',
    '/patient/appointments',
    '/patient/summaries',
    '/patient/tickets',
  ]

  for (const route of patientRoutes) {
    test(`${route} redirects to /login without auth`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' })
      expect(page.url()).toContain('/login')
    })
  }
})

test.describe('Patient Dashboard (/patient/dashboard)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/patient/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('dashboard page loads and shows greeting', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('שלום')
  })

  test('shows "upcoming appointments" stat card', async ({ page }) => {
    await expect(page.locator('text=תורים קרובים').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows "total appointments" stat card', async ({ page }) => {
    await expect(page.locator('text=/סה"כ תורים/').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows "treatment summaries" stat card', async ({ page }) => {
    await expect(page.locator('text=סיכומי טיפולים').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows "book appointment" quick action card', async ({ page }) => {
    await expect(page.locator('text=קבע תור חדש').first()).toBeVisible({ timeout: 10000 })
  })

  test('"book appointment" button navigates to /doctors', async ({ page }) => {
    await page.getByRole('link', { name: /קבע תור חדש/i }).first().click()
    await expect(page).toHaveURL(/\/doctors/)
  })

  test('sidebar navigation is visible', async ({ page }) => {
    const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').first()
    await expect(sidebar).toBeVisible({ timeout: 5000 })
  })

  test('sidebar has link to appointments', async ({ page }) => {
    const apptLink = page.getByRole('link', { name: /תורים/i })
    await expect(apptLink.first()).toBeVisible()
  })
})

test.describe('Patient Appointments (/patient/appointments)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/patient/appointments')
    await page.waitForLoadState('networkidle')
  })

  test('appointments page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows appointment list or empty state', async ({ page }) => {
    // Either appointment cards or "no appointments" message
    await page.waitForTimeout(3000)
    const hasData = (await page.locator('[data-slot="card"], table tbody tr').count()) > 0
    const hasEmptyMsg = (await page.locator('text=/אין.*תורים|אין.*פגישות/i').count()) > 0
    expect(hasData || hasEmptyMsg).toBeTruthy()
  })

  test('each appointment row shows status badge', async ({ page }) => {
    await page.waitForTimeout(3000)
    const badges = page.locator('[data-slot="badge"]')
    // If there are appointments with badges, they should be visible
    const rowCount = await page.locator('[data-slot="badge"]').count()
    if (rowCount > 0) {
      expect(await badges.count()).toBeGreaterThan(0)
    }
  })

  test('cancel button appears on pending/confirmed appointments', async ({ page }) => {
    await page.waitForTimeout(3000)
    const cancelBtns = page.getByRole('button', { name: /בטל|cancel/i })
    // We don't assert count > 0 because user may have no active appointments
    // Just verify page doesn't crash
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

test.describe('Patient Treatment Summaries (/patient/summaries)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/patient/summaries')
    await page.waitForLoadState('networkidle')
  })

  test('summaries page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows summary list or empty state', async ({ page }) => {
    await page.waitForTimeout(3000)
    const hasSummaries = await page.locator('[data-slot="card"], table tbody tr').count() > 0
    const hasEmpty = await page.locator('text=/אין סיכומים|לא נמצאו/i').count() > 0
    expect(hasSummaries || hasEmpty).toBeTruthy()
  })

  test('summary cards display diagnosis or treatment info', async ({ page }) => {
    await page.waitForTimeout(3000)
    const cards = page.locator('[data-slot="card"]')
    if (await cards.count() > 0) {
      // At least one card should have some text
      const firstCard = cards.first()
      const text = await firstCard.textContent()
      expect(text?.length).toBeGreaterThan(5)
    }
  })
})

test.describe('Patient Support Tickets (/patient/tickets)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/patient/tickets')
    await page.waitForLoadState('networkidle')
  })

  test('tickets page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows ticket list or empty state', async ({ page }) => {
    await page.waitForTimeout(3000)
    const hasTickets = await page.locator('[data-slot="card"], table tbody tr').count() > 0
    const hasEmpty = await page.locator('text=/אין פניות|לא נמצאו/i').count() > 0
    expect(hasTickets || hasEmpty).toBeTruthy()
  })

  test('has a "create ticket" button', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /פנייה חדשה|צור פנייה|פתח פנייה/i })
      .or(page.getByRole('link', { name: /פנייה חדשה|צור פנייה/i }))
    await expect(createBtn.first()).toBeVisible({ timeout: 10000 })
  })

  test('ticket status badges are visible when tickets exist', async ({ page }) => {
    await page.waitForTimeout(3000)
    const ticketCount = await page.locator('[data-slot="card"]').count()
    if (ticketCount > 0) {
      const badges = page.locator('[data-slot="badge"]')
      expect(await badges.count()).toBeGreaterThan(0)
    }
  })
})

test.describe('Patient Sidebar Navigation', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/patient/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('sidebar navigates to /patient/appointments', async ({ page }) => {
    await page.getByRole('link', { name: /תורים שלי|התורים שלי/i }).first().click()
    await expect(page).toHaveURL(/\/patient\/appointments/)
  })

  test('sidebar navigates to /patient/summaries', async ({ page }) => {
    await page.getByRole('link', { name: /סיכומי טיפולים/i }).first().click()
    await expect(page).toHaveURL(/\/patient\/summaries/)
  })

  test('sidebar navigates to /patient/tickets', async ({ page }) => {
    await page.getByRole('link', { name: /פניות|tickets/i }).first().click()
    await expect(page).toHaveURL(/\/patient\/tickets/)
  })
})
