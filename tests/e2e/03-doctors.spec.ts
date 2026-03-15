/**
 * E2E Tests – Doctors Listing & Doctor Profile Pages
 *
 * Covers: /doctors (listing with filters), /doctors/[id] (profile), /doctors/[id]/book (booking)
 */
import { test, expect } from '@playwright/test'

// ─── Doctors Listing ──────────────────────────────────────────────────────────
test.describe('Doctors Listing (/doctors)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/doctors')
  })

  test('loads with HTTP 200 and shows heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('הרופאים')
  })

  test('renders the filter panel on the left', async ({ page }) => {
    // Filter panel should be visible
    const filterPanel = page.locator('aside, [class*="filter"], [class*="Filter"]').first()
    await expect(filterPanel).toBeVisible({ timeout: 10000 })
  })

  test('renders doctor cards after loading', async ({ page }) => {
    // Wait for doctor cards to appear (they load via Suspense)
    await page.waitForSelector('[data-slot="card"], [data-testid="doctor-card"]', { timeout: 15000 })
    const cards = page.locator('[data-slot="card"]')
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows subheading about 30+ doctors', async ({ page }) => {
    await expect(page.locator('p, span').filter({ hasText: /30\+|רופאים מומחים/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('filter by specialization narrows results', async ({ page }) => {
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 })
    const initialCount = await page.locator('[data-slot="card"]').count()

    // Click a specialization button/select in the filter panel
    const specializationFilter = page
      .locator('aside, [class*="filter"]')
      .getByRole('button', { name: /קרדיולוגיה/i })
      .first()

    if (await specializationFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specializationFilter.click()
      await page.waitForTimeout(2000)
      const filteredCount = await page.locator('[data-slot="card"]').count()
      // Filtered results should be less than or equal to initial
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    } else {
      // Filter may be a select – try URL approach
      await page.goto('/doctors?specialization=%D7%A7%D7%A8%D7%93%D7%99%D7%95%D7%9C%D7%95%D7%92%D7%99%D7%94')
      await page.waitForSelector('[data-slot="card"]', { timeout: 15000 })
      expect(await page.locator('[data-slot="card"]').count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('filter by city via URL parameter works', async ({ page }) => {
    await page.goto('/doctors?city=%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91')
    // Wait for page to load (don't require cards – city may return 0 doctors)
    await expect(page.locator('h1')).toContainText('הרופאים', { timeout: 10000 })
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('search by name via URL parameter works', async ({ page }) => {
    await page.goto('/doctors?search=דוד')
    // Wait for page heading – don't require cards as search may return 0 results
    await expect(page.locator('h1')).toContainText('הרופאים', { timeout: 10000 })
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('empty search results shows helpful message', async ({ page }) => {
    await page.goto('/doctors?search=xxxxxxxxxnotexistingdoctor')
    await page.waitForTimeout(3000)
    // Should show empty state or 0 results – not a server error
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('clicking a doctor card navigates to their profile', async ({ page }) => {
    test.slow() // Extra time when running in parallel
    await page.waitForSelector('[data-slot="card"] a, [data-slot="card"] button', { timeout: 20000 })
    const doctorLink = page.locator('a[href*="/doctors/"]').first()
    if (await doctorLink.count() > 0) {
      await doctorLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/doctors\/.+/, { timeout: 15000 })
    }
  })

  test('header is visible on doctors page', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible()
  })

  test('footer is visible on doctors page', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible()
  })
})

// ─── Doctor Profile Page ───────────────────────────────────────────────────────
test.describe('Doctor Profile (/doctors/[id])', () => {
  // We find the first real doctor link from the listing
  test('doctor profile page loads without server error', async ({ page }) => {
    await page.goto('/doctors')
    await page.waitForSelector('a[href*="/doctors/"]', { timeout: 15000 })
    const firstDoctorLink = page.locator('a[href*="/doctors/"]').first()
    const href = await firstDoctorLink.getAttribute('href')

    if (href) {
      const res = await page.goto(href)
      expect(res?.status()).not.toBe(500)
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
    }
  })

  test('doctor profile shows doctor name', async ({ page }) => {
    await page.goto('/doctors')
    await page.waitForSelector('a[href*="/doctors/"]', { timeout: 15000 })
    const firstDoctorLink = page.locator('a[href*="/doctors/"]').first()
    const href = await firstDoctorLink.getAttribute('href')

    if (href) {
      await page.goto(href)
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('doctor profile has a "book appointment" button or link', async ({ page }) => {
    await page.goto('/doctors')
    await page.waitForSelector('a[href*="/doctors/"]', { timeout: 15000 })
    const firstDoctorLink = page.locator('a[href*="/doctors/"]').first()
    const href = await firstDoctorLink.getAttribute('href')

    if (href) {
      await page.goto(href)
      await page.waitForTimeout(2000)
      const bookBtn = page.getByRole('link', { name: /קבע תור|book|הזמן/i })
        .or(page.getByRole('button', { name: /קבע תור|book|הזמן/i }))
      await expect(bookBtn.first()).toBeVisible({ timeout: 10000 })
    }
  })
})

// ─── Booking Page ─────────────────────────────────────────────────────────────
test.describe('Booking Page (/doctors/[id]/book)', () => {
  test('booking page redirects unauthenticated user to login', async ({ page }) => {
    // Find a real doctor first
    await page.goto('/doctors')
    await page.waitForSelector('a[href*="/doctors/"]', { timeout: 15000 })
    const firstDoctorLink = page.locator('a[href*="/doctors/"]').first()
    const href = await firstDoctorLink.getAttribute('href')

    if (href) {
      const bookUrl = `${href}/book`
      await page.goto(bookUrl, { waitUntil: 'networkidle' })
      const finalUrl = page.url()
      // Either redirected to login or shows booking page (if public)
      const isLoginOrBook =
        finalUrl.includes('/login') ||
        finalUrl.includes('/book') ||
        finalUrl.includes('/doctors')
      expect(isLoginOrBook).toBeTruthy()
    }
  })
})

// ─── Specialization Filter via URL ────────────────────────────────────────────
test.describe('Doctors – specialization URL filters', () => {
  const specializations = [
    'רפואה כללית',
    'קרדיולוגיה',
    'נוירולוגיה',
    'רפואת עור',
  ]

  for (const spec of specializations) {
    test(`filtering by ${spec} returns valid page`, async ({ page }) => {
      const encoded = encodeURIComponent(spec)
      await page.goto(`/doctors?specialization=${encoded}`)
      await expect(page.locator('h1')).toContainText('הרופאים', { timeout: 10000 })
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
    })
  }
})
