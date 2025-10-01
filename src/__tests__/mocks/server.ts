import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup server with our request handlers
export const server = setupServer(...handlers)