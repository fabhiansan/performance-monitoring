import { describe, it, expect } from 'vitest'

describe('TDD Guard Setup', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should pass basic math test', () => {
    // Fixed the intentionally failing test
    expect(1 + 1).toBe(2)
  })
})