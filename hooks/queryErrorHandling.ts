/**
 * Centralized Error Handling for React Query
 * Provides consistent error handling, logging, and retry logic across all queries
 */

import { logger } from '../services/logger';

/**
 * Transform and log query errors
 * @param error - The error object
 * @param operation - Description of the operation that failed
 * @param context - Additional context for debugging
 */
export function handleQueryError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    logger.error(`Query error in ${operation}`, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  } else {
    logger.error(`Query error in ${operation}`, {
      error,
      ...context
    });
  }
}

/**
 * Standard retry configuration for queries
 * - Retries up to 3 times with exponential backoff
 * - Doesn't retry on 4xx client errors
 * - Max delay of 30 seconds
 */
export const queryRetryConfig = {
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on 4xx errors (client errors)
    if (error instanceof Error && 'status' in error) {
      const status = (error as Error & { status?: number }).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        logger.warn('Not retrying 4xx error', { status, failureCount });
        return false;
      }
    }

    // Retry up to 3 times
    if (failureCount >= 3) {
      logger.warn('Max retries reached', { failureCount });
      return false;
    }

    return true;
  },
  retryDelay: (attemptIndex: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, ..., max 30s
    const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
    logger.debug(`Retrying after ${delay}ms`, { attemptIndex });
    return delay;
  },
};

/**
 * Standard retry configuration for mutations
 * - Less aggressive than query retries
 * - Only retries on network errors (5xx)
 * - Max 2 retries
 */
export const mutationRetryConfig = {
  retry: (failureCount: number, error: unknown) => {
    // Only retry on server errors (5xx)
    if (error instanceof Error && 'status' in error) {
      const status = (error as Error & { status?: number }).status;
      // Don't retry client errors (4xx)
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
    }

    // Retry up to 2 times for mutations
    return failureCount < 2;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

/**
 * Create an error handler for React Query onError callback
 * @param operation - Description of the operation
 * @param context - Additional context
 */
export function createQueryErrorHandler(
  operation: string,
  context?: Record<string, unknown>
) {
  return (error: unknown) => {
    handleQueryError(error, operation, context);
  };
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout') ||
      error.name === 'NetworkError' ||
      error.name === 'TypeError' // Often thrown for network issues
    );
  }
  return false;
}

/**
 * Check if an error is a validation error (4xx)
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status?: number }).status;
    return typeof status === 'number' && status >= 400 && status < 500;
  }
  return false;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status?: number }).status;
    return typeof status === 'number' && status >= 500 && status < 600;
  }
  return false;
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown, operation: string): string {
  if (isNetworkError(error)) {
    return `Kesalahan jaringan saat ${operation}. Periksa koneksi Anda.`;
  }

  if (isValidationError(error)) {
    return `Data tidak valid saat ${operation}. Periksa kembali masukan Anda.`;
  }

  if (isServerError(error)) {
    return `Server mengalami masalah saat ${operation}. Silakan coba lagi nanti.`;
  }

  if (error instanceof Error) {
    return error.message || `Gagal melakukan ${operation}`;
  }

  return `Terjadi kesalahan tak terduga saat ${operation}`;
}
