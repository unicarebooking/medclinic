/**
 * Unit Tests for TypeScript Types Validation
 * Tests 19-24
 */
import { describe, it, expect } from 'vitest'
import type { Database, UserRole, AppointmentStatus, TicketStatus, TicketPriority } from '@/types/database.types'
import type { RAGQueryRequest, RAGQueryResponse, RAGSource } from '@/types/rag'

describe('Database Types - Compile-time Validation', () => {
  // Test 19
  it('should validate UserRole type values', () => {
    const validRoles: UserRole[] = ['patient', 'doctor', 'admin']
    expect(validRoles).toContain('patient')
    expect(validRoles).toContain('doctor')
    expect(validRoles).toContain('admin')
    expect(validRoles).toHaveLength(3)
  })

  // Test 20
  it('should validate AppointmentStatus type values', () => {
    const validStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled']
    expect(validStatuses).toHaveLength(4)
  })

  // Test 21
  it('should validate TicketStatus type values', () => {
    const validStatuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']
    expect(validStatuses).toHaveLength(4)
  })

  // Test 22
  it('should validate TicketPriority type values', () => {
    const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    expect(validPriorities).toHaveLength(4)
  })
})

describe('RAG Types - Structure Validation', () => {
  // Test 23
  it('should validate RAGQueryRequest structure', () => {
    const request: RAGQueryRequest = { query: 'test query' }
    expect(request.query).toBe('test query')
    expect(request.top_k).toBeUndefined()

    const requestWithTopK: RAGQueryRequest = { query: 'test', top_k: 5 }
    expect(requestWithTopK.top_k).toBe(5)
  })

  // Test 24
  it('should validate RAGQueryResponse structure', () => {
    const response: RAGQueryResponse = {
      answer: 'תשובה',
      sources: [{ patient_name: 'ישראל', date: '2024-01-01' }],
      total_summaries_scanned: 10,
      model: 'llama3.2:3b',
    }
    expect(response.sources).toHaveLength(1)
    expect(response.model).toBe('llama3.2:3b')
  })
})
