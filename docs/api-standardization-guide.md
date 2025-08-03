# API Standardization Guide

## Overview

This guide documents the standardization of all API endpoints in the Employee Performance Analyzer to provide consistent response formats with proper metadata and error structures while maintaining backward compatibility.

## New Standardized Response Format

### Success Response Structure

```json
{
  "success": true,
  "data": {
    // Actual response data
  },
  "message": "Operation completed successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    // Additional metadata specific to the operation
  }
}
```

### Error Response Structure

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "error": {
      "code": "ERROR_CODE",
      "details": {
        // Additional error details
      },
      "retryable": false
    }
  }
}
```

## Error Codes and Categories

### Standard Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Requested resource not found
- `SERVER_ERROR`: Internal server error
- `NETWORK_ERROR`: Network connectivity issues
- `PERMISSION_ERROR`: Access denied
- `UNKNOWN_ERROR`: Unclassified error

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

## Backward Compatibility

### Legacy Response Format

Existing clients will continue to receive responses in the original format:

```json
// Legacy success response
{
  "id": 123,
  "name": "John Doe",
  "message": "Employee added successfully"
}

// Legacy error response
{
  "error": "Employee not found"
}
```

### Opting into New Format

To receive the new standardized format, clients can:

1. **Add HTTP Header**: `Accept-API-Version: 2.0`
2. **Add Query Parameter**: `?apiVersion=2.0`

## Frontend Integration

### ApiService Configuration

```typescript
import { api } from './services/api';

// Enable standardized format (default for new implementations)
api.setResponseFormat(true);

// Use legacy format for backward compatibility
api.setResponseFormat(false);
```

### Error Handling

The updated ApiService automatically handles both response formats:

```typescript
try {
  const employees = await api.getAllEmployees();
  // employees contains the actual data, regardless of response format
} catch (error) {
  if (error instanceof AppError) {
    console.log('Error code:', error.code);
    console.log('User message:', error.userMessage);
    console.log('Retryable:', error.retryable);
  }
}
```

## API Endpoints

### Employee Management

#### GET /api/employees
**Legacy Response:**
```json
[
  { "id": 1, "name": "John Doe", "position": "Manager" }
]
```

**Standardized Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "John Doe", "position": "Manager" }
  ],
  "message": "Employees retrieved successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "count": 1
  }
}
```

#### POST /api/employees
**Legacy Response:**
```json
{
  "id": 123,
  "message": "Employee added successfully"
}
```

**Standardized Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "John Doe",
    "nip": "12345",
    "gol": "III/a",
    "pangkat": "Penata Muda",
    "position": "Staff",
    "subPosition": "Analyst",
    "organizationalLevel": "Staff/Other"
  },
  "message": "Employee added successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "employeeId": 123
  }
}
```

#### Validation Error Example
**Standardized Response:**
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        {
          "field": "name",
          "message": "Name is required"
        },
        {
          "field": "gol",
          "message": "Golongan is required"
        }
      ],
      "retryable": false
    }
  }
}
```

### Upload Sessions

#### GET /api/upload-sessions
**Standardized Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": "uuid-123",
      "session_name": "Q1 2024 Data",
      "upload_timestamp": "2024-01-15T10:30:00.000Z",
      "employee_count": 150,
      "competency_count": 8
    }
  ],
  "message": "Upload sessions retrieved successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "count": 1
  }
}
```

### Health Check

#### GET /api/health
**Standardized Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "database": true
  },
  "message": "Performance Analyzer API is running",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

## Migration Strategy

### Phase 1: Dual Support (Current)
- Both legacy and standardized formats are supported
- Legacy format is default for existing clients
- New clients can opt into standardized format

### Phase 2: Gradual Migration
- Update frontend components to use standardized format
- Add deprecation warnings for legacy format
- Monitor usage metrics

### Phase 3: Full Migration (Future)
- Make standardized format the default
- Provide legacy format only with explicit opt-in
- Eventually deprecate legacy format

## Benefits

### Consistency
- All endpoints follow the same response structure
- Predictable error handling across the application
- Standardized metadata for debugging and monitoring

### Developer Experience
- Clear success/failure indication
- Structured error information with actionable details
- Consistent validation error format
- Built-in retry logic support

### Monitoring and Debugging
- Timestamps for all responses
- Version information for API compatibility
- Structured error codes for automated handling
- Additional metadata for context

### Future-Proofing
- Extensible metadata structure
- Version-aware client support
- Graceful degradation for legacy clients

## Implementation Files

- **Response Formatter**: `/server/responseFormatter.js`
- **Standardized Server**: `/server/server-standardized.mjs`
- **Updated API Service**: `/services/api.ts`
- **Error Handler**: `/services/errorHandler.ts`

## Testing

### Manual Testing

```bash
# Test with legacy format (default)
curl http://localhost:3002/api/employees

# Test with standardized format
curl -H "Accept-API-Version: 2.0" http://localhost:3002/api/employees

# Test with query parameter
curl "http://localhost:3002/api/employees?apiVersion=2.0"
```

### Frontend Testing

```typescript
// Test legacy format
api.setResponseFormat(false);
const legacyResponse = await api.getAllEmployees();

// Test standardized format
api.setResponseFormat(true);
const standardizedResponse = await api.getAllEmployees();
```

## Conclusion

The API standardization provides a robust foundation for consistent error handling, improved developer experience, and future extensibility while maintaining full backward compatibility with existing clients.