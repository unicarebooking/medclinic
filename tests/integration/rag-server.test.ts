/**
 * Integration Tests for RAG Server
 * Tests 89-100: RAG server endpoints via ALB or direct
 *
 * Requires: ALB_URL or RAG_SERVER_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect } from 'vitest'

const ALB_URL = process.env.ALB_URL || 'http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com'
const RAG_INTERNAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// RAG server health check goes through ALB path /api/health or direct
// We test both the Next.js proxy and expectations about the RAG server

describe('RAG Server - Health', () => {
  // Test 89
  it('should respond to ALB health check on /', async () => {
    const res = await fetch(ALB_URL)
    expect(res.status).toBe(200)
  })
})

describe('RAG Server - Query Validation', () => {
  // Test 90
  it('should require authentication for RAG query', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'כאבי ראש', top_k: 5 }),
    })
    expect(res.status).toBe(401)
  })

  // Test 91
  it('should return proper error structure for unauthorized', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    })
    const data = await res.json()
    expect(data).toHaveProperty('error')
    expect(typeof data.error).toBe('string')
  })
})

describe('RAG Server - Index Validation', () => {
  // Test 92
  it('should require authentication for indexing', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_table: 'treatment_summaries',
        source_id: '00000000-0000-0000-0000-000000000000',
      }),
    })
    expect(res.status).toBe(401)
  })

  // Test 93
  it('should reject GET on index endpoint', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/index`)
    expect(res.status).toBe(405)
  })
})

describe('RAG Server - Response Format', () => {
  // Test 94
  it('should return JSON content type on error', async () => {
    const res = await fetch(`${ALB_URL}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    })
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

describe('Static Pages - Accessibility', () => {
  // Test 95
  it('should serve about page', async () => {
    const res = await fetch(`${ALB_URL}/about`)
    expect(res.status).toBe(200)
  })

  // Test 96
  it('should serve contact page', async () => {
    const res = await fetch(`${ALB_URL}/contact`)
    expect(res.status).toBe(200)
  })

  // Test 97
  it('should serve FAQ page', async () => {
    const res = await fetch(`${ALB_URL}/faq`)
    expect(res.status).toBe(200)
  })

  // Test 98
  it('should serve privacy page', async () => {
    const res = await fetch(`${ALB_URL}/privacy`)
    expect(res.status).toBe(200)
  })

  // Test 99
  it('should serve terms page', async () => {
    const res = await fetch(`${ALB_URL}/terms`)
    expect(res.status).toBe(200)
  })

  // Test 100
  it('should serve forgot-password page', async () => {
    const res = await fetch(`${ALB_URL}/forgot-password`)
    expect(res.status).toBe(200)
  })
})
