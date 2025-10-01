import { Employee } from '../types';
import { ValidationResult, PerformanceDataValidator } from './validationService';
import {
  JsonValidationRules,
  DataStructureValidationRules,
  EmployeeRecordValidationRules,
  PerformanceDataValidationRules,
  EmployeePerformanceIntegrityRules
} from '../utils/validationRules';
import {
  RecoveryOptionGenerator,
  IntegritySummaryGenerator,
  ValidationErrorConverter,
  IntegrityMessageGenerator
} from '../utils/integrityAnalysis';

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
  affectedData?: unknown;
  recoverable: boolean;
  employeeName?: string;
  fieldName?: string;
}

export interface DataIntegrityWarning {
  type: 'partial_corruption' | 'data_inconsistency' | 'format_anomaly' | 'encoding_issue';
  message: string;
  details: string;
  affectedData?: unknown;
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
  recoveryData?: unknown;
}

export interface DataIntegritySummary {
  totalRecords: number;
  corruptedRecords: number;
  recoverableRecords: number;
  dataLossPercentage: number;
  integrityScore: number; // 0-100
  recommendedAction: 'proceed' | 'review_required' | 'manual_intervention' | 'abort';
}

interface JsonValidationResult {
  isValid: boolean;
  parsedData?: unknown;
  error?: string;
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
  
  // Validation rule classes
  private jsonValidationRules: JsonValidationRules;
  private dataStructureRules: DataStructureValidationRules;
  private employeeRecordRules: EmployeeRecordValidationRules;
  private performanceDataRules: PerformanceDataValidationRules;
  private employeePerformanceRules: EmployeePerformanceIntegrityRules;
  
  // Analysis utility classes
  private recoveryOptionGenerator: RecoveryOptionGenerator;
  private integritySummaryGenerator: IntegritySummaryGenerator;
  private validationErrorConverter: ValidationErrorConverter;

  constructor() {
    this.performanceValidator = new PerformanceDataValidator();
    
    // Initialize validation rules
    this.jsonValidationRules = new JsonValidationRules();
    this.dataStructureRules = new DataStructureValidationRules();
    this.employeeRecordRules = new EmployeeRecordValidationRules();
    this.performanceDataRules = new PerformanceDataValidationRules();
    this.employeePerformanceRules = new EmployeePerformanceIntegrityRules();
    
    // Initialize analysis utilities
    this.recoveryOptionGenerator = new RecoveryOptionGenerator();
    this.integritySummaryGenerator = new IntegritySummaryGenerator();
    this.validationErrorConverter = new ValidationErrorConverter();
  }

  /**
   * Validate JSON data integrity after parsing
   */
  validateJsonIntegrity(rawData: string, parsedData?: unknown): DataIntegrityResult {
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
  private validateJsonParsing(rawData: string, parsedData?: unknown): JsonValidationResult {
    // Validate raw data
    const rawDataErrors = this.jsonValidationRules.validateRawData(rawData);
    this.errors.push(...rawDataErrors);
    
    if (rawDataErrors.length > 0) {
      return { isValid: false };
    }

    // Validate parsed data if provided
    if (parsedData !== undefined) {
      const parsedDataErrors = this.jsonValidationRules.validateParsedData(parsedData, rawData);
      this.errors.push(...parsedDataErrors);
      
      if (parsedDataErrors.length === 0) {
        return { isValid: true, parsedData: JSON.parse(rawData) };
      } else {
        const lastError = parsedDataErrors[parsedDataErrors.length - 1];
        return { isValid: false, error: lastError.details };
      }
    }

    // Parse the raw data
    try {
      const parsed = JSON.parse(rawData);
      return { isValid: true, parsedData: parsed };
    } catch (error) {
      const parseErrors = this.jsonValidationRules.validateParsedData(undefined, rawData);
      this.errors.push(...parseErrors);
      return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validate data structure integrity
   */
  private validateDataStructure(data: unknown): void {
    const validation = this.dataStructureRules.validateDataStructure(data);
    this.errors.push(...validation.errors);
    this.warnings.push(...validation.warnings);
  }

  /**
   * Validate employee data integrity
   */
  private validateEmployeeDataIntegrity(employees: unknown[]): void {
    employees.forEach((employee, index) => {
      const validation = this.employeeRecordRules.validateEmployeeRecord(employee, index);
      this.errors.push(...validation.errors);
      this.warnings.push(...validation.warnings);
      
      // Validate performance data if employee record is valid
      if (validation.errors.length === 0 && typeof employee === 'object' && employee !== null) {
        const empRecord = employee as Record<string, unknown>;
        if (empRecord.performance !== undefined) {
          const employeeName = (empRecord.name as string) || `Employee ${index + 1}`;
          const perfValidation = this.performanceDataRules.validatePerformanceDataStructure(
            empRecord.performance, 
            employeeName
          );
          this.errors.push(...perfValidation.errors);
          this.warnings.push(...perfValidation.warnings);
        }
      }
    });
  }

  // Employee record validation has been moved to EmployeeRecordValidationRules

  // Performance data structure validation has been moved to PerformanceDataValidationRules

  // Performance entry validation has been moved to PerformanceDataValidationRules

  /**
   * Validate individual employee performance integrity
   */
  private validateEmployeePerformanceIntegrity(employee: Employee): void {
    const validation = this.employeePerformanceRules.validateEmployeePerformanceIntegrity(employee);
    this.errors.push(...validation.errors);
    this.warnings.push(...validation.warnings);
  }

  // Encoding issue checking has been moved to EmployeePerformanceIntegrityRules

  // Text encoding issue detection has been moved to EmployeePerformanceIntegrityRules

  // JSON error recoverability checking has been moved to JsonValidationRules

  /**
   * Convert standard validation errors to integrity errors
   */
  private convertStandardValidationErrors(validation: ValidationResult): void {
    const converted = this.validationErrorConverter.convertStandardValidationErrors(validation);
    this.errors.push(...converted.errors);
    this.warnings.push(...converted.warnings);
  }

  // Validation error severity mapping has been moved to ValidationErrorConverter

  /**
   * Generate recovery options based on detected issues
   */
  private generateRecoveryOptions(): void {
    this.recoveryOptions = this.recoveryOptionGenerator.generateRecoveryOptions(this.errors);
  }

  /**
   * Generate integrity summary
   */
  private generateIntegritySummary(data: unknown): DataIntegritySummary {
    return this.integritySummaryGenerator.generateIntegritySummary(data, this.errors);
  }
}

/**
 * Utility functions for data integrity validation
 */
export function validateJsonIntegrity(rawData: string, parsedData?: unknown): DataIntegrityResult {
  const validator = new DataIntegrityValidator();
  return validator.validateJsonIntegrity(rawData, parsedData);
}

export function validatePerformanceDataIntegrity(employees: Employee[]): DataIntegrityResult {
  const validator = new DataIntegrityValidator();
  return validator.validatePerformanceDataIntegrity(employees);
}

export function getIntegrityMessage(result: DataIntegrityResult): string {
  const messageGenerator = new IntegrityMessageGenerator();
  return messageGenerator.getIntegrityMessage(result.isValid, result.errors);
}

export function getRecoveryRecommendation(result: DataIntegrityResult): string {
  const messageGenerator = new IntegrityMessageGenerator();
  return messageGenerator.getRecoveryRecommendation(result.summary.recommendedAction);
}
