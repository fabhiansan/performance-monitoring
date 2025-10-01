import { useCallback } from 'react';
import { errorHandler } from '../services/errorHandler';
import { useError } from './ErrorContext';

// Hook for handling async operations with error handling
export const useAsyncError = () => {
  const { showError } = useError();

  return useCallback(async <T,>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      showError(error, context);
      return null;
    }
  }, [showError]);
};

// Hook for wrapping functions with error handling
export const useErrorHandler = () => {
  const { showError } = useError();

  return useCallback(<T extends unknown[], R>(
    fn: (..._args: T) => R | Promise<R>,
    context?: Record<string, unknown>
  ) => {
    return async (...callArgs: T): Promise<R | null> => {
      try {
        return await fn(...callArgs);
      } catch (error) {
        showError(error, context);
        return null;
      }
    };
  }, [showError]);
};

// Utility function to create error boundaries for specific operations
export const createErrorBoundary = (context: Record<string, unknown>) => {
  return (error: unknown) => {
    errorHandler.handleError(error, context);
  };
};
