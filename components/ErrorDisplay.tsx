import React from 'react';
import { ErrorDetails } from '../services/errorHandler';
import { useError } from '../contexts/ErrorContext';

interface ErrorDisplayProps {
  className?: string;
  showDismiss?: boolean;
  showRetry?: boolean;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  className = '',
  showDismiss = true,
  showRetry = true,
  compact = false,
}) => {
  const { currentError, dismissError, retryLastAction, errors } = useError();

  if (!currentError) {
    return null;
  }

  const getSeverityStyles = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 text-yellow-700 dark:text-yellow-300';
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-900/50 border-orange-500 text-orange-700 dark:text-orange-300';
      case 'high':
        return 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-700 dark:text-red-300';
      case 'critical':
        return 'bg-red-200 dark:bg-red-900/70 border-red-600 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900/50 border-gray-500 text-gray-700 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'low':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
      case 'high':
      case 'critical':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getCategoryLabel = (category: ErrorDetails['category']) => {
    switch (category) {
      case 'network': return 'Connection Error';
      case 'validation': return 'Validation Error';
      case 'parsing': return 'Data Processing Error';
      case 'server': return 'Server Error';
      case 'permission': return 'Permission Error';
      default: return 'Error';
    }
  };

  if (compact) {
    return (
      <div className={`border-l-4 p-3 rounded-lg ${getSeverityStyles(currentError.severity)} ${className}`} role="alert">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getSeverityIcon(currentError.severity)}
            <span className="ml-2 font-medium">{currentError.userMessage}</span>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {currentError.retryable && showRetry && (
              <button
                onClick={retryLastAction}
                className="text-sm underline hover:no-underline"
              >
                Retry
              </button>
            )}
            {showDismiss && (
              <button
                onClick={dismissError}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 p-4 rounded-lg ${getSeverityStyles(currentError.severity)} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {getSeverityIcon(currentError.severity)}
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-bold">
                {getCategoryLabel(currentError.category)}
              </p>
              <p className="mt-1">{currentError.userMessage}</p>
              
              {currentError.suggestions && currentError.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-sm">Suggestions:</p>
                  <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                    {currentError.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {currentError.context && Object.keys(currentError.context).length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details
                  </summary>
                  <div className="mt-2 text-xs bg-black bg-opacity-10 p-2 rounded">
                    <p><strong>Code:</strong> {currentError.code}</p>
                    <p><strong>Time:</strong> {currentError.timestamp.toLocaleString()}</p>
                    {currentError.context.component && (
                      <p><strong>Component:</strong> {currentError.context.component}</p>
                    )}
                    {currentError.context.operation && (
                      <p><strong>Operation:</strong> {currentError.context.operation}</p>
                    )}
                  </div>
                </details>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {currentError.retryable && showRetry && (
                <button
                  onClick={retryLastAction}
                  className="px-3 py-1 text-sm border border-current rounded hover:bg-current hover:bg-opacity-10 transition-colors"
                >
                  Retry
                </button>
              )}
              {showDismiss && (
                <button
                  onClick={dismissError}
                  className="px-3 py-1 text-sm border border-current rounded hover:bg-current hover:bg-opacity-10 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
          
          {errors.length > 1 && (
            <div className="mt-3 text-sm">
              <p>
                {errors.length - 1} more error{errors.length > 2 ? 's' : ''} occurred.{' '}
                <button
                  onClick={() => {/* Show error history */}}
                  className="underline hover:no-underline"
                >
                  View all
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;