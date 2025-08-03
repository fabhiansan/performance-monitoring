# Data Validation Layer Guide

This guide explains how to use the comprehensive data validation layer implemented for performance data integrity checking, error reporting, and data recovery.

## Overview

The data validation layer provides:
- **JSON Integrity Validation**: Checks for malformed JSON, encoding issues, and structural problems
- **Performance Data Validation**: Validates employee performance data structure and content
- **Error Reporting**: Detailed error messages with severity levels and recovery recommendations
- **Data Recovery**: Automatic and manual data recovery options
- **User Notifications**: Clear feedback on data quality and validation results

## Architecture

### Core Components

1. **DataIntegrityService** (`services/dataIntegrityService.ts`)
   - Validates JSON integrity and performance data structure
   - Provides detailed error reporting and recovery options
   - Calculates data quality scores

2. **EnhancedDatabaseService** (`services/enhancedDatabaseService.ts`)
   - Integrates validation with database operations
   - Handles data recovery and auto-fixing
   - Provides comprehensive error reporting

3. **DataValidationMiddleware** (`middleware/dataValidationMiddleware.js`)
   - Express.js middleware for automatic validation
   - Handles validation errors and recovery
   - Adds validation headers to responses

## Usage

### Automatic Validation

The validation layer is automatically applied to relevant endpoints:

```javascript
// Employee data upload with validation
POST /api/employee-data
```

Validation headers are automatically added to responses:
- `X-Data-Validation-Applied`: Whether validation was performed
- `X-Data-Quality-Score`: Overall data quality score (0-100)
- `X-Data-Warnings`: Number of warnings detected
- `X-Recovery-Applied`: Whether automatic recovery was applied
- `X-Performance-Data-Validated`: Whether performance data validation was performed
- `X-Records-Processed`: Number of records processed
- `X-Records-Recovered`: Number of records recovered

### Manual Validation

#### Validate Data Integrity

```javascript
POST /api/data/validate
Content-Type: application/json

{
  "rawData": "{\"employees\": [...]}",  // Raw JSON string to validate
  "employeeData": [...]                    // Parsed employee data array
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "endpoint": "/api/data/validate",
    "reports": [
      {
        "type": "json_integrity",
        "result": {
          "isValid": true,
          "errors": [],
          "warnings": [],
          "summary": {
            "integrityScore": 95,
            "totalErrors": 0,
            "totalWarnings": 1
          }
        },
        "message": "Data integrity check completed",
        "recommendation": "No action required"
      },
      {
        "type": "performance_data_integrity",
        "result": { /* ... */ },
        "dbResult": {
          "success": true,
          "dataQualityScore": 92,
          "recordsProcessed": 150,
          "recordsRecovered": 3
        },
        "detailedReport": "Detailed validation report..."
      }
    ]
  },
  "message": "Data validation report generated successfully"
}
```

#### Recover Corrupted Data

```javascript
POST /api/data/recover
Content-Type: application/json

{
  "rawData": "{\"employees\": [...]}",  // Raw JSON string to recover
  "recoveryOptions": {
    "autoFix": true,
    "useDefaultValues": true,
    "skipCorruptedRecords": false
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "recoveredData": [/* recovered employee data */],
    "recoveryReport": {
      "recordsProcessed": 150,
      "recordsRecovered": 8,
      "dataQualityScore": 88,
      "canProceed": true,
      "requiresUserAction": false,
      "recommendations": [
        "Review recovered records for accuracy",
        "Consider data source quality improvements"
      ],
      "availableActions": [
        {
          "type": "accept_recovered",
          "description": "Accept recovered data as-is",
          "confidence": 85
        },
        {
          "type": "manual_review",
          "description": "Manually review and fix issues",
          "confidence": 95
        }
      ]
    },
    "errors": [/* any remaining errors */],
    "warnings": [/* warnings about recovery */]
  },
  "message": "Data recovery completed successfully",
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "detailedReport": "Comprehensive recovery report..."
  }
}
```

## Error Types and Handling

### JSON Integrity Errors

- **Syntax Errors**: Malformed JSON structure
- **Encoding Issues**: Character encoding problems
- **Truncation**: Incomplete JSON data
- **Schema Violations**: Missing required fields
- **Data Type Mismatches**: Incorrect field types

### Performance Data Errors

- **Missing Employees**: Required employee records not found
- **Invalid Scores**: Performance scores outside valid range
- **Missing Competencies**: Required competency data missing
- **Duplicate Records**: Duplicate employee entries
- **Inconsistent Data**: Data inconsistencies across records

### Error Severity Levels

- **Critical**: Data cannot be processed safely
- **High**: Significant issues that may affect results
- **Medium**: Minor issues with potential impact
- **Low**: Cosmetic issues or warnings

## Recovery Options

### Automatic Recovery

- **JSON Repair**: Fix common JSON syntax issues
- **Default Values**: Apply default values for missing fields
- **Data Cleaning**: Remove invalid characters and normalize data
- **Type Conversion**: Convert data types when possible

### Manual Recovery

- **Skip Corrupted Records**: Continue processing valid records
- **User Confirmation**: Require user approval for changes
- **Partial Recovery**: Recover what's possible and report issues
- **Fallback Parsing**: Use alternative parsing strategies

## Configuration

### Middleware Options

```javascript
// JSON validation middleware
app.use(validateJsonMiddleware({
  autoFix: true,              // Enable automatic fixing
  useDefaultValues: true,     // Use default values for missing fields
  skipCorruptedRecords: false, // Skip corrupted records
  requireUserConfirmation: false, // Require user confirmation
  logErrors: true             // Log validation errors
}));

// Performance data validation middleware
app.use(validatePerformanceMiddleware({
  autoFix: true,              // Enable automatic fixing
  useDefaultValues: true,     // Use default values
  minDataQualityScore: 70,    // Minimum acceptable quality score
  logErrors: true             // Log validation errors
}));
```

### Service Configuration

```javascript
import { EnhancedDatabaseService } from './services/enhancedDatabaseService.js';

const dbService = new EnhancedDatabaseService();

// Parse with validation
const result = dbService.parsePerformanceDataWithIntegrity(rawData, {
  autoFix: true,
  useDefaultValues: true,
  skipCorruptedRecords: false
});

// Get employee data with validation
const employees = dbService.getEmployeeDataWithIntegrity(employeeArray, {
  autoFix: true,
  useDefaultValues: true
});
```

## Best Practices

### For Developers

1. **Always Check Validation Results**: Review validation headers and results
2. **Handle Recovery Options**: Provide user-friendly recovery interfaces
3. **Log Validation Issues**: Monitor data quality over time
4. **Test with Corrupted Data**: Ensure robust error handling
5. **Configure Appropriately**: Set validation thresholds based on requirements

### For Data Quality

1. **Monitor Quality Scores**: Track data quality trends
2. **Address Root Causes**: Fix data source issues
3. **Regular Validation**: Validate data regularly, not just on upload
4. **User Training**: Educate users on data quality requirements
5. **Backup Strategies**: Maintain backups before applying auto-fixes

## Monitoring and Debugging

### Validation Logs

Validation activities are logged with structured information:

```javascript
// JSON integrity issues
console.warn('🔍 Data integrity issues detected:', {
  endpoint: '/api/employee-data',
  method: 'POST',
  errors: 2,
  warnings: 1,
  integrityScore: 85
});

// Performance data validation
console.warn('📊 Performance data validation issues:', {
  endpoint: '/api/employee-data',
  method: 'POST',
  recordsProcessed: 150,
  recordsRecovered: 8,
  dataQualityScore: 88,
  errors: 3
});
```

### Response Headers

Monitor validation through response headers:

```bash
# Check validation status
curl -I http://localhost:3002/api/employee-data

# Response headers:
X-Data-Validation-Applied: true
X-Data-Quality-Score: 92
X-Data-Warnings: 1
X-Recovery-Applied: true
X-Performance-Data-Validated: true
X-Records-Processed: 150
X-Records-Recovered: 8
```

### Error Reporting

Generate detailed validation reports:

```bash
# Generate validation report
curl -X POST http://localhost:3002/api/data/validate \
  -H "Content-Type: application/json" \
  -d '{"rawData": "{...}", "employeeData": [...]}'
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Large datasets may require streaming validation
2. **Performance Impact**: Validation adds processing overhead
3. **False Positives**: Overly strict validation may reject valid data
4. **Recovery Failures**: Some data corruption may be unrecoverable

### Solutions

1. **Optimize Validation**: Use targeted validation for specific data types
2. **Batch Processing**: Process large datasets in smaller batches
3. **Adjust Thresholds**: Fine-tune validation sensitivity
4. **Fallback Strategies**: Implement multiple recovery approaches

## Integration Examples

### Frontend Integration

```javascript
// Upload with validation feedback
async function uploadEmployeeData(employees) {
  try {
    const response = await fetch('/api/employee-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees })
    });
    
    // Check validation headers
    const dataQualityScore = response.headers.get('X-Data-Quality-Score');
    const warnings = response.headers.get('X-Data-Warnings');
    const recoveryApplied = response.headers.get('X-Recovery-Applied');
    
    if (dataQualityScore < 80) {
      showDataQualityWarning(dataQualityScore, warnings);
    }
    
    if (recoveryApplied === 'true') {
      showRecoveryNotification();
    }
    
    return await response.json();
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Validate data before upload
async function validateBeforeUpload(rawData) {
  const response = await fetch('/api/data/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawData })
  });
  
  const result = await response.json();
  return result.data.reports;
}
```

### Error Recovery UI

```javascript
// Handle validation errors with user options
async function handleValidationError(error) {
  if (error.details && error.details.recoveryOptions) {
    const userChoice = await showRecoveryOptions(error.details.recoveryOptions);
    
    if (userChoice.type === 'auto_recover') {
      return await recoverData(error.details.rawData);
    } else if (userChoice.type === 'manual_fix') {
      return await showManualFixInterface(error.details.errors);
    }
  }
  
  throw error;
}

async function recoverData(rawData) {
  const response = await fetch('/api/data/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      rawData,
      recoveryOptions: { autoFix: true, useDefaultValues: true }
    })
  });
  
  return await response.json();
}
```

This comprehensive data validation layer ensures robust handling of performance data with clear error reporting and recovery options, providing a reliable foundation for data integrity in the employee performance analyzer.