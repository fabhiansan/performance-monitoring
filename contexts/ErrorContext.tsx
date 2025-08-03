import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ErrorDetails, ErrorHandler, errorHandler } from '../services/errorHandler';

interface ErrorState {
  errors: ErrorDetails[];
  isVisible: boolean;
}

interface ErrorContextValue {
  // Error state
  errors: ErrorDetails[];
  currentError: ErrorDetails | null;
  isErrorVisible: boolean;
  
  // Error actions
  showError: (error: unknown, context?: Record<string, any>) => void;
  clearError: (errorCode?: string) => void;
  clearAllErrors: () => void;
  dismissError: () => void;
  
  // Error management
  retryLastAction: () => void;
  setRetryAction: (action: () => void) => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
  autoHideDelay?: number;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ 
  children, 
  maxErrors = 5,
  autoHideDelay = 5000 
}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    isVisible: false,
  });
  
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  // Subscribe to error handler events
  useEffect(() => {
    const unsubscribe = errorHandler.onError((error: ErrorDetails) => {
      setErrorState(prev => ({
        errors: [error, ...prev.errors].slice(0, maxErrors),
        isVisible: true,
      }));

      // Auto-hide low severity errors
      if (error.severity === 'low' && autoHideDelay > 0) {
        setTimeout(() => {
          clearError(error.code);
        }, autoHideDelay);
      }
    });

    return unsubscribe;
  }, [maxErrors, autoHideDelay]);

  const showError = useCallback((error: unknown, context?: Record<string, any>) => {
    const errorDetails = errorHandler.handleError(error, context);
    // Error is automatically added via the subscription above
  }, []);

  const clearError = useCallback((errorCode?: string) => {
    setErrorState(prev => {
      if (!errorCode) {
        // Clear the most recent error
        return {
          errors: prev.errors.slice(1),
          isVisible: prev.errors.length > 1,
        };
      }
      
      // Clear specific error by code
      const filteredErrors = prev.errors.filter(err => err.code !== errorCode);
      return {
        errors: filteredErrors,
        isVisible: filteredErrors.length > 0,
      };
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrorState({
      errors: [],
      isVisible: false,
    });
  }, []);

  const dismissError = useCallback(() => {
    setErrorState(prev => ({
      errors: prev.errors.slice(1),
      isVisible: prev.errors.length > 1,
    }));
  }, []);

  const retryLastAction = useCallback(() => {
    if (retryAction) {
      retryAction();
      setRetryAction(null);
    }
  }, [retryAction]);

  const setRetryActionCallback = useCallback((action: () => void) => {
    setRetryAction(() => action);
  }, []);

  const value: ErrorContextValue = {
    errors: errorState.errors,
    currentError: errorState.errors[0] || null,
    isErrorVisible: errorState.isVisible,
    showError,
    clearError,
    clearAllErrors,
    dismissError,
    retryLastAction,
    setRetryAction: setRetryActionCallback,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextValue => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Hook for handling async operations with error handling
export const useAsyncError = () => {
  const { showError, setRetryAction } = useError();

  const executeAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    retryable: boolean = true
  ): Promise<T | null> => {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      showError(error, context);
      
      if (retryable) {
        setRetryAction(operation);
      }
      
      return null;
    }
  }, [showError, setRetryAction]);

  return executeAsync;
};

// Hook for wrapping functions with error handling
export const useErrorHandler = () => {
  const { showError } = useError();

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    context?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        showError(error, context);
        return null;
      }
    };
  }, [showError]);

  return withErrorHandling;
};

// Utility function to create error boundaries for specific operations
export const createErrorBoundary = (context: Record<string, any>) => {
  return (error: unknown) => {
    errorHandler.handleError(error, context);
  };
};