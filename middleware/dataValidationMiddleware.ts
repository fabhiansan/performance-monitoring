import { Request, Response, NextFunction } from 'express';
import { EnhancedDatabaseService, type DatabaseOperationResult } from '../services/enhancedDatabaseService';
import { validateJsonIntegrity, validatePerformanceDataIntegrity, getIntegrityMessage, getRecoveryRecommendation, DataIntegrityResult, DataIntegrityError, RecoveryOption } from '../services/dataIntegrityService';
import { Employee } from '../types';

// Constants for repeated string literals
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      dataValidation?: {
        integrityResult?: DataIntegrityResult;
        warnings?: string[];
        recoveryApplied?: boolean;
        middlewareError?: string;
      };
      validatedEmployeeData?: {
        employees?: Employee[];
        validationResult?: DatabaseOperationResult;
        dataQualityScore?: number;
      };
    }
  }
}

interface ValidationOptions {
  autoFix?: boolean;
  useDefaultValues?: boolean;
  skipCorruptedRecords?: boolean;
  requireUserConfirmation?: boolean;
  logErrors?: boolean;
  minDataQualityScore?: number;
}

interface ErrorReport {
  timestamp: string;
  endpoint: string;
  reports: Array<{
    type: string;
    result: DataIntegrityResult;
    message: string;
    recommendation: RecoveryOption;
    dbResult?: {
      success: boolean;
      dataQualityScore: number;
      recordsProcessed: number;
      recordsRecovered: number;
    };
    detailedReport?: string;
  }>;
}

interface ValidationResult {
  shouldBlock: boolean;
  statusCode: number;
  body: Record<string, unknown> | null;
  warnings: string[];
  recoveryApplied: boolean;
}

/**
 * Data validation middleware for Express.js
 * Provides comprehensive data integrity checking and error reporting
 */
export class DataValidationMiddleware {
  private enhancedDbService: EnhancedDatabaseService;

  constructor() {
    this.enhancedDbService = new EnhancedDatabaseService();
  }

  /**
   * Middleware to validate JSON data integrity before processing
   */
  validateJsonData(options: ValidationOptions = {}) {
    const defaultOptions = {
      autoFix: true,
      useDefaultValues: true,
      skipCorruptedRecords: false,
      requireUserConfirmation: false,
      logErrors: true
    };
    
    const config = { ...defaultOptions, ...options };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if request contains JSON data that needs validation
        const jsonData = this.extractJsonData(req);
        
        if (!jsonData) {
          return next(); // No JSON data to validate
        }

        // Validate JSON integrity
        const integrityResult = validateJsonIntegrity(jsonData.raw, jsonData.parsed);
        
        // Log validation results if enabled
        if (config.logErrors && !integrityResult.isValid) {
          console.warn('🔍 Data integrity issues detected:', {
            endpoint: req.path,
            method: req.method,
            errors: integrityResult.errors.length,
            warnings: integrityResult.warnings.length,
            integrityScore: integrityResult.summary.integrityScore
          });
        }

        // Handle validation results
        if (!integrityResult.isValid) {
          const response = this.handleValidationFailure(integrityResult, config, req);
          
          if (response.shouldBlock) {
            return res
              .status(response.statusCode)
              .json(response.body ?? {
                success: false,
                error: 'Data validation failed'
              });
          }
          
          // Attach validation results to request for downstream processing
          req.dataValidation = {
            integrityResult,
            warnings: response.warnings,
            recoveryApplied: response.recoveryApplied
          };
        } else {
          req.dataValidation = {
            integrityResult,
            warnings: [],
            recoveryApplied: false
          };
        }

        next();
      } catch (error: unknown) {
        console.error('❌ Data validation middleware error:', error);
        
        if (config.logErrors && error instanceof Error) {
          console.error('Validation middleware stack trace:', error.stack);
        }
        
        // Don't block request on middleware errors, but log them
        req.dataValidation = {
          middlewareError: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
          warnings: ['Data validation middleware encountered an error'],
          recoveryApplied: false
        };
        
        next();
      }
    };
  }

  /**
   * Middleware to validate employee performance data
   */
  validatePerformanceData(options: ValidationOptions = {}) {
    const defaultOptions = {
      autoFix: true,
      useDefaultValues: true,
      minDataQualityScore: 70,
      logErrors: true
    };
    
    const config = { ...defaultOptions, ...options };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract employee data from request
        const employees = this.extractEmployeeData(req);
        
        if (!employees || !Array.isArray(employees)) {
          return next(); // No employee data to validate
        }

        // Validate performance data integrity
        const result = this.enhancedDbService.getEmployeeDataWithIntegrity(employees, {
          autoFix: config.autoFix,
          useDefaultValues: config.useDefaultValues
        });

        // Log validation results
        if (config.logErrors && !result.success) {
          console.warn('📊 Performance data validation issues:', {
            endpoint: req.path,
            method: req.method,
            recordsProcessed: result.metadata.recordsProcessed,
            recordsRecovered: result.metadata.recordsRecovered,
            dataQualityScore: result.metadata.dataQualityScore,
            errors: result.errors.length
          });
        }

        // Check if data quality meets minimum requirements
        if (result.metadata.dataQualityScore < config.minDataQualityScore) {
          const errorResponse = {
            success: false,
            error: 'Data quality below acceptable threshold',
            details: {
              dataQualityScore: result.metadata.dataQualityScore,
              minimumRequired: config.minDataQualityScore,
              errors: result.errors,
              warnings: result.warnings,
              recoveryOptions: result.recoveryOptions.map((opt: RecoveryOption) => ({
                type: opt.type,
                description: opt.description,
                confidence: opt.confidence,
                riskLevel: opt.riskLevel
              }))
            },
            metadata: {
              timestamp: new Date().toISOString(),
              endpoint: req.path,
              validationReport: this.enhancedDbService.generateErrorReport(result)
            }
          };
          
          return res.status(422).json(errorResponse);
        }

        // Attach validated data to request
        req.validatedEmployeeData = {
          employees: Array.isArray(result.data) ? result.data : undefined,
          validationResult: result,
          dataQualityScore: result.metadata.dataQualityScore
        };

        next();
      } catch (error: unknown) {
        console.error('❌ Performance data validation error:', error);
        
        const errorResponse = {
          success: false,
          error: 'Performance data validation failed',
          details: {
            message: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
            timestamp: new Date().toISOString(),
            endpoint: req.path
          }
        };
        
        return res.status(500).json(errorResponse);
      }
    };
  }

  /**
   * Middleware to add data validation headers to responses
   */
  addValidationHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to add validation headers
      res.json = (function patchedJson(body: unknown) {
        if (req.dataValidation) {
          res.set({
            'X-Data-Validation-Applied': 'true',
            'X-Data-Quality-Score': req.dataValidation.integrityResult?.summary?.integrityScore || 'unknown',
            'X-Data-Warnings': req.dataValidation.warnings?.length || 0,
            'X-Recovery-Applied': req.dataValidation.recoveryApplied || false
          });
        }
        
        if (req.validatedEmployeeData) {
          res.set({
            'X-Performance-Data-Validated': 'true',
            'X-Performance-Quality-Score': req.validatedEmployeeData.dataQualityScore ?? 'unknown',
            'X-Records-Processed': req.validatedEmployeeData.validationResult?.metadata.recordsProcessed ?? 0,
            'X-Records-Recovered': req.validatedEmployeeData.validationResult?.metadata.recordsRecovered ?? 0
          });
        }
        
        return originalJson.call(res, body);
      }) as typeof res.json;
      
      next();
    };
  }

  /**
   * Extract JSON data from request
   */
  extractJsonData(req: Request) {
    // Check for JSON in body
    if (req.body && typeof req.body === 'object') {
      try {
        const rawJson = JSON.stringify(req.body);
        return {
          raw: rawJson,
          parsed: req.body
        };
      } catch (error) {
        console.warn('Failed to stringify request body:', error);
      }
    }
    
    // Check for raw JSON string in specific fields
    if (req.body && req.body.performanceData && typeof req.body.performanceData === 'string') {
      return {
        raw: req.body.performanceData,
        parsed: undefined // Will be parsed during validation
      };
    }
    
    return null;
  }

  /**
   * Extract employee data from request
   */
  extractEmployeeData(req: Request) {
    // Check validated data first
    if (req.validatedEmployeeData && req.validatedEmployeeData.employees) {
      return req.validatedEmployeeData.employees;
    }
    
    // Check request body
    if (req.body) {
      if (Array.isArray(req.body)) {
        return req.body;
      }
      
      if (req.body.employees && Array.isArray(req.body.employees)) {
        return req.body.employees;
      }
      
      if (req.body.data && Array.isArray(req.body.data)) {
        return req.body.data;
      }
    }
    
    return null;
  }

  /**
   * Handle validation failure
   */
  handleValidationFailure(integrityResult: DataIntegrityResult, config: ValidationOptions, req: Request): ValidationResult {
    const warnings = [];
    let recoveryApplied = false;
    let shouldBlock = false;
    let statusCode = 200;
    let body = null;

    // Determine severity
    const criticalErrors = integrityResult.errors.filter((e: DataIntegrityError) => e.severity === 'critical');
    const highErrors = integrityResult.errors.filter((e: DataIntegrityError) => e.severity === 'high');
    
    // Handle critical errors
    if (criticalErrors.length > 0) {
      shouldBlock = true;
      statusCode = 400;
      body = {
        success: false,
        error: 'Critical data integrity issues detected',
        details: {
          message: getIntegrityMessage(integrityResult),
          recommendation: getRecoveryRecommendation(integrityResult),
          errors: criticalErrors.map((e: DataIntegrityError) => ({
            type: e.type,
            message: e.message,
            severity: e.severity,
            recoverable: e.recoverable
          })),
          integrityScore: integrityResult.summary.integrityScore,
          recoveryOptions: integrityResult.recoveryOptions.map((opt: RecoveryOption) => ({
            type: opt.type,
            description: opt.description,
            confidence: opt.confidence,
            riskLevel: opt.riskLevel
          }))
        },
        metadata: {
          timestamp: new Date().toISOString(),
          endpoint: req.path,
          totalErrors: integrityResult.errors.length,
          totalWarnings: integrityResult.warnings.length
        }
      };
    }
    // Handle high priority errors
    else if (highErrors.length > 0 && !config.autoFix) {
      shouldBlock = true;
      statusCode = 422;
      body = {
        success: false,
        error: 'High priority data issues detected',
        details: {
          message: getIntegrityMessage(integrityResult),
          recommendation: 'Enable auto-fix or manually resolve issues',
          errors: highErrors.map((e: DataIntegrityError) => ({
            type: e.type,
            message: e.message,
            severity: e.severity,
            recoverable: e.recoverable
          })),
          integrityScore: integrityResult.summary.integrityScore
        }
      };
    }
    // Handle recoverable issues with auto-fix
    else if (config.autoFix && integrityResult.recoveryOptions.length > 0) {
      warnings.push('Data issues detected and auto-recovery applied');
      recoveryApplied = true;
    }
    // Handle minor issues
    else {
      warnings.push(`Data validation completed with ${integrityResult.errors.length} errors and ${integrityResult.warnings.length} warnings`);
    }

    return {
      shouldBlock,
      statusCode,
      body,
      warnings,
      recoveryApplied
    };
  }

  /**
   * Create error reporting endpoint
   */
  createErrorReportingEndpoint() {
    return (req: Request, res: Response) => {
      try {
        const { rawData, employeeData } = req.body;
        
        const report: ErrorReport = {
          timestamp: new Date().toISOString(),
          endpoint: req.path,
          reports: []
        };
        
        // Validate JSON data if provided
        if (rawData) {
          const jsonIntegrityResult = validateJsonIntegrity(rawData);
          report.reports.push({
            type: 'json_integrity',
            result: jsonIntegrityResult,
            message: getIntegrityMessage(jsonIntegrityResult),
            recommendation: jsonIntegrityResult.recoveryOptions[0] || {
              type: 'manual_review',
              description: 'Manual review required',
              action: 'review_data',
              confidence: 'medium'
            }
          });
        }
        
        // Validate employee data if provided
        if (employeeData && Array.isArray(employeeData)) {
          const performanceIntegrityResult = validatePerformanceDataIntegrity(employeeData);
          const dbResult = this.enhancedDbService.getEmployeeDataWithIntegrity(employeeData);
          
          report.reports.push({
            type: 'performance_data_integrity',
            result: performanceIntegrityResult,
            message: getIntegrityMessage(performanceIntegrityResult),
            recommendation: performanceIntegrityResult.recoveryOptions[0] || {
              type: 'manual_review',
              description: 'Manual review required',
              action: 'review_data',
              confidence: 'medium'
            },
            dbResult: {
              success: dbResult.success,
              dataQualityScore: dbResult.metadata.dataQualityScore,
              recordsProcessed: dbResult.metadata.recordsProcessed,
              recordsRecovered: dbResult.metadata.recordsRecovered
            },
            detailedReport: this.enhancedDbService.generateErrorReport(dbResult)
          });
        }
        
        res.json({
          success: true,
          data: report,
          message: 'Data validation report generated successfully'
        });
        
      } catch (error: unknown) {
        console.error('Error generating validation report:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate validation report',
          details: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
        });
      }
    };
  }

  /**
   * Create data recovery endpoint
   */
  createDataRecoveryEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const { rawData, recoveryOptions = {} } = req.body;
        
        if (!rawData) {
          return res.status(400).json({
            success: false,
            error: 'Raw data is required for recovery'
          });
        }
        
        // Attempt data recovery
        const result = this.enhancedDbService.parsePerformanceDataWithIntegrity(rawData, {
          autoFix: true,
          useDefaultValues: true,
          skipCorruptedRecords: false,
          ...recoveryOptions
        });
        
        const userOptions = this.enhancedDbService.getRecoveryOptionsForUser(result);
        
        return res.json({
          success: result.success,
          data: {
            recoveredData: result.data,
            recoveryReport: {
              recordsProcessed: result.metadata.recordsProcessed,
              recordsRecovered: result.metadata.recordsRecovered,
              dataQualityScore: result.metadata.dataQualityScore,
              canProceed: userOptions.canProceed,
              requiresUserAction: userOptions.requiresUserAction,
              recommendations: userOptions.recommendations,
              availableActions: userOptions.actions
            },
            errors: result.errors,
            warnings: result.warnings
          },
          message: result.success ? 'Data recovery completed successfully' : 'Data recovery completed with issues',
          metadata: {
            timestamp: new Date().toISOString(),
            detailedReport: this.enhancedDbService.generateErrorReport(result)
          }
        });
        
      } catch (error: unknown) {
        console.error('Error during data recovery:', error);
        return res.status(500).json({
          success: false,
          error: 'Data recovery failed',
          details: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
        });
      }
    };
  }
}

// Export middleware instance and utility functions
export const dataValidationMiddleware = new DataValidationMiddleware();

export function createValidationMiddleware(_options: ValidationOptions = {}) {
  return new DataValidationMiddleware();
}

export function validateJsonMiddleware(options: ValidationOptions = {}) {
  return dataValidationMiddleware.validateJsonData(options);
}

export function validatePerformanceMiddleware(options: ValidationOptions = {}) {
  return dataValidationMiddleware.validatePerformanceData(options);
}

export function addValidationHeadersMiddleware() {
  return dataValidationMiddleware.addValidationHeaders();
}

export function createErrorReportingEndpoint() {
  return dataValidationMiddleware.createErrorReportingEndpoint();
}

export function createDataRecoveryEndpoint() {
  return dataValidationMiddleware.createDataRecoveryEndpoint();
}
