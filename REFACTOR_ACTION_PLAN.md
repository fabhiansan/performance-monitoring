# 🎯 Refactor Action Plan
## Employee Performance Analyzer - Post-Refactor Improvements

**Generated:** 2025-10-01
**Based on:** Comprehensive Code Review (8.5/10 rating)
**Status:** Ready for Implementation

---

## 📋 Executive Summary

The React Query refactor was successful, achieving:
- ✅ 73% reduction in App.tsx complexity (584 → 157 lines)
- ✅ 67% reduction in DataManagement.tsx complexity (1060 → 351 lines)
- ✅ Zero TypeScript errors
- ✅ Clean separation of concerns with service layer

However, **20 issues** were identified across 3 severity levels:
- 🔴 **3 HIGH** - Must fix before deployment
- 🟡 **8 MEDIUM** - Should fix in next sprint
- 🟢 **9 LOW** - Nice to have improvements

**Estimated Total Effort:** 3-4 days of development

---

## 🚨 Phase 1: Critical Fixes (Before Deployment)
**Priority:** URGENT | **Effort:** 4-6 hours | **Risk:** HIGH if not fixed

### 1.1 Fix FileReader Memory Leak
**Issue ID:** ISSUE #8
**Severity:** 🔴 HIGH
**File:** `components/data/ImportZone.tsx` lines 27-34
**Effort:** 30 minutes

**Problem:**
```typescript
const handleFileUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    setRawText(text);  // ❌ State update after unmount possible
  };
  reader.readAsText(file);
};
```

**Solution:**
```typescript
const handleFileUpload = useCallback((file: File) => {
  const reader = new FileReader();
  const abortController = new AbortController();

  reader.onload = (e) => {
    if (!abortController.signal.aborted) {
      const text = e.target?.result as string;
      setRawText(text);
    }
  };

  reader.onerror = () => {
    if (!abortController.signal.aborted) {
      onClearError();
      // Show error toast
    }
  };

  reader.readAsText(file);

  // Cleanup function to be called on unmount
  return () => {
    abortController.abort();
    reader.abort();
  };
}, [onClearError]);

// In component:
useEffect(() => {
  let cleanup: (() => void) | undefined;

  return () => {
    if (cleanup) cleanup();
  };
}, []);
```

**Testing:**
- [ ] Upload file and immediately navigate away
- [ ] Verify no console errors
- [ ] Verify no memory leaks in Chrome DevTools

---

### 1.2 Fix Empty Employee Name Validation
**Issue ID:** ISSUE #4
**Severity:** 🔴 HIGH
**File:** `services/ImportOrchestrator.ts` line 119
**Effort:** 20 minutes

**Problem:**
```typescript
employeeName = employeeName.replace(/^\d+\.?\s*/, '');
if (employeeName && !employeeNames.includes(employeeName)) {
  employeeNames.push(employeeName);
}
```
**Edge Case:** Name "1. " becomes empty string after removal but still passes check.

**Solution:**
```typescript
// In extractEmployeeNamesFromData function
for (const field of fields) {
  const bracketMatch = field.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    let employeeName = bracketMatch[1].trim();
    // Remove leading numbering like "1." or "4. "
    employeeName = employeeName.replace(/^\d+\.?\s*/, '').trim();

    // ✅ Validate non-empty and minimum length
    if (employeeName &&
        employeeName.length >= 2 &&
        !employeeNames.includes(employeeName)) {
      employeeNames.push(employeeName);
    } else if (employeeName.length < 2) {
      logger.warn('Skipped invalid employee name', {
        original: field,
        processed: employeeName
      });
    }
  }
}
```

**Testing:**
- [ ] Import CSV with "1. " in name field
- [ ] Import CSV with very short names (single character)
- [ ] Verify proper error logging
- [ ] Verify names with 2+ characters are accepted

---

### 1.3 Fix Empty Dataset Edge Cases
**Issue ID:** BUG #1
**Severity:** 🔴 HIGH
**File:** `AppRefactored.tsx` lines 185-189
**Effort:** 1 hour

**Problem:**
Current logic doesn't handle case where master employees exist but selected session has no data.

**Solution:**

1. **Create new EmptyState variants:**

```typescript
// components/shared/EmptyState.tsx - Add new interface
interface EmptyStateProps {
  type?: 'no-employees' | 'no-session-data' | 'no-performance-data';
  onNavigateToManagement?: () => void;
  onNavigateToDataImport?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-employees',
  onNavigateToManagement,
  onNavigateToDataImport
}) => {
  const config = {
    'no-employees': {
      title: 'No Employees Found',
      description: 'Start by adding employees to the system',
      action: 'Add Employees',
      onClick: onNavigateToManagement
    },
    'no-session-data': {
      title: 'No Data in Selected Session',
      description: 'This session doesn\'t contain any employee data',
      action: 'Import Data',
      onClick: onNavigateToDataImport
    },
    'no-performance-data': {
      title: 'No Performance Data',
      description: 'Import performance scores for this session',
      action: 'Import Performance Data',
      onClick: onNavigateToDataImport
    }
  };

  const { title, description, action, onClick } = config[type];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <IconUsers className="w-24 h-24 text-gray-300 mb-4" />
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      {onClick && (
        <Button onClick={onClick} variant="primary">
          {action}
        </Button>
      )}
    </div>
  );
};
```

2. **Update AppRefactored.tsx:**

```typescript
// In AppContent component
const getEmptyStateConfig = (): { show: boolean; type: EmptyStateProps['type'] } => {
  // No master employees at all
  if (masterEmployees.length === 0 && activeView === 'overview') {
    return { show: true, type: 'no-employees' };
  }

  // Master employees exist but selected session is empty
  const sessionViews = ['analytics', 'employees', 'rekap-kinerja', 'report', 'table'];
  if (sessionViews.includes(activeView) && sessionEmployees.length === 0) {
    return { show: true, type: 'no-session-data' };
  }

  // Master employees exist but they have no performance data
  if (activeView === 'overview' && masterEmployees.length > 0) {
    const hasPerformanceData = masterEmployees.some(emp =>
      emp.performance && emp.performance.length > 0
    );
    if (!hasPerformanceData) {
      return { show: true, type: 'no-performance-data' };
    }
  }

  return { show: false, type: 'no-employees' };
};

const emptyStateConfig = getEmptyStateConfig();

// In render:
{emptyStateConfig.show ? (
  <EmptyState
    type={emptyStateConfig.type}
    onNavigateToManagement={() => setActiveView(VIEW_NAMES.EMPLOYEE_MANAGEMENT)}
    onNavigateToDataImport={() => setActiveView(VIEW_NAMES.DATA)}
  />
) : (
  renderActiveView()
)}
```

**Testing:**
- [ ] No employees in system → Shows "No Employees" state
- [ ] Has employees but empty session → Shows "No Session Data" state
- [ ] Has employees but no performance data → Shows "No Performance Data" state
- [ ] All empty state buttons navigate correctly

---

## 🔧 Phase 2: Important Improvements (Next Sprint)
**Priority:** HIGH | **Effort:** 1-2 days | **Risk:** MEDIUM if delayed

### 2.1 Add Error Handling to React Query Hooks
**Issue ID:** ISSUE #1
**Severity:** 🟡 MEDIUM
**Files:** `hooks/useEmployeeData.ts`, `hooks/useSessionData.ts`
**Effort:** 1 hour

**Solution:**

1. **Create error handling utility:**

```typescript
// hooks/queryErrorHandling.ts
import { QueryError } from '@tanstack/react-query';
import { logger } from '../services/logger';

export function handleQueryError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
) {
  logger.error(`Query error in ${operation}`, { error, ...context });

  // You can also show toast notifications here
  // toast.error(`Failed to ${operation}`);
}

export const queryErrorConfig = {
  onError: (error: unknown, context: string) => {
    handleQueryError(error, context);
  },
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on 4xx errors
    if (error instanceof Error && 'status' in error) {
      const status = (error as Error & { status?: number }).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
    }
    return failureCount < 3;
  }
};
```

2. **Update hooks to use error handling:**

```typescript
// hooks/useEmployeeData.ts
import { queryErrorConfig, handleQueryError } from './queryErrorHandling';

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: async () => {
      return await employeeApi.getAllEmployees();
    },
    staleTime: 10 * 60 * 1000,
    onError: (error) => handleQueryError(error, 'fetch employees'),
    retry: queryErrorConfig.retry
  });
}

export function useSessionEmployees(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: sessionId ? queryKeys.employees.session(sessionId) : ['employees', 'session', 'null'],
    queryFn: async () => {
      if (!sessionId) return [];
      return await sessionApi.getEmployeeDataBySession(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
    onError: (error) => handleQueryError(error, 'fetch session employees', { sessionId }),
    retry: queryErrorConfig.retry
  });
}

export function useOrganizationalMappings() {
  return useQuery({
    queryKey: queryKeys.organizational.mappings,
    queryFn: async () => {
      return await employeeApi.getEmployeeOrgLevelMapping();
    },
    staleTime: 15 * 60 * 1000,
    onError: (error) => handleQueryError(error, 'fetch organizational mappings'),
    retry: queryErrorConfig.retry
  });
}
```

**Testing:**
- [ ] Simulate API failure → Verify error logged
- [ ] Verify 4xx errors don't retry
- [ ] Verify 5xx errors retry up to 3 times
- [ ] Check error states are exposed to components

---

### 2.2 Fix SessionManager Integration
**Issue ID:** ISSUE #10
**Severity:** 🟡 MEDIUM
**File:** `components/data/DataManagementRefactored.tsx` lines 277-290
**Effort:** 2 hours

**Problem:**
SessionManager receives all empty/noop props, making it non-functional.

**Solution:**

**Option A: Remove SessionManager** (Recommended for now)
```typescript
// Remove this entire block from DataManagementRefactored.tsx
<SessionManager
  uploadSessions={[]}
  setUploadSessions={() => {}}
  // ... all noop props
/>
```

**Option B: Integrate SessionManager Properly** (Future enhancement)
```typescript
// 1. Create new SessionManagement component using React Query
// components/data/SessionManagement.tsx
import { useSessions, useDeleteSession } from '../../hooks/useSessionData';
import { useSaveEmployeeData } from '../../hooks/useEmployeeData';

export const SessionManagement: React.FC = () => {
  const { data: sessions = [], isLoading } = useSessions();
  const deleteSession = useDeleteSession();
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Implementation using React Query hooks
  // ...
};

// 2. Replace old SessionManager with new one
<SessionManagement />
```

**Decision:** For Phase 2, **Option A (Remove)** is recommended. SessionManager can be reimplemented in Phase 4 if needed.

**Testing:**
- [ ] Verify DataManagement works without SessionManager
- [ ] No console errors or warnings
- [ ] All existing functionality preserved

---

### 2.3 Replace alert() with Toast Notifications
**Issue ID:** ISSUE #12
**Severity:** 🟡 MEDIUM
**File:** `components/data/DataManagementRefactored.tsx`
**Effort:** 1.5 hours

**Solution:**

1. **Install toast library:**
```bash
pnpm add react-hot-toast
```

2. **Create toast wrapper:**
```typescript
// services/toast.ts
import toast from 'react-hot-toast';

export const showSuccessToast = (message: string, duration = 4000) => {
  toast.success(message, {
    duration,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: '#fff',
    },
  });
};

export const showErrorToast = (message: string, duration = 5000) => {
  toast.error(message, {
    duration,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: '#fff',
    },
  });
};

export const showInfoToast = (message: string, duration = 3000) => {
  toast(message, {
    duration,
    position: 'top-right',
    icon: 'ℹ️',
  });
};
```

3. **Update DataManagementRefactored.tsx:**
```typescript
import { showSuccessToast, showErrorToast } from '../../services/toast';

// Replace:
alert(`✅ Berhasil mengimpor ${result.employees.length} data pegawai!...`);

// With:
showSuccessToast(
  `Berhasil mengimpor ${result.employees.length} data pegawai! ` +
  `Untuk melihat analisis kinerja, silakan impor data kinerja.`,
  5000
);

// Replace error alerts:
alert(`✅ Data pegawai berhasil diimpor ke database, tetapi gagal memuat ke tampilan...`);

// With:
showErrorToast(
  'Data pegawai berhasil diimpor ke database, tetapi gagal memuat ke tampilan. ' +
  'Silakan refresh halaman.',
  6000
);
```

4. **Add Toaster to App:**
```typescript
// index.tsx or App.tsx
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <AppContent />
      <Toaster />
    </ErrorProvider>
  );
};
```

**Testing:**
- [ ] Success messages show as green toasts
- [ ] Error messages show as red toasts
- [ ] Toasts auto-dismiss after timeout
- [ ] Multiple toasts stack properly
- [ ] No more alert() calls in codebase

---

### 2.4 Add Input Validation for Session Names
**Issue ID:** ISSUE #9
**Severity:** 🟡 MEDIUM
**File:** `components/data/DataManagementRefactored.tsx` line 299
**Effort:** 45 minutes

**Solution:**

```typescript
// Add validation function
const validateSessionName = (value: string): {
  valid: boolean;
  error?: string
} => {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: 'Session name is required' };
  }

  // Validate MM/YYYY format if using month input
  const monthYearRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
  if (!monthYearRegex.test(value)) {
    return {
      valid: false,
      error: 'Invalid format. Use MM/YYYY (e.g., 07/2025)'
    };
  }

  // Check if month/year is not in future
  const [month, year] = value.split('/').map(Number);
  const inputDate = new Date(year, month - 1);
  const now = new Date();

  if (inputDate > now) {
    return {
      valid: false,
      error: 'Session date cannot be in the future'
    };
  }

  return { valid: true };
};

// Update state
const [sessionName, setSessionName] = useState('');
const [sessionNameError, setSessionNameError] = useState<string | null>(null);

// Update input
<input
  type="month"
  placeholder="MM/YYYY e.g. 07/2025"
  value={sessionName}
  onChange={(e) => {
    const value = e.target.value;
    setSessionName(value);

    const validation = validateSessionName(value);
    setSessionNameError(validation.valid ? null : validation.error);
  }}
  onBlur={() => {
    if (sessionName) {
      const validation = validateSessionName(sessionName);
      setSessionNameError(validation.valid ? null : validation.error);
    }
  }}
  className={`w-full px-3 py-2 border rounded-lg ${
    sessionNameError
      ? 'border-red-500 dark:border-red-400'
      : 'border-gray-300 dark:border-gray-600'
  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2`}
  autoFocus
/>
{sessionNameError && (
  <p className="text-sm text-red-500 dark:text-red-400 mb-4">
    {sessionNameError}
  </p>
)}

// Update save button
<button
  onClick={handleSaveSession}
  disabled={!sessionName.trim() || !!sessionNameError}
  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Save
</button>
```

**Testing:**
- [ ] Empty session name → Shows error
- [ ] Invalid format (13/2025) → Shows error
- [ ] Future date → Shows error
- [ ] Valid format (07/2025) → No error
- [ ] Save button disabled when invalid

---

### 2.5 Fix Validation Result Type Mismatch
**Issue ID:** ISSUE #5
**Severity:** 🟡 MEDIUM
**File:** `services/ImportOrchestrator.ts` lines 189-207
**Effort:** 1 hour

**Problem:**
Converting between different validation formats is verbose and loses error type specificity.

**Solution:**

1. **Update csvParser to return ValidationResult directly:**

```typescript
// services/csvParser.ts
import { ValidationResult, ValidationError } from './validationService';

export interface ValidationResultLegacy {
  valid: boolean;
  errors: string[];
}

// Add new function
export function validateEmployeeDataV2(employees: EmployeeData[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  employees.forEach((emp, index) => {
    if (!emp.name || emp.name.trim() === '') {
      errors.push({
        type: 'missing_required_field',
        message: `Employee at row ${index + 1} is missing a name`,
        field: 'name',
        row: index + 1
      });
    }

    if (!emp.gol || emp.gol.trim() === '') {
      warnings.push({
        type: 'missing_optional_field',
        message: `Employee "${emp.name}" is missing golongan`,
        field: 'gol',
        employee: emp.name
      });
    }

    // Add more specific validation...
  });

  const validEmployees = employees.filter(emp => emp.name && emp.gol).length;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalEmployees: employees.length,
      validEmployees,
      invalidEmployees: employees.length - validEmployees,
      totalCompetencies: 0,
      requiredCompetencies: [],
      missingCompetencies: [],
      dataCompleteness: validEmployees / employees.length,
      completeness: validEmployees / employees.length,
      scoreQuality: validEmployees === employees.length ? 'good' : 'poor'
    }
  };
}
```

2. **Update ImportOrchestrator:**

```typescript
// services/ImportOrchestrator.ts
async function processEmployeeRoster(rawText: string): Promise<ImportResult> {
  const parsedEmployees = parseEmployeeCSV(rawText);
  const validation = validateEmployeeDataV2(parsedEmployees); // ✅ Use new version

  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => e.message).join('\n');
    throw new Error(`Data tidak valid:\n${errorMessages}`);
  }

  // Convert EmployeeData to Employee format
  const employees: Employee[] = parsedEmployees.map((emp, index) => ({
    id: index + 1,
    name: emp.name,
    nip: emp.nip || '',
    gol: emp.gol || '',
    pangkat: emp.pangkat || '',
    position: emp.position || '',
    sub_position: emp.subPosition || '',
    organizational_level: simplifyOrganizationalLevel(emp.organizationalLevel, emp.gol),
    performance: []
  }));

  return {
    type: 'employee_roster',
    employees,
    validation, // ✅ Already in correct format
    requiresResolution: false,
    unknownEmployees: [],
    fuzzyMatches: {},
    orgLevelMapping: {}
  };
}
```

**Testing:**
- [ ] Employee roster import shows correct error types
- [ ] Warnings are displayed separately from errors
- [ ] Validation summary is accurate
- [ ] No type conversion errors

---

### 2.6 Prevent Session Switch During Import
**Issue ID:** BUG #2
**Severity:** 🟡 MEDIUM
**Files:** `AppRefactored.tsx`, `components/layout/Sidebar.tsx`
**Effort:** 45 minutes

**Solution:**

1. **Add import state tracking:**

```typescript
// hooks/useImportState.ts
import { create } from 'zustand';

interface ImportState {
  isImporting: boolean;
  setIsImporting: (importing: boolean) => void;
}

export const useImportState = create<ImportState>((set) => ({
  isImporting: false,
  setIsImporting: (importing) => set({ isImporting: importing }),
}));
```

2. **Update DataManagementRefactored:**

```typescript
import { useImportState } from '../../hooks/useImportState';

export const DataManagementRefactored: React.FC<DataManagementRefactoredProps> = ({
  employees,
  onDataUpdate
}) => {
  const { setIsImporting } = useImportState();

  const handleImport = useCallback(async (rawText: string) => {
    setIsProcessing(true);
    setIsImporting(true); // ✅ Set global import state
    setError(null);
    setRawTextBuffer(rawText);

    try {
      // ... import logic
    } finally {
      setIsProcessing(false);
      setIsImporting(false); // ✅ Clear global import state
    }
  }, [/* deps */]);

  // ...
};
```

3. **Update Sidebar to disable session switching:**

```typescript
// components/layout/Sidebar.tsx
import { useImportState } from '../../hooks/useImportState';

const Sidebar: React.FC<SidebarProps> = ({
  datasets,
  selectedDatasetId,
  onDatasetChange,
  // ...
}) => {
  const { isImporting } = useImportState();

  return (
    <div className="sidebar">
      {/* Dataset selector */}
      <select
        value={selectedDatasetId}
        onChange={(e) => {
          if (isImporting) {
            toast.error('Cannot switch sessions during import');
            return;
          }
          onDatasetChange(e.target.value);
        }}
        disabled={isImporting || isDatasetSwitching}
        className={isImporting ? 'opacity-50 cursor-not-allowed' : ''}
      >
        {/* options */}
      </select>

      {isImporting && (
        <p className="text-xs text-yellow-600 mt-1">
          Import in progress...
        </p>
      )}
    </div>
  );
};
```

**Testing:**
- [ ] Start import → Session selector disabled
- [ ] Try to change session during import → Toast shown
- [ ] Import completes → Session selector enabled
- [ ] Import fails → Session selector enabled

---

### 2.7 Add Large Dataset Virtualization
**Issue ID:** PERFORMANCE #1
**Severity:** 🟡 MEDIUM
**File:** `components/data/DatasetViewer.tsx` lines 67-79
**Effort:** 2 hours

**Solution:**

1. **Install virtualization library:**
```bash
pnpm add @tanstack/react-virtual
```

2. **Create virtualized employee list:**

```typescript
// components/data/VirtualizedEmployeeList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Employee } from '../../types';
import { simplifyOrganizationalLevel } from '../../utils/organizationalLevels';

interface VirtualizedEmployeeListProps {
  employees: Employee[];
  maxHeight?: number;
}

export const VirtualizedEmployeeList: React.FC<VirtualizedEmployeeListProps> = ({
  employees,
  maxHeight = 320 // 40 (item height) * 8 items
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Estimated height of each row
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No employees in dataset
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ height: `${maxHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const employee = employees[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded mx-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {employee.name}
                </span>
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title={employee.organizational_level || undefined}
                >
                  {simplifyOrganizationalLevel(employee.organizational_level, employee.gol)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

3. **Update DatasetViewer:**

```typescript
// components/data/DatasetViewer.tsx
import { VirtualizedEmployeeList } from './VirtualizedEmployeeList';

export const DatasetViewer: React.FC<DatasetViewerProps> = ({
  employees,
  // ...
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      {/* ... KPI cards ... */}

      {/* Replace old list with virtualized version */}
      <VirtualizedEmployeeList
        employees={employees}
        maxHeight={320}
      />

      {/* ... rest of component ... */}
    </div>
  );
};
```

**Performance Impact:**
- Before: Renders all 1000+ employees = ~30ms render time
- After: Renders ~15 visible items = ~3ms render time
- **10x performance improvement** for large datasets

**Testing:**
- [ ] Small dataset (10 employees) renders correctly
- [ ] Large dataset (1000+ employees) scrolls smoothly
- [ ] No layout shifts or flickering
- [ ] Performance profiler shows improvement

---

### 2.8 Implement CSV Formula Injection Prevention
**Issue ID:** SECURITY #1
**Severity:** 🟡 MEDIUM (Security)
**File:** `components/data/DataManagementRefactored.tsx` line 217
**Effort:** 30 minutes

**Solution:**

```typescript
// utils/csvSecurity.ts
/**
 * Sanitize CSV cell to prevent formula injection attacks
 * Prevents Excel/Sheets from interpreting formulas
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Characters that can start a formula in Excel/Sheets
  const formulaStarters = ['=', '+', '-', '@', '\t', '\r'];

  // Check if cell starts with potential formula character
  if (formulaStarters.some(starter => str.startsWith(starter))) {
    // Prefix with single quote to force text interpretation
    return `'${str}`;
  }

  // Also handle pipe character which can be used in some attacks
  if (str.startsWith('|')) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escape double quotes in CSV values
 */
export function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes
  // and escape internal quotes by doubling them
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Full CSV cell preparation: sanitize + escape
 */
export function prepareCSVCell(value: unknown): string {
  const sanitized = sanitizeCSVCell(value);
  return escapeCSVValue(sanitized);
}
```

**Update DataManagementRefactored.tsx:**

```typescript
import { prepareCSVCell } from '../../utils/csvSecurity';

const handleExportCSV = useCallback(() => {
  if (employees.length === 0) return;

  const csvData = employees.map(emp => {
    const avgScore = emp.performance && emp.performance.length > 0
      ? emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length
      : 0;
    return {
      Name: emp.name,
      Job: simplifyOrganizationalLevel(emp.organizational_level, emp.gol),
      'Average Score': avgScore.toFixed(2),
      ...(emp.performance && emp.performance.length > 0
        ? emp.performance.reduce((acc, perf) => ({
          ...acc,
          [perf.name]: perf.score
        }), {})
        : {})
    };
  });

  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.map(h => prepareCSVCell(h)).join(','), // ✅ Sanitize headers
    ...csvData.map(row =>
      headers.map(header => prepareCSVCell(row[header as keyof typeof row])).join(',') // ✅ Sanitize cells
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employee-performance-data-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}, [employees]);
```

**Testing:**
- [ ] Export with employee name "=SUM(A1:A10)" → Prefixed with `'`
- [ ] Export with name containing commas → Properly quoted
- [ ] Export with special characters → Properly escaped
- [ ] Open in Excel → No formula execution warnings
- [ ] Open in Google Sheets → No formula execution

---

## 🎨 Phase 3: Code Quality & Polish (Backlog)
**Priority:** MEDIUM | **Effort:** 1-2 days | **Risk:** LOW if delayed

### 3.1 Standardize Error Handling Patterns
**Issue ID:** ISSUE #13
**Severity:** 🟢 LOW
**Effort:** 2 hours

**Solution:**

1. **Create error handling guidelines document:**

```markdown
# Error Handling Guidelines

## Pattern 1: Component-Level Errors (UI Feedback)
Use local state for errors that affect component UI:
```typescript
const [error, setError] = useState<string | null>(null);

// Display in component
{error && <Alert variant="error">{error}</Alert>}
```

## Pattern 2: Global Errors (System-Wide Issues)
Use ErrorContext for errors that affect the entire app:
```typescript
const { showError } = useError();

try {
  await criticalOperation();
} catch (error) {
  showError(error, { component: 'MyComponent', operation: 'criticalOp' });
}
```

## Pattern 3: Silent Errors (Background Operations)
Use logger for errors that don't need user notification:
```typescript
try {
  await backgroundSync();
} catch (error) {
  logger.error('Background sync failed', { error });
}
```

## Decision Tree:
- Does error block user from continuing? → Pattern 2 (ErrorContext)
- Does error affect current form/view? → Pattern 1 (Local state)
- Is error from background process? → Pattern 3 (Logger)
```

2. **Audit and update components to follow pattern.**

---

### 3.2 Add Optimistic Updates
**Issue ID:** IMPROVEMENT #1
**Severity:** 🟢 LOW
**Effort:** 3 hours

**Example Implementation:**

```typescript
// hooks/useEmployeeData.ts
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: number) => {
      return await employeeApi.deleteEmployee(employeeId);
    },
    onMutate: async (employeeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });

      // Snapshot the previous value
      const previousEmployees = queryClient.getQueryData<Employee[]>(queryKeys.employees.all);

      // Optimistically update to the new value
      queryClient.setQueryData<Employee[]>(queryKeys.employees.all, (old) => {
        if (!old) return [];
        return old.filter(emp => emp.id !== employeeId);
      });

      // Return a context object with the snapshotted value
      return { previousEmployees };
    },
    onError: (_err, _employeeId, context) => {
      // Rollback on error
      if (context?.previousEmployees) {
        queryClient.setQueryData(queryKeys.employees.all, context.previousEmployees);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
```

**Apply to:**
- [ ] useDeleteEmployee
- [ ] useUpdateEmployee
- [ ] useAddEmployee

---

### 3.3 Add Request Cancellation
**Issue ID:** IMPROVEMENT #2
**Severity:** 🟢 LOW
**Effort:** 1 hour

**Solution:**

```typescript
// services/api/clients/SessionApiClient.ts
async getEmployeeDataBySession(sessionId: string, signal?: AbortSignal): Promise<EmployeeWithSession[]> {
  if (!sessionId || sessionId.trim() === '') {
    throw createValidationError(SESSION_ID_REQUIRED, { operation: 'getEmployeeDataBySession' });
  }

  const result = await this.get<EmployeeDataResponse>(
    `/employee-data/session/${encodeURIComponent(sessionId)}`,
    {
      operation: 'getEmployeeDataBySession',
      signal // ✅ Pass signal to base client
    }
  );

  // ... rest of implementation
}

// hooks/useEmployeeData.ts
export function useSessionEmployees(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: sessionId ? queryKeys.employees.session(sessionId) : ['employees', 'session', 'null'],
    queryFn: async ({ signal }) => { // ✅ React Query provides signal
      if (!sessionId) return [];
      return await sessionApi.getEmployeeDataBySession(sessionId, signal);
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

### 3.4 Add Data Prefetching
**Issue ID:** IMPROVEMENT #3
**Severity:** 🟢 LOW
**Effort:** 1.5 hours

**Solution:**

```typescript
// components/layout/Sidebar.tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../hooks/useQueryClient';
import { sessionApi } from '../../services/api';

const Sidebar: React.FC<SidebarProps> = ({ datasets, onDatasetChange }) => {
  const queryClient = useQueryClient();

  const handleSessionHover = useCallback((sessionId: string) => {
    // Prefetch session data on hover
    queryClient.prefetchQuery({
      queryKey: queryKeys.employees.session(sessionId),
      queryFn: () => sessionApi.getEmployeeDataBySession(sessionId),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return (
    <select
      onChange={(e) => onDatasetChange(e.target.value)}
    >
      {datasets.map(dataset => (
        <option
          key={dataset.id}
          value={dataset.id}
          onMouseEnter={() => handleSessionHover(dataset.id)} // ✅ Prefetch on hover
        >
          {dataset.name}
        </option>
      ))}
    </select>
  );
};
```

---

### 3.5 Add Loading States to Export Buttons
**Issue ID:** ISSUE #14
**Severity:** 🟢 LOW
**Effort:** 30 minutes

**Solution:**

```typescript
// components/data/DatasetViewer.tsx
const [isExporting, setIsExporting] = useState(false);

const handleExport = async (type: 'csv' | 'json') => {
  setIsExporting(true);
  try {
    // Export logic (may be slow for large datasets)
    if (type === 'csv') {
      await exportCSV();
    } else {
      await exportJSON();
    }
  } finally {
    setIsExporting(false);
  }
};

<Button
  onClick={() => handleExport('csv')}
  disabled={!canExport || isExporting}
  loading={isExporting}
  variant="success"
>
  {isExporting ? 'Exporting...' : 'Export CSV'}
</Button>
```

---

### 3.6 Fix useSessionManager Hook
**Issue ID:** ISSUE #2
**Severity:** 🟢 LOW
**Effort:** 30 minutes

**Solution:**

```typescript
// hooks/useSessionData.ts
export function useSessionManager(initialSessionId?: string) {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: currentSession } = useCurrentSession();
  const setCurrentSession = useSetCurrentSession();

  const activeSessionId = initialSessionId || currentSession?.session_id || sessions[0]?.session_id;

  // ✅ Reuse existing hook instead of creating new query
  const {
    data: employees = [],
    isLoading: employeesLoading
  } = useSessionEmployees(activeSessionId);

  const handleSessionChange = async (sessionId: string) => {
    await setCurrentSession.mutateAsync(sessionId);
  };

  return {
    sessions,
    activeSessionId,
    employees,
    isLoading: sessionsLoading || employeesLoading,
    isSwitching: setCurrentSession.isPending,
    changeSession: handleSessionChange,
  };
}
```

---

### 3.7 Create Performance Rating Constants
**Issue ID:** ISSUE #7
**Severity:** 🟢 LOW
**Effort:** 20 minutes

**Solution:**

```typescript
// constants/performanceRatings.ts
export const STRING_RATING_MAP = {
  'Kurang Baik': 65,
  'Baik': 75,
  'Sangat Baik': 85,
} as const;

export type StringRating = keyof typeof STRING_RATING_MAP;

export const NUMERIC_RATING_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 75,
  FAIR: 65,
  POOR: 50,
} as const;

export function getRatingLabel(score: number): string {
  if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT) return 'Sangat Baik';
  if (score >= NUMERIC_RATING_THRESHOLDS.GOOD) return 'Baik';
  if (score >= NUMERIC_RATING_THRESHOLDS.FAIR) return 'Cukup';
  return 'Kurang Baik';
}

export function isValidStringRating(value: string): value is StringRating {
  return value in STRING_RATING_MAP;
}
```

**Update parser to use constants:**

```typescript
import { STRING_RATING_MAP, isValidStringRating } from '../constants/performanceRatings';

// In score conversion logic
if (isValidStringRating(value)) {
  return STRING_RATING_MAP[value];
}
```

---

### 3.8 Add Memoization to Export Functions
**Issue ID:** PERFORMANCE #2
**Severity:** 🟢 LOW
**Effort:** 20 minutes

**Solution:**

```typescript
// components/data/DataManagementRefactored.tsx
import { useCallback, useMemo } from 'react';

const handleExportCSV = useCallback(() => {
  if (employees.length === 0) return;

  // CSV generation logic...
}, [employees]); // ✅ Only recreate when employees change

const handleExportJSON = useCallback(() => {
  if (employees.length === 0) return;

  // JSON generation logic...
}, [employees]); // ✅ Only recreate when employees change

// Pre-compute export data
const exportData = useMemo(() => {
  if (employees.length === 0) return null;

  return employees.map(emp => {
    const avgScore = emp.performance?.length > 0
      ? emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length
      : 0;
    return {
      Name: emp.name,
      Job: simplifyOrganizationalLevel(emp.organizational_level, emp.gol),
      'Average Score': avgScore.toFixed(2),
      // ... rest
    };
  });
}, [employees]); // ✅ Only recompute when employees change
```

---

### 3.9 Improve Query Key Factory
**Issue ID:** ISSUE #3
**Severity:** 🟢 LOW
**Effort:** 15 minutes

**Solution:**

```typescript
// hooks/useQueryClient.ts
export const queryKeys = {
  // Employee data
  employees: {
    all: ['employees'] as const,
    // ✅ Handle null case in factory
    session: (sessionId: string | null | undefined) =>
      sessionId ? ['employees', 'session', sessionId] as const
                : ['employees', 'session', 'null'] as const,
    suggestions: ['employees', 'suggestions'] as const,
  },

  // ... rest of keys
} as const;
```

**Update hook:**

```typescript
export function useSessionEmployees(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.employees.session(sessionId), // ✅ Factory handles null
    queryFn: async () => {
      if (!sessionId) return [];
      return await sessionApi.getEmployeeDataBySession(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

### 3.10 Handle Duplicate Employee Detection
**Issue ID:** BUG #3
**Severity:** 🟢 LOW
**Effort:** 1 hour

**Solution:**

```typescript
// services/NameMatchingService.ts
export interface DuplicateMatch {
  importedName: string;
  existingName: string;
  similarity: number;
  conflict: 'duplicate' | 'similar';
}

export function detectDuplicates(
  importedNames: string[],
  existingNames: string[]
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];
  const normalizedExisting = new Map<string, string>();

  // Build normalized map
  existingNames.forEach(name => {
    normalizedExisting.set(normalizeName(name), name);
  });

  // Check each imported name
  importedNames.forEach(importedName => {
    const normalized = normalizeName(importedName);

    // Exact normalized match → duplicate
    if (normalizedExisting.has(normalized)) {
      const existingName = normalizedExisting.get(normalized)!;
      if (importedName !== existingName) {
        duplicates.push({
          importedName,
          existingName,
          similarity: 1.0,
          conflict: 'duplicate'
        });
      }
    } else {
      // Check for high similarity to existing names
      for (const [existingNormalized, existingName] of normalizedExisting.entries()) {
        const similarity = calculateSimilarity(normalized, existingNormalized);
        if (similarity >= 0.95 && similarity < 1.0) {
          duplicates.push({
            importedName,
            existingName,
            similarity,
            conflict: 'similar'
          });
        }
      }
    }
  });

  return duplicates;
}
```

**Add duplicate warning to import flow:**

```typescript
// services/ImportOrchestrator.ts
const duplicates = detectDuplicates(employeeNamesInData, Object.keys(orgLevelMapping));

if (duplicates.length > 0) {
  logger.warn('Potential duplicate employees detected', { duplicates });

  // Add to validation warnings
  return {
    // ... existing return
    validation: {
      ...parseResult.validation,
      warnings: [
        ...parseResult.validation.warnings,
        ...duplicates.map(dup => ({
          type: 'duplicate_employee' as const,
          message: `"${dup.importedName}" may be duplicate of "${dup.existingName}" (${(dup.similarity * 100).toFixed(0)}% match)`,
          employee: dup.importedName
        }))
      ]
    }
  };
}
```

---

## 🧪 Phase 4: Testing & Documentation (Backlog)
**Priority:** LOW | **Effort:** 2-3 days | **Risk:** LOW

### 4.1 Add Unit Tests for Services
**Effort:** 1 day

```typescript
// services/__tests__/NameMatchingService.test.ts
import { normalizeName, calculateSimilarity, findBestMatch, matchEmployeeNames } from '../NameMatchingService';

describe('NameMatchingService', () => {
  describe('normalizeName', () => {
    it('should remove Indonesian titles', () => {
      expect(normalizeName('Dr. Ahmad Supriyanto, S.E., M.M.')).toBe('ahmad supriyanto');
    });

    it('should remove punctuation', () => {
      expect(normalizeName('John-Doe_Jr.')).toBe('john doe jr');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeName('John    Doe')).toBe('john doe');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateSimilarity('test', 'test')).toBe(1.0);
    });

    it('should return high similarity for typos', () => {
      const similarity = calculateSimilarity('John Doe', 'Jon Doe');
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  describe('findBestMatch', () => {
    it('should find best match above threshold', () => {
      const candidates = ['John Doe', 'Jane Doe', 'Bob Smith'];
      const match = findBestMatch('Jon Doe', candidates, 0.8);
      expect(match?.name).toBe('John Doe');
    });

    it('should return null if no match above threshold', () => {
      const candidates = ['John Doe', 'Jane Doe'];
      const match = findBestMatch('Bob Smith', candidates, 0.8);
      expect(match).toBeNull();
    });
  });
});
```

---

### 4.2 Add Integration Tests for React Query Hooks
**Effort:** 1 day

```typescript
// hooks/__tests__/useEmployeeData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEmployees, useSaveEmployeeData } from '../useEmployeeData';
import { employeeApi } from '../../services/api';

// Mock API
jest.mock('../../services/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useEmployeeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useEmployees', () => {
    it('should fetch employees successfully', async () => {
      const mockEmployees = [
        { id: 1, name: 'John Doe', performance: [] },
        { id: 2, name: 'Jane Doe', performance: [] },
      ];

      (employeeApi.getAllEmployees as jest.Mock).mockResolvedValue(mockEmployees);

      const { result } = renderHook(() => useEmployees(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEmployees);
      expect(employeeApi.getAllEmployees).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      (employeeApi.getAllEmployees as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useEmployees(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
    });
  });

  describe('useSaveEmployeeData', () => {
    it('should save employees and invalidate queries', async () => {
      const mockSessionId = 'session-123';
      (sessionApi.saveEmployeeData as jest.Mock).mockResolvedValue(mockSessionId);

      const { result } = renderHook(() => useSaveEmployeeData(), {
        wrapper: createWrapper(),
      });

      const employees = [{ id: 1, name: 'John Doe', performance: [] }];

      result.current.mutate({ employees, sessionName: 'Test Session' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(sessionApi.saveEmployeeData).toHaveBeenCalledWith(
        employees,
        'Test Session'
      );
    });
  });
});
```

---

### 4.3 Update Documentation
**Effort:** 4 hours

**Tasks:**
- [ ] Update REFACTOR_SUMMARY.md with Phase 1-3 changes
- [ ] Create TESTING.md with test guidelines
- [ ] Create API_MIGRATION_GUIDE.md for developers
- [ ] Update CLAUDE.md with new architecture
- [ ] Add JSDoc comments to all service functions
- [ ] Create architecture diagrams (optional)

---

### 4.4 Add E2E Tests (Optional)
**Effort:** 1 day

Use Playwright or Cypress for end-to-end testing:

```typescript
// e2e/import-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Employee Data Import Flow', () => {
  test('should import employee roster successfully', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Navigate to data management
    await page.click('text=Data Management');

    // Upload CSV file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('fixtures/employee-roster.csv');

    // Click analyze
    await page.click('button:has-text("Analyze Data")');

    // Wait for success message
    await expect(page.locator('.toast-success')).toContainText('Berhasil mengimpor');

    // Verify employees are visible
    await page.click('text=Employee Management');
    await expect(page.locator('.employee-card')).toHaveCount(10);
  });
});
```

---

## 📊 Implementation Timeline

### Week 1: Critical Fixes
- **Day 1-2:** Phase 1 (Critical Fixes) - 6 hours
  - Fix FileReader memory leak
  - Fix employee name validation
  - Fix empty dataset edge cases
- **Day 3:** Testing Phase 1 - 2 hours
- **Day 4-5:** Phase 2.1-2.4 (Error handling, SessionManager, Toast, Validation) - 6 hours

### Week 2: Improvements & Polish
- **Day 1-2:** Phase 2.5-2.8 (Type fixes, Session switch, Virtualization, Security) - 7 hours
- **Day 3:** Testing Phase 2 - 2 hours
- **Day 4-5:** Phase 3 (Selected improvements) - 6 hours

### Week 3: Testing & Documentation (Optional)
- **Day 1-2:** Unit tests - 8 hours
- **Day 3:** Integration tests - 4 hours
- **Day 4:** Documentation updates - 4 hours
- **Day 5:** E2E tests (optional) - 4 hours

**Total Estimated Effort:**
- Phase 1 (Critical): 6 hours
- Phase 2 (Important): 13 hours
- Phase 3 (Polish): 10 hours
- Phase 4 (Testing): 20 hours
- **Grand Total: ~49 hours (~6-7 working days)**

---

## ✅ Definition of Done

### Phase 1 (Critical) - Required for Deployment
- [ ] All 3 HIGH severity issues fixed
- [ ] TypeScript compiles with no errors
- [ ] Manual testing completed for all critical paths
- [ ] No console errors in browser
- [ ] Code reviewed and approved

### Phase 2 (Important) - Required for Next Release
- [ ] All 8 MEDIUM severity issues addressed
- [ ] Toast notifications implemented
- [ ] Error handling standardized
- [ ] Security issues resolved
- [ ] Performance improvements applied

### Phase 3 (Polish) - Nice to Have
- [ ] Code quality improvements completed
- [ ] Performance optimizations applied
- [ ] Developer experience enhancements done

### Phase 4 (Testing) - Long-term
- [ ] Unit test coverage > 70%
- [ ] Integration tests for critical flows
- [ ] Documentation fully updated
- [ ] E2E tests for main user journeys

---

## 🚀 Getting Started

1. **Create a new branch:**
   ```bash
   git checkout -b refactor/phase-1-critical-fixes
   ```

2. **Start with Phase 1, Issue 1.1:**
   Open `components/data/ImportZone.tsx` and implement the FileReader cleanup.

3. **Test each fix thoroughly before moving to next issue.**

4. **Create PR after each phase:**
   - Phase 1 PR: "fix: critical issues from code review"
   - Phase 2 PR: "feat: important improvements from code review"
   - Phase 3 PR: "refactor: code quality improvements"

5. **Update this document as you progress:**
   Mark completed items with ✅

---

## 📝 Notes

- **Prioritize Phase 1** - These are blockers for deployment
- **Phase 2 can be split** - Tackle high-impact items first
- **Phase 3 is flexible** - Pick improvements based on team capacity
- **Phase 4 is optional** - Do if time permits

**Last Updated:** 2025-10-01
**Maintained By:** Development Team
**Review Frequency:** After each phase completion
