# API Standardization Implementation

## Overview

This project has been updated to provide standardized API response formats while maintaining full backward compatibility with existing clients.

## Quick Start

### Running the Standardized Server

```bash
# Start the new standardized server
node server/server-standardized.mjs

# Or use the original server (legacy format only)
node server/server.mjs
```

### Testing Both Formats

```bash
# Run the test script to verify both formats work
node test-api-formats.js
```

## Key Features

### ✅ Standardized Response Format
- Consistent structure across all endpoints
- Rich metadata including timestamps and version info
- Structured error handling with error codes
- Success/failure indication in every response

### ✅ Backward Compatibility
- Existing clients continue to work without changes
- Legacy response format preserved
- Gradual migration path available

### ✅ Enhanced Error Handling
- Detailed error information with codes and categories
- Validation errors with field-specific messages
- Retry logic support
- User-friendly error messages

### ✅ Developer Experience
- Type-safe error handling with AppError class
- Automatic format detection in frontend
- Comprehensive documentation
- Easy testing and debugging

## Response Format Comparison

### Legacy Format (Existing)
```json
// Success
{ "id": 123, "name": "John Doe" }

// Error
{ "error": "Employee not found" }
```

### Standardized Format (New)
```json
// Success
{
  "success": true,
  "data": { "id": 123, "name": "John Doe" },
  "message": "Employee retrieved successfully",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0"
  }
}

// Error
{
  "success": false,
  "data": null,
  "message": "Employee not found",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "error": {
      "code": "NOT_FOUND",
      "details": { "employeeId": 123 },
      "retryable": false
    }
  }
}
```

## Using the New Format

### Frontend Integration

```typescript
import { api } from './services/api';

// Enable standardized format for new features
api.setResponseFormat(true);

try {
  const employees = await api.getAllEmployees();
  console.log('Employees:', employees);
} catch (error) {
  if (error instanceof AppError) {
    console.log('Error code:', error.code);
    console.log('User message:', error.userMessage);
    console.log('Can retry:', error.retryable);
  }
}
```

### HTTP Requests

```bash
# Request standardized format
curl -H "Accept-API-Version: 2.0" http://localhost:3002/api/employees

# Request legacy format (default)
curl http://localhost:3002/api/employees
```

## File Structure

```
├── server/
│   ├── responseFormatter.js      # Standardized response utilities
│   ├── server-standardized.mjs   # New server with standardized responses
│   ├── server.mjs                # Original server (legacy format)
│   └── server.js                 # Alternative server implementation
├── services/
│   ├── api.ts                    # Updated API service with dual format support
│   └── errorHandler.ts           # Enhanced error handling
├── docs/
│   └── api-standardization-guide.md  # Comprehensive API documentation
├── test-api-formats.js           # Test script for both formats
└── README-API-STANDARDIZATION.md # This file
```

## Implementation Details

### Response Formatter (`server/responseFormatter.js`)
- `ApiResponse` class for consistent response creation
- Express middleware for adding response helpers
- Legacy wrapper for backward compatibility
- Standardized error handlers

### Updated API Service (`services/api.ts`)
- Dual format support with automatic detection
- Enhanced error handling with AppError integration
- Backward compatible method signatures
- Configurable response format preference

### Error Handling
- Structured error codes (VALIDATION_ERROR, NOT_FOUND, etc.)
- Field-specific validation errors
- Retry logic support
- User-friendly error messages

## Testing

### Automated Testing
```bash
# Start the server
node server/server-standardized.mjs

# In another terminal, run tests
node test-api-formats.js
```

### Manual Testing
```bash
# Test health endpoint with both formats
curl http://localhost:3002/api/health
curl -H "Accept-API-Version: 2.0" http://localhost:3002/api/health

# Test error handling
curl http://localhost:3002/api/employees/99999
curl -H "Accept-API-Version: 2.0" http://localhost:3002/api/employees/99999
```

## Migration Guide

### For New Features
1. Use the standardized format by default
2. Set `api.setResponseFormat(true)` in frontend code
3. Handle AppError instances for better error management

### For Existing Features
1. Keep using legacy format initially
2. Gradually migrate components to standardized format
3. Test thoroughly before switching formats

### Server Deployment
1. Deploy `server-standardized.mjs` alongside existing server
2. Update load balancer or proxy to route to new server
3. Monitor for any compatibility issues
4. Gradually phase out legacy server

## Benefits

### For Developers
- Consistent API responses across all endpoints
- Better error handling and debugging
- Type-safe error management
- Clear success/failure indication

### For Users
- More reliable error messages
- Better application stability
- Improved user experience during errors
- Faster issue resolution

### For Operations
- Structured logging and monitoring
- Better error tracking and analytics
- Easier debugging and troubleshooting
- Version-aware API management

## Troubleshooting

### Common Issues

1. **Server not responding**
   ```bash
   # Check if server is running
   curl http://localhost:3002/api/health
   ```

2. **Wrong response format**
   ```bash
   # Verify headers
   curl -v -H "Accept-API-Version: 2.0" http://localhost:3002/api/health
   ```

3. **Frontend errors**
   ```typescript
   // Check API service configuration
   console.log('Using standardized format:', api.useStandardizedFormat);
   ```

### Debug Mode

The server logs all requests and response formats for debugging:

```bash
# Start server with debug logging
DEBUG=api:* node server/server-standardized.mjs
```

## Future Enhancements

- [ ] Add response caching with metadata
- [ ] Implement API versioning in URLs
- [ ] Add request/response compression
- [ ] Enhance monitoring and metrics
- [ ] Add automated API documentation generation

## Support

For questions or issues related to the API standardization:

1. Check the [API Standardization Guide](docs/api-standardization-guide.md)
2. Run the test script to verify functionality
3. Review server logs for detailed error information
4. Test with both legacy and standardized formats

---

**Note**: This implementation maintains 100% backward compatibility. Existing clients will continue to work without any changes while new clients can opt into the improved standardized format.