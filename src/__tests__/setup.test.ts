import { describe, it, expect } from 'vitest'

describe('TDD Guard Setup', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should fail initially to test TDD Guard', () => {
    // This test should fail to demonstrate TDD Guard working
    expect(1 + 1).toBe(3)
  })
})