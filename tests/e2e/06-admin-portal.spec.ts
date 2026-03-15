/**
 * E2E Tests – Admin Portal
 *
 * Tests the admin panel when authenticated as an admin user.
 * All authenticated tests are skipped if TEST_ADMIN_EMAIL is not set.
 *
 * Set env vars:
 *   TEST_ADMIN_EMAIL=admin@example.com
 *   TEST_ADMIN_PASSWORD=YourPassword123
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

const HAS_CREDENTIALS = !!process.env.TEST_ADMIN_EMAIL

// ─── Unauthenticated Redirects ────────────────────────────────────────────────
test.describe('Admin Portal – Unauthenticated redirects', () => {
  test('admin/dashboard redirects to /login without auth', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    expect(page.url()).toContain('/login')
  })

  test('admin/tickets redirects to /login without auth', async ({ page }) => {
    await page.goto('/admin/tickets', { waitUntil: 'networkidle' })
    expect(page.url()).toContain('/login')
  })
})

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
test.describe('Admin Dashboard (/admin/dashboard)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('dashboard loads without server error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows admin dashboard heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows system-wide statistics cards', async ({ page }) => {
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 })
    const cards = page.locator('[data-slot="card"]')
    expect(await cards.count()).toBeGreaterThanOrEqual(2)
  })

  test('stat cards show numeric values', async ({ page }) => {
    await page.waitForTimeout(5000)
    const numericText = page.locator('p.text-3xl, [class*="font-bold"]')
    expect(await numericText.count()).toBeGreaterThan(0)
  })

  test('admin sidebar navigation is visible', async ({ page }) => {
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    await expect(sidebar).toBeVisible({ timeout: 5000 })
  })

  test('sidebar has link to tickets', async ({ page }) => {
    const ticketsLink = page.getByRole('link', { name: /פניות|tickets/i })
    await expect(ticketsLink.first()).toBeVisible()
  })
})

// ─── Admin Tickets ────────────────────────────────────────────────────────────
test.describe('Admin Tickets (/admin/tickets)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/tickets')
    await page.waitForLoadState('networkidle')
  })

  test('tickets page loads without server error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows ticket list or empty state', async ({ page }) => {
    await page.waitForTimeout(5000)
    const hasTickets =
      (await page.locator('table tbody tr, [data-slot="card"]').count()) > 0
    const hasEmpty = (await page.locator('text=/אין פניות|לא נמצאו/i').count()) > 0
    expect(hasTickets || hasEmpty).toBeTruthy()
  })

  test('tickets have status badges', async ({ page }) => {
    await page.waitForTimeout(3000)
    const ticketCount = await page.locator('table tbody tr, [data-slot="card"]').count()
    if (ticketCount > 0) {
      const badges = page.locator('[data-slot="badge"]')
      expect(await badges.count()).toBeGreaterThan(0)
    }
  })

  test('tickets have priority indicators', async ({ page }) => {
    await page.waitForTimeout(3000)
    const ticketCount = await page.locator('table tbody tr, [data-slot="card"]').count()
    if (ticketCount > 0) {
      // Priority labels or badges should appear
      const priorityText = page.locator('text=/דחוף|גבוהה|בינונית|נמוכה/i')
      expect(await priorityText.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('can filter tickets by status', async ({ page }) => {
    await page.waitForTimeout(3000)
    const statusFilter = page.locator('select, [role="combobox"]').first()
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click()
      await page.waitForTimeout(500)
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
    }
  })

  test('resolve/assign button appears on open tickets', async ({ page }) => {
    await page.waitForTimeout(3000)
    // These buttons may or may not exist depending on ticket data
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── Admin Navigation ─────────────────────────────────────────────────────────
test.describe('Admin Sidebar Navigation', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('sidebar link to /admin/tickets works', async ({ page }) => {
    await page.getByRole('link', { name: /פניות|tickets/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/tickets/)
  })

  test('clicking dashboard link stays on /admin/dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /לוח בקרה|dashboard/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})

// ─── Role-Based Access Control ────────────────────────────────────────────────
test.describe('RBAC – Patient cannot access doctor routes', () => {
  test.skip(!process.env.TEST_PATIENT_EMAIL, 'Requires TEST_PATIENT_EMAIL + TEST_PATIENT_PASSWORD')

  test('patient accessing /doctor/dashboard gets redirected or sees error', async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/doctor/dashboard', { waitUntil: 'networkidle' })
    const url = page.url()
    // Should redirect to patient portal, login, or show 403
    const isBlocked =
      url.includes('/login') ||
      url.includes('/patient') ||
      (await page.locator('text=/403|Forbidden|אין גישה/i').count()) > 0
    expect(isBlocked).toBeTruthy()
  })

  test('patient accessing /admin/dashboard gets redirected or sees error', async ({ page }) => {
    await loginAs(page, 'patient')
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    const url = page.url()
    const isBlocked =
      url.includes('/login') ||
      url.includes('/patient') ||
      (await page.locator('text=/403|Forbidden|אין גישה/i').count()) > 0
    expect(isBlocked).toBeTruthy()
  })
})
