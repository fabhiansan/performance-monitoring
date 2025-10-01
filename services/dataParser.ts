import { type CompetencyScore, type Employee } from '../types';
import { logger } from './logger';

export interface ParseOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  skipCorruptedRecords: boolean;
  maxRecoveryAttempts: number;
}

export interface ParseResult {
  success: boolean;
  data?: Employee[];
  errors: string[];
  warnings: string[];
  recordsProcessed: number;
  recordsRecovered: number;
}

/**
 * Service responsible for parsing and cleaning employee performance data
 */
export class DataParserService {
  private defaultOptions: ParseOptions = {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false,
    maxRecoveryAttempts: 3
  };

  /**
   * Parse JSON performance data with error recovery
   */
  async parsePerformanceData(
    jsonString: string, 
    options: Partial<ParseOptions> = {}
  ): Promise<ParseResult> {
    const opts = { ...this.defaultOptions, ...options };
    let attempts = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.debug('Starting performance data parsing', {
      dataLength: jsonString.length,
      options: opts
    });

    while (attempts < opts.maxRecoveryAttempts) {
      attempts++;
      
      try {
        logger.debug('Parse attempt', { attempt: attempts });
        
        let data: unknown;
        
        if (attempts === 1) {
          // First attempt: direct parsing
          data = JSON.parse(jsonString);
        } else if (attempts === 2) {
          // Second attempt: fix common issues
          const fixedJson = this.fixCommonJsonIssues(jsonString);
          data = JSON.parse(fixedJson);
        } else {
          // Third attempt: fallback parsing
          data = this.fallbackJsonParsing(jsonString);
        }

        if (data && Array.isArray(data)) {
          const cleanedData = this.cleanAndNormalizeData(data, opts);
          
          logger.info('Performance data parsed successfully', {
            attempts,
            recordsProcessed: data.length,
            recordsRetained: cleanedData.length,
            recordsRecovered: data.length - cleanedData.length
          });

          return {
            success: true,
            data: cleanedData,
            errors,
            warnings,
            recordsProcessed: data.length,
            recordsRecovered: data.length - cleanedData.length
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Attempt ${attempts}: ${errorMessage}`);
        
        logger.debug('Parse attempt failed', {
          attempt: attempts,
          error: errorMessage
        });
      }
    }

    logger.error('All parse attempts failed', {
      totalAttempts: attempts,
      errors
    });

    return {
      success: false,
      errors,
      warnings,
      recordsProcessed: 0,
      recordsRecovered: 0
    };
  }

  /**
   * Fix common JSON formatting issues
   */
  private fixCommonJsonIssues(jsonString: string): string {
    logger.debug('Applying common JSON fixes');
    
    return jsonString
      // Fix missing quotes around property names
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix single quotes
      .replace(/'/g, '"')
      // Fix undefined values
      .replace(/:\s*undefined/g, ': null')
      // Fix NaN values
      .replace(/:\s*NaN/g, ': null');
  }

  /**
   * Last resort: extract data using regex patterns
   */
  private fallbackJsonParsing(jsonString: string): Record<string, unknown>[] {
    logger.debug('Attempting fallback regex parsing');
    
    const employees: Record<string, unknown>[] = [];
    const names: string[] = [];
    const scores: number[] = [];

    // Extract employee names
    const namePattern = /"name"\s*:\s*"([^"]+)"/g;
    let nameMatch;
    while ((nameMatch = namePattern.exec(jsonString)) !== null) {
      names.push(nameMatch[1]);
    }

    // Extract scores
    const scorePattern = /"score"\s*:\s*(\d+(?:\.\d+)?)/g;
    let scoreMatch;
    while ((scoreMatch = scorePattern.exec(jsonString)) !== null) {
      scores.push(parseFloat(scoreMatch[1]));
    }

    // Combine names and scores
    for (let i = 0; i < names.length; i++) {
      employees.push({
        name: names[i],
        performance: scores[i] ? [{ name: 'Overall', score: scores[i] }] : [],
        organizational_level: 'Unknown'
      });
    }

    logger.debug('Fallback parsing result', {
      namesFound: names.length,
      scoresFound: scores.length,
      employeesCreated: employees.length
    });

    return employees;
  }

  /**
   * Clean and normalize employee data
   */
  private cleanAndNormalizeData(data: Record<string, unknown>[], options: ParseOptions): Employee[] {
    logger.debug('Starting data cleaning and normalization', {
      recordCount: data.length
    });

    const cleanedEmployees: Employee[] = [];

    for (const item of data) {
      try {
        const employee: Employee = {
          name: this.cleanString(item.name),
          performance: this.cleanPerformanceData(item.performance),
          organizational_level: this.cleanString(item.organizational_level || 'Unknown')
        };

        // Apply validation and fixes
        if (this.validateEmployee(employee, options)) {
          cleanedEmployees.push(employee);
        }
      } catch (error) {
        logger.warn('Failed to clean employee record', {
          record: item,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Data cleaning completed', {
      originalCount: data.length,
      cleanedCount: cleanedEmployees.length,
      rejectedCount: data.length - cleanedEmployees.length
    });

    return cleanedEmployees;
  }

  /**
   * Clean string values
   */
  private cleanString(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value || '').trim();
    }
    
    return value
      .trim()
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[^\w\s-]/g, ''); // Remove special characters except hyphens
  }

  /**
   * Clean performance data array
   */
  private cleanPerformanceData(performance: unknown): CompetencyScore[] {
    if (!Array.isArray(performance)) {
      return [];
    }

    return performance
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        name: this.cleanString((item as Record<string, unknown>).competency ?? (item as Record<string, unknown>).name),
        score: this.normalizeScore((item as Record<string, unknown>).score)
      }))
      .filter(item => item.name && !isNaN(item.score));
  }

  /**
   * Normalize score values
   */
  private normalizeScore(score: unknown): number {
    const numScore = typeof score === 'number'
      ? score
      : Number.parseFloat(String(score));
    if (isNaN(numScore)) {
      return 0;
    }
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, numScore));
  }

  /**
   * Validate employee record
   */
  private validateEmployee(employee: Employee, options: ParseOptions): boolean {
    if (!employee.name || employee.name.trim() === '') {
      if (!options.skipCorruptedRecords) {
        return false;
      }
    }

    if (!employee.performance || employee.performance.length === 0) {
      if (options.useDefaultValues) {
        employee.performance = [{ name: 'Overall', score: 0 }];
      } else if (!options.skipCorruptedRecords) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const dataParser = new DataParserService();
