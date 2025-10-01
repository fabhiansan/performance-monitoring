import { logger } from './logger';

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'parsing' | 'server' | 'permission' | 'unknown';
  timestamp: Date;
  context?: Record<string, unknown>;
  retryable: boolean;
  actionable: boolean;
  suggestions?: string[];
}

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, unknown>;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly severity: ErrorDetails['severity'];
  public readonly category: ErrorDetails['category'];
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly actionable: boolean;
  public readonly suggestions: string[];
  public cause?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      userMessage?: string;
      severity?: ErrorDetails['severity'];
      category?: ErrorDetails['category'];
      context?: Record<string, unknown>;
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
  private errorListeners: Array<(_error: ErrorDetails) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Subscribe to error events
  onError(listener: (_error: ErrorDetails) => void): () => void {
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
      message: 'Terjadi kesalahan yang tidak diketahui',
      userMessage: 'Terjadi kesalahan. Silakan coba lagi.',
      severity: 'medium',
      category: 'unknown',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: ['Silakan muat ulang halaman lalu coba lagi'],
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
      userMessage: 'Terjadi kesalahan. Silakan coba lagi.',
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
      userMessage: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      severity: 'high',
      category: 'network',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: [
        'Periksa koneksi internet Anda',
        'Pastikan server sedang berjalan',
        'Coba muat ulang halaman',
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
      userMessage: 'Terjadi masalah saat memproses data Anda.',
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
      userMessage: 'Server sedang mengalami gangguan. Silakan coba lagi nanti.',
      severity: 'high',
      category: 'server',
      timestamp: new Date(),
      context: context || {},
      retryable: true,
      actionable: true,
      suggestions: [
        'Coba lagi beberapa saat lagi',
        'Hubungi tim dukungan jika masalah berlanjut',
      ],
    };
  }

  private createPermissionError(error: Error, context?: ErrorContext): ErrorDetails {
    return {
      code: 'PERMISSION_ERROR',
      message: error.message,
      userMessage: 'Anda tidak memiliki izin untuk melakukan aksi ini.',
      severity: 'medium',
      category: 'permission',
      timestamp: new Date(),
      context: context || {},
      retryable: false,
      actionable: true,
      suggestions: [
        'Periksa hak akses Anda',
        'Hubungi administrator',
      ],
    };
  }

  // Message formatting helpers
  private formatValidationMessage(message: string): string {
    if (message.includes('required')) {
      return 'Silakan isi seluruh kolom yang wajib diisi.';
    }
    if (message.includes('invalid')) {
      return 'Periksa kembali masukan Anda lalu coba lagi.';
    }
    if (message.includes('format')) {
      return 'Periksa format data Anda.';
    }
    return message;
  }

  private getValidationSuggestions(message: string): string[] {
    const suggestions: string[] = [];
    
    if (message.includes('csv') || message.includes('format')) {
      suggestions.push('Pastikan file CSV memiliki header yang benar');
      suggestions.push('Periksa jika ada koma yang hilang atau berlebih');
      suggestions.push('Pastikan nama pegawai berada dalam tanda kurung siku [Nama]');
    }
    
    if (message.includes('employee') || message.includes('name')) {
      suggestions.push('Periksa kembali ejaan nama pegawai');
      suggestions.push('Pastikan nama sesuai dengan data pegawai di sistem');
    }
    
    return suggestions.length > 0 ? suggestions : ['Periksa kembali masukan Anda lalu coba lagi'];
  }

  private getParsingSuggestions(message: string): string[] {
    const suggestions: string[] = [];
    
    if (message.includes('header')) {
      suggestions.push('Pastikan baris pertama berisi header kolom');
      suggestions.push('Header harus memuat nama pegawai dalam kurung siku, misalnya: "Kompetensi [Nama Pegawai]"');
    }
    
    if (message.includes('score') || message.includes('numeric')) {
      suggestions.push('Pastikan setiap baris berisi skor numerik (10, 65, 75, dst.)');
      suggestions.push('Penilaian teks yang didukung: "Baik" (75), "Sangat Baik" (85), "Kurang Baik" (65)');
      suggestions.push('Periksa apakah ada nilai yang hilang atau tidak valid pada kolom skor');
    }
    
    if (message.includes('format')) {
      suggestions.push('Format yang didukung: CSV standar dengan nilai bertanda kutip');
      suggestions.push('Beberapa baris penilaian per pegawai didukung');
    }
    
    return suggestions.length > 0 ? suggestions : ['Periksa kembali format data Anda'];
  }

  // Logging
  private logError(error: ErrorDetails): void {
    const logMessage = `[${error.category.toUpperCase()}] ${error.code}: ${error.message}`;
    
    switch (error.severity) {
      case 'low':
        logger.debug(logMessage, {
          timestamp: error.timestamp,
          context: error.context,
          suggestions: error.suggestions,
        });
        break;
      case 'medium':
        logger.warn(logMessage, {
          timestamp: error.timestamp,
          context: error.context,
          suggestions: error.suggestions,
        });
        break;
      case 'high':
      case 'critical':
        logger.error(logMessage, {
          timestamp: error.timestamp,
          context: error.context,
          suggestions: error.suggestions,
        });
        break;
      default:
        logger.info(logMessage, {
          timestamp: error.timestamp,
          context: error.context,
          suggestions: error.suggestions,
        });
    }
  }

  // Notification
  private notifyListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        logger.error('Error in error listener', { 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    });
  }
}

// Factory functions for common errors
export const createNetworkError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'NETWORK_ERROR',
    userMessage: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
    severity: 'high',
    category: 'network',
    retryable: true,
    suggestions: [
      'Periksa koneksi internet Anda',
      'Pastikan server sedang berjalan',
      'Coba muat ulang halaman',
    ],
    context,
  });
};

export const createValidationError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'VALIDATION_ERROR',
    userMessage: 'Periksa kembali masukan Anda lalu coba lagi.',
    severity: 'low',
    category: 'validation',
    retryable: false,
    context,
  });
};

export const createParsingError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'PARSING_ERROR',
    userMessage: 'Terjadi masalah saat memproses data Anda.',
    severity: 'medium',
    category: 'parsing',
    retryable: false,
    context,
  });
};

export const createServerError = (message: string, context?: ErrorContext): AppError => {
  return new AppError(message, {
    code: 'SERVER_ERROR',
    userMessage: 'Server sedang mengalami gangguan. Silakan coba lagi nanti.',
    severity: 'high',
    category: 'server',
    retryable: true,
    suggestions: [
      'Coba lagi beberapa saat lagi',
      'Hubungi tim dukungan jika masalah berlanjut',
    ],
    context,
  });
};

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();
