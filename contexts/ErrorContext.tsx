import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ErrorDetails, errorHandler } from '../services/errorHandler';

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
  showError: (_error: unknown, _context?: Record<string, unknown>) => void;
  clearError: (_errorCode?: string) => void;
  clearAllErrors: () => void;
  dismissError: () => void;
  
  // Error management
  retryLastAction: () => void;
  setRetryAction: (_action: () => void) => void;
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

  const showError = useCallback((error: unknown, context?: Record<string, unknown>) => {
    errorHandler.handleError(error, context);
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

  // Subscribe to error handler events
  useEffect(() => {
    return errorHandler.onError((error: ErrorDetails) => {
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
  }, [maxErrors, autoHideDelay, clearError]);

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
    setRetryAction(action);
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
