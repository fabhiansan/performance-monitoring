# Organizational Level Standardization Guide

## Overview

This document outlines the standardized approach for organizational level categorization across the Employee Performance Analyzer application. The standardization ensures consistent behavior and reduces confusion when working with organizational levels.

## Standardized Functions

### Primary Function: `categorizeOrganizationalLevel`

**Use this function for all organizational level categorization needs.**

```typescript
import { categorizeOrganizationalLevel } from '../utils/organizationalLevels';

const category = categorizeOrganizationalLevel(employee.organizational_level);
// Returns: 'Eselon II' | 'Eselon III' | 'Eselon IV' | 'Staff' | 'Other'
```

### Helper Functions

#### `isAnyEselonLevel(category)`
Checks if a category represents any Eselon level (II, III, or IV).

```typescript
import { categorizeOrganizationalLevel, isAnyEselonLevel } from '../utils/organizationalLevels';

const category = categorizeOrganizationalLevel(employee.organizational_level);
const isEselon = isAnyEselonLevel(category);
```

#### `isEselonLevel(level)`
Direct check if a level string is an Eselon level.

```typescript
import { isEselonLevel } from '../utils/organizationalLevels';

const isEselon = isEselonLevel(employee.organizational_level);
```

#### `isStaffLevel(level)`
Direct check if a level string is a Staff level.

```typescript
import { isStaffLevel } from '../utils/organizationalLevels';

const isStaff = isStaffLevel(employee.organizational_level);
```

## Deprecated Functions

### `getSpecificEselonLevel` (Deprecated)

**⚠️ This function is deprecated.** Use `categorizeOrganizationalLevel` instead.

**Why deprecated:**
- Creates confusion with similar functionality to `categorizeOrganizationalLevel`
- Different return type can lead to inconsistent handling
- Reduces code maintainability

**Migration:**
```typescript
// OLD (deprecated)
const level = getSpecificEselonLevel(employee.organizational_level);

// NEW (recommended)
const category = categorizeOrganizationalLevel(employee.organizational_level);
```

## Implementation Examples

### Filtering Employees by Type

```typescript
import { categorizeOrganizationalLevel, isAnyEselonLevel } from '../utils/organizationalLevels';

// Filter Eselon employees
const eselonEmployees = employees.filter(emp => {
  const category = categorizeOrganizationalLevel(emp.organizational_level);
  return isAnyEselonLevel(category);
});

// Filter Staff employees
const staffEmployees = employees.filter(emp => {
  const category = categorizeOrganizationalLevel(emp.organizational_level);
  return category === 'Staff';
});

// Filter by specific Eselon level
const eselonIIEmployees = employees.filter(emp => {
  const category = categorizeOrganizationalLevel(emp.organizational_level);
  return category === 'Eselon II';
});
```

### Component Usage Pattern

```typescript
import React, { useMemo } from 'react';
import { categorizeOrganizationalLevel, isAnyEselonLevel } from '../utils/organizationalLevels';

const MyComponent = ({ employees }) => {
  // Use standardized categorization function
  const categorizeEmployee = categorizeOrganizationalLevel;
  
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const category = categorizeEmployee(emp.organizational_level);
      
      // Use helper function for Eselon check
      if (filterType === 'eselon') {
        return isAnyEselonLevel(category);
      }
      
      // Direct comparison for specific levels
      if (filterType === 'staff') {
        return category === 'Staff';
      }
      
      return true;
    });
  }, [employees, filterType]);
  
  // ... rest of component
};
```

## Benefits of Standardization

1. **Consistency**: All components use the same categorization logic
2. **Maintainability**: Single source of truth for organizational level logic
3. **Type Safety**: Clear TypeScript types for all return values
4. **Performance**: Optimized functions with consistent behavior
5. **Documentation**: Clear understanding of what each function does

## Migration Checklist

- [ ] Replace all instances of `getSpecificEselonLevel` with `categorizeOrganizationalLevel`
- [ ] Use `isAnyEselonLevel` helper for Eselon level checks
- [ ] Update imports to use standardized functions
- [ ] Test all components to ensure consistent behavior
- [ ] Update any custom logic that relied on the old function's return type

## Files Updated

- `utils/organizationalLevels.ts` - Added standardization functions and deprecation notice
- `components/TableView.tsx` - Updated to use standardized approach
- `components/DashboardOverview.tsx` - Already using standardized approach

## Future Considerations

In a future version, the deprecated `getSpecificEselonLevel` function will be removed. All code should migrate to use the standardized functions outlined in this document.