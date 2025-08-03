# Enhanced Validation System - Edge Case Handling

This guide documents the enhanced validation system that provides comprehensive edge case handling for performance data validation.

## 🚀 New Features

### 1. Circular Reference Detection

The system now detects and prevents circular references in employee data that could cause infinite loops or memory issues.

**Features:**
- Tracks employee references using unique keys (`id-name`)
- Detects self-referencing data structures
- Configurable maximum reference depth (default: 10)
- Identifies duplicate competency references within employee data

**Example Issues Detected:**
```javascript
// Circular reference - same employee ID and name
[
  { id: 1, name: "John Doe", performance: [...] },
  { id: 1, name: "John Doe", performance: [...] } // Duplicate reference
]

// Self-referencing competencies
{
  performance: [
    { name: "leadership", score: 85 },
    { name: "leadership", score: 90 } // Duplicate reference
  ]
}
```

### 2. Array Size Limits

Prevents memory exhaustion by enforcing configurable limits on array sizes.

**Configuration:**
```javascript
export const VALIDATION_LIMITS = {
  MAX_ARRAY_SIZE: 1000,        // Maximum number of employees
  MAX_COMPETENCY_COUNT: 50,    // Maximum competencies per employee
  MAX_CIRCULAR_REFERENCE_DEPTH: 10,
  MIN_COMPETENCY_NAME_LENGTH: 2,
  MAX_COMPETENCY_NAME_LENGTH: 100
};
```

**Validation Checks:**
- Total employee array size
- Individual employee competency counts
- Prevents processing of oversized datasets

### 3. Competency Name Sanitization

Automatically cleans and validates competency names to ensure data consistency.

**Sanitization Process:**
1. **Trim whitespace** - Removes leading/trailing spaces
2. **Remove invalid characters** - Keeps only alphanumeric, spaces, hyphens, underscores
3. **Normalize spaces** - Converts multiple spaces to single space
4. **Case normalization** - Converts to lowercase with capitalized first letter
5. **Length validation** - Enforces minimum and maximum length constraints

**Examples:**
```javascript
// Before sanitization
"  kualitas@#$%kinerja!!!  "

// After sanitization
"Kualitas kinerja"

// Multiple spaces normalized
"kepemimpinan   dan   komunikasi" → "Kepemimpinan dan komunikasi"
```

**Validation Rules:**
- Minimum length: 2 characters
- Maximum length: 100 characters
- Must be a valid string (not null/undefined)
- Invalid characters are removed automatically

### 4. Duplicate Competency Detection and Merging

Intelligently detects and merges duplicate competencies within the same employee's data.

**Detection Strategy:**
- Uses normalized competency names for comparison
- Case-insensitive matching
- Handles variations in spacing and formatting

**Merging Strategy:**
- **Score calculation**: Averages all duplicate scores
- **Name selection**: Uses the most complete/longest name variant
- **Precision**: Rounds averaged scores to 2 decimal places

**Example:**
```javascript
// Before merging
[
  { name: "kualitas kinerja", score: 85 },
  { name: "Kualitas Kinerja", score: 90 },
  { name: "KUALITAS KINERJA", score: 88 }
]

// After merging
[
  { name: "Kualitas Kinerja", score: 87.67 } // Average of 85, 90, 88
]
```

## 🔧 Implementation Details

### New Validation Methods

1. **`validateArraySizes(employees)`**
   - Checks total employee count
   - Validates individual competency counts
   - Prevents memory exhaustion

2. **`validateCircularReferences(employees, depth)`**
   - Tracks employee references
   - Detects circular dependencies
   - Configurable depth limits

3. **`validateAndSanitizeCompetencyNames(employees)`**
   - Validates name format and length
   - Sanitizes invalid characters
   - Normalizes formatting

4. **`validateAndMergeDuplicateCompetencies(employees)`**
   - Groups competencies by normalized name
   - Merges duplicates with averaged scores
   - Preserves best name variant

5. **`sanitizeCompetencyName(name)`**
   - Core sanitization logic
   - Character filtering and normalization
   - Case and spacing standardization

### Enhanced Error Types

```typescript
type ValidationErrorType = 
  | 'circular_reference'      // Circular dependencies detected
  | 'array_size_exceeded'     // Array size limits exceeded
  | 'invalid_competency_name' // Invalid name format/length
  | 'duplicate_competency';   // Duplicate competencies found
```

### Enhanced Warning Types

```typescript
type ValidationWarningType = 
  | 'competency_merged'    // Duplicates were merged
  | 'competency_sanitized'; // Names were sanitized
```

## 📊 Usage Examples

### Basic Usage

```javascript
import { validatePerformanceData } from './services/validationService.js';

const employees = [
  {
    id: 1,
    name: "John Doe",
    performance: [
      { name: "  leadership@#$  ", score: 85 },
      { name: "Leadership", score: 90 }
    ]
  }
];

const result = validatePerformanceData(employees);

console.log('Validation Result:', {
  isValid: result.isValid,
  errors: result.errors.length,
  warnings: result.warnings.length,
  dataCompleteness: result.summary.dataCompleteness
});
```

### Handling Validation Results

```javascript
const result = validatePerformanceData(employees);

// Check for specific edge case errors
const circularErrors = result.errors.filter(err => err.type === 'circular_reference');
const arraySizeErrors = result.errors.filter(err => err.type === 'array_size_exceeded');
const nameErrors = result.errors.filter(err => err.type === 'invalid_competency_name');

// Check for data improvements
const mergedWarnings = result.warnings.filter(warn => warn.type === 'competency_merged');
const sanitizedWarnings = result.warnings.filter(warn => warn.type === 'competency_sanitized');

console.log('Data Quality Improvements:', {
  competenciesMerged: mergedWarnings.length,
  namesSanitized: sanitizedWarnings.length
});
```

## ⚙️ Configuration

### Customizing Validation Limits

```javascript
// Modify validation limits as needed
VALIDATION_LIMITS.MAX_ARRAY_SIZE = 2000;           // Increase employee limit
VALIDATION_LIMITS.MAX_COMPETENCY_COUNT = 100;      // Increase competency limit
VALIDATION_LIMITS.MIN_COMPETENCY_NAME_LENGTH = 3;  // Stricter name length
```

### Custom Sanitization Rules

The `sanitizeCompetencyName` method can be customized for specific requirements:

```javascript
private sanitizeCompetencyName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')              // Normalize spaces
    .toLowerCase()                     // Convert to lowercase
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
}
```

## 🧪 Testing

Run the enhanced validation tests:

```bash
node test/enhanced-validation-test.js
```

The test suite covers:
- Array size limit validation
- Circular reference detection
- Competency name sanitization
- Duplicate competency merging
- Combined edge case scenarios

## 🔍 Monitoring and Debugging

### Error Analysis

```javascript
const result = validatePerformanceData(employees);

// Analyze error distribution
const errorTypes = {};
result.errors.forEach(error => {
  errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
});

console.log('Error Distribution:', errorTypes);
```

### Performance Impact

The enhanced validation adds minimal overhead:
- **Array size checks**: O(n) complexity
- **Circular reference detection**: O(n) with Set-based tracking
- **Name sanitization**: O(m) where m is total competencies
- **Duplicate merging**: O(m log m) for sorting and grouping

## 🚨 Best Practices

1. **Validate Early**: Run validation before processing data
2. **Handle Warnings**: Review and act on sanitization/merging warnings
3. **Monitor Limits**: Adjust validation limits based on your data size
4. **Log Results**: Keep track of validation results for data quality monitoring
5. **Test Edge Cases**: Regularly test with problematic data samples

## 🔗 Integration

The enhanced validation is automatically integrated into:
- Existing validation workflows
- Data import processes
- API endpoints with validation
- Database operations

No breaking changes to existing code - all enhancements are additive and backward compatible.