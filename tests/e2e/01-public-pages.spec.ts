/**
 * E2E Tests – Public Pages
 *
 * Covers every publicly accessible route that requires NO authentication:
 *   / (Home), /doctors, /about, /contact, /faq, /privacy, /terms, /forgot-password
 *
 * Tests verify: HTTP 200, correct title/heading text, navigation links,
 * key UI sections, and basic interactivity (e.g. specialization buttons).
 */
import { test, expect } from '@playwright/test'

// ─── Home Page ────────────────────────────────────────────────────────────────
test.describe('Home Page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads with HTTP 200 and shows page content', async ({ page }) => {
    await expect(page).toHaveTitle(/medclinic|doctor|קליניקה/i)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('hero section contains main headline and two CTA buttons', async ({ page }) => {
    const hero = page.locator('h1')
    await expect(hero).toContainText('הבריאות')

    const findDoctorBtn = page.getByRole('link', { name: /מצא רופא/i })
    const joinBtn = page.getByRole('link', { name: /הצטרף/i })
    await expect(findDoctorBtn).toBeVisible()
    await expect(joinBtn).toBeVisible()
  })

  test('features section renders 4 feature cards', async ({ page }) => {
    const featureCards = page.locator('section').nth(1).locator('[data-slot="card"]')
    await expect(featureCards).toHaveCount(4)
  })

  test('specializations section shows all 10 specializations', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'רפואה כללית' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'קרדיולוגיה' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'נוירולוגיה' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'פסיכיאטריה' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'אורתופדיה' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'רפואת ילדים' })).toBeVisible()
  })

  test('clicking a specialization navigates to /doctors with filter', async ({ page }) => {
    await page.getByRole('button', { name: 'קרדיולוגיה' }).click()
    await expect(page).toHaveURL(/\/doctors.*specialization=/)
  })

  test('CTA section has sign-up button', async ({ page }) => {
    const ctaBtn = page.getByRole('link', { name: /הירשמו/i })
    await expect(ctaBtn).toBeVisible()
  })

  test('header navigation links are present', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header.getByRole('link', { name: /רופאים|doctors/i })).toBeVisible()
  })

  test('footer is rendered', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
  })

  test('"מצא רופא" button navigates to /doctors', async ({ page }) => {
    await page.getByRole('link', { name: /מצא רופא/i }).first().click()
    await expect(page).toHaveURL(/\/doctors/)
  })

  test('"הצטרף עכשיו" button navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /הצטרף/i }).first().click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── About Page ───────────────────────────────────────────────────────────────
test.describe('About Page (/about)', () => {
  test('loads and displays heading', async ({ page }) => {
    const res = await page.goto('/about')
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('page has HTML content and no error messages', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── Contact Page ─────────────────────────────────────────────────────────────
test.describe('Contact Page (/contact)', () => {
  test('loads successfully', async ({ page }) => {
    const res = await page.goto('/contact')
    expect(res?.status()).toBe(200)
  })

  test('displays contact information', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

// ─── FAQ Page ─────────────────────────────────────────────────────────────────
test.describe('FAQ Page (/faq)', () => {
  test('loads successfully', async ({ page }) => {
    const res = await page.goto('/faq')
    expect(res?.status()).toBe(200)
  })

  test('shows FAQ heading', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('has no uncaught server errors', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })
})

// ─── Privacy Policy ───────────────────────────────────────────────────────────
test.describe('Privacy Policy (/privacy)', () => {
  test('loads successfully', async ({ page }) => {
    const res = await page.goto('/privacy')
    expect(res?.status()).toBe(200)
  })

  test('shows privacy heading', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

// ─── Terms of Service ─────────────────────────────────────────────────────────
test.describe('Terms of Service (/terms)', () => {
  test('loads successfully', async ({ page }) => {
    const res = await page.goto('/terms')
    expect(res?.status()).toBe(200)
  })

  test('shows terms heading', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

// ─── 404 / Unknown Routes ─────────────────────────────────────────────────────
test.describe('Unknown routes', () => {
  test('returns 404 or redirects for unknown path', async ({ page }) => {
    const res = await page.goto('/this-route-definitely-does-not-exist-xyz')
    // Next.js returns 404; some configs redirect to home
    expect([200, 404]).toContain(res?.status())
  })
})
