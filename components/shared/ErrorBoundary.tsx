import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error', { 
      error: _error.message, 
      stack: _error.stack,
      componentStack: _errorInfo.componentStack 
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(_error, _errorInfo);
    }

    this.setState({ errorInfo: _errorInfo });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary min-h-[200px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-red-600 mb-4">
              An unexpected error occurred in this section of the application.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-red-100 border border-red-300 rounded p-3 mb-4">
                <summary className="cursor-pointer font-medium text-red-800 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="space-x-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specialized error boundary for async operations
interface AsyncErrorBoundaryState extends State {
  isRetrying: boolean;
}

export class AsyncErrorBoundary extends Component<Props, AsyncErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    logger.error('AsyncErrorBoundary caught an error', { 
      error: _error.message, 
      stack: _error.stack,
      componentStack: _errorInfo.componentStack 
    });

    if (this.props.onError) {
      this.props.onError(_error, _errorInfo);
    }

    this.setState({ errorInfo: _errorInfo });
  }

  private handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });
    
    // Give a moment for the UI to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined, 
      isRetrying: false 
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="async-error-boundary min-h-[150px] flex items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-2">
          <div className="text-center">
            <div className="text-yellow-600 text-2xl mb-2">🔄</div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">
              Operation Failed
            </h3>
            <p className="text-yellow-700 text-sm mb-3">
              There was an error processing your request.
            </p>
            
            <button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              className={`px-3 py-2 text-sm rounded transition-colors ${
                this.state.isRetrying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {this.state.isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
