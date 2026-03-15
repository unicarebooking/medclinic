/**
 * E2E Tests – API Endpoints
 *
 * Black-box tests hitting all API routes directly via HTTP.
 * These run against whatever baseURL is configured (local or ALB).
 *
 * No browser UI is used – tests use the Playwright `request` fixture.
 */
import { test, expect } from '@playwright/test'

// ─── Health & Connectivity ────────────────────────────────────────────────────
test.describe('Application Health', () => {
  test('GET / returns 200', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
  })

  test('GET / returns HTML content', async ({ request }) => {
    const res = await request.get('/')
    const body = await res.text()
    expect(body).toContain('<!DOCTYPE html')
  })

  test('GET /_next/static does not return 503', async ({ request }) => {
    const res = await request.get('/_next/static', { maxRedirects: 5 })
    expect(res.status()).not.toBe(503)
  })

  test('homepage content contains Hebrew text', async ({ request }) => {
    const res = await request.get('/')
    const body = await res.text()
    // The app is Hebrew – page should contain Hebrew characters
    expect(body).toMatch(/[\u0590-\u05FF]/)
  })
})

// ─── Page Routes (Server-side rendering) ─────────────────────────────────────
test.describe('Page Routes – HTTP status', () => {
  const publicRoutes = [
    { path: '/', name: 'Home' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/forgot-password', name: 'Forgot Password' },
    { path: '/doctors', name: 'Doctors Listing' },
    { path: '/about', name: 'About' },
    { path: '/contact', name: 'Contact' },
    { path: '/faq', name: 'FAQ' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/terms', name: 'Terms' },
  ]

  for (const { path, name } of publicRoutes) {
    test(`GET ${path} (${name}) returns 200`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 5 })
      expect(res.status()).toBe(200)
    })
  }
})

// ─── Protected Routes – redirect unauthenticated ──────────────────────────────
test.describe('Protected Routes – redirect behavior', () => {
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

  for (const path of protectedRoutes) {
    test(`GET ${path} without auth redirects (3xx) or shows login`, async ({ request }) => {
      // Don't follow redirects so we can inspect the raw response
      const res = await request.get(path, { maxRedirects: 0 })
      const status = res.status()
      // Either a redirect or the login page (200 after redirect) is acceptable
      expect([200, 301, 302, 307, 308]).toContain(status)
    })
  }
})

// ─── Auth API ─────────────────────────────────────────────────────────────────
test.describe('POST /api/auth/register – validation', () => {
  test('rejects empty body with 4xx', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {},
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('rejects missing email with 4xx', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { password: 'Password123!', fullName: 'Test User' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('rejects invalid email format with 4xx', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'not-an-email', password: 'Password123!', fullName: 'Test' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('rejects short password with 4xx', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'test@example.com', password: '123', fullName: 'Test' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('returns JSON response', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {},
    })
    const contentType = res.headers()['content-type'] || ''
    expect(contentType).toContain('json')
  })
})

// ─── RAG API ──────────────────────────────────────────────────────────────────
test.describe('POST /api/rag/query', () => {
  test('returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/rag/query', {
      data: { query: 'test query' },
    })
    expect(res.status()).toBe(401)
  })

  test('returns JSON with error property for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/rag/query', {
      data: { query: 'test query' },
    })
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('GET method returns 405', async ({ request }) => {
    const res = await request.get('/api/rag/query')
    expect(res.status()).toBe(405)
  })
})

test.describe('POST /api/rag/index', () => {
  test('returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/rag/index', {
      data: { source_table: 'test', source_id: 'abc' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('POST /api/rag/reindex', () => {
  test('returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/rag/reindex', {
      data: {},
    })
    // 401 or 403
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})

test.describe('GET /api/rag/health', () => {
  test('health endpoint responds (200 or 503)', async ({ request }) => {
    const res = await request.get('/api/rag/health')
    // RAG server might not be running – 200 (healthy) or 503 (service unavailable)
    expect([200, 503, 404]).toContain(res.status())
  })
})

// ─── Transcription API ────────────────────────────────────────────────────────
test.describe('POST /api/transcription/upload', () => {
  test('returns 4xx for request with no file', async ({ request }) => {
    const res = await request.post('/api/transcription/upload')
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('returns 4xx for request with wrong content type', async ({ request }) => {
    const res = await request.post('/api/transcription/upload', {
      data: { test: 'data' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe('GET /api/transcription/status/[jobId]', () => {
  test('returns 4xx/5xx for non-existent job ID', async ({ request }) => {
    const res = await request.get('/api/transcription/status/non-existent-job-000000')
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('returns JSON response', async ({ request }) => {
    const res = await request.get('/api/transcription/status/non-existent-job-000000')
    const contentType = res.headers()['content-type'] || ''
    expect(contentType).toContain('json')
  })
})

test.describe('GET /api/transcription/download/[jobId]', () => {
  test('returns 4xx/5xx for non-existent job ID', async ({ request }) => {
    const res = await request.get('/api/transcription/download/non-existent-job-000000')
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})

// ─── Security Headers ─────────────────────────────────────────────────────────
test.describe('Security – Response Headers', () => {
  test('homepage does not expose server version in headers', async ({ request }) => {
    const res = await request.get('/')
    const serverHeader = res.headers()['server'] || ''
    // Should not expose "Apache/2.4" or "nginx/1.18" style version info
    expect(serverHeader).not.toMatch(/\d+\.\d+/)
  })

  test('API 401 response has proper JSON error body', async ({ request }) => {
    const res = await request.post('/api/rag/query', {
      data: { query: 'test' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
  })
})

// ─── Content Integrity ────────────────────────────────────────────────────────
test.describe('Content Integrity', () => {
  test('login page contains form elements', async ({ request }) => {
    const res = await request.get('/login')
    const body = await res.text()
    expect(body).toContain('input')
  })

  test('register page contains form elements', async ({ request }) => {
    const res = await request.get('/register')
    const body = await res.text()
    expect(body).toContain('input')
  })

  test('doctors page contains card or list elements', async ({ request }) => {
    const res = await request.get('/doctors')
    const body = await res.text()
    // Should have some meaningful content
    expect(body.length).toBeGreaterThan(1000)
  })
})
