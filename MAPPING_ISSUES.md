# Backend ↔ Frontend Mapping Issues

The Fastify backend has filled in many of the earlier gaps, but a few routes remain stubs or still diverge from the frontend contract. Each item below notes its current status so we can focus on the remaining work.

## Missing or Divergent Endpoints

1. **`GET /api/employees-count`** – ✅ Resolved  
   - Frontend: `services/api/clients/EmployeeApiClient.ts:208-217` reads the count from this route.  
   - Backend: `server/fastifyServer.ts:223-224` now exposes the endpoint and returns the length of `getAllEmployees()` (`server/fastifyServer.ts:787-794`).  
   - Impact: Employee dashboards receive a valid count response instead of a 404.

2. **`POST /api/employees/resolve`** – ⚠️ Still a stub  
   - Frontend: Case-resolution workflows still post mappings via `services/api/clients/EmployeeApiClient.ts:235-255`.  
   - Backend: The route exists (`server/fastifyServer.ts:223,805-842`) but only logs and returns success; no persistence is wired up.  
   - Impact: Resolved mappings evaporate, so reconciliation remains broken until storage logic is implemented.

3. **Employee summary update path** – ⚠️ Frontend mismatch  
   - Frontend: Continues to `PUT /api/employees/:employeeName/summary` (`services/api/clients/EmployeeApiClient.ts:258-285`).  
   - Backend: Implements `PATCH /api/current-dataset/employee/:name/summary` (`server/fastifyServer.ts:272-273,1043-1079`) per the documented contract.  
   - Impact: Requests still 404. Frontend (and mocks) need to follow the `/api/current-dataset/...` route.

4. **Session selection API** – ⚠️ Route exists, state missing  
   - Frontend: `services/api/clients/SessionApiClient.ts:159-186` calls `GET/POST /current-session`.  
   - Backend: Routes now exist (`server/fastifyServer.ts:246-252,961-989`) but only log the payload; no current-session row is stored or read from the database.  
   - Impact: Components cannot rely on persisted session selection until the backing storage layer is built.

5. **Historical data feeds** – ✅ Implemented (basic)  
   - Frontend: `services/api/clients/DataApiClient.ts:16-70` expects `/employee-data/range` and `/employee-data/latest`.  
   - Backend: Both endpoints were reintroduced (`server/fastifyServer.ts:246-248,844-944`). They aggregate session data via `KyselyDatabase.getEmployeeDataBySession`.  
   - Impact: Historical dashboards can load again. Further optimization/filtering may be needed, but the contract is satisfied.

6. **Bulk leadership score updates** – ✅ Implemented  
   - Frontend: Streams batches to `PUT /api/current-dataset/leadership-scores/bulk` (`services/api/clients/LeadershipApiClient.ts:38-67`).  
   - Backend: Route now exists and writes to `manual_leadership_scores` (`server/fastifyServer.ts:255-287,1082-1135`).  
   - Impact: Rekap Kinerja auto-save works against the Fastify server.

7. **Dataset CRUD endpoints** – ⚠️ Handlers are placeholders  
   - Frontend/docs: `CLAUDE.md:61-69`, MSW handlers (`src/__tests__/mocks/handlers.ts:69-147`), and tooling still reference `/api/datasets`.  
   - Backend: Routes exist (`server/fastifyServer.ts:268-273,992-1039`) but return canned responses instead of reading/writing datasets.  
   - Impact: UI receives empty lists and “success” messages with no persistence; real dataset management remains blocked.

## Payload / Type Mismatches

8. **Organizational level mapping shape** – ⚠️ Still diverges  
   - Backend: Returns `Record<string, number>` counts in `server/kyselyDatabase.ts:232-247`.  
   - Frontend: Types the response as `Record<string, string>` (`services/api/clients/EmployeeApiClient.ts:215-219`, stored in `hooks/useAppState.ts:8-76`).  
   - Impact: TypeScript hides numeric payloads, inviting subtle bugs until the client types (and any downstream usage) are updated.

---

Legend: ✅ resolved · ⚠️ follow-up required.
