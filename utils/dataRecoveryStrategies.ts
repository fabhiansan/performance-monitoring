/**
 * Data recovery strategies extracted from enhancedDatabaseService
 */

import { Employee, CompetencyScore } from '../types';

export interface RecoveryResult {
  success: boolean;
  data?: Employee[];
  recordsRecovered: number;
  error?: string;
}

export interface RecoveryOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  skipCorruptedRecords: boolean;
  promptForMissingData: boolean;
  maxRecoveryAttempts: number;
}

/**
 * Strategy for fixing common JSON syntax issues
 */
export class JsonSyntaxFixStrategy {
  fixCommonJsonIssues(jsonString: string): string {
    let fixed = jsonString;
    
    // Remove trailing commas
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    
    // Fix unquoted keys
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix single quotes to double quotes
    fixed = fixed.replace(/'/g, '"');
    
    // Remove comments
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
    fixed = fixed.replace(/\/\/.*$/gm, '');
    
    // Fix missing quotes around string values
    fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*([,}])/g, ': "$1"$2');
    
    return fixed;
  }

  attemptJsonParsing(jsonString: string): RecoveryResult {
    try {
      const fixedJson = this.fixCommonJsonIssues(jsonString);
      const recoveredData = JSON.parse(fixedJson);
      const recordsRecovered = Array.isArray(recoveredData) ? recoveredData.length : 1;
      return { success: true, data: recoveredData, recordsRecovered };
    } catch (error) {
      return { 
        success: false, 
        recordsRecovered: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Strategy for extracting partial data from corrupted JSON
 */
export class PartialDataExtractionStrategy {
  extractPartialJsonData(jsonString: string): Record<string, unknown>[] {
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
    
    return results;
  }

  attemptPartialRecovery(jsonString: string): RecoveryResult {
    const partialData = this.extractPartialJsonData(jsonString);
    if (partialData && partialData.length > 0) {
      return { success: true, data: partialData as unknown as Employee[], recordsRecovered: partialData.length };
    }
    return { success: false, recordsRecovered: 0, error: 'No partial data could be extracted' };
  }
}

/**
 * Strategy for fallback JSON parsing using regex extraction
 */
export class FallbackParsingStrategy {
  fallbackJsonParsing(jsonString: string): Employee[] {
    const results: Employee[] = [];
    
    // Extract employee-like data using regex patterns
    const namePattern = /"name"\s*:\s*"([^"]+)"/g;
    const scorePattern = /"score"\s*:\s*(\d+(?:\.\d+)?)/g;
    
    let nameMatch;
    const names: string[] = [];
    while ((nameMatch = namePattern.exec(jsonString)) !== null) {
      names.push(nameMatch[1]);
    }
    
    let scoreMatch;
    const scores: number[] = [];
    while ((scoreMatch = scorePattern.exec(jsonString)) !== null) {
      scores.push(parseFloat(scoreMatch[1]));
    }
    
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
        performance: scores[index] ? [{ name: 'recovered_score', score: scores[index] }] : [],
      });
    });

    return results;
  }

  attemptFallbackRecovery(jsonString: string): RecoveryResult {
    const fallbackData = this.fallbackJsonParsing(jsonString);
    if (fallbackData && fallbackData.length > 0) {
      return { success: true, data: fallbackData, recordsRecovered: fallbackData.length };
    }
    return { success: false, recordsRecovered: 0, error: 'Fallback parsing failed' };
  }
}

/**
 * Main data recovery coordinator that uses multiple strategies
 */
export class DataRecoveryCoordinator {
  private syntaxFixStrategy = new JsonSyntaxFixStrategy();
  private partialExtractionStrategy = new PartialDataExtractionStrategy();
  private fallbackStrategy = new FallbackParsingStrategy();

  attemptDataRecovery(rawData: string, options: RecoveryOptions): RecoveryResult {
    let attempts = 0;

    while (attempts < options.maxRecoveryAttempts) {
      attempts++;
      
      try {
        // Attempt 1: Fix common JSON syntax issues
        if (attempts === 1) {
          const result = this.syntaxFixStrategy.attemptJsonParsing(rawData);
          if (result.success) return result;
        }
        
        // Attempt 2: Extract partial data
        if (attempts === 2) {
          const result = this.partialExtractionStrategy.attemptPartialRecovery(rawData);
          if (result.success) return result;
        }
        
        // Attempt 3: Use fallback parsing
        if (attempts === 3) {
          const result = this.fallbackStrategy.attemptFallbackRecovery(rawData);
          if (result.success) return result;
        }
        
      } catch (_error) {
        // Continue to next attempt
        continue;
      }
    }

    return { 
      success: false, 
      recordsRecovered: 0, 
      error: `Failed to recover data after ${attempts} attempts` 
    };
  }
}

/**
 * Utility functions for data cleaning and normalization
 */
export class DataCleaningUtils {
  cleanString(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value || '');
    }
    
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\p{Cc}]/gu, '') // Remove control characters
      .replace(/\uFFFD/g, ''); // Remove replacement characters
  }

  normalizeScore(score: unknown): number {
    const numScore = parseFloat(String(score));
    if (isNaN(numScore)) {
      return 0;
    }
    
    // Clamp score to valid range
    return Math.max(0, Math.min(100, numScore));
  }

  cleanPerformanceData(performance: unknown): CompetencyScore[] {
    if (!Array.isArray(performance)) {
      return [];
    }
    
    return performance
      .filter(perf => perf && typeof perf === 'object')
      .map(perf => {
        const perfObj = perf as { name?: unknown; score?: unknown };
        return {
          name: this.cleanString(perfObj.name) || 'Unknown Competency',
          score: this.normalizeScore(perfObj.score)
        };
      })
      .filter(perf => perf.name !== 'Unknown Competency' && !isNaN(perf.score as number));
  }

  cleanAndNormalizeData(data: Array<Record<string, unknown> | Employee>, options: RecoveryOptions): Employee[] {
    return data.map(rawItem => {
      const item = rawItem as Record<string, unknown>;
      // Ensure required fields exist
      const employee: Employee = {
        id: (item.id as number) || 0,
        name: this.cleanString(item.name) || 'Unknown Employee',
        nip: this.cleanString(item.nip) || '',
        gol: this.cleanString(item.gol) || '',
        pangkat: this.cleanString(item.pangkat) || '',
        position: this.cleanString(item.position) || '',
        sub_position: this.cleanString(item.sub_position || item.subPosition) || '',
        organizational_level: this.cleanString(item.organizational_level || item.organizationalLevel) || 'Staff/Other',
        performance: this.cleanPerformanceData(item.performance)
      };
      
      return employee;
    }).filter(emp => emp.name !== 'Unknown Employee' || options.useDefaultValues);
  }
}
