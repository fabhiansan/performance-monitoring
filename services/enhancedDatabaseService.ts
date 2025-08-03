import { Employee } from '../types';
import { DataIntegrityValidator, DataIntegrityResult, RecoveryOption } from './dataIntegrityService';
import { ValidationResult } from './validationService';

export interface DatabaseOperationResult {
  success: boolean;
  data?: any;
  integrityResult?: DataIntegrityResult;
  validationResult?: ValidationResult;
  errors: string[];
  warnings: string[];
  recoveryOptions: RecoveryOption[];
  metadata: {
    operation: string;
    timestamp: string;
    recordsProcessed: number;
    recordsRecovered: number;
    dataQualityScore: number;
  };
}

export interface DataRecoveryOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  skipCorruptedRecords: boolean;
  promptForMissingData: boolean;
  maxRecoveryAttempts: number;
}

/**
 * Enhanced database service with data integrity validation and recovery
 */
export class EnhancedDatabaseService {
  private integrityValidator: DataIntegrityValidator;
  private defaultRecoveryOptions: DataRecoveryOptions = {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false,
    promptForMissingData: false,
    maxRecoveryAttempts: 3
  };

  constructor() {
    this.integrityValidator = new DataIntegrityValidator();
  }

  /**
   * Parse and validate JSON performance data with integrity checks
   */
  parsePerformanceDataWithIntegrity(
    rawJsonData: string,
    recoveryOptions: Partial<DataRecoveryOptions> = {}
  ): DatabaseOperationResult {
    const options = { ...this.defaultRecoveryOptions, ...recoveryOptions };
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    let recoveredData: any = null;
    let recordsProcessed = 0;
    let recordsRecovered = 0;

    try {
      // Step 1: Validate JSON integrity
      const integrityResult = this.integrityValidator.validateJsonIntegrity(rawJsonData);
      
      if (!integrityResult.isValid) {
        // Attempt recovery if enabled
        if (options.autoFix && integrityResult.recoveryOptions.length > 0) {
          const recoveryResult = this.attemptDataRecovery(rawJsonData, integrityResult, options);
          if (recoveryResult.success) {
            recoveredData = recoveryResult.data;
            recordsRecovered = recoveryResult.recordsRecovered;
            warnings.push(`Data recovery successful: ${recordsRecovered} records recovered`);
          } else {
            errors.push(`Data recovery failed: ${recoveryResult.error}`);
          }
        } else {
          errors.push('JSON integrity validation failed and recovery is disabled');
        }
      } else {
        // Parse successful data
        try {
          recoveredData = JSON.parse(rawJsonData);
        } catch (parseError) {
          errors.push(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }

      // Step 2: Validate employee data structure if we have data
      let validationResult: ValidationResult | undefined;
      if (recoveredData && Array.isArray(recoveredData)) {
        recordsProcessed = recoveredData.length;
        
        // Apply data cleaning and normalization
        const cleanedData = this.cleanAndNormalizeData(recoveredData, options);
        
        // Validate performance data integrity
        const performanceIntegrityResult = this.integrityValidator.validatePerformanceDataIntegrity(cleanedData);
        
        if (!performanceIntegrityResult.isValid && options.autoFix) {
          const fixedData = this.applyAutoFixes(cleanedData, performanceIntegrityResult);
          recoveredData = fixedData.data;
          recordsRecovered += fixedData.recordsFixed;
          warnings.push(`Auto-fixed ${fixedData.recordsFixed} data issues`);
        }
      }

      // Calculate data quality score
      const dataQualityScore = this.calculateDataQualityScore(integrityResult, validationResult);

      return {
        success: errors.length === 0,
        data: recoveredData,
        integrityResult,
        validationResult,
        errors,
        warnings,
        recoveryOptions: integrityResult.recoveryOptions,
        metadata: {
          operation: 'parsePerformanceDataWithIntegrity',
          timestamp,
          recordsProcessed,
          recordsRecovered,
          dataQualityScore
        }
      };

    } catch (error) {
      errors.push(`Unexpected error during data processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        errors,
        warnings,
        recoveryOptions: [],
        metadata: {
          operation: 'parsePerformanceDataWithIntegrity',
          timestamp,
          recordsProcessed,
          recordsRecovered,
          dataQualityScore: 0
        }
      };
    }
  }

  /**
   * Retrieve and validate employee data from database with integrity checks
   */
  getEmployeeDataWithIntegrity(
    employees: Employee[],
    recoveryOptions: Partial<DataRecoveryOptions> = {}
  ): DatabaseOperationResult {
    const options = { ...this.defaultRecoveryOptions, ...recoveryOptions };
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    let processedData = employees;
    let recordsProcessed = employees.length;
    let recordsRecovered = 0;

    try {
      // Validate data integrity
      const integrityResult = this.integrityValidator.validatePerformanceDataIntegrity(employees);
      
      if (!integrityResult.isValid) {
        if (options.autoFix) {
          const fixResult = this.applyAutoFixes(employees, integrityResult);
          processedData = fixResult.data;
          recordsRecovered = fixResult.recordsFixed;
          warnings.push(`Auto-fixed ${recordsRecovered} data integrity issues`);
        } else {
          errors.push('Data integrity issues detected and auto-fix is disabled');
        }
      }

      // Apply additional data cleaning
      if (options.useDefaultValues) {
        const cleanResult = this.applyDefaultValues(processedData);
        processedData = cleanResult.data;
        if (cleanResult.recordsModified > 0) {
          warnings.push(`Applied default values to ${cleanResult.recordsModified} records`);
        }
      }

      // Calculate data quality score
      const dataQualityScore = this.calculateDataQualityScore(integrityResult);

      return {
        success: errors.length === 0,
        data: processedData,
        integrityResult,
        errors,
        warnings,
        recoveryOptions: integrityResult.recoveryOptions,
        metadata: {
          operation: 'getEmployeeDataWithIntegrity',
          timestamp,
          recordsProcessed,
          recordsRecovered,
          dataQualityScore
        }
      };

    } catch (error) {
      errors.push(`Error during data retrieval: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        data: employees,
        errors,
        warnings,
        recoveryOptions: [],
        metadata: {
          operation: 'getEmployeeDataWithIntegrity',
          timestamp,
          recordsProcessed,
          recordsRecovered,
          dataQualityScore: 0
        }
      };
    }
  }

  /**
   * Attempt to recover corrupted JSON data
   */
  private attemptDataRecovery(
    rawData: string,
    integrityResult: DataIntegrityResult,
    options: DataRecoveryOptions
  ): { success: boolean; data?: any; recordsRecovered: number; error?: string } {
    let attempts = 0;
    let recoveredData: any = null;
    let recordsRecovered = 0;

    while (attempts < options.maxRecoveryAttempts) {
      attempts++;
      
      try {
        // Attempt 1: Fix common JSON syntax issues
        if (attempts === 1) {
          const fixedJson = this.fixCommonJsonIssues(rawData);
          recoveredData = JSON.parse(fixedJson);
          recordsRecovered = Array.isArray(recoveredData) ? recoveredData.length : 1;
          return { success: true, data: recoveredData, recordsRecovered };
        }
        
        // Attempt 2: Extract partial data
        if (attempts === 2) {
          const partialData = this.extractPartialJsonData(rawData);
          if (partialData && partialData.length > 0) {
            recordsRecovered = partialData.length;
            return { success: true, data: partialData, recordsRecovered };
          }
        }
        
        // Attempt 3: Use fallback parsing
        if (attempts === 3) {
          const fallbackData = this.fallbackJsonParsing(rawData);
          if (fallbackData) {
            recordsRecovered = Array.isArray(fallbackData) ? fallbackData.length : 1;
            return { success: true, data: fallbackData, recordsRecovered };
          }
        }
        
      } catch (error) {
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

  /**
   * Fix common JSON syntax issues
   */
  private fixCommonJsonIssues(jsonString: string): string {
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

  /**
   * Extract partial data from corrupted JSON
   */
  private extractPartialJsonData(jsonString: string): any[] {
    const results: any[] = [];
    
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

  /**
   * Fallback JSON parsing using regex extraction
   */
  private fallbackJsonParsing(jsonString: string): any[] {
    const results: any[] = [];
    
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
        name,
        performance: scores[index] ? [{ name: 'recovered_score', score: scores[index] }] : []
      });
    });
    
    return results;
  }

  /**
   * Clean and normalize data
   */
  private cleanAndNormalizeData(data: any[], options: DataRecoveryOptions): Employee[] {
    return data.map(item => {
      // Ensure required fields exist
      const employee: Employee = {
        id: item.id || 0,
        name: this.cleanString(item.name) || 'Unknown Employee',
        nip: this.cleanString(item.nip) || '',
        gol: this.cleanString(item.gol) || '',
        pangkat: this.cleanString(item.pangkat) || '',
        position: this.cleanString(item.position) || '',
        sub_position: this.cleanString(item.sub_position || item.subPosition) || '',
        organizational_level: this.cleanString(item.organizational_level || item.organizationalLevel) || 'Staff/Other',
        performance: this.cleanPerformanceData(item.performance) || []
      };
      
      return employee;
    }).filter(emp => emp.name !== 'Unknown Employee' || options.useDefaultValues);
  }

  /**
   * Clean string data
   */
  private cleanString(value: any): string {
    if (typeof value !== 'string') {
      return String(value || '');
    }
    
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\uFFFD/g, ''); // Remove replacement characters
  }

  /**
   * Clean performance data
   */
  private cleanPerformanceData(performance: any): any[] {
    if (!Array.isArray(performance)) {
      return [];
    }
    
    return performance
      .filter(perf => perf && typeof perf === 'object')
      .map(perf => ({
        name: this.cleanString(perf.name) || 'Unknown Competency',
        score: this.normalizeScore(perf.score)
      }))
      .filter(perf => perf.name !== 'Unknown Competency' && !isNaN(perf.score));
  }

  /**
   * Normalize score values
   */
  private normalizeScore(score: any): number {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) {
      return 0;
    }
    
    // Clamp score to valid range
    return Math.max(0, Math.min(100, numScore));
  }

  /**
   * Apply automatic fixes to data issues
   */
  private applyAutoFixes(
    employees: Employee[],
    integrityResult: DataIntegrityResult
  ): { data: Employee[]; recordsFixed: number } {
    let recordsFixed = 0;
    const fixedEmployees = employees.map(employee => {
      let wasFixed = false;
      const fixedEmployee = { ...employee };
      
      // Fix missing names
      if (!fixedEmployee.name || fixedEmployee.name.trim() === '') {
        fixedEmployee.name = `Employee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        wasFixed = true;
      }
      
      // Fix missing performance data
      if (!fixedEmployee.performance || !Array.isArray(fixedEmployee.performance)) {
        fixedEmployee.performance = [];
        wasFixed = true;
      }
      
      // Fix invalid scores
      fixedEmployee.performance = fixedEmployee.performance.map(perf => {
        if (typeof perf.score !== 'number' || isNaN(perf.score)) {
          wasFixed = true;
          return { ...perf, score: 0 };
        }
        if (perf.score < 0 || perf.score > 100) {
          wasFixed = true;
          return { ...perf, score: Math.max(0, Math.min(100, perf.score)) };
        }
        return perf;
      });
      
      // Fix missing organizational level
      if (!fixedEmployee.organizational_level || fixedEmployee.organizational_level.trim() === '') {
        fixedEmployee.organizational_level = 'Staff/Other';
        wasFixed = true;
      }
      
      if (wasFixed) {
        recordsFixed++;
      }
      
      return fixedEmployee;
    });
    
    return { data: fixedEmployees, recordsFixed };
  }

  /**
   * Apply default values to missing fields
   */
  private applyDefaultValues(employees: Employee[]): { data: Employee[]; recordsModified: number } {
    let recordsModified = 0;
    
    const processedEmployees = employees.map(employee => {
      let wasModified = false;
      const processed = { ...employee };
      
      // Apply defaults for empty fields
      const defaults = {
        nip: 'N/A',
        gol: 'N/A',
        pangkat: 'N/A',
        position: 'Staff',
        sub_position: 'General',
        organizational_level: 'Staff/Other'
      };
      
      Object.entries(defaults).forEach(([field, defaultValue]) => {
        if (!processed[field as keyof Employee] || 
            (typeof processed[field as keyof Employee] === 'string' && 
             (processed[field as keyof Employee] as string).trim() === '')) {
          (processed as any)[field] = defaultValue;
          wasModified = true;
        }
      });
      
      if (wasModified) {
        recordsModified++;
      }
      
      return processed;
    });
    
    return { data: processedEmployees, recordsModified };
  }

  /**
   * Calculate overall data quality score
   */
  private calculateDataQualityScore(
    integrityResult: DataIntegrityResult,
    validationResult?: ValidationResult
  ): number {
    let score = integrityResult.summary.integrityScore;
    
    // Adjust score based on validation results
    if (validationResult) {
      const errorPenalty = validationResult.errors.length * 5;
      const warningPenalty = validationResult.warnings.length * 2;
      score = Math.max(0, score - errorPenalty - warningPenalty);
    }
    
    return Math.round(score);
  }

  /**
   * Generate detailed error report
   */
  generateErrorReport(result: DatabaseOperationResult): string {
    const report: string[] = [];
    
    report.push('=== Data Integrity Report ===');
    report.push(`Operation: ${result.metadata.operation}`);
    report.push(`Timestamp: ${result.metadata.timestamp}`);
    report.push(`Records Processed: ${result.metadata.recordsProcessed}`);
    report.push(`Records Recovered: ${result.metadata.recordsRecovered}`);
    report.push(`Data Quality Score: ${result.metadata.dataQualityScore}/100`);
    report.push('');
    
    if (result.errors.length > 0) {
      report.push('ERRORS:');
      result.errors.forEach((error, index) => {
        report.push(`${index + 1}. ${error}`);
      });
      report.push('');
    }
    
    if (result.warnings.length > 0) {
      report.push('WARNINGS:');
      result.warnings.forEach((warning, index) => {
        report.push(`${index + 1}. ${warning}`);
      });
      report.push('');
    }
    
    if (result.recoveryOptions.length > 0) {
      report.push('RECOVERY OPTIONS:');
      result.recoveryOptions.forEach((option, index) => {
        report.push(`${index + 1}. ${option.description}`);
        report.push(`   Action: ${option.action}`);
        report.push(`   Confidence: ${option.confidence}`);
        report.push(`   Risk Level: ${option.riskLevel}`);
        report.push('');
      });
    }
    
    return report.join('\n');
  }

  /**
   * Get recovery options for user notification
   */
  getRecoveryOptionsForUser(result: DatabaseOperationResult): {
    canProceed: boolean;
    requiresUserAction: boolean;
    recommendations: string[];
    actions: { label: string; action: string; risk: string }[];
  } {
    const canProceed = result.success || result.metadata.dataQualityScore >= 70;
    const requiresUserAction = result.recoveryOptions.some(opt => opt.type === 'user_input_required' || opt.type === 'manual_review');
    
    const recommendations: string[] = [];
    const actions: { label: string; action: string; risk: string }[] = [];
    
    if (result.metadata.dataQualityScore >= 90) {
      recommendations.push('Data quality is excellent. Safe to proceed.');
    } else if (result.metadata.dataQualityScore >= 70) {
      recommendations.push('Data quality is acceptable with minor issues.');
    } else if (result.metadata.dataQualityScore >= 40) {
      recommendations.push('Data quality has significant issues. Review recommended.');
    } else {
      recommendations.push('Data quality is poor. Manual intervention required.');
    }
    
    result.recoveryOptions.forEach(option => {
      actions.push({
        label: option.description,
        action: option.action,
        risk: option.riskLevel
      });
    });
    
    return {
      canProceed,
      requiresUserAction,
      recommendations,
      actions
    };
  }
}

// Export utility functions
export function createEnhancedDatabaseService(): EnhancedDatabaseService {
  return new EnhancedDatabaseService();
}

export function getDataQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}