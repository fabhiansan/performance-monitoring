import { logger } from './logger';
import { DataParserService } from './dataParser';
import { DataRecoveryService } from './dataRecovery';
import { DatabaseOperationsService, DatabaseOperationResult } from './databaseOperations';
import { DataIntegrityValidator } from './dataIntegrityService';
import { validatePerformanceData } from './validationService';
import { Employee } from '../types';

export interface ProcessingOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  skipCorruptedRecords: boolean;
  validateData: boolean;
  checkIntegrity: boolean;
  maxRecoveryAttempts: number;
}

interface ParseResult {
  success: boolean;
  data?: Employee[];
  errors: string[];
  warnings: string[];
  recordsProcessed: number;
  recordsRecovered: number;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  shouldStop: boolean;
}

interface IntegrityResult {
  errors: string[];
  warnings: string[];
}

/**
 * Orchestrator service that coordinates data parsing, validation, recovery, and storage
 * Replaces the monolithic EnhancedDatabaseService with a modular approach
 */
export class DatabaseServiceOrchestrator {
  private parser: DataParserService;
  private recovery: DataRecoveryService;
  private operations: DatabaseOperationsService;
  private integrityValidator: DataIntegrityValidator;

  private defaultOptions: ProcessingOptions = {
    autoFix: true,
    useDefaultValues: true,
    skipCorruptedRecords: false,
    validateData: true,
    checkIntegrity: true,
    maxRecoveryAttempts: 3
  };

  constructor() {
    this.parser = new DataParserService();
    this.recovery = new DataRecoveryService();
    this.operations = new DatabaseOperationsService();
    this.integrityValidator = new DataIntegrityValidator();
  }

  // Helper function to parse JSON data
  private async parseData(jsonString: string, opts: ProcessingOptions): Promise<ParseResult> {
    logger.debug('Step 1: Parsing performance data');
    const parseResult = await this.parser.parsePerformanceData(jsonString, {
      autoFix: opts.autoFix,
      useDefaultValues: opts.useDefaultValues,
      skipCorruptedRecords: opts.skipCorruptedRecords,
      maxRecoveryAttempts: opts.maxRecoveryAttempts
    });

    if (!parseResult.success || !parseResult.data) {
      return { success: false, errors: parseResult.errors, warnings: parseResult.warnings, recordsProcessed: parseResult.recordsProcessed ?? 0, recordsRecovered: parseResult.recordsRecovered ?? 0 };
    }

    return {
      success: true,
      data: parseResult.data,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      recordsProcessed: parseResult.recordsProcessed ?? parseResult.data.length ?? 0,
      recordsRecovered: parseResult.recordsRecovered ?? 0
    };
  }

  // Helper function to validate data
  private validateData(processedData: Employee[], opts: ProcessingOptions): ValidationResult {
    if (!opts.validateData) {
      return { errors: [], warnings: [], shouldStop: false };
    }

    logger.debug('Step 2: Validating performance data');
    const validationResult = validatePerformanceData(processedData);
    
    const errors = validationResult.errors.map(error =>
      error.details ? `${error.message}: ${error.details}` : error.message
    );
    const warnings = validationResult.warnings.map(warning =>
      warning.details ? `${warning.message}: ${warning.details}` : warning.message
    );
    
    return {
      errors,
      warnings,
      shouldStop: !validationResult.isValid && !opts.autoFix
    };
  }

  // Helper function to check data integrity
  private async checkIntegrity(processedData: Employee[], opts: ProcessingOptions): Promise<IntegrityResult> {
    if (!opts.checkIntegrity) {
      return { errors: [], warnings: [] };
    }

    logger.debug('Step 3: Checking data integrity');
    const integrityResult = await this.integrityValidator.validatePerformanceDataIntegrity(processedData);
    
    const errors = integrityResult.errors.map(error =>
      error.details ? `${error.message}: ${error.details}` : error.message
    );
    const warnings = integrityResult.warnings.map(warning =>
      warning.details ? `${warning.message}: ${warning.details}` : warning.message
    );

    if (opts.autoFix && integrityResult.recoveryOptions.length > 0) {
      logger.debug('Applying integrity fixes');
      warnings.push('Applied automatic integrity fixes');
    }

    return { errors, warnings };
  }

  // Helper function to apply recovery
  private async applyRecovery(processedData: Employee[], opts: ProcessingOptions, allErrors: string[], allWarnings: string[]): Promise<Employee[]> {
    if (!opts.autoFix || (allErrors.length === 0 && allWarnings.length === 0)) {
      return processedData;
    }

    logger.debug('Step 4: Applying data recovery');
    const recoveryResult = await this.recovery.recoverEmployeeData(processedData, {
      autoFix: opts.autoFix,
      useDefaultValues: opts.useDefaultValues,
      maxRecoveryAttempts: opts.maxRecoveryAttempts
    });

    if (recoveryResult.success && recoveryResult.data) {
      allWarnings.push(...recoveryResult.warnings);
      return recoveryResult.data;
    }

    return processedData;
  }

  /**
   * Main entry point: parse, validate, recover, and store performance data
   */
  async processPerformanceData(
    jsonString: string,
    options: Partial<ProcessingOptions> = {}
  ): Promise<DatabaseOperationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    logger.info('Starting performance data processing pipeline', {
      dataLength: jsonString.length,
      options: opts
    });

    try {
      // Step 1: Parse the JSON data
      const parseResult = await this.parseData(jsonString, opts);
      if (!parseResult.success) {
        return this.createFailureResult('parse', parseResult.errors, parseResult.warnings);
      }

      let processedData = parseResult.data;
      const allWarnings: string[] = [...parseResult.warnings];
      const allErrors: string[] = [...parseResult.errors];

      // Ensure we have data to validate
      if (!processedData) {
        return this.createFailureResult('parse', ['No data found after parsing'], allWarnings);
      }

      // Step 2: Validate data if requested
      const validationResult = this.validateData(processedData, opts);
      allErrors.push(...validationResult.errors);
      allWarnings.push(...validationResult.warnings);
      
      if (validationResult.shouldStop) {
        return this.createFailureResult('validation', allErrors, allWarnings);
      }

      // Step 3: Check data integrity if requested
      const integrityResult = await this.checkIntegrity(processedData, opts);
      allErrors.push(...integrityResult.errors);
      allWarnings.push(...integrityResult.warnings);

      // Step 4: Apply recovery and fixes if needed
      processedData = await this.applyRecovery(processedData, opts, allErrors, allWarnings);

      // Step 5: Store the processed data
      logger.debug('Step 5: Storing processed data');
      const storeResult = await this.operations.storeEmployeeData(processedData, {
        validateData: false, // Already validated
        checkIntegrity: false, // Already checked
        autoFix: false, // Already fixed
        useTransactions: true
      });

      const duration = Date.now() - startTime;
      
      logger.info('Performance data processing pipeline completed', {
        success: storeResult.success,
        originalDataLength: jsonString.length,
        finalRecordCount: processedData.length,
        errorsCount: allErrors.length,
        warningsCount: allWarnings.length,
        duration
      });

      // Return consolidated result
      return {
        ...storeResult,
        errors: [...allErrors, ...storeResult.errors],
        warnings: [...allWarnings, ...storeResult.warnings],
        metadata: {
          ...storeResult.metadata,
          operation: 'process_performance_data',
          recordsProcessed: parseResult.recordsProcessed,
          recordsRecovered: parseResult.recordsRecovered
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Performance data processing pipeline failed', {
        error: errorMessage,
        dataLength: jsonString.length
      });

      return this.createFailureResult('pipeline', [errorMessage], []);
    }
  }

  /**
   * Get employee data with integrity validation
   */
  async getEmployeeDataWithIntegrity(
    sessionId: string,
    options: Partial<ProcessingOptions> = {}
  ): Promise<DatabaseOperationResult> {
    const opts = { ...this.defaultOptions, ...options };

    logger.info('Getting employee data with integrity checks', {
      sessionId,
      options: opts
    });

    try {
      // Get data from database
      const result = await this.operations.getEmployeeData(sessionId, {
        validateData: opts.validateData,
        checkIntegrity: opts.checkIntegrity,
        autoFix: opts.autoFix
      });

      if (!result.success || !result.data) {
        return result;
      }

      let processedData = result.data;
      const allWarnings = [...result.warnings];
      const allErrors = [...result.errors];

      // Apply integrity checks and recovery if requested
      if (opts.checkIntegrity) {
        const integrityResult = await this.integrityValidator.validatePerformanceDataIntegrity(processedData);
        
        if (!integrityResult.isValid) {
          allErrors.push(
            ...integrityResult.errors.map(error =>
              error.details ? `${error.message}: ${error.details}` : error.message
            )
          );
          allWarnings.push(
            ...integrityResult.warnings.map(warning =>
              warning.details ? `${warning.message}: ${warning.details}` : warning.message
            )
          );

          if (opts.autoFix) {
            const recoveryResult = await this.recovery.recoverEmployeeData(processedData, {
              autoFix: true,
              useDefaultValues: opts.useDefaultValues
            });

            if (recoveryResult.success && recoveryResult.data) {
              processedData = recoveryResult.data;
              allWarnings.push(...recoveryResult.warnings);
            }
          }
        }
      }

      return {
        ...result,
        data: processedData,
        errors: allErrors,
        warnings: allWarnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get employee data with integrity', {
        sessionId,
        error: errorMessage
      });

      return this.createFailureResult('get_data', [errorMessage], []);
    }
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport(result: DatabaseOperationResult): string {
    return this.operations.generateErrorReport(result);
  }

  /**
   * Get recovery options for user
   */
  getRecoveryOptionsForUser(result: DatabaseOperationResult) {
    return this.operations.getRecoveryOptions(result);
  }

  /**
   * Create a standardized failure result
   */
  private createFailureResult(
    operation: string,
    errors: string[],
    warnings: string[]
  ): DatabaseOperationResult {
    return {
      success: false,
      errors,
      warnings,
      metadata: {
        operation,
        timestamp: new Date().toISOString(),
        recordsProcessed: 0,
        recordsRecovered: 0,
        dataQualityScore: 0
      }
    };
  }
}

// Export singleton instance for backward compatibility
export const enhancedDatabaseService = new DatabaseServiceOrchestrator();

// Also export the class for direct instantiation if needed
export { DatabaseServiceOrchestrator as EnhancedDatabaseService };
