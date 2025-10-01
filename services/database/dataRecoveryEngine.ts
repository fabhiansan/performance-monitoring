/**
 * Data Recovery Engine
 * 
 * Handles data recovery and corruption repair with reduced complexity
 */

import { Employee } from '../../types';
import { logger } from '../logger';

export interface RecoveryOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  skipCorruptedRecords: boolean;
  maxRecoveryAttempts: number;
}

export interface RecoveryResult {
  success: boolean;
  data?: Employee[];
  recordsRecovered: number;
  error?: string;
}

export class DataRecoveryEngine {
  private readonly defaultOptions: RecoveryOptions = {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false,
    maxRecoveryAttempts: 3
  };

  /**
   * Attempt to recover corrupted JSON data
   */
  attemptJsonRecovery(rawData: string, options: Partial<RecoveryOptions> = {}): RecoveryResult {
    const opts = { ...this.defaultOptions, ...options };
    let attempts = 0;

    while (attempts < opts.maxRecoveryAttempts) {
      attempts++;
      
      try {
        const result = this.executeRecoveryAttempt(rawData, attempts);
        if (result.success) {
          return {
            success: true,
            data: result.data,
            recordsRecovered: result.data?.length || 0
          };
        }
      } catch (error) {
        logger.debug(`Recovery attempt ${attempts} failed`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return {
      success: false,
      recordsRecovered: 0,
      error: `Failed to recover data after ${attempts} attempts`
    };
  }

  /**
   * Execute specific recovery attempt based on attempt number
   */
  private executeRecoveryAttempt(rawData: string, attemptNumber: number): { success: boolean; data?: Employee[] } {
    switch (attemptNumber) {
      case 1:
        return this.fixCommonJsonIssues(rawData);
      case 2:
        return this.extractPartialData(rawData);
      case 3:
        return this.fallbackParsing(rawData);
      default:
        throw new Error('Maximum recovery attempts exceeded');
    }
  }

  /**
   * Fix common JSON syntax issues
   */
  private fixCommonJsonIssues(jsonString: string): { success: boolean; data?: Employee[] } {
    try {
      let fixed = jsonString;
      
      // Apply common fixes
      fixed = this.removeTrailingCommas(fixed);
      fixed = this.fixUnquotedKeys(fixed);
      fixed = this.fixSingleQuotes(fixed);
      fixed = this.removeComments(fixed);
      fixed = this.fixUnquotedStringValues(fixed);
      
      const parsed = JSON.parse(fixed) as unknown;
      const arrayData = Array.isArray(parsed) ? parsed : [parsed];
      return { success: true, data: arrayData as unknown as Employee[] };
    } catch {
      return { success: false };
    }
  }

  /**
   * Extract partial data from corrupted JSON
   */
  private extractPartialData(jsonString: string): { success: boolean; data?: Employee[] } {
    try {
      const results: Record<string, unknown>[] = [];
      
      // Try to extract individual JSON objects
      const objectMatches = jsonString.match(/\{[^{}]*\}/g);
      if (objectMatches) {
        objectMatches.forEach(match => {
          try {
            const obj = JSON.parse(match);
            results.push(obj);
          } catch {
            // Skip invalid objects
          }
        });
      }
      
      return results.length > 0 ? { success: true, data: results as unknown as Employee[] } : { success: false };
    } catch {
      return { success: false };
    }
  }

  /**
   * Fallback JSON parsing using regex extraction
   */
  private fallbackParsing(jsonString: string): { success: boolean; data?: Employee[] } {
    try {
      const results: Employee[] = [];
      
      // Extract employee-like data using regex patterns
      const names = this.extractNames(jsonString);
      const scores = this.extractScores(jsonString);
      
      // Create basic employee objects
      names.forEach((name, index) => {
        results.push({
          id: 0,
          name,
          nip: '',
          gol: '',
          pangkat: '',
          position: '',
          sub_position: '',
          organizational_level: 'Staff/Other',
          performance: scores[index] ? [{ name: 'recovered_score', score: scores[index] }] : []
        });
      });
      
      return results.length > 0 ? { success: true, data: results } : { success: false };
    } catch {
      return { success: false };
    }
  }

  // Helper methods for JSON fixing
  private removeTrailingCommas(str: string): string {
    return str.replace(/,\s*([}\]])/g, '$1');
  }

  private fixUnquotedKeys(str: string): string {
    return str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  }

  private fixSingleQuotes(str: string): string {
    return str.replace(/'/g, '"');
  }

  private removeComments(str: string): string {
    return str
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  }

  private fixUnquotedStringValues(str: string): string {
    return str.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*([,}])/g, ': "$1"$2');
  }

  private extractNames(jsonString: string): string[] {
    const namePattern = /"name"\s*:\s*"([^"]+)"/g;
    const names: string[] = [];
    let match;
    
    while ((match = namePattern.exec(jsonString)) !== null) {
      names.push(match[1]);
    }
    
    return names;
  }

  private extractScores(jsonString: string): number[] {
    const scorePattern = /"score"\s*:\s*(\d+(?:\.\d+)?)/g;
    const scores: number[] = [];
    let match;
    
    while ((match = scorePattern.exec(jsonString)) !== null) {
      scores.push(parseFloat(match[1]));
    }
    
    return scores;
  }
}
