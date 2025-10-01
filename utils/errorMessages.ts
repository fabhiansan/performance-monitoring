/**
 * Consistent error message formatting utilities
 */

export interface ErrorMessageOptions {
  context?: string;
  action?: string;
  suggestions?: string[];
  userFriendly?: boolean;
}

export class ErrorMessageFormatter {
  /**
   * Format network errors with consistent messaging
   */
  static formatNetworkError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', action = 'connect to server', userFriendly = true } = options;
    
    if (userFriendly) {
      return `Tidak dapat ${action}. Periksa koneksi Anda lalu coba lagi.${context ? ` (${context})` : ''}`;
    }
    
    return `Network error while attempting to ${action}${context ? ` in ${context}` : ''}: ${error instanceof Error ? error.message : 'Unknown network error'}`;
  }

  /**
   * Format validation errors with helpful suggestions
   */
  static formatValidationError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', userFriendly = true, suggestions = [] } = options;
    
    let message = error instanceof Error ? error.message : 'Validasi gagal';
    
    if (userFriendly) {
      // Make validation messages more user-friendly
      message = message
        .replace(/validation/gi, 'data validation')
        .replace(/invalid/gi, 'incorrect')
        .replace(/required/gi, 'missing required information');
    }
    
    if (context) {
      message += ` in ${context}`;
    }
    
    if (suggestions.length > 0) {
      message += '\n\nSaran:\n' + suggestions.map(s => `• ${s}`).join('\n');
    }
    
    return message;
  }

  /**
   * Format parsing errors with data format guidance
   */
  static formatParsingError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', userFriendly = true } = options;
    
    let message = error instanceof Error ? error.message : 'Gagal memproses data';
    
    if (userFriendly) {
      if (message.includes('CSV') || message.includes('csv')) {
        message = 'Terjadi masalah saat memproses data CSV Anda. Periksa formatnya lalu coba lagi.';
      } else if (message.includes('JSON') || message.includes('json')) {
        message = 'Format data tampaknya tidak valid. Periksa berkas Anda lalu coba lagi.';
      } else if (message.includes('header')) {
        message = 'Header data hilang atau tidak valid. Pastikan baris pertama berisi header kolom yang benar.';
      }
    }
    
    if (context) {
      message += ` (${context})`;
    }
    
    return message;
  }

  /**
   * Format server errors with appropriate user messaging
   */
  static formatServerError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', action = 'process your request', userFriendly = true } = options;
    
    if (userFriendly) {
      return `Server sementara tidak dapat ${action}. Silakan coba lagi sebentar lagi.${context ? ` (${context})` : ''}`;
    }
    
    return `Server error while attempting to ${action}${context ? ` in ${context}` : ''}: ${error instanceof Error ? error.message : 'Unknown server error'}`;
  }

  /**
   * Format permission errors
   */
  static formatPermissionError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', action = 'perform this action', userFriendly = true } = options;
    
    if (userFriendly) {
      return `Anda tidak memiliki izin untuk ${action}.${context ? ` (${context})` : ''} Hubungi administrator jika memerlukan akses.`;
    }
    
    return `Permission denied while attempting to ${action}${context ? ` in ${context}` : ''}: ${error instanceof Error ? error.message : 'Access denied'}`;
  }

  /**
   * Format generic errors with context
   */
  static formatGenericError(error: unknown, options: ErrorMessageOptions = {}): string {
    const { context = '', action = '', userFriendly = true } = options;
    
    let message = error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga';
    
    if (userFriendly) {
      // Make technical messages more user-friendly
      message = message
        .replace(/fetch/gi, 'mengambil data')
        .replace(/undefined/gi, 'informasi tidak tersedia')
        .replace(/null/gi, 'data tidak tersedia');
    }
    
    if (action) {
      message = `Gagal ${action}: ${message}`;
    }
    
    if (context) {
      message += ` (${context})`;
    }
    
    return message;
  }

  /**
   * Get appropriate suggestions based on error type and context
   */
  static getSuggestions(errorType: string, context?: string): string[] {
    const suggestions: string[] = [];
    
    switch (errorType.toLowerCase()) {
      case 'network':
        suggestions.push(
          'Periksa koneksi internet Anda',
          'Pastikan server sedang berjalan',
          'Coba muat ulang halaman'
        );
        break;
        
      case 'validation':
        if (context?.includes('csv') || context?.includes('data')) {
          suggestions.push(
            'Periksa format file CSV Anda',
            'Pastikan semua kolom wajib terisi',
            'Pastikan nama pegawai berada dalam tanda kurung siku [Nama]'
          );
        } else {
          suggestions.push(
            'Pastikan seluruh kolom wajib terisi',
            'Pastikan format data sudah benar',
            'Coba lagi dengan informasi yang valid'
          );
        }
        break;
        
      case 'parsing':
        suggestions.push(
          'Ensure your file has proper headers',
          'Check for missing or extra commas',
          'Verify the file is not corrupted'
        );
        break;
        
      case 'server':
        suggestions.push(
          'Try again in a few moments',
          'Contact support if the issue persists',
          'Check if the server is running'
        );
        break;
        
      case 'permission':
        suggestions.push(
          'Contact an administrator',
          'Check your user permissions',
          'Try logging out and back in'
        );
        break;
        
      default:
        suggestions.push(
          'Try refreshing the page',
          'Check your connection',
          'Contact support if the issue persists'
        );
    }
    
    return suggestions;
  }
}

/**
 * Quick formatting functions for common use cases
 */
export const formatError = {
  network: (error: unknown, context?: string) => 
    ErrorMessageFormatter.formatNetworkError(error, { ...(context ? { context } : {}), userFriendly: true }),
    
  validation: (error: unknown, context?: string, suggestions?: string[]) => 
    ErrorMessageFormatter.formatValidationError(error, { ...(context ? { context } : {}), userFriendly: true, ...(suggestions ? { suggestions } : {}) }),
    
  parsing: (error: unknown, context?: string) => 
    ErrorMessageFormatter.formatParsingError(error, { ...(context ? { context } : {}), userFriendly: true }),
    
  server: (error: unknown, context?: string) => 
    ErrorMessageFormatter.formatServerError(error, { ...(context ? { context } : {}), userFriendly: true }),
    
  permission: (error: unknown, context?: string) => 
    ErrorMessageFormatter.formatPermissionError(error, { ...(context ? { context } : {}), userFriendly: true }),
    
  generic: (error: unknown, context?: string) => 
    ErrorMessageFormatter.formatGenericError(error, { ...(context ? { context } : {}), userFriendly: true }),
};
