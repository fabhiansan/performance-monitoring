/**
 * Standardized API Response Formatter
 * Provides consistent response structure across all API endpoints
 */

export class ApiResponse {
  constructor(success, data = null, message = null, metadata = {}) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...metadata
    };
  }

  static success(data, message = null, metadata = {}) {
    return new ApiResponse(true, data, message, metadata);
  }

  static error(message, code = 'UNKNOWN_ERROR', details = null, metadata = {}) {
    return new ApiResponse(false, null, message, {
      error: {
        code,
        details,
        retryable: false,
        ...details
      },
      ...metadata
    });
  }

  static validationError(message, validationErrors = [], metadata = {}) {
    return new ApiResponse(false, null, message, {
      error: {
        code: 'VALIDATION_ERROR',
        details: validationErrors,
        retryable: false
      },
      ...metadata
    });
  }

  static notFound(resource = 'Resource', metadata = {}) {
    return new ApiResponse(false, null, `${resource} not found`, {
      error: {
        code: 'NOT_FOUND',
        details: null,
        retryable: false
      },
      ...metadata
    });
  }

  static serverError(message = 'Internal server error', details = null, metadata = {}) {
    return new ApiResponse(false, null, message, {
      error: {
        code: 'SERVER_ERROR',
        details,
        retryable: true
      },
      ...metadata
    });
  }

  toJSON() {
    return {
      success: this.success,
      data: this.data,
      message: this.message,
      metadata: this.metadata
    };
  }
}

/**
 * Express middleware for consistent response formatting
 */
export function responseFormatter(req, res, next) {
  // Add helper methods to response object
  res.apiSuccess = (data, message, metadata) => {
    const response = ApiResponse.success(data, message, metadata);
    return res.json(response.toJSON());
  };

  res.apiError = (statusCode, message, code, details, metadata) => {
    const response = ApiResponse.error(message, code, details, metadata);
    return res.status(statusCode).json(response.toJSON());
  };

  res.apiValidationError = (message, validationErrors, metadata) => {
    const response = ApiResponse.validationError(message, validationErrors, metadata);
    return res.status(400).json(response.toJSON());
  };

  res.apiNotFound = (resource, metadata) => {
    const response = ApiResponse.notFound(resource, metadata);
    return res.status(404).json(response.toJSON());
  };

  res.apiServerError = (message, details, metadata) => {
    const response = ApiResponse.serverError(message, details, metadata);
    return res.status(500).json(response.toJSON());
  };

  next();
}

/**
 * Backward compatibility wrapper
 * Maintains old response format for legacy clients
 */
export function legacyResponseWrapper(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Check if client accepts new format via header
    const acceptsNewFormat = req.headers['accept-api-version'] === '2.0' || 
                           req.query.apiVersion === '2.0';
    
    if (acceptsNewFormat) {
      // Use new standardized format
      return originalJson.call(this, data);
    }
    
    // Maintain backward compatibility for legacy clients
    if (data && typeof data === 'object' && 'success' in data) {
      // If it's already in new format, extract data for legacy response
      if (data.success) {
        return originalJson.call(this, data.data || data.message || { status: 'OK' });
      } else {
        // For errors, maintain old error format
        const errorResponse = {
          error: data.message || 'An error occurred'
        };
        if (data.metadata && data.metadata.error && data.metadata.error.details) {
          Object.assign(errorResponse, data.metadata.error.details);
        }
        return originalJson.call(this, errorResponse);
      }
    }
    
    // Pass through non-standardized responses as-is
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Error handling middleware with standardized responses
 */
export function standardErrorHandler(err, req, res, next) {
  console.error('API Error:', err);
  
  // Handle different error types
  if (err.name === 'ValidationError') {
    return res.apiValidationError(
      'Validation failed',
      err.details || [],
      { originalError: err.message }
    );
  }
  
  if (err.name === 'CastError' || err.name === 'TypeError') {
    return res.apiValidationError(
      'Invalid data format',
      [{ field: err.path, message: err.message }],
      { originalError: err.message }
    );
  }
  
  if (err.status === 404) {
    return res.apiNotFound('Resource');
  }
  
  // Default server error
  return res.apiServerError(
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? err.stack : null,
    { originalError: err.message }
  );
}

/**
 * 404 handler with standardized response
 */
export function notFoundHandler(req, res) {
  res.apiNotFound('API endpoint', {
    requestedPath: req.path,
    method: req.method
  });
}

export default {
  ApiResponse,
  responseFormatter,
  legacyResponseWrapper,
  standardErrorHandler,
  notFoundHandler
};