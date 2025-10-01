/**
 * Validation rules extracted from dataIntegrityService
 */

import { Employee } from '../types';
import { DataIntegrityError, DataIntegrityWarning } from '../services/dataIntegrityService';

// Constants for repeated strings
const PERFORMANCE_SCORE_INVALID_MESSAGE = 'Performance score is not a valid number';

/**
 * JSON validation rules
 */
export class JsonValidationRules {
  validateRawData(rawData: unknown): DataIntegrityError[] {
    const errors: DataIntegrityError[] = [];

    if (!rawData || typeof rawData !== 'string') {
      errors.push({
        type: 'json_parse_error',
        message: 'Invalid raw data provided',
        details: 'Raw data is null, undefined, or not a string',
        severity: 'critical',
        recoverable: false
      });
    }

    return errors;
  }

  validateParsedData(parsedData: unknown, rawData: string): DataIntegrityError[] {
    const errors: DataIntegrityError[] = [];

    if (parsedData !== undefined) {
      try {
        const reparsed = JSON.parse(rawData);
        if (JSON.stringify(reparsed) !== JSON.stringify(parsedData)) {
          errors.push({
            type: 'data_corruption',
            message: 'Parsed data does not match raw JSON data',
            details: 'Data corruption detected during parsing process',
            severity: 'high',
            recoverable: true
          });
        }
      } catch (error) {
        errors.push({
          type: 'json_parse_error',
          message: 'JSON parsing failed',
          details: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
          recoverable: this.isRecoverableJsonError(rawData, error)
        });
      }
    }

    return errors;
  }

  private isRecoverableJsonError(rawData: string, error: unknown): boolean {
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
}

/**
 * Data structure validation rules
 */
export class DataStructureValidationRules {
  validateDataStructure(data: unknown): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];

    if (data === null || data === undefined) {
      errors.push({
        type: 'critical_data_loss',
        message: 'Data is null or undefined',
        details: 'Complete data loss detected',
        severity: 'critical',
        recoverable: false
      });
      return { errors, warnings };
    }

    // Check for expected array structure
    if (!Array.isArray(data)) {
      warnings.push({
        type: 'format_anomaly',
        message: 'Data is not in expected array format',
        details: `Expected array, got ${typeof data}`,
        affectedData: typeof data
      });
    }

    // Check for empty data
    if (Array.isArray(data) && data.length === 0) {
      warnings.push({
        type: 'data_inconsistency',
        message: 'Empty data array',
        details: 'No employee records found in data'
      });
    }

    return { errors, warnings };
  }
}

/**
 * Employee record validation rules
 */
export class EmployeeRecordValidationRules {
  validateEmployeeRecord(employee: unknown, index: number): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];
    const employeeName = (employee as { name?: string })?.name || `Employee ${index + 1}`;

    // Check for null/undefined employee
    if (employee === null || employee === undefined) {
      errors.push({
        type: 'critical_data_loss',
        message: `Employee record is null/undefined`,
        details: `Employee at index ${index} is completely missing`,
        severity: 'high',
        recoverable: false,
        employeeName
      });
      return { errors, warnings };
    }

    if (typeof employee !== 'object') {
      errors.push({
        type: 'schema_violation',
        message: 'Employee record is not an object',
        details: `Employee at index ${index} is not an object`,
        severity: 'high',
        recoverable: false,
        employeeName
      });
      return { errors, warnings };
    }

    const empRecord = employee as Record<string, unknown>;

    // Check required fields
    const requiredFields = ['name'];
    requiredFields.forEach(field => {
      if (!empRecord[field] || (typeof empRecord[field] === 'string' && (empRecord[field] as string).trim() === '')) {
        errors.push({
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

    return { errors, warnings };
  }
}

/**
 * Performance data validation rules
 */
export class PerformanceDataValidationRules {
  validatePerformanceDataStructure(
    performance: unknown, 
    employeeName: string
  ): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];

    if (performance === null) {
      warnings.push({
        type: 'data_inconsistency',
        message: 'Performance data is null',
        details: 'Employee has null performance data',
        employeeName
      });
      return { errors, warnings };
    }

    if (!Array.isArray(performance)) {
      errors.push({
        type: 'schema_violation',
        message: 'Performance data is not an array',
        details: `Expected array, got ${typeof performance}`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance'
      });
      return { errors, warnings };
    }

    // Validate each performance entry
    performance.forEach((perf, index) => {
      const entryValidation = this.validatePerformanceEntry(perf, index, employeeName);
      errors.push(...entryValidation.errors);
      warnings.push(...entryValidation.warnings);
    });

    return { errors, warnings };
  }

  validatePerformanceEntry(
    perf: unknown, 
    index: number, 
    employeeName: string
  ): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];

    if (perf === null || perf === undefined) {
      errors.push({
        type: 'data_corruption',
        message: 'Performance entry is null/undefined',
        details: `Performance entry ${index} is missing`,
        severity: 'medium',
        recoverable: true,
        employeeName
      });
      return { errors, warnings };
    }

    if (typeof perf !== 'object') {
      errors.push({
        type: 'schema_violation',
        message: 'Performance entry is not an object',
        details: `Performance entry ${index} is not an object`,
        severity: 'medium',
        recoverable: true,
        employeeName
      });
      return { errors, warnings };
    }

    const perfRecord = perf as Record<string, unknown>;

    // Check required performance fields
    if (!perfRecord.name || typeof perfRecord.name !== 'string') {
      errors.push({
        type: 'schema_violation',
        message: 'Performance entry missing competency name',
        details: `Performance entry ${index} has invalid or missing name`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.name'
      });
    }

    if (perfRecord.score === undefined || perfRecord.score === null) {
      errors.push({
        type: 'schema_violation',
        message: 'Performance entry missing score',
        details: `Performance entry ${index} has missing score`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.score'
      });
    } else if (typeof perfRecord.score !== 'number' || isNaN(perfRecord.score)) {
      errors.push({
        type: 'data_corruption',
        message: PERFORMANCE_SCORE_INVALID_MESSAGE,
        details: `Performance entry ${index} has invalid score: ${perfRecord.score}`,
        severity: 'medium',
        recoverable: true,
        employeeName,
        fieldName: 'performance.score'
      });
    } else if (perfRecord.score < 0 || perfRecord.score > 100) {
      warnings.push({
        type: 'data_inconsistency',
        message: 'Performance score out of expected range',
        details: `Score ${perfRecord.score} is outside 0-100 range`,
        employeeName,
        fieldName: 'performance.score'
      });
    }

    return { errors, warnings };
  }
}

/**
 * Employee performance integrity validation rules
 */
export class EmployeePerformanceIntegrityRules {
  validateEmployeePerformanceIntegrity(employee: Employee): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];

    // Check for data consistency
    if (employee.performance && employee.performance.length > 0) {
      const uniqueCompetencies = new Set(employee.performance.map(p => p.name.toLowerCase()));
      if (uniqueCompetencies.size !== employee.performance.length) {
        warnings.push({
          type: 'data_inconsistency',
          message: 'Duplicate competencies found',
          details: 'Employee has duplicate competency entries',
          employeeName: employee.name
        });
      }
    }

    // Check for encoding issues
    const encodingValidation = this.checkEncodingIssues(employee);
    warnings.push(...encodingValidation);

    return { errors, warnings };
  }

  private checkEncodingIssues(employee: Employee): DataIntegrityWarning[] {
    const warnings: DataIntegrityWarning[] = [];
    const textFields = [employee.name, employee.nip, employee.position, employee.organizational_level];
    
    textFields.forEach(field => {
      if (field && this.hasEncodingIssues(field)) {
        warnings.push({
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
        warnings.push({
          type: 'encoding_issue',
          message: 'Competency name has encoding issues',
          details: `Competency name contains suspicious characters: ${perf.name}`,
          employeeName: employee.name
        });
      }
    });

    return warnings;
  }

  private hasEncodingIssues(text: string): boolean {
    // Check for common encoding issue patterns
    const encodingPatterns = [
      /\uFFFD/, // Replacement character
      /[\p{Cc}]/u, // Control characters
      /\\u[0-9a-fA-F]{4}/, // Escaped unicode
      /â€™|â€œ|â€/, // Common UTF-8 encoding issues
    ];

    return encodingPatterns.some(pattern => pattern.test(text));
  }
}