import { createNetworkError, createServerError, createValidationError, AppError } from '../../errorHandler';
import { logger } from '../../logger';
import { ApiResponse, ApiClientConfig, RequestContext, ERROR_MESSAGES } from '../interfaces/ApiInterfaces';

export class BaseApiClient {
  protected baseUrl: string;
  protected useStandardizedFormat: boolean;
  protected timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.useStandardizedFormat = config.useStandardizedFormat;
    this.timeout = config.timeout || 30000;
  }

  // Method to toggle between legacy and standardized response formats
  setResponseFormat(useStandardized: boolean): void {
    this.useStandardizedFormat = useStandardized;
  }

  // Helper method to add appropriate headers for API version
  protected getRequestHeaders(additionalHeaders: Record<string, string> = {}, includeContentType: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      ...(includeContentType && { 'Content-Type': 'application/json' }),
      ...additionalHeaders
    };
    
    if (this.useStandardizedFormat) {
      headers['Accept-API-Version'] = '2.0';
    }
    
    return headers;
  }

  // Helper method to extract data from standardized or legacy response
  protected extractResponseData<T>(responseData: ApiResponse<T> | T): T {
    // Check if it's a standardized response format
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      const standardizedResponse = responseData as ApiResponse<T>;
      if (standardizedResponse.success) {
        return standardizedResponse.data as T;
      } else {
        // Handle standardized error format
        const errorMessage = standardizedResponse.message || 'An error occurred';
        const errorCode = standardizedResponse.metadata?.error?.code || 'UNKNOWN_ERROR';
        const errorDetails = standardizedResponse.metadata?.error?.details;
        
        throw new AppError(errorMessage, {
          code: errorCode,
          userMessage: errorMessage,
          context: { errorDetails },
          retryable: standardizedResponse.metadata?.error?.retryable || false
        });
      }
    }
    
    // Handle legacy response format
    return responseData as T;
  }

  // Core HTTP method for consistent error handling
  protected async handleApiCall<T>(
    operation: () => Promise<Response>,
    context: RequestContext
  ): Promise<T> {
    try {
      const response = await operation();
      
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ error: ERROR_MESSAGES.UNKNOWN_ERROR }));
        
        // Handle standardized error responses
        if (responseData && typeof responseData === 'object' && 'success' in responseData && !responseData.success) {
          const errorMessage = responseData.message || 'An error occurred';
          const errorCode = responseData.metadata?.error?.code || 'UNKNOWN_ERROR';
          const errorDetails = responseData.metadata?.error?.details;
          
          throw new AppError(errorMessage, {
            code: errorCode,
            userMessage: errorMessage,
            context: { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status,
                errorDetails
              }
            },
            retryable: responseData.metadata?.error?.retryable || false
          });
        }
        
        // Handle legacy error responses
        const errorText = responseData.error || responseData.message || 'Unknown error';
        
        if (response.status >= 500) {
          throw createServerError(
            `Server error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        } else if (response.status >= 400) {
          throw createValidationError(
            `Request error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        } else {
          throw createNetworkError(
            `HTTP error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        }
      }

      const responseData = await response.json();
      return this.extractResponseData<T>(responseData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle network/fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw createNetworkError(
          'Failed to connect to server. Please check your connection.',
          { 
            operation: context.operation,
            additionalData: {
              endpoint: context.endpoint,
              originalError: error.message
            }
          }
        );
      }
      
      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw createServerError(
          'Invalid response from server',
          { 
            operation: context.operation,
            additionalData: {
              endpoint: context.endpoint,
              originalError: error.message
            }
          }
        );
      }
      
      // Re-throw unknown errors with context
      throw new AppError(error instanceof Error ? error.message : 'Unknown error', {
        code: 'UNKNOWN_API_ERROR',
        userMessage: 'An unexpected error occurred while communicating with the server',
        severity: 'medium',
        category: 'unknown',
        context: { 
          operation: context.operation,
          additionalData: {
            endpoint: context.endpoint
          }
        },
        ...(error instanceof Error ? { cause: error } : {}),
      });
    }
  }

  // Core HTTP methods
  async get<T>(endpoint: string, context: RequestContext): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      return await this.handleApiCall<T>(
        () => fetch(`${this.baseUrl}${endpoint}`, {
          headers: this.getRequestHeaders(),
          signal: context.signal || controller.signal
        }),
        { ...context, endpoint }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post<T>(endpoint: string, data: unknown, context: RequestContext): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      return await this.handleApiCall<T>(
        () => fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.getRequestHeaders(),
          body: JSON.stringify(data),
          signal: context.signal || controller.signal
        }),
        { ...context, endpoint }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async put<T>(endpoint: string, data: unknown, context: RequestContext): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      return await this.handleApiCall<T>(
        () => fetch(`${this.baseUrl}${endpoint}`, {
          method: 'PUT',
          headers: this.getRequestHeaders(),
          body: JSON.stringify(data),
          signal: context.signal || controller.signal
        }),
        { ...context, endpoint }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async delete<T>(endpoint: string, context: RequestContext): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      return await this.handleApiCall<T>(
        () => fetch(`${this.baseUrl}${endpoint}`, {
          method: 'DELETE',
          headers: this.getRequestHeaders({}, false),
          signal: context.signal || controller.signal
        }),
        { ...context, endpoint }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Health check method (used by multiple clients)
  async checkHealth(): Promise<boolean> {
    try {
      // Try the Electron-specific health endpoint first
      const response = await fetch('http://localhost:3002/health');
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Don't throw for first attempt, just log
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Electron health check failed', { error: message });
    }
    
    // Fallback to API health endpoint
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      // Don't throw for health check, just return false
      const message = error instanceof Error ? error.message : String(error);
      logger.error('API health check failed', { error: message });
      return false;
    }
  }
}
