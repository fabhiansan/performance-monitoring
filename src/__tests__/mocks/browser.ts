import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Setup worker for browser-based mocking (useful for Storybook or manual testing)
export const worker = setupWorker(...handlers)

// Start the worker in development mode only
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
  })
}