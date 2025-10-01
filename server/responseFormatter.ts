/**
 * Standardized API Response Formatter
 * Provides consistent response structure across all API endpoints
 */

import type { NextFunction, Request, Response } from 'express';

type MetadataRecord = Record<string, unknown>;

interface DefaultMetadata {
  timestamp: string;
  version: string;
}

export interface ApiErrorInfo {
  code: string;
  details: unknown;
  retryable: boolean;
}

export type ApiMetadata<T extends MetadataRecord = MetadataRecord> = DefaultMetadata & T;

export type ApiErrorMetadata<T extends MetadataRecord = MetadataRecord> = ApiMetadata<T & { error: ApiErrorInfo }>;

export interface ApiResponseBody<
  TData = unknown,
  TMetadata extends ApiMetadata = ApiMetadata
> {
  success: boolean;
  data: TData | null;
  message: string | null;
  metadata: TMetadata;
}

function buildMetadata<T extends MetadataRecord>(metadata?: T): ApiMetadata<T> {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    version: '1.0.0',
    ...(metadata ?? {})
  } as ApiMetadata<T>;
}

function buildErrorMetadata<T extends MetadataRecord>(
  error: ApiErrorInfo,
  metadata?: T
): ApiErrorMetadata<T> {
  const baseMetadata = buildMetadata(metadata);
  return {
    ...baseMetadata,
    error
  } as ApiErrorMetadata<T>;
}

export class ApiResponse<
  TData = unknown,
  TMetadata extends ApiMetadata = ApiMetadata
> {
  public success: boolean;
  public data: TData | null;
  public message: string | null;
  public metadata: TMetadata;
  public timestamp: string;

  constructor(success: boolean, data: TData | null, message: string | null, metadata: TMetadata) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.metadata = metadata;
    this.timestamp = metadata.timestamp;
  }

  static success<
    TData = unknown,
    TMetadataInput extends MetadataRecord = MetadataRecord
  >(data: TData, message: string | null = null, metadata?: TMetadataInput) {
    const meta = buildMetadata(metadata);
    return new ApiResponse<TData, ApiMetadata<TMetadataInput>>(true, data, message, meta);
  }

  static error<
    TMetadataInput extends MetadataRecord = MetadataRecord
  >(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details: unknown = null,
    metadata?: TMetadataInput
  ) {
    const errorInfo: ApiErrorInfo = {
      code,
      details,
      retryable: false
    };
    const meta = buildErrorMetadata(errorInfo, metadata);
    return new ApiResponse<null, ApiErrorMetadata<TMetadataInput>>(false, null, message, meta);
  }

  static validationError<
    TMetadataInput extends MetadataRecord = MetadataRecord
  >(
    message: string,
    validationErrors: unknown[] = [],
    metadata?: TMetadataInput
  ) {
    const errorInfo: ApiErrorInfo = {
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      retryable: false
    };
    const meta = buildErrorMetadata(errorInfo, metadata);
    return new ApiResponse<null, ApiErrorMetadata<TMetadataInput>>(false, null, message, meta);
  }

  static notFound<
    TMetadataInput extends MetadataRecord = MetadataRecord
  >(resource: string = 'Resource', metadata?: TMetadataInput) {
    const errorInfo: ApiErrorInfo = {
      code: 'NOT_FOUND',
      details: null,
      retryable: false
    };
    const meta = buildErrorMetadata(errorInfo, metadata);
    return new ApiResponse<null, ApiErrorMetadata<TMetadataInput>>(false, null, `${resource} not found`, meta);
  }

  static serverError<
    TMetadataInput extends MetadataRecord = MetadataRecord
  >(
    message: string = 'Internal server error',
    details: unknown = null,
    metadata?: TMetadataInput
  ) {
    const errorInfo: ApiErrorInfo = {
      code: 'SERVER_ERROR',
      details,
      retryable: true
    };
    const meta = buildErrorMetadata(errorInfo, metadata);
    return new ApiResponse<null, ApiErrorMetadata<TMetadataInput>>(false, null, message, meta);
  }

  toJSON(): ApiResponseBody<TData, TMetadata> {
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
export function responseFormatter(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const extendedRes = res as Response & {
    apiSuccess: (_data: unknown, _message?: string | null, _metadata?: Record<string, unknown>) => Response;
    apiError: (_statusCode: number, _message: string, _code?: string, _details?: unknown, _metadata?: Record<string, unknown>) => Response;
    apiValidationError: (_message: string, _validationErrors?: unknown[], _metadata?: Record<string, unknown>) => Response;
    apiNotFound: (_resource?: string, _metadata?: Record<string, unknown>) => Response;
    apiServerError: (_message?: string, _details?: unknown, _metadata?: Record<string, unknown>) => Response;
  };

  extendedRes.apiSuccess = (data: unknown, message?: string | null, metadata?: Record<string, unknown>) => {
    const response = ApiResponse.success(data, message ?? undefined, metadata);
    return res.json(response.toJSON());
  };

  extendedRes.apiError = (statusCode: number, message: string, code?: string, details?: unknown, metadata?: Record<string, unknown>) => {
    const response = ApiResponse.error(message, code, details, metadata);
    return res.status(statusCode).json(response.toJSON());
  };

  extendedRes.apiValidationError = (message: string, validationErrors?: unknown[], metadata?: Record<string, unknown>) => {
    const response = ApiResponse.validationError(message, validationErrors, metadata);
    return res.status(400).json(response.toJSON());
  };

  extendedRes.apiNotFound = (resource?: string, metadata?: Record<string, unknown>) => {
    const response = ApiResponse.notFound(resource, metadata);
    return res.status(404).json(response.toJSON());
  };

  extendedRes.apiServerError = (message?: string, details?: unknown, metadata?: Record<string, unknown>) => {
    const response = ApiResponse.serverError(message, details, metadata);
    return res.status(500).json(response.toJSON());
  };

  next();
}

/**
 * Backward compatibility wrapper
 * Maintains old response format for legacy clients
 */
export function legacyResponseWrapper(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function patchedJson(data): Response {
    const acceptHeader = req.headers['accept-api-version'];
    const queryVersion = req.query.apiVersion;
    const acceptsNewFormat = acceptHeader === '2.0' || (typeof queryVersion === 'string' && queryVersion === '2.0');

    if (acceptsNewFormat) {
      return originalJson(data);
    }

    if (data && typeof data === 'object' && 'success' in data) {
      const typedData = data as ApiResponseBody<unknown, ApiMetadata | ApiErrorMetadata>;
      if (typedData.success) {
        return originalJson(typedData.data ?? typedData.message ?? { status: 'OK' });
      }

      const errorResponse: Record<string, unknown> = {
        error: typedData.message ?? 'An error occurred'
      };

      if (isErrorMetadata(typedData.metadata)) {
        const details = typedData.metadata.error.details;
        if (isPlainRecord(details)) {
          Object.assign(errorResponse, details);
        }
      }

      return originalJson(errorResponse);
    }

    return originalJson(data);
  } as Response['json'];

  next();
}

/**
 * Error handling middleware with standardized responses
 */
export function standardErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response | void {
  const extendedRes = res as Response & {
    apiValidationError: (_message: string, _validationErrors?: unknown[], _metadata?: Record<string, unknown>) => Response;
    apiNotFound: (_resource?: string, _metadata?: Record<string, unknown>) => Response;
    apiServerError: (_message?: string, _details?: unknown, _metadata?: Record<string, unknown>) => Response;
  };

  console.error('API Error:', err);

  if (isValidationError(err)) {
    return extendedRes.apiValidationError(
      'Validation failed',
      err.details ?? [],
      { originalError: err.message }
    );
  }

  if (isCastOrTypeError(err)) {
    const details =
      err.name === 'CastError'
        ? [{ field: err.path, message: err.message }]
        : [{ message: err.message }];
    return extendedRes.apiValidationError(
      'Invalid data format',
      details,
      { originalError: err.message }
    );
  }

  if (isHttpError(err) && err.status === 404) {
    return extendedRes.apiNotFound('Resource');
  }

  const stack = err instanceof Error ? err.stack : null;
  const message = err instanceof Error ? err.message : 'Unknown error';

  return extendedRes.apiServerError(
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? stack : null,
    { originalError: message }
  );
}

/**
 * 404 handler with standardized response
 */
export function notFoundHandler(req: Request, res: Response): Response {
  const extendedRes = res as Response & {
    apiNotFound: (_resource?: string, _metadata?: Record<string, unknown>) => Response;
  };

  return extendedRes.apiNotFound('API endpoint', {
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

interface ValidationErrorLike {
  name: 'ValidationError';
  message: string;
  details?: unknown[];
}

interface CastErrorLike {
  name: 'CastError' | 'TypeError';
  message: string;
  path?: string;
}

interface HttpErrorLike {
  status?: number;
  message?: string;
}

function isValidationError(error: unknown): error is ValidationErrorLike {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name: unknown }).name === 'ValidationError'
  );
}

function isCastOrTypeError(error: unknown): error is CastErrorLike {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = (error as { name?: unknown }).name;
  return name === 'CastError' || name === 'TypeError';
}

function isHttpError(error: unknown): error is HttpErrorLike {
  return Boolean(error && typeof error === 'object' && 'status' in error);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrorMetadata(metadata: ApiMetadata | ApiErrorMetadata | undefined): metadata is ApiErrorMetadata {
  return Boolean(metadata && 'error' in metadata);
}
