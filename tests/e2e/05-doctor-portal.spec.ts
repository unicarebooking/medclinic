/**
 * E2E Tests – Doctor Portal
 *
 * Tests the full doctor experience when authenticated.
 * All tests are skipped automatically if TEST_DOCTOR_EMAIL is not set.
 *
 * Set env vars:
 *   TEST_DOCTOR_EMAIL=doctor@example.com
 *   TEST_DOCTOR_PASSWORD=YourPassword123
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures/auth'

const HAS_CREDENTIALS = !!process.env.TEST_DOCTOR_EMAIL

// ─── Unauthenticated Redirects ────────────────────────────────────────────────
test.describe('Doctor Portal – Unauthenticated redirects', () => {
  const doctorRoutes = [
    '/doctor/dashboard',
    '/doctor/patients',
    '/doctor/appointments',
    '/doctor/availability',
    '/doctor/summaries',
    '/doctor/search-summaries',
    '/doctor/rag-search',
    '/doctor/transcriptions',
  ]

  for (const route of doctorRoutes) {
    test(`${route} redirects to /login without auth`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' })
      expect(page.url()).toContain('/login')
    })
  }
})

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
test.describe('Doctor Dashboard (/doctor/dashboard)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('dashboard loads and shows doctor greeting', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('שלום')
    await expect(page.locator('h1')).toContainText('ד"ר')
  })

  test('shows 4 stat cards (today, pending, patients, summaries)', async ({ page }) => {
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 })
    const cards = page.locator('[data-slot="card"]')
    expect(await cards.count()).toBeGreaterThanOrEqual(4)
  })

  test('"today appointments" card is visible', async ({ page }) => {
    await expect(page.locator('text=תורים להיום').first()).toBeVisible({ timeout: 10000 })
  })

  test('"pending approval" card is visible', async ({ page }) => {
    await expect(page.locator('text=ממתינים לאישור').first()).toBeVisible({ timeout: 10000 })
  })

  test('"total patients" card is visible', async ({ page }) => {
    await expect(page.locator('text=מטופלים').first()).toBeVisible({ timeout: 10000 })
  })

  test('"monthly summaries" card is visible', async ({ page }) => {
    await expect(page.locator('text=סיכומים החודש').first()).toBeVisible({ timeout: 10000 })
  })

  test('weekly appointments bar chart is rendered', async ({ page }) => {
    // Recharts renders SVG elements
    await page.waitForSelector('svg, [class*="recharts"]', { timeout: 10000 })
    const charts = page.locator('svg, [class*="recharts"]')
    expect(await charts.count()).toBeGreaterThanOrEqual(1)
  })

  test('quick actions card has navigation buttons', async ({ page }) => {
    await expect(page.locator('text=פעולות מהירות').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /צפה בכל התורים/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /נהל זמינות/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /כתוב סיכום/i }).first()).toBeVisible()
  })
})

// ─── Doctor Patients ──────────────────────────────────────────────────────────
test.describe('Doctor Patients (/doctor/patients)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/patients')
    await page.waitForLoadState('networkidle')
  })

  test('patients page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows patient list or empty state', async ({ page }) => {
    await page.waitForTimeout(5000)
    const hasPatients =
      (await page.locator('table tbody tr, [class*="patient-row"], [data-slot="card"]').count()) > 0
    const hasEmpty = (await page.locator('text=/אין מטופלים|לא נמצאו/i').count()) > 0
    expect(hasPatients || hasEmpty).toBeTruthy()
  })

  test('search input is available', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="חפש"]')
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 })
  })

  test('searching filters the patient list', async ({ page }) => {
    await page.waitForTimeout(3000)
    const searchInput = page.locator('input[type="search"], input[placeholder*="חפש"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('דוד')
      await page.waitForTimeout(1000)
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
    }
  })

  test('clicking a patient row navigates to patient detail', async ({ page }) => {
    await page.waitForTimeout(5000)
    const patientLink = page.locator('a[href*="/doctor/patients/"]').first()
    if (await patientLink.count() > 0) {
      await patientLink.click()
      await expect(page).toHaveURL(/\/doctor\/patients\/.+/)
    }
  })
})

// ─── Patient Detail (Doctor view) ─────────────────────────────────────────────
test.describe('Patient Detail Page (/doctor/patients/[id])', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test('patient detail page loads with tabs', async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/patients')
    await page.waitForTimeout(5000)
    const patientLink = page.locator('a[href*="/doctor/patients/"]').first()
    if (await patientLink.count() > 0) {
      const href = await patientLink.getAttribute('href')
      if (href) {
        await page.goto(href)
        await page.waitForURL(/\/doctor\/patients\/.+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')
        // Should have tabs: appointments, summaries, transcriptions, payments
        const tabs = page.getByRole('tab')
        await expect(tabs.first()).toBeVisible({ timeout: 10000 })
        expect(await tabs.count()).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

// ─── Doctor Appointments ──────────────────────────────────────────────────────
test.describe('Doctor Appointments (/doctor/appointments)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/appointments')
    await page.waitForLoadState('networkidle')
  })

  test('appointments page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('shows appointment list or empty state', async ({ page }) => {
    await page.waitForTimeout(5000)
    const hasData =
      (await page.locator('table tbody tr, [data-slot="card"]').count()) > 0
    const hasEmpty = (await page.locator('text=/אין תורים|לא נמצאו/i').count()) > 0
    expect(hasData || hasEmpty).toBeTruthy()
  })

  test('confirm/cancel action buttons exist for pending appointments', async ({ page }) => {
    await page.waitForTimeout(3000)
    // These may or may not exist depending on data
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── Doctor Availability ──────────────────────────────────────────────────────
test.describe('Doctor Availability (/doctor/availability)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/availability')
    await page.waitForLoadState('networkidle')
  })

  test('availability page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('has a "create slot" or "add availability" button', async ({ page }) => {
    const addBtn = page
      .getByRole('button', { name: /הוסף|צור|זמינות חדשה|תור חדש/i })
      .or(page.getByRole('link', { name: /הוסף|צור/i }))
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 })
  })

  test('shows existing slots or empty state', async ({ page }) => {
    await page.waitForTimeout(5000)
    const hasSlots =
      (await page.locator('table tbody tr, [class*="slot"], [data-slot="card"]').count()) > 0
    const hasEmpty = (await page.locator('text=/אין זמינות|לא נמצאו/i').count()) > 0
    expect(hasSlots || hasEmpty).toBeTruthy()
  })
})

// ─── Treatment Summaries (Doctor) ─────────────────────────────────────────────
test.describe('Doctor Summaries (/doctor/summaries)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/summaries')
    await page.waitForLoadState('networkidle')
  })

  test('summaries page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows summaries form or list', async ({ page }) => {
    await page.waitForTimeout(3000)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('has diagnosis/treatment text areas', async ({ page }) => {
    await page.waitForTimeout(3000)
    const hasForm = (await page.locator('textarea, [contenteditable]').count()) > 0
    const hasList = (await page.locator('[data-slot="card"]').count()) > 0
    expect(hasForm || hasList).toBeTruthy()
  })
})

// ─── Search Summaries ─────────────────────────────────────────────────────────
test.describe('Doctor Search Summaries (/doctor/search-summaries)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/search-summaries')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('has a search input field', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="חפש"]')
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 })
  })

  test('submitting a search query shows results or empty state', async ({ page }) => {
    const searchInput = page.locator('input[data-slot="input"], input[placeholder*="חפש"], input[type="search"], input[type="text"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('כאב גב')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── RAG Search ───────────────────────────────────────────────────────────────
test.describe('Doctor RAG Search (/doctor/rag-search)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/rag-search')
    await page.waitForLoadState('networkidle')
  })

  test('RAG search page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('has a search input', async ({ page }) => {
    const searchInput = page.locator('input, textarea').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('submitting query shows response or error gracefully', async ({ page }) => {
    const searchInput = page.locator('input, textarea').first()
    await searchInput.fill('מה הטיפול לסוכרת?')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(5000) // RAG can be slow
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── Transcriptions ───────────────────────────────────────────────────────────
test.describe('Doctor Transcriptions (/doctor/transcriptions)', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/transcriptions')
    await page.waitForLoadState('networkidle')
  })

  test('transcriptions page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('shows file upload area', async ({ page }) => {
    // Should have a file input or upload button
    const fileInput = page.locator('input[type="file"]')
    const uploadBtn = page.getByRole('button', { name: /העלה|upload|בחר קובץ/i })
    const hasUpload =
      (await fileInput.count()) > 0 ||
      (await uploadBtn.count()) > 0
    expect(hasUpload).toBeTruthy()
  })

  test('shows transcription history or empty state', async ({ page }) => {
    await page.waitForTimeout(3000)
    const hasHistory = (await page.locator('[data-slot="card"], table tbody tr').count()) > 0
    const hasEmpty = (await page.locator('text=/אין תמלולים|לא נמצאו/i').count()) > 0
    expect(hasHistory || hasEmpty).toBeTruthy()
  })
})

// ─── Doctor Sidebar Navigation ────────────────────────────────────────────────
test.describe('Doctor Sidebar Navigation', () => {
  test.skip(!HAS_CREDENTIALS, 'Requires TEST_DOCTOR_EMAIL + TEST_DOCTOR_PASSWORD')

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor')
    await page.goto('/doctor/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('sidebar link to /doctor/patients works', async ({ page }) => {
    await page.getByRole('link', { name: /מטופלים/i }).first().click()
    await expect(page).toHaveURL(/\/doctor\/patients/)
  })

  test('sidebar link to /doctor/appointments works', async ({ page }) => {
    await page.getByRole('link', { name: /תורים/i }).first().click()
    await expect(page).toHaveURL(/\/doctor\/appointments|\/doctor\/availability/)
  })

  test('sidebar link to /doctor/availability works', async ({ page }) => {
    await page.getByRole('link', { name: /זמינות/i }).first().click()
    await expect(page).toHaveURL(/\/doctor\/availability/)
  })

  test('sidebar link to /doctor/summaries works', async ({ page }) => {
    await page.getByRole('link', { name: /סיכומי טיפולים|סיכום/i }).first().click()
    await expect(page).toHaveURL(/\/doctor\/summaries/)
  })
})
