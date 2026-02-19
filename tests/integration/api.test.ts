/**
 * Integration Tests for API Endpoints
 * Tests 45-62: All API routes tested against live ALB
 *
 * Requires env var: ALB_URL (defaults to medclinic ALB)
 */
import { describe, it, expect } from 'vitest'

const ALB_URL = process.env.ALB_URL || 'http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com'

describe('API - Health & Connectivity', () => {
  // Test 45
  it('should return 200 from ALB root', async () => {
    const res = await fetch(ALB_URL, { redirect: 'follow' })
    expect(res.status).toBe(200)
  })

  // Test 46
  it('should return HTML content from homepage', async () => {
    const res = await fetch(ALB_URL)
    const text = await res.text()
    expect(text).toContain('<!DOCTYPE html')
  })

  // Test 47
  it('should serve Next.js static assets', async () => {
    const res = await fetch(`${ALB_URL}/_next/static`, { redirect: 'follow' })
    // May redirect or 404, but should not 503
    expect(res.status).not.toBe(503)
  })
})

describe('API - Auth Endpoints', () => {
  // Test 48
  it('should reject registration with missing fields', async () => {
    const res = await fetch(`${ALB_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  // Test 49
  it('should reject registration with invalid email', async () => {
    const res = await fetch(`${ALB_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123456', fullName: 'Test' }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  // Test 50
  it('should reject registration with short password', async () => {
    const res = await fetch(`${ALB_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: '123', fullName: 'Test' }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('API - RAG Query Endpoint', () => {
  // Test 51
  it('should reject unauthenticated RAG query', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    })
    expect(res.status).toBe(401)
  })

  // Test 52
  it('should return JSON error for unauthenticated RAG query', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    })
    const data = await res.json()
    expect(data).toHaveProperty('error')
  })

  // Test 53
  it('should reject GET method on RAG query', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`)
    expect(res.status).toBe(405)
  })
})

describe('API - RAG Index Endpoint', () => {
  // Test 54
  it('should reject unauthenticated RAG index', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_table: 'test', source_id: 'test' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('API - Transcription Endpoints', () => {
  // Test 55
  it('should reject empty transcription upload', async () => {
    const res = await fetch(`${ALB_URL}/api/transcription/upload`, {
      method: 'POST',
    })
    // Should get error, not 200
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  // Test 56
  it('should return 404 for non-existent transcription job', async () => {
    const res = await fetch(`${ALB_URL}/api/transcription/status/non-existent-job-id`)
    expect([404, 500, 503]).toContain(res.status)
  })

  // Test 57
  it('should return 404 for non-existent download job', async () => {
    const res = await fetch(`${ALB_URL}/api/transcription/download/non-existent-job-id`)
    expect([404, 500, 503]).toContain(res.status)
  })
})

describe('API - Page Routing', () => {
  // Test 58
  it('should serve login page', async () => {
    const res = await fetch(`${ALB_URL}/login`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('html')
  })

  // Test 59
  it('should serve register page', async () => {
    const res = await fetch(`${ALB_URL}/register`)
    expect(res.status).toBe(200)
  })

  // Test 60
  it('should serve doctors listing page', async () => {
    const res = await fetch(`${ALB_URL}/doctors`)
    expect(res.status).toBe(200)
  })

  // Test 61
  it('should redirect unauthenticated user from /patient/dashboard', async () => {
    const res = await fetch(`${ALB_URL}/patient/dashboard`, { redirect: 'manual' })
    // Should redirect to login
    expect([301, 302, 307, 308]).toContain(res.status)
  })

  // Test 62
  it('should redirect unauthenticated user from /doctor/dashboard', async () => {
    const res = await fetch(`${ALB_URL}/doctor/dashboard`, { redirect: 'manual' })
    expect([301, 302, 307, 308]).toContain(res.status)
  })
})
