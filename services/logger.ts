export enum LogLevel {
  _DEBUG = 0,
  _INFO = 1,
  _WARN = 2,
  _ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel._INFO;
  private isDevelopment: boolean;

  constructor() {
    // Handle both Vite (import.meta.env) and Node.js (process.env) environments
    this.isDevelopment = this.getEnvironmentMode() !== 'production';
    this.setLevelFromEnvironment();
  }

  private getEnvironmentMode(): string {
    // Check if we're in a Vite environment (browser/frontend)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.MODE || 'development';
    }
    // Fallback to Node.js environment (server/backend)
    return process.env.NODE_ENV || 'development';
  }

  private getLogLevel(): string | undefined {
    // Check if we're in a Vite environment (browser/frontend)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_LOG_LEVEL;
    }
    // Fallback to Node.js environment (server/backend)
    return process.env.VITE_LOG_LEVEL || process.env.LOG_LEVEL;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setLevelFromEnvironment(): void {
    const envLevel = this.getLogLevel()?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG': this.level = LogLevel._DEBUG; break;
      case 'INFO': this.level = LogLevel._INFO; break;
      case 'WARN': this.level = LogLevel._WARN; break;
      case 'ERROR': this.level = LogLevel._ERROR; break;
      default: this.level = this.isDevelopment ? LogLevel._DEBUG : LogLevel._INFO;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>, source?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const sourcePrefix = source ? `[${source}] ` : '';
    const contextSuffix = context ? ` ${JSON.stringify(context)}` : '';
    
    return `${timestamp} [${levelName}] ${sourcePrefix}${message}${contextSuffix}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, source?: string): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context, source);

    // In development, use console for immediate feedback
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel._DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel._INFO:
          console.info(formattedMessage);
          break;
        case LogLevel._WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel._ERROR:
          console.error(formattedMessage);
          break;
      }
    } else {
      // In production, only log errors and warnings to console
      if (level >= LogLevel._WARN) {
        if (level === LogLevel._ERROR) {
          console.error(formattedMessage);
        } else {
          console.warn(formattedMessage);
        }
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel._DEBUG, message, context, source);
  }

  info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel._INFO, message, context, source);
  }

  warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel._WARN, message, context, source);
  }

  error(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel._ERROR, message, context, source);
  }

  // Convenience methods for common patterns
  database(message: string, context?: Record<string, unknown>): void {
    this.info(message, context, 'DATABASE');
  }

  api(message: string, context?: Record<string, unknown>): void {
    this.info(message, context, 'API');
  }

  validation(message: string, context?: Record<string, unknown>): void {
    this.debug(message, context, 'VALIDATION');
  }

  performance(message: string, context?: Record<string, unknown>): void {
    this.debug(message, context, 'PERFORMANCE');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions that match console API
export const logDebug = (message: string, context?: Record<string, unknown>, source?: string) => 
  logger.debug(message, context, source);

export const logInfo = (message: string, context?: Record<string, unknown>, source?: string) => 
  logger.info(message, context, source);

export const logWarn = (message: string, context?: Record<string, unknown>, source?: string) => 
  logger.warn(message, context, source);

export const logError = (message: string, context?: Record<string, unknown>, source?: string) => 
  logger.error(message, context, source);