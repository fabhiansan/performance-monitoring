/// <reference types="vite/client" />
/**
 * REFACTORED: Legacy ApiService has been decomposed into focused clients
 * 
 * The 773-line god class has been replaced with:
 * - EmployeeApiClient: Employee CRUD, suggestions, org-mapping (11 methods)
 * - SessionApiClient: Upload sessions, session data retrieval (4 methods) 
 * - DataApiClient: Data operations, time-range queries (3 methods)
 * - LeadershipApiClient: Manual leadership scores (3 methods)
 * 
 * This file now exports a compatibility layer that delegates to the new clients.
 * 
 * For new code, prefer direct client imports:
 * import { employeeApi, sessionApi, dataApi, leadershipApi } from './api/interfaces'
 * 
 * Legacy compatibility maintained via:
 * import { api } from './api' // Uses legacy.ts under the hood
 */

// Re-export the legacy compatibility layer
export { api } from './api/legacy';
export type { UploadSession, EmployeeWithSession } from './api/legacy';

// Also export the new client architecture for progressive migration
export { 
  apiClientFactory,
  employeeApi, 
  sessionApi, 
  dataApi, 
  leadershipApi 
} from './api/interfaces';
