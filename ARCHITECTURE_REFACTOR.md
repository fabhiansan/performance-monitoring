# Architecture Refactor: Session Performance Data Model

## Date
January 2025

## Problem Statement

The application had a fundamental architectural flaw where **session employees were treated as separate entities** from master employees, leading to:

1. **Data Duplication**: Employee records were duplicated in each session
2. **Incorrect Coverage Metrics**: Coverage showed 100% (19/19) when actual coverage was 11.8% (19/161)
3. **Confusing Data Model**: "Session employees" concept made it unclear that sessions should only store performance data
4. **Database Mismatch**: Database schema was correct (normalized), but API returned only employees with performance data

## Old Architecture (Incorrect)

```
┌─────────────────────────────────────────┐
│  Master Employees (161 total)          │
│  - Basic employee info only             │
│  - No performance data                  │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Session Employees (19 with data)      │
│  - DUPLICATE employee records           │
│  - Performance data attached            │
│  - Treated as separate entities         │
└─────────────────────────────────────────┘
                 ↓
         Dashboard sees only 19
         Coverage: 19/19 = 100% ❌
```

### Issues:
- **useSessionEmployees** hook returned only employees WITH performance data
- **App.tsx** chose between `masterEmployees` or `sessionEmployees`
- **Coverage calculation** divided session employees by session employees (always 100%)
- **Kelola Pegawai** showed 161, but dashboard only processed 19

## New Architecture (Correct)

```
┌─────────────────────────────────────────────────────────────┐
│  Master Employees (161 total) - Single Source of Truth      │
│  - id, name, nip, position, organizational_level, etc.      │
│  - Performance array populated per session                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Session Performance Data (session_id = "2024-Q4")          │
│  - employee_id: 1, competency_id: 5, score: 85, period      │
│  - employee_id: 1, competency_id: 6, score: 90, period      │
│  - employee_id: 5, competency_id: 5, score: 75, period      │
│  - (19 employees have data in this session)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
         Dashboard receives ALL 161 employees
         19 have performance.length > 0
         142 have performance.length = 0
         Coverage: 19/161 = 11.8% ✅
```

### Benefits:
- **No data duplication**: Single employee record per person
- **Accurate metrics**: Coverage shows real percentage across entire organization
- **Clear data model**: Sessions contain only performance scores, not employee records
- **Flexible filtering**: Can show all employees or filter by "has performance data"

## Changes Made

### 1. Database Layer (`server/kyselyDatabase.ts`)

**Before:**
```typescript
async getEmployeeDataBySession(period: string): Promise<Employee[]> {
  // Only returned employees WHO HAVE performance data
  const employeesWithScores = await this.db
    .selectFrom('performance_scores')
    .where('period', '=', period)
    .distinct()
    .execute();
  
  // Filter: only these employee IDs
  return employees.where('id', 'in', employeeIds);
}
```

**After:**
```typescript
async getEmployeeDataBySession(period: string): Promise<Employee[]> {
  // Returns ALL employees from master database
  const employees = await this.db
    .selectFrom('employee_database')
    .selectAll()
    .orderBy('name')
    .execute();
  
  // Attach performance data per session
  for (const emp of employees) {
    const performance = await this.db
      .selectFrom('performance_scores')
      .where('employee_id', '=', emp.id)
      .where('period', '=', period)
      .execute();
    
    // Some employees will have performance.length = 0
    employeesWithPerformance.push({
      ...emp,
      performance: performance.map(p => ({ name: p.name, score: p.score }))
    });
  }
}
```

### 2. React Query Hooks (`hooks/useEmployeeData.ts`)

**New Hook Added:**
```typescript
export function useEmployeesWithSessionData(sessionId: string | null) {
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees.session(sessionId),
    queryFn: async ({ signal }) => {
      if (!sessionId) {
        // No session: return all employees with empty performance
        return await employeeApi.getAllEmployees(signal);
      }
      // Returns ALL 161 employees with session-filtered performance
      return await sessionApi.getEmployeeDataBySession(sessionId, signal);
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Deprecated:**
```typescript
// ❌ OLD: Only returned employees with performance data
[Removed in refactor] useSessionEmployees() has been removed. Use useEmployeesWithSessionData() to get all master employees with performance filtered by session.
```

### 3. Session Manager (`hooks/useSessionData.ts`)

**Before:**
```typescript
export function useSessionManager(initialSessionId?: string) {
  // ...
// useSessionEmployees() has been removed; sessions now manage metadata only and do not load employees here.
  
  return {
    sessions,
    activeSessionId,
    employees, // ❌ Returned "session employees"
    // ...
  };
}
```

**After:**
```typescript
export function useSessionManager(initialSessionId?: string) {
  // ...
  // No longer returns employees - sessions manage metadata only
  
  return {
    sessions,
    activeSessionId,
    // employees removed ✅
    isLoading,
    isSwitching,
    changeSession,
    error,
  };
}
```

### 4. App Component (`App.tsx`)

**Before:**
```typescript
const { data: masterEmployees = [] } = useEmployees();
const { employees: sessionEmployees } = useSessionManager();

// Chose one or the other
const overviewEmployees = hasSessionEmployees 
  ? sessionEmployees  // Only 19 with performance
  : masterEmployees;  // All 161 without performance

<DashboardOverview employees={overviewEmployees} />
```

**After:**
```typescript
const { activeSessionId } = useSessionManager();

// Get ALL employees with session-filtered performance
const { data: employees = [] } = useEmployeesWithSessionData(activeSessionId);
// Returns 161 employees
// - 19 have performance.length > 0
// - 142 have performance.length = 0

<DashboardOverview employees={employees} />
```

### 5. Dashboard Coverage Calculation

**Before:**
```typescript
const employeesWithPerformance = filteredEmployees.filter(
  emp => emp.performance && emp.performance.length > 0
);
const coveragePercent = (employeesWithPerformance.length / filteredEmployees.length) * 100;
// Result: 19/19 = 100% ❌
```

**After:**
```typescript
const employeesWithPerformance = filteredEmployees.filter(
  emp => emp.performance && emp.performance.length > 0
);
const coveragePercent = (employeesWithPerformance.length / filteredEmployees.length) * 100;
// Result: 19/161 = 11.8% ✅
// filteredEmployees now contains ALL employees
```

## Database Schema (Already Correct)

The database schema was already correctly normalized:

```sql
-- Master employees (single source of truth)
CREATE TABLE employee_database (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  nip TEXT UNIQUE,
  position TEXT,
  organizational_level TEXT,
  -- No performance data here
);

-- Performance scores linked by employee_id and session_id
CREATE TABLE performance_scores (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  competency_id INTEGER NOT NULL,
  score REAL NOT NULL,
  period TEXT NOT NULL,  -- This is the session/period
  FOREIGN KEY (employee_id) REFERENCES employee_database(id),
  FOREIGN KEY (competency_id) REFERENCES competencies(id)
);

-- Session metadata
CREATE TABLE upload_sessions (
  session_id TEXT PRIMARY KEY,
  session_name TEXT NOT NULL,
  upload_timestamp TEXT NOT NULL,
  employee_count INTEGER,
  competency_count INTEGER
);
```

**Key Point**: The schema was correct all along. The bug was in the API layer returning filtered results instead of all employees.

## Migration Guide

### For Developers

1. `useSessionEmployees()` has been removed — use `useEmployeesWithSessionData()` instead
2. **Stop treating sessions as employee containers** - Sessions are performance data periods
3. **Update UI logic**: Filter `employees.filter(e => e.performance.length > 0)` when you only want employees with data
4. **Coverage calculations**: Now correctly show organizational coverage, not session coverage

### API Changes

- `GET /api/employee-data/session/:sessionId` now returns **ALL employees** with session-filtered performance
- Response structure unchanged, but `employees` array now includes all 161 employees

### Breaking Changes

- **None for users** - This is a bug fix that makes metrics accurate
- **For developers**: Remove references to "session employees" concept

## Metrics Impact

| Metric | Before (Wrong) | After (Correct) |
|--------|---------------|-----------------|
| Total Employees | 161 (in Kelola Pegawai) | 161 (everywhere) |
| Dashboard Employees | 19 (session only) | 161 (all with session data) |
| Employees with Performance | 19 | 19 |
| Cakupan Data Kinerja | 100% (19/19) ❌ | 11.8% (19/161) ✅ |

## Testing Checklist

- [x] Dashboard shows 161 total employees
- [x] Coverage shows ~11.8% instead of 100%
- [x] Kelola Pegawai and Dashboard employee counts match
- [x] Performance data displays correctly for employees who have it
- [x] Employees without performance data show empty performance arrays
- [x] Session switching correctly updates performance data
- [x] Filtering by "has performance data" works correctly
- [x] No duplicate employee records in database

## Future Enhancements

1. **Session Coverage Goals**: Set target coverage per session (e.g., "aim for 80% by Q2")
2. **Coverage Trends**: Track coverage improvement over time
3. **Missing Data Alerts**: Highlight employees missing performance data
4. **Bulk Performance Entry**: Quickly add data for multiple employees
5. **Performance History**: View employee's performance across multiple sessions

## Conclusion

This refactor fixes a fundamental architectural flaw by aligning the application code with the already-correct database schema. The concept of "session employees" has been removed - sessions now correctly store only performance data linked to master employee records.

**Key Takeaway**: Sessions are **performance data periods**, not employee containers.