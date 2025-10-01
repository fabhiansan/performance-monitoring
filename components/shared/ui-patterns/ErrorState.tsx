/**
 * ErrorState Component
 * 
 * Reusable error state component for displaying error messages and recovery actions.
 */

import React from 'react';
import { Alert, Button } from '../../../design-system';
import { IconSparkles } from '../Icons';

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Retry action */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Additional action */
  additionalAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Whether to show as a dismissible alert */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Custom className */
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  additionalAction,
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mb-6">
        <IconSparkles className="w-12 h-12 mx-auto text-red-500 opacity-50" />
      </div>
      
      <Alert
        variant="error"
        title={title}
        dismissible={dismissible}
        onDismiss={onDismiss}
        className="mb-6"
      >
        {message}
      </Alert>
      
      {(onRetry || additionalAction) && (
        <div className="flex gap-4 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              size="md"
            >
              {retryLabel}
            </Button>
          )}
          
          {additionalAction && (
            <Button
              onClick={additionalAction.onClick}
              variant={additionalAction.variant || 'outline'}
              size="md"
            >
              {additionalAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorState;
