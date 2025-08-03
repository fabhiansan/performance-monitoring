export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'parsing' | 'server' | 'permission' | 'unknown';
  timestamp: Date;
  context?: Record<string, any>;
  retryable: boolean;
  actionable: boolean;
  suggestions?: string[];
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly severity: ErrorDetails['severity'];
  public readonly category: ErrorDetails['category'];
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;
  public readonly retryable: boolean;
  public readonly actionable: boolean;
  public readonly suggestions: string[];

  constructor(
    message: string,
    options: {
      code?: string;
      userMessage?: string;
      severity?: ErrorDetails['severity'];
      category?: ErrorDetails['category'];
      context?: Record<string, any>;
      retryable?: boolean;
      actionable?: boolean;
      suggestions?: string[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.userMessage = options.userMessage || 'An unexpected error occurred';
    this.severity = options.severity || 'medium';
    this.category = options.category || 'unknown';
    this.timestamp = new Date();
    this.context = options.context || {};
    this.retryable = options.retryable ?? false;
    this.actionable = options.actionable ?? true;
    this.suggestions = options.suggestions || [];

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toDetails(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp,
      context: this.context,
      retryable: this.retryable,
      actionable: this.actionable,
      suggestions: this.suggestions,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: ErrorDetails) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Subscribe to error events
  onError(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Handle different types of errors
  handleError(error: unknown, context?: ErrorContext): ErrorDetails {
    const errorDetails = this.processError(error, context);
    this.logError(errorDetails);
    this.notifyListeners(errorDetails);
    return errorDetails;
  }

  // Process and classify errors
  private processError(error: unknown, context?: ErrorContext): ErrorDetails {
    if (error instanceof AppError) {
      return {
        ...error.toDetails(),
        context: { ...error.context, ...context },
      };
    }

    if (error instanceof Error) {
      return this.classifyError(error, context);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        code: 'STRING_ERROR',
        message: error,
        userMessage: error,
        severity: 'medium',
        category: 'unknown',
        timestamp: new Date(),
        context: context || {},
        retryable: false,
        actionable: true,
      };
    }

    // Handle unknown error types
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      userMessage: 'Something went wrong. Please try again.',
      severity: 'medium',
      category: 'unknown',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: ['Please refresh the page and try again'],
    };
  }

  // Classify standard JavaScript errors
  private classifyError(error: Error, context?: ErrorContext): ErrorDetails {
    const message = error.message;
    const lowerMessage = message.toLowerCase();

    // Network errors
    if (this.isNetworkError(lowerMessage)) {
      return this.createNetworkError(error, context);
    }

    // Validation errors
    if (this.isValidationError(lowerMessage)) {
      return this.createValidationError(error, context);
    }

    // Parsing errors
    if (this.isParsingError(lowerMessage)) {
      return this.createParsingError(error, context);
    }

    // Server errors
    if (this.isServerError(lowerMessage)) {
      return this.createServerError(error, context);
    }

    // Permission errors
    if (this.isPermissionError(lowerMessage)) {
      return this.createPermissionError(error, context);
    }

    // Generic error
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      userMessage: 'An error occurred. Please try again.',
      severity: 'medium',
      category: 'unknown',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
    };
  }

  // Error type detection methods
  private isNetworkError(message: string): boolean {
    return /^(fetch|network|connection|timeout|cors)/i.test(message) ||
           message.includes('failed to fetch') ||
           message.includes('network error') ||
           message.includes('connection refused');
  }

  private isValidationError(message: string): boolean {
    return message.includes('validation') ||
           message.includes('invalid') ||
           message.includes('required') ||
           message.includes('missing') ||
           message.includes('format');
  }

  private isParsingError(message: string): boolean {
    return message.includes('parsing') ||
           message.includes('parse') ||
           message.includes('csv') ||
           message.includes('format') ||
           message.includes('header');
  }

  private isServerError(message: string): boolean {
    return message.includes('server') ||
           message.includes('api') ||
           message.includes('database') ||
           message.includes('500') ||
           message.includes('503');
  }

  private isPermissionError(message: string): boolean {
    return message.includes('permission') ||
           message.includes('unauthorized') ||
           message.includes('forbidden') ||
           message.includes('403') ||
           message.includes('401');
  }

  // Error creation methods
  private createNetworkError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      userMessage: 'Unable to connect to the server. Please check your connection.',
      severity: 'high',
      category: 'network',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: [
        'Check your internet connection',
        'Verify the server is running',
        'Try refreshing the page',
      ],
    };
  }

  private createValidationError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      userMessage: this.formatValidationMessage(error.message),
      severity: 'low',
      category: 'validation',
      timestamp: new Date(),
      context: context || {},
      retryable: false,
      actionable: true,
      suggestions: this.getValidationSuggestions(error.message),
    };
  }

  private createParsingError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'PARSING_ERROR',
      message: error.message,
      userMessage: 'There was an issue processing your data.',
      severity: 'medium',
      category: 'parsing',
      timestamp: new Date(),
      context: context || {},
      retryable: false,
      actionable: true,
      suggestions: this.getParsingSuggestions(error.message),
    };
  }

  private createServerError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'SERVER_ERROR',
      message: error.message,
      userMessage: 'Server is experiencing issues. Please try again later.',
      severity: 'high',
      category: 'server',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: [
        'Try again in a few moments',
        'Contact support if the issue persists',
      ],
    };
  }

  private createPermissionError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'PERMISSION_ERROR',
      message: error.message,
      userMessage: 'You do not have permission to perform this action.',
      severity: 'medium',
      category: 'permission',
      timestamp: new Date(),
      context: context || {},
      retryable: false,
      actionable: true,
      suggestions: [
        'Check your permissions',
        'Contact an administrator',
      ],
    };
  }

  // Message formatting helpers
  private formatValidationMessage(message: string): string {
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    if (message.includes('invalid')) {
      return 'Please check your input and try again.';
    }
    if (message.includes('format')) {
      return 'Please check the format of your data.';
    }
    return message;
  }

  private getValidationSuggestions(message: string): string[] {
    const suggestions: string[] = [];
    
    if (message.includes('csv') || message.includes('format')) {
      suggestions.push('Ensure your CSV file has proper headers');
      suggestions.push('Check for missing or extra commas');
      suggestions.push('Verify employee names are in brackets [Name]');
    }
    
    if (message.includes('employee') || message.includes('name')) {
      suggestions.push('Check employee names for typos');
      suggestions.push('Ensure names match the employee database');
    }
    
    return suggestions.length > 0 ? suggestions : ['Please check your input and try again'];
  }

  private getParsingSuggestions(message: string): string[] {
    const suggestions: string[] = [];
    
    if (message.includes('header')) {
      suggestions.push('Ensure the first row contains column headers');
      suggestions.push('Headers should include employee names in brackets like: "Competency [Employee Name]"');
    }
    
    if (message.includes('score') || message.includes('numeric')) {
      suggestions.push('Ensure data rows contain numeric scores (10, 65, 75, etc.)');
      suggestions.push('Supported string ratings: "Baik" (75), "Sangat Baik" (85), "Kurang Baik" (65)');
      suggestions.push('Check for missing or invalid values in score columns');
    }
    
    if (message.includes('format')) {
      suggestions.push('Supported formats: Standard CSV with quoted fields');
      suggestions.push('Multiple assessment rows per employee are supported');
    }
    
    return suggestions.length > 0 ? suggestions : ['Please check your data format'];
  }

  // Logging
  private logError(error: ErrorDetails): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category.toUpperCase()}] ${error.code}: ${error.message}`;
    
    console[logLevel](logMessage, {
      timestamp: error.timestamp,
      context: error.context,
      suggestions: error.suggestions,
    });
  }

  private getLogLevel(severity: ErrorDetails['severity']): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low': return 'log';
      case 'medium': return 'warn';
      case 'high':
      case 'critical': return 'error';
      default: return 'log';
    }
  }

  // Notification
  private notifyListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }
}

// Factory functions for common errors
export const createNetworkError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'NETWORK_ERROR',
    userMessage: 'Unable to connect to the server. Please check your connection.',
    severity: 'high',
    category: 'network',
    retryable: true,
    suggestions: [
      'Check your internet connection',
      'Verify the server is running',
      'Try refreshing the page',
    ],
    context,
  });
};

export const createValidationError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'VALIDATION_ERROR',
    userMessage: 'Please check your input and try again.',
    severity: 'low',
    category: 'validation',
    retryable: false,
    context,
  });
};

export const createParsingError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'PARSING_ERROR',
    userMessage: 'There was an issue processing your data.',
    severity: 'medium',
    category: 'parsing',
    retryable: false,
    context,
  });
};

export const createServerError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'SERVER_ERROR',
    userMessage: 'Server is experiencing issues. Please try again later.',
    severity: 'high',
    category: 'server',
    retryable: true,
    suggestions: [
      'Try again in a few moments',
      'Contact support if the issue persists',
    ],
    context,
  });
};

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();