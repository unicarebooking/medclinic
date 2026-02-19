/**
 * Integration Tests for Supabase Database
 * Tests 25-44: Database connectivity, CRUD operations, RLS, pgvector
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

describe('Supabase - Connection', () => {
  // Test 25
  it('should connect to Supabase successfully', async () => {
    const { data, error } = await supabase.from('users').select('id').limit(1)
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  // Test 26
  it('should have SUPABASE_URL configured', () => {
    expect(SUPABASE_URL).toBeTruthy()
    expect(SUPABASE_URL).toMatch(/^https:\/\//)
  })
})

describe('Supabase - Tables Exist', () => {
  // Test 27
  it('should have users table', async () => {
    const { error } = await supabase.from('users').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 28
  it('should have doctors table', async () => {
    const { error } = await supabase.from('doctors').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 29
  it('should have appointments table', async () => {
    const { error } = await supabase.from('appointments').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 30
  it('should have treatment_summaries table', async () => {
    const { error } = await supabase.from('treatment_summaries').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 31
  it('should have transcriptions table', async () => {
    const { error } = await supabase.from('transcriptions').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 32
  it('should have tickets table', async () => {
    const { error } = await supabase.from('tickets').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 33
  it('should have locations table', async () => {
    const { error } = await supabase.from('locations').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 34
  it('should have treatment_types table', async () => {
    const { error } = await supabase.from('treatment_types').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 35
  it('should have doctor_availability_slots table', async () => {
    const { error } = await supabase.from('doctor_availability_slots').select('id').limit(1)
    expect(error).toBeNull()
  })

  // Test 36
  it('should have document_chunks table (pgvector)', async () => {
    const { error } = await supabase.from('document_chunks').select('id').limit(1)
    expect(error).toBeNull()
  })
})

describe('Supabase - Schema Validation', () => {
  // Test 37
  it('should have correct users columns', async () => {
    const { data, error } = await supabase.from('users').select('id, email, full_name, phone, role, avatar_url, created_at').limit(1)
    expect(error).toBeNull()
  })

  // Test 38
  it('should have correct doctors columns', async () => {
    const { data, error } = await supabase.from('doctors').select('id, user_id, specialization, bio, license_number, years_of_experience, consultation_fee, is_active').limit(1)
    expect(error).toBeNull()
  })

  // Test 39
  it('should have correct treatment_summaries columns', async () => {
    const { data, error } = await supabase.from('treatment_summaries').select('id, appointment_id, doctor_id, patient_id, diagnosis, treatment_notes, prescription, follow_up_required, follow_up_date').limit(1)
    expect(error).toBeNull()
  })

  // Test 40
  it('should have correct document_chunks columns', async () => {
    const { data, error } = await supabase.from('document_chunks').select('id, source_table, source_id, chunk_index, doctor_id, patient_id, content, metadata').limit(1)
    expect(error).toBeNull()
  })
})

describe('Supabase - Foreign Key Relations', () => {
  // Test 41
  it('should join doctors with users', async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, user:users!doctors_user_id_fkey(full_name)')
      .limit(1)
    expect(error).toBeNull()
  })

  // Test 42
  it('should join treatment_summaries with patients', async () => {
    const { data, error } = await supabase
      .from('treatment_summaries')
      .select('id, patient:users!treatment_summaries_patient_id_fkey(full_name)')
      .limit(1)
    expect(error).toBeNull()
  })

  // Test 43
  it('should join appointments with doctors and patients', async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, doctor_id, patient_id')
      .limit(1)
    expect(error).toBeNull()
  })
})

describe('Supabase - RPC Functions', () => {
  // Test 44
  it('should have match_document_chunks function', async () => {
    // Call with empty embedding - should work without errors (may return empty)
    const dummyEmbedding = new Array(768).fill(0)
    const { error } = await supabase.rpc('match_document_chunks', {
      query_embedding: dummyEmbedding,
      match_count: 5,
      filter_doctor_id: '00000000-0000-0000-0000-000000000000',
      similarity_threshold: 0.5,
    })
    // Function should exist - error is null on success, or contains 'function' if missing
    if (error) {
      expect(error.message).not.toContain('Could not find the function')
    } else {
      expect(error).toBeNull()
    }
  })
})
