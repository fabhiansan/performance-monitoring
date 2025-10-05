import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Start the MSW server before all tests
beforeAll(() => {
  const fetchBeforeListen = globalThis.fetch
  server.listen({ onUnhandledRequest: 'error' })

  if (typeof fetchBeforeListen === 'function' && (fetchBeforeListen as any)?.mock) {
    globalThis.fetch = fetchBeforeListen
  }
})

// Reset any runtime request handlers after each test
afterEach(() => {
  server.resetHandlers()
  cleanup() // Clean up any rendered components
})

// Stop the server after all tests
afterAll(() => {
  server.close()
})

// Basic test setup validation
describe('TDD Guard Setup', () => {
  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should pass basic math test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have testing library utilities available', () => {
    expect(cleanup).toBeDefined()
  })
})
