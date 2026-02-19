/**
 * Unit Tests for Constants and Types
 * Tests 13-18
 */
import { describe, it, expect } from 'vitest'
import { CITIES, SPECIALIZATIONS, APPOINTMENT_STATUSES, USER_ROLES, TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/constants'

describe('Constants - Cities', () => {
  // Test 13
  it('should have at least 5 cities', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(5)
  })

  // Test 14
  it('should include major Israeli cities', () => {
    const cityList = [...CITIES]
    expect(cityList).toContain('תל אביב')
    expect(cityList).toContain('ירושלים')
    expect(cityList).toContain('חיפה')
  })
})

describe('Constants - Specializations', () => {
  // Test 15
  it('should have at least 5 specializations', () => {
    expect(SPECIALIZATIONS.length).toBeGreaterThanOrEqual(5)
  })

  // Test 16
  it('should include common specializations', () => {
    const specList = [...SPECIALIZATIONS]
    expect(specList).toContain('רפואה כללית')
    expect(specList).toContain('קרדיולוגיה')
  })
})

describe('Constants - Statuses', () => {
  // Test 17
  it('should have all appointment statuses', () => {
    expect(APPOINTMENT_STATUSES).toHaveProperty('pending')
    expect(APPOINTMENT_STATUSES).toHaveProperty('confirmed')
    expect(APPOINTMENT_STATUSES).toHaveProperty('completed')
    expect(APPOINTMENT_STATUSES).toHaveProperty('cancelled')
  })

  // Test 18
  it('should have all user roles', () => {
    expect(USER_ROLES).toHaveProperty('patient')
    expect(USER_ROLES).toHaveProperty('doctor')
    expect(USER_ROLES).toHaveProperty('admin')
  })
})
