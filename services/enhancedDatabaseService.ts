import { Employee } from '../types';

// Constants for repeated strings
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';
import { DataIntegrityValidator, DataIntegrityResult, RecoveryOption } from './dataIntegrityService';
import { ValidationResult } from './validationService';
import { 
  DataRecoveryCoordinator, 
  RecoveryOptions as RecoveryOpts, 
  DataCleaningUtils 
} from '../utils/dataRecoveryStrategies';
import { 
  AutoFixStrategy,
  DefaultValuesStrategy,
  DataQualityCalculator,
  RecoveryOptionsAnalyzer,
  ErrorReportGenerator
} from '../utils/dataValidationUtils';

export interface DatabaseOperationResult {
  success: boolean;
  data?: Employee[] | Record<string, unknown>;
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

export interface DataRecoveryOptions extends RecoveryOpts {}

/**
 * Enhanced database service with data integrity validation and recovery
 */
export class EnhancedDatabaseService {
  private integrityValidator: DataIntegrityValidator;
  private dataRecoveryCoordinator: DataRecoveryCoordinator;
  private dataCleaningUtils: DataCleaningUtils;
  private autoFixStrategy: AutoFixStrategy;
  private defaultValuesStrategy: DefaultValuesStrategy;
  private dataQualityCalculator: DataQualityCalculator;
  private recoveryOptionsAnalyzer: RecoveryOptionsAnalyzer;
  private errorReportGenerator: ErrorReportGenerator;
  
  private defaultRecoveryOptions: DataRecoveryOptions = {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false,
    promptForMissingData: false,
    maxRecoveryAttempts: 3
  };

  constructor() {
    this.integrityValidator = new DataIntegrityValidator();
    this.dataRecoveryCoordinator = new DataRecoveryCoordinator();
    this.dataCleaningUtils = new DataCleaningUtils();
    this.autoFixStrategy = new AutoFixStrategy();
    this.defaultValuesStrategy = new DefaultValuesStrategy();
    this.dataQualityCalculator = new DataQualityCalculator();
    this.recoveryOptionsAnalyzer = new RecoveryOptionsAnalyzer();
    this.errorReportGenerator = new ErrorReportGenerator();
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
    const context = {
      errors: [] as string[],
      warnings: [] as string[],
      recoveredData: null as Employee[] | null,
      recordsProcessed: 0,
      recordsRecovered: 0
    };

    try {
      const integrityResult = this.validateJsonIntegrity(rawJsonData, options, context);
      const validationResult = this.processEmployeeData(context, options);
      const dataQualityScore = this.dataQualityCalculator.calculateDataQualityScore(
        integrityResult, 
        validationResult ? {
          errors: validationResult.errors.map(e => e.message),
          warnings: validationResult.warnings.map(w => w.message)
        } : undefined
      );

      return this.createSuccessResult(context, integrityResult, validationResult, timestamp, dataQualityScore);

    } catch (error) {
      return this.createErrorResult(context, timestamp, error);
    }
  }

  private validateJsonIntegrity(
    rawJsonData: string, 
    options: DataRecoveryOptions, 
    context: { errors: string[]; warnings: string[]; recoveredData: Employee[] | null; recordsRecovered: number }
  ) {
    const integrityResult = this.integrityValidator.validateJsonIntegrity(rawJsonData);
    
    if (!integrityResult.isValid) {
      this.handleInvalidJson(rawJsonData, options, context, integrityResult);
    } else {
      this.handleValidJson(rawJsonData, context);
    }
    
    return integrityResult;
  }

  private handleInvalidJson(
    rawJsonData: string,
    options: DataRecoveryOptions,
    context: { errors: string[]; warnings: string[]; recoveredData: Employee[] | null; recordsRecovered: number },
    integrityResult: DataIntegrityResult
  ) {
    if (options.autoFix && integrityResult.recoveryOptions.length > 0) {
      const recoveryResult = this.dataRecoveryCoordinator.attemptDataRecovery(rawJsonData, options);
      if (recoveryResult.success) {
        context.recoveredData = recoveryResult.data ?? null;
        context.recordsRecovered = recoveryResult.recordsRecovered;
        context.warnings.push(`Data recovery successful: ${context.recordsRecovered} records recovered`);
      } else {
        context.errors.push(`Data recovery failed: ${recoveryResult.error}`);
      }
    } else {
      context.errors.push('JSON integrity validation failed and recovery is disabled');
    }
  }

  private handleValidJson(
    rawJsonData: string,
    context: { errors: string[]; recoveredData: Employee[] | null }
  ) {
    try {
      const parsed = JSON.parse(rawJsonData) as unknown;
      context.recoveredData = Array.isArray(parsed)
        ? (parsed as unknown as Employee[])
        : [parsed as unknown as Employee];
    } catch (parseError) {
      context.errors.push(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : UNKNOWN_ERROR_MESSAGE}`);
    }
  }

  private processEmployeeData(
    context: { recoveredData: Employee[] | null; recordsProcessed: number; recordsRecovered: number; warnings: string[] },
    options: DataRecoveryOptions
  ): ValidationResult | undefined {
    if (!context.recoveredData || !Array.isArray(context.recoveredData)) {
      return undefined;
    }

    context.recordsProcessed = context.recoveredData.length;
    
    // Apply data cleaning and normalization
    const cleanedData = this.dataCleaningUtils.cleanAndNormalizeData(
      context.recoveredData as Array<Record<string, unknown> | Employee>,
      options
    );
    
    // Validate performance data integrity
    const performanceIntegrityResult = this.integrityValidator.validatePerformanceDataIntegrity(cleanedData);
    
    if (!performanceIntegrityResult.isValid && options.autoFix) {
      const fixedData = this.autoFixStrategy.applyAutoFixes(cleanedData, performanceIntegrityResult);
      context.recoveredData = fixedData.data;
      context.recordsRecovered += fixedData.recordsFixed;
      context.warnings.push(`Auto-fixed ${fixedData.recordsFixed} data issues`);
    }

    return undefined; // Return actual validation result when available
  }

  private createSuccessResult(
    context: { errors: string[]; warnings: string[]; recoveredData: Employee[] | null; recordsProcessed: number; recordsRecovered: number },
    integrityResult: DataIntegrityResult,
    validationResult: ValidationResult | undefined,
    timestamp: string,
    dataQualityScore: number
  ): DatabaseOperationResult {
    const operationName = 'parsePerformanceDataWithIntegrity';
    
    return {
      success: context.errors.length === 0,
      data: context.recoveredData ?? undefined,
      integrityResult,
      validationResult,
      errors: context.errors,
      warnings: context.warnings,
      recoveryOptions: integrityResult.recoveryOptions,
      metadata: {
        operation: operationName,
        timestamp,
        recordsProcessed: context.recordsProcessed,
        recordsRecovered: context.recordsRecovered,
        dataQualityScore
      }
    };
  }

  private createErrorResult(
    context: { errors: string[]; warnings: string[]; recordsProcessed: number; recordsRecovered: number },
    timestamp: string,
    error: unknown
  ): DatabaseOperationResult {
    const operationName = 'parsePerformanceDataWithIntegrity';
    context.errors.push(`Unexpected error during data processing: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`);
    
    return {
      success: false,
      errors: context.errors,
      warnings: context.warnings,
      recoveryOptions: [],
      metadata: {
        operation: operationName,
        timestamp,
        recordsProcessed: context.recordsProcessed,
        recordsRecovered: context.recordsRecovered,
        dataQualityScore: 0
      }
    };
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
    const recordsProcessed = employees.length;
    let recordsRecovered = 0;

    try {
      // Validate data integrity
      const integrityResult = this.integrityValidator.validatePerformanceDataIntegrity(employees);
      
      if (!integrityResult.isValid) {
        if (options.autoFix) {
          const fixResult = this.autoFixStrategy.applyAutoFixes(employees, integrityResult);
          processedData = fixResult.data;
          recordsRecovered = fixResult.recordsFixed;
          warnings.push(`Auto-fixed ${recordsRecovered} data integrity issues`);
        } else {
          errors.push('Data integrity issues detected and auto-fix is disabled');
        }
      }

      // Apply additional data cleaning
      if (options.useDefaultValues) {
        const cleanResult = this.defaultValuesStrategy.applyDefaultValues(processedData);
        processedData = cleanResult.data;
        if (cleanResult.recordsModified > 0) {
          warnings.push(`Applied default values to ${cleanResult.recordsModified} records`);
        }
      }

      // Calculate data quality score
      const dataQualityScore = this.dataQualityCalculator.calculateDataQualityScore(integrityResult);

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
      errors.push(`Error during data retrieval: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`);
      
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

  // Data recovery methods have been moved to DataRecoveryCoordinator

  // JSON fixing methods have been moved to JsonSyntaxFixStrategy

  // Partial data extraction methods have been moved to PartialDataExtractionStrategy

  // Fallback parsing methods have been moved to FallbackParsingStrategy

  // Data cleaning and normalization methods have been moved to DataCleaningUtils

  // String cleaning methods have been moved to DataCleaningUtils

  // Performance data cleaning methods have been moved to DataCleaningUtils

  // Score normalization methods have been moved to DataCleaningUtils

  // Auto-fix methods have been moved to AutoFixStrategy

  // Default values methods have been moved to DefaultValuesStrategy

  // Data quality calculation methods have been moved to DataQualityCalculator

  /**
   * Generate detailed error report
   */
  generateErrorReport(result: DatabaseOperationResult): string {
    return this.errorReportGenerator.generateErrorReport(
      result.metadata.operation,
      result.metadata.timestamp,
      result.metadata.recordsProcessed,
      result.metadata.recordsRecovered,
      result.metadata.dataQualityScore,
      result.errors,
      result.warnings,
      result.recoveryOptions
    );
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
    return this.recoveryOptionsAnalyzer.getRecoveryOptionsForUser(
      result.success,
      result.metadata.dataQualityScore,
      result.recoveryOptions
    );
  }
}

// Export utility functions
export function createEnhancedDatabaseService(): EnhancedDatabaseService {
  return new EnhancedDatabaseService();
}

export function getDataQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  return new DataQualityCalculator().getDataQualityLevel(score);
}
