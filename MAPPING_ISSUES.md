# Backend ↔ Frontend Mapping Issues

The following gaps were found when comparing the Fastify backend (`server/fastifyServer.ts`) with the API clients used by the React frontend. Each item links the frontend expectation to the backend implementation (or lack thereof) and calls out the user-visible impact.

## Missing or Divergent Endpoints

1. **`GET /api/employees-count` is not implemented**  
   - Frontend: The employee client calls this endpoint in `services/api/clients/EmployeeApiClient.ts:208-213` to display a master employee count.  
   - Backend: `server/fastifyServer.ts:193-219` lists all employee routes, and none expose `/api/employees-count`. The old SQLite service still has a counter in `server/database.ts:1108-1114`, but the Fastify/Kysely stack never wires it up.  
   - Impact: Any UI relying on the count request fails with a 404, preventing accurate totals in analytics or dashboards.

2. **`POST /api/employees/resolve` endpoint missing**  
   - Frontend: Case-resolution workflows post mappings via `services/api/clients/EmployeeApiClient.ts:235-255`.  
   - Backend: No matching handler exists in `server/fastifyServer.ts` (confirmed by the employee route list at `server/fastifyServer.ts:193-219`).  
   - Impact: Upload reconciliation features cannot persist chosen matches, blocking conflict resolution after CSV imports.

3. **Employee summary updates point to the wrong path**  
   - Frontend: Summaries are sent to `PUT /api/employees/:employeeName/summary` (`services/api/clients/EmployeeApiClient.ts:258-285`).  
   - Docs & mocks: `CLAUDE.md:61-69` and the MSW handlers (`src/__tests__/mocks/handlers.ts:169-189`) expect `PATCH /api/current-dataset/employee/:name/summary`.  
   - Backend: Neither route exists in `server/fastifyServer.ts`, so every summary save currently 404s. The mismatch also leaves the agreed contract unclear for future work.

4. **Session selection API absent**  
   - Frontend: `services/api/clients/SessionApiClient.ts:159-186` needs `GET /api/current-session` and `POST /api/current-session` to drive `useCurrentSession`.  
   - Backend: `server/fastifyServer.ts:224-236` only exposes upload CRUD; no “current session” state is tracked.  
   - Impact: Components cannot mark or remember the active session, so workflows that depend on a persisted selection (e.g., dataset switching) break.

5. **Historical data feeds missing**  
   - Frontend: `services/api/clients/DataApiClient.ts:16-71` calls `GET /api/employee-data/range` and `GET /api/employee-data/latest`.  
   - Backend: The Fastify server never reintroduced these routes (only `GET /api/employee-data/session/:sessionId` is present at `server/fastifyServer.ts:231-233`).  
   - Impact: Dashboards cannot load historical snapshots or “latest dataset” views; legacy features regress.

6. **Bulk leadership score updates unsupported**  
   - Frontend: Manual recaps stream updates to `PUT /api/current-dataset/leadership-scores/bulk` (`services/api/clients/LeadershipApiClient.ts:38-67`).  
   - Backend: Leadership wiring in `server/fastifyServer.ts:255-260` only handles single-record PUTs.  
   - Impact: The Rekap Kinerja UI (`components/dashboard/RekapKinerja.tsx:78-114`) auto-saves batches, but the request fails immediately.

7. **Dataset CRUD endpoints still referenced but unimplemented**  
   - Docs/tests: `CLAUDE.md:61-69`, MSW handlers (`src/__tests__/mocks/handlers.ts:69-147`), and benchmarks (`scripts/performance-benchmark.cjs:258-263`) all assume `/api/datasets` endpoints exist.  
   - Backend: `server/fastifyServer.ts:239-249` only provides `/api/current-dataset`.  
   - Impact: Any code relying on the documented dataset list or delete APIs will 404; mocks and tooling hide the gap until runtime.

## Payload / Type Mismatches

8. **Organizational level mapping shape differs**  
   - Backend: `server/kyselyDatabase.ts:216-231` returns `Record<string, number>` (counts per level).  
   - Frontend: The API client consumes it as `Record<string, string>` (`services/api/clients/EmployeeApiClient.ts:215-219`) and stores it that way in state (`hooks/useAppState.ts:8-60`).  
   - Impact: TypeScript lies about the payload, and any string operations (e.g., concatenation) will behave incorrectly when real numeric counts arrive.

These items should be prioritised before exposing the unified Fastify server to the UI; each one either breaks an existing feature or contradicts the documented contract.
