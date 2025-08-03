import { Employee, CompetencyScore } from '../types';
import { ValidationResult, ValidationError, ValidationWarning, PerformanceDataValidator } from './validationService';

export interface DataIntegrityResult {
  isValid: boolean;
  hasCorruption: boolean;
  errors: DataIntegrityError[];
  warnings: DataIntegrityWarning[];
  recoveryOptions: RecoveryOption[];
  summary: DataIntegritySummary;
}

export interface DataIntegrityError {
  type: 'json_parse_error' | 'data_corruption' | 'schema_violation' | 'critical_data_loss' | 'encoding_error';
  message: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedData?: any;
  recoverable: boolean;
  employeeName?: string;
  fieldName?: string;
}

export interface DataIntegrityWarning {
  type: 'partial_corruption' | 'data_inconsistency' | 'format_anomaly' | 'encoding_issue';
  message: string;
  details: string;
  affectedData?: any;
  employeeName?: string;
  fieldName?: string;
}

export interface RecoveryOption {
  type: 'auto_fix' | 'manual_review' | 'data_restoration' | 'fallback_values' | 'user_input_required';
  description: string;
  action: string;
  confidence: 'high' | 'medium' | 'low';
  riskLevel: 'safe' | 'moderate' | 'risky';
  affectedFields: string[];
  recoveryData?: any;
}

export interface DataIntegritySummary {
  totalRecords: number;
  corruptedRecords: number;
  recoverableRecords: number;
  dataLossPercentage: number;
  integrityScore: number; // 0-100
  recommendedAction: 'proceed' | 'review_required' | 'manual_intervention' | 'abort';
}

/**
 * Comprehensive data integrity validation service
 * Checks for JSON parsing errors, data corruption, and provides recovery options
 */
export class DataIntegrityValidator {
  private errors: DataIntegrityError[] = [];
  private warnings: DataIntegrityWarning[] = [];
  private recoveryOptions: RecoveryOption[] = [];
  private performanceValidator: PerformanceDataValidator;

  constructor() {
    this.performanceValidator = new PerformanceDataValidator();
  }

  /**
   * Validate JSON data integrity after parsing
   */
  validateJsonIntegrity(rawData: string, parsedData?: any): DataIntegrityResult {
    this.errors = [];
    this.warnings = [];
    this.recoveryOptions = [];

    // Step 1: Validate JSON parsing
    const jsonValidation = this.validateJsonParsing(rawData, parsedData);
    
    // Step 2: Validate data structure integrity
    if (jsonValidation.parsedData) {
      this.validateDataStructure(jsonValidation.parsedData);
    }

    // Step 3: Validate employee data integrity
    if (jsonValidation.parsedData && Array.isArray(jsonValidation.parsedData)) {
      this.validateEmployeeDataIntegrity(jsonValidation.parsedData);
    }

    // Step 4: Generate recovery options
    this.generateRecoveryOptions();

    // Step 5: Generate summary
    const summary = this.generateIntegritySummary(jsonValidation.parsedData);

    return {
      isValid: this.errors.length === 0,
      hasCorruption: this.errors.some(e => e.type === 'data_corruption' || e.type === 'critical_data_loss'),
      errors: this.errors,
      warnings: this.warnings,
      recoveryOptions: this.recoveryOptions,
      summary
    };
  }

  /**
   * Validate performance data from database with integrity checks
   */
  validatePerformanceDataIntegrity(employees: Employee[]): DataIntegrityResult {
    this.errors = [];
    this.warnings = [];
    this.recoveryOptions = [];

    // Validate each employee's performance data
    employees.forEach(employee => {
      this.validateEmployeePerformanceIntegrity(employee);
    });

    // Run standard performance validation
    const standardValidation = this.performanceValidator.validateEmployeeData(employees);
    
    // Convert standard validation errors to integrity errors
    this.convertStandardValidationErrors(standardValidation);

    // Generate recovery options
    this.generateRecoveryOptions();

    // Generate summary
    const summary = this.generateIntegritySummary(employees);

    return {
      isValid: this.errors.length === 0,
      hasCorruption: this.errors.some(e => e.type === 'data_corruption' || e.type === 'critical_data_loss'),
      errors: this.errors,
      warnings: this.warnings,
      recoveryOptions: this.recoveryOptions,
      summary
    };
  }

  /**
   * Validate JSON parsing and detect corruption
   */
  private validateJsonParsing(rawData: string, parsedData?: any): { isValid: boolean; parsedData?: any; error?: string } {
    if (!rawData || typeof rawData !== 'string') {
      this.errors.push({
        type: 'json_parse_error',
        message: 'Invalid raw data provided',
        details: 'Raw data is null, undefined, or not a string',
        severity: 'critical',
        recoverable: false
      });
      return { isValid: false };
    }

    // If parsedData is provided, validate it matches the raw data
    if (parsedData !== undefined) {
      try {
        const reparsed = JSON.parse(rawData);
        if (JSON.stringify(reparsed) !== JSON.stringify(parsedData)) {
          this.errors.push({
            type: 'data_corruption',
            message: 'Parsed data does not match raw JSON data',
            details: 'Data corruption detected during parsing process',
            severity: 'high',
            recoverable: true
          });
        }
        return { isValid: true, parsedData: reparsed };
      } catch (error) {
        this.errors.push({
          type: 'json_parse_error',
          message: 'JSON parsing failed',
          details: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
          recoverable: this.isRecoverableJsonError(rawData, error)
        });
        return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Parse the raw data
    try {
      const parsed = JSON.parse(rawData);
      return { isValid: true, parsedData: parsed };
    } catch (error) {
      this.errors.push({
        type: 'json_parse_error',
        message: 'JSON parsing failed',
        details: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        recoverable: this.isRecoverableJsonError(rawData, error)
      });
      return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validate data structure integrity
   */
  private validateDataStructure(data: any): void {
    if (data === null || data === undefined) {
      this.errors.push({
        type: 'critical_data_loss',
        message: 'Data is null or undefined',
        details: 'Complete data loss detected',
        severity: 'critical',
        recoverable: false
      });
      return;
    }

    // Check for expected array structure
    if (!Array.isArray(data)) {
      this.warnings.push({
        type: 'format_anomaly',
        message: 'Data is not in expected array format',
        details: `Expected array, got ${typeof data}`,
        affectedData: typeof data
      });
    }

    // Check for empty data
    if (Array.isArray(data) && data.length === 0) {
      this.warnings.push({
        type: 'data_inconsistency',
        message: 'Empty data array',
        details: 'No employee records found in data'
      });
    }
  }

  /**
   * Validate employee data integrity
   */
  private validateEmployeeDataIntegrity(employees: any[]): void {
    employees.forEach((employee, index) => {
      this.validateEmployeeRecord(employee, index);
    });
  }

  /**
   * Validate individual employee record
   */
  private validateEmployeeRecord(employee: any, index: number): void {
    const employeeName = employee?.name || `Employee ${index + 1}`;

    // Check for null/undefined employee
    if (employee === null || employee === undefined) {
      this.errors.push({
        type: 'critical_data_loss',
        message: `Employee record is null/undefined`,
        details: `Employee at index ${index} is completely missing`,
        severity: 'high',
        recoverable: false,
        employeeName
      });
      return;
    }

    // Check required fields
    const requiredFields = ['name'];
    requiredFields.forEach(field => {
      if (!employee[field] || (typeof employee[field] === 'string' && employee[field].trim() === '')) {
        this.errors.push({
          type: 'schema_violation',
          message: `Missing required field: ${field}`,
          details: `Employee record missing critical field: ${field}`,
          severity: 'high',
          recoverable: true,
          employeeName,
          fieldName: field
        });
      }
    });

    // Validate performance data structure
    if (employee.performance !== undefined) {
      this.validatePerformanceDataStructure(employee.performance, employeeName);
    }
  }

  /**
   * Validate performance data structure for an employee
   */
  private validatePerformanceDataStructure(performance: any, employeeName: string): void {
    if (performance === null) {
      this.warnings.push({
        type: 'data_inconsistency',
        message: 'Performance data is null',
        details: 'Employee has null performance data',
        employeeName
      });
      return;
    }

    if (!Array.isArray(performance)) {
      this.errors.push({
        type: 'schema_violation',
        message: 'Performance data is not an array',
        details: `Expected array, got ${typeof performance}`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance'
      });
      return;
    }

    // Validate each performance entry
    performance.forEach((perf, index) => {
      this.validatePerformanceEntry(perf, index, employeeName);
    });
  }

  /**
   * Validate individual performance entry
   */
  private validatePerformanceEntry(perf: any, index: number, employeeName: string): void {
    if (perf === null || perf === undefined) {
      this.errors.push({
        type: 'data_corruption',
        message: 'Performance entry is null/undefined',
        details: `Performance entry ${index} is missing`,
        severity: 'medium',
        recoverable: true,
        employeeName
      });
      return;
    }

    // Check required performance fields
    if (!perf.name || typeof perf.name !== 'string') {
      this.errors.push({
        type: 'schema_violation',
        message: 'Performance entry missing competency name',
        details: `Performance entry ${index} has invalid or missing name`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.name'
      });
    }

    if (perf.score === undefined || perf.score === null) {
      this.errors.push({
        type: 'schema_violation',
        message: 'Performance entry missing score',
        details: `Performance entry ${index} has missing score`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.score'
      });
    } else if (typeof perf.score !== 'number' || isNaN(perf.score)) {
      this.errors.push({
        type: 'data_corruption',
        message: 'Performance score is not a valid number',
        details: `Performance entry ${index} has invalid score: ${perf.score}`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.score'
      });
    } else if (perf.score < 0 || perf.score > 100) {
      this.warnings.push({
        type: 'data_inconsistency',
        message: 'Performance score out of expected range',
        details: `Score ${perf.score} is outside 0-100 range`,
        employeeName,
        fieldName: 'performance.score'
      });
    }
  }

  /**
   * Validate individual employee performance integrity
   */
  private validateEmployeePerformanceIntegrity(employee: Employee): void {
    // Check for data consistency
    if (employee.performance && employee.performance.length > 0) {
      const uniqueCompetencies = new Set(employee.performance.map(p => p.name.toLowerCase()));
      if (uniqueCompetencies.size !== employee.performance.length) {
        this.warnings.push({
          type: 'data_inconsistency',
          message: 'Duplicate competencies found',
          details: 'Employee has duplicate competency entries',
          employeeName: employee.name
        });
      }
    }

    // Check for encoding issues
    this.checkEncodingIssues(employee);
  }

  /**
   * Check for text encoding issues
   */
  private checkEncodingIssues(employee: Employee): void {
    const textFields = [employee.name, employee.nip, employee.position, employee.organizational_level];
    
    textFields.forEach((field, index) => {
      if (field && this.hasEncodingIssues(field)) {
        this.warnings.push({
          type: 'encoding_issue',
          message: 'Potential encoding issues detected',
          details: `Text field contains suspicious characters: ${field}`,
          employeeName: employee.name
        });
      }
    });

    // Check performance competency names
    employee.performance?.forEach(perf => {
      if (this.hasEncodingIssues(perf.name)) {
        this.warnings.push({
          type: 'encoding_issue',
          message: 'Competency name has encoding issues',
          details: `Competency name contains suspicious characters: ${perf.name}`,
          employeeName: employee.name
        });
      }
    });
  }

  /**
   * Check if text has encoding issues
   */
  private hasEncodingIssues(text: string): boolean {
    // Check for common encoding issue patterns
    const encodingPatterns = [
      /\uFFFD/, // Replacement character
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters
      /\\u[0-9a-fA-F]{4}/, // Escaped unicode
      /â€™|â€œ|â€�/, // Common UTF-8 encoding issues
    ];

    return encodingPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if JSON error is recoverable
   */
  private isRecoverableJsonError(rawData: string, error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Common recoverable JSON errors
    const recoverablePatterns = [
      /Unexpected token.*in JSON/, // Missing quotes, trailing commas
      /Unexpected end of JSON/, // Truncated JSON
      /Expected.*but found/, // Format issues
    ];

    return recoverablePatterns.some(pattern => pattern.test(errorMessage)) && 
           rawData.length > 0 && 
           rawData.includes('{') && 
           rawData.includes('}');
  }

  /**
   * Convert standard validation errors to integrity errors
   */
  private convertStandardValidationErrors(validation: ValidationResult): void {
    validation.errors.forEach(error => {
      this.errors.push({
        type: 'schema_violation',
        message: error.message,
        details: error.details || '',
        severity: this.mapValidationSeverity(error.type),
        recoverable: true,
        employeeName: error.employeeName,
        fieldName: error.competencyName
      });
    });

    validation.warnings.forEach(warning => {
      this.warnings.push({
        type: 'data_inconsistency',
        message: warning.message,
        details: warning.details || '',
        employeeName: warning.employeeName,
        fieldName: warning.competencyName
      });
    });
  }

  /**
   * Map validation error types to severity levels
   */
  private mapValidationSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorType) {
      case 'critical_data':
      case 'missing_employee':
        return 'critical';
      case 'invalid_score':
      case 'missing_competency':
        return 'high';
      case 'duplicate_employee':
      case 'malformed_header':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Generate recovery options based on detected issues
   */
  private generateRecoveryOptions(): void {
    // Auto-fix options for common issues
    const autoFixableErrors = this.errors.filter(e => 
      e.recoverable && 
      (e.type === 'schema_violation' || e.type === 'data_corruption')
    );

    if (autoFixableErrors.length > 0) {
      this.recoveryOptions.push({
        type: 'auto_fix',
        description: 'Automatically fix recoverable data issues',
        action: 'Apply default values and data normalization',
        confidence: 'high',
        riskLevel: 'safe',
        affectedFields: autoFixableErrors.map(e => e.fieldName || 'unknown')
      });
    }

    // Manual review for critical issues
    const criticalErrors = this.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      this.recoveryOptions.push({
        type: 'manual_review',
        description: 'Critical issues require manual review',
        action: 'Review and manually correct data before proceeding',
        confidence: 'high',
        riskLevel: 'moderate',
        affectedFields: criticalErrors.map(e => e.fieldName || 'unknown')
      });
    }

    // Fallback values for missing data
    const missingDataErrors = this.errors.filter(e => 
      e.type === 'schema_violation' && e.fieldName
    );
    if (missingDataErrors.length > 0) {
      this.recoveryOptions.push({
        type: 'fallback_values',
        description: 'Use default values for missing fields',
        action: 'Apply system defaults for missing required fields',
        confidence: 'medium',
        riskLevel: 'safe',
        affectedFields: missingDataErrors.map(e => e.fieldName!)
      });
    }

    // User input for unrecoverable issues
    const unrecoverableErrors = this.errors.filter(e => !e.recoverable);
    if (unrecoverableErrors.length > 0) {
      this.recoveryOptions.push({
        type: 'user_input_required',
        description: 'Some issues require user input to resolve',
        action: 'Prompt user for missing or corrupted data',
        confidence: 'low',
        riskLevel: 'moderate',
        affectedFields: unrecoverableErrors.map(e => e.fieldName || 'unknown')
      });
    }
  }

  /**
   * Generate integrity summary
   */
  private generateIntegritySummary(data: any): DataIntegritySummary {
    const totalRecords = Array.isArray(data) ? data.length : 0;
    const corruptedRecords = this.errors.filter(e => e.employeeName).length;
    const recoverableRecords = this.errors.filter(e => e.recoverable && e.employeeName).length;
    
    const dataLossPercentage = totalRecords > 0 ? (corruptedRecords / totalRecords) * 100 : 0;
    
    // Calculate integrity score (0-100)
    let integrityScore = 100;
    this.errors.forEach(error => {
      switch (error.severity) {
        case 'critical': integrityScore -= 25; break;
        case 'high': integrityScore -= 15; break;
        case 'medium': integrityScore -= 10; break;
        case 'low': integrityScore -= 5; break;
      }
    });
    integrityScore = Math.max(0, integrityScore);

    // Determine recommended action
    let recommendedAction: 'proceed' | 'review_required' | 'manual_intervention' | 'abort';
    if (integrityScore >= 90) {
      recommendedAction = 'proceed';
    } else if (integrityScore >= 70) {
      recommendedAction = 'review_required';
    } else if (integrityScore >= 40) {
      recommendedAction = 'manual_intervention';
    } else {
      recommendedAction = 'abort';
    }

    return {
      totalRecords,
      corruptedRecords,
      recoverableRecords,
      dataLossPercentage,
      integrityScore,
      recommendedAction
    };
  }
}

/**
 * Utility functions for data integrity validation
 */
export function validateJsonIntegrity(rawData: string, parsedData?: any): DataIntegrityResult {
  const validator = new DataIntegrityValidator();
  return validator.validateJsonIntegrity(rawData, parsedData);
}

export function validatePerformanceDataIntegrity(employees: Employee[]): DataIntegrityResult {
  const validator = new DataIntegrityValidator();
  return validator.validatePerformanceDataIntegrity(employees);
}

export function getIntegrityMessage(result: DataIntegrityResult): string {
  if (result.isValid) {
    return 'Data integrity validation passed successfully';
  }

  const criticalErrors = result.errors.filter(e => e.severity === 'critical').length;
  const highErrors = result.errors.filter(e => e.severity === 'high').length;
  
  if (criticalErrors > 0) {
    return `Critical data integrity issues detected (${criticalErrors} critical, ${result.errors.length} total errors)`;
  } else if (highErrors > 0) {
    return `Significant data integrity issues detected (${highErrors} high priority, ${result.errors.length} total errors)`;
  } else {
    return `Minor data integrity issues detected (${result.errors.length} errors, ${result.warnings.length} warnings)`;
  }
}

export function getRecoveryRecommendation(result: DataIntegrityResult): string {
  switch (result.summary.recommendedAction) {
    case 'proceed':
      return 'Data quality is acceptable. You can proceed with processing.';
    case 'review_required':
      return 'Data has some issues but is mostly intact. Review warnings before proceeding.';
    case 'manual_intervention':
      return 'Significant data issues detected. Manual intervention recommended before proceeding.';
    case 'abort':
      return 'Critical data integrity issues detected. Processing should be aborted until issues are resolved.';
    default:
      return 'Unable to determine recovery recommendation.';
  }
}