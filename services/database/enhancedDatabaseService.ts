/**
 * Enhanced Database Service (Refactored)
 * 
 * Simplified service with reduced cognitive complexity using composition
 */

import { Employee } from '../../types';
import { DataIntegrityValidator, DataIntegrityResult, RecoveryOption } from '../dataIntegrityService';
import { ValidationResult } from '../validationService';
import { DataRecoveryEngine, RecoveryOptions } from './dataRecoveryEngine';
import { DataCleaningService, CleaningOptions } from './dataCleaningService';
import { DataQualityAnalyzer, QualityReport } from './qualityAnalyzer';
import { logger } from '../logger';

export interface ProcessingMetadata {
  operation: string;
  timestamp: string;
  recordsProcessed: number;
  recordsRecovered: number;
  dataQualityScore: number;
  [key: string]: unknown;
}

export interface DatabaseOperationResult {
  success: boolean;
  data?: Employee[] | Record<string, unknown>;
  integrityResult?: DataIntegrityResult;
  validationResult?: ValidationResult;
  qualityReport?: QualityReport;
  errors: string[];
  warnings: string[];
  recoveryOptions: RecoveryOption[];
  metadata: ProcessingMetadata;
}

export interface ProcessingOptions {
  recovery: Partial<RecoveryOptions>;
  cleaning: Partial<CleaningOptions>;
  enableQualityAnalysis: boolean;
}

/**
 * Enhanced database service with modular data processing components
 */
export class EnhancedDatabaseService {
  private integrityValidator: DataIntegrityValidator;
  private recoveryEngine: DataRecoveryEngine;
  private cleaningService: DataCleaningService;
  private qualityAnalyzer: DataQualityAnalyzer;

  private defaultOptions: ProcessingOptions = {
    recovery: {
      autoFix: true,
      useDefaultValues: true,
      skipCorruptedRecords: false,
      maxRecoveryAttempts: 3
    },
    cleaning: {
      useDefaultValues: true,
      strictValidation: false,
      autoCorrectTypes: true
    },
    enableQualityAnalysis: true
  };

  constructor() {
    this.integrityValidator = new DataIntegrityValidator();
    this.recoveryEngine = new DataRecoveryEngine();
    this.cleaningService = new DataCleaningService();
    this.qualityAnalyzer = new DataQualityAnalyzer();
  }

  /**
   * Parse and validate JSON performance data with integrity checks
   */
  parsePerformanceDataWithIntegrity(
    rawJsonData: string,
    options: Partial<ProcessingOptions> = {}
  ): DatabaseOperationResult {
    const opts = this.mergeOptions(options);
    const metadata = this.initializeMetadata('parsePerformanceDataWithIntegrity');
    
    try {
      // Step 1: Validate JSON integrity
      const integrityResult = this.integrityValidator.validateJsonIntegrity(rawJsonData);
      
      // Step 2: Attempt data recovery if needed
      const parseResult = this.parseWithRecovery(rawJsonData, integrityResult, opts);
      
      // Step 3: Clean and validate the data
      const cleaningResult = this.processDataCleaning(parseResult.data, opts);
      
      // Step 4: Analyze data quality
      const qualityReport = this.analyzeDataQuality(cleaningResult.data, integrityResult, opts);
      
      return this.buildOperationResult({
        parseResult,
        cleaningResult,
        integrityResult,
        qualityReport,
        metadata,
        opts
      });

    } catch (error) {
      return this.handleProcessingError(error, metadata);
    }
  }

  /**
   * Retrieve and validate employee data with integrity checks
   */
  getEmployeeDataWithIntegrity(
    employees: Employee[],
    options: Partial<ProcessingOptions> = {}
  ): DatabaseOperationResult {
    const opts = this.mergeOptions(options);
    const metadata = this.initializeMetadata('getEmployeeDataWithIntegrity', employees.length);

    try {
      // Step 1: Validate data integrity
      const integrityResult = this.integrityValidator.validatePerformanceDataIntegrity(employees);
      
      // Step 2: Apply data cleaning
      const cleaningResult = this.processDataCleaning(employees, opts);
      
      // Step 3: Analyze data quality
      const qualityReport = this.analyzeDataQuality(cleaningResult.data, integrityResult, opts);

      return this.buildEmployeeDataResult({
        employees: cleaningResult.data,
        cleaningResult,
        integrityResult,
        qualityReport,
        metadata,
        opts
      });

    } catch (error) {
      return this.handleProcessingError(error, metadata, employees);
    }
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport(result: DatabaseOperationResult): string {
    const sections = [
      this.buildReportHeader(result),
      this.buildErrorSection(result.errors),
      this.buildWarningSection(result.warnings),
      this.buildRecoverySection(result.recoveryOptions),
      this.buildQualitySection(result.qualityReport)
    ].filter(section => section);

    return sections.join('\n\n');
  }

  /**
   * Get user-friendly recovery recommendations
   */
  getRecoveryOptionsForUser(result: DatabaseOperationResult): {
    canProceed: boolean;
    requiresUserAction: boolean;
    recommendations: string[];
    actions: Array<{ label: string; action: string; risk: string }>;
  } {
    const canProceed = result.success || result.metadata.dataQualityScore >= 70;
    const requiresUserAction = result.recoveryOptions.some(opt => 
      opt.type === 'user_input_required' || opt.type === 'manual_review'
    );

    return {
      canProceed,
      requiresUserAction,
      recommendations: this.buildUserRecommendations(result),
      actions: this.buildUserActions(result.recoveryOptions)
    };
  }

  // Private helper methods

  private mergeOptions(options: Partial<ProcessingOptions>): ProcessingOptions {
    return {
      recovery: { ...this.defaultOptions.recovery, ...options.recovery },
      cleaning: { ...this.defaultOptions.cleaning, ...options.cleaning },
      enableQualityAnalysis: options.enableQualityAnalysis ?? this.defaultOptions.enableQualityAnalysis
    };
  }

  private initializeMetadata(operation: string, recordsProcessed = 0) {
    return {
      operation,
      timestamp: new Date().toISOString(),
      recordsProcessed,
      recordsRecovered: 0,
      dataQualityScore: 0
    };
  }

  private parseWithRecovery(
    rawJsonData: string,
    integrityResult: DataIntegrityResult,
    options: ProcessingOptions
  ): { data: Employee[]; recovered: number; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let data: Employee[] = [];
    let recovered = 0;

    if (!integrityResult.isValid && options.recovery.autoFix) {
      const recoveryResult = this.recoveryEngine.attemptJsonRecovery(rawJsonData, options.recovery);
      
      if (recoveryResult.success && recoveryResult.data) {
        data = recoveryResult.data;
        recovered = recoveryResult.recordsRecovered;
        warnings.push(`Data recovery successful: ${recovered} records recovered`);
      } else {
        errors.push(`Data recovery failed: ${recoveryResult.error}`);
      }
    } else if (integrityResult.isValid) {
      try {
        const parsed = JSON.parse(rawJsonData) as unknown;
        data = Array.isArray(parsed)
          ? (parsed as unknown as Employee[])
          : [parsed as unknown as Employee];
      } catch (parseError) {
        errors.push(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } else {
      errors.push('JSON integrity validation failed and recovery is disabled');
    }

    return { data, recovered, errors, warnings };
  }

  private processDataCleaning(data: Employee[], options: ProcessingOptions) {
    if (data.length === 0) {
      return { data: [], recordsModified: 0, warnings: [] };
    }

    // Apply data cleaning
    const cleaningResult = this.cleaningService.cleanEmployeeData(
      data as unknown as Record<string, unknown>[],
      options.cleaning
    );
    
    // Apply default values if enabled
    if (options.cleaning.useDefaultValues) {
      const defaultsResult = this.cleaningService.applyDefaultValues(cleaningResult.data, options.cleaning);
      return {
        data: defaultsResult.data,
        recordsModified: cleaningResult.recordsModified + defaultsResult.recordsModified,
        warnings: [...cleaningResult.warnings, ...defaultsResult.warnings]
      };
    }

    return cleaningResult;
  }

  private analyzeDataQuality(
    data: Employee[],
    integrityResult: DataIntegrityResult,
    options: ProcessingOptions
  ): QualityReport | undefined {
    if (!options.enableQualityAnalysis) return undefined;
    
    return this.qualityAnalyzer.analyzeDataQuality(data, integrityResult);
  }

  private buildOperationResult(params: {
    parseResult: { data: Employee[]; recovered: number; errors: string[]; warnings: string[] };
    cleaningResult: { data: Employee[]; recordsModified: number; warnings: string[] };
    integrityResult: DataIntegrityResult;
    qualityReport?: QualityReport;
    metadata: ProcessingMetadata;
    opts: ProcessingOptions;
  }): DatabaseOperationResult {
    const { parseResult, cleaningResult, integrityResult, qualityReport, metadata } = params;
    
    const allErrors = [...parseResult.errors];
    const allWarnings = [...parseResult.warnings, ...cleaningResult.warnings];
    
    metadata.recordsProcessed = parseResult.data.length;
    metadata.recordsRecovered = parseResult.recovered + cleaningResult.recordsModified;
    metadata.dataQualityScore = qualityReport?.score || this.calculateFallbackQualityScore(integrityResult);

    return {
      success: allErrors.length === 0,
      data: cleaningResult.data,
      integrityResult,
      qualityReport,
      errors: allErrors,
      warnings: allWarnings,
      recoveryOptions: integrityResult.recoveryOptions,
      metadata
    };
  }

  private buildEmployeeDataResult(params: {
    employees: Employee[];
    cleaningResult: { data: Employee[]; recordsModified: number; warnings: string[] };
    integrityResult: DataIntegrityResult;
    qualityReport?: QualityReport;
    metadata: ProcessingMetadata;
    opts: ProcessingOptions;
  }): DatabaseOperationResult {
    const { cleaningResult, integrityResult, qualityReport, metadata } = params;
    
    const errors: string[] = [];
    if (!integrityResult.isValid) {
      errors.push('Data integrity issues detected');
    }

    metadata.recordsRecovered = cleaningResult.recordsModified;
    metadata.dataQualityScore = qualityReport?.score || this.calculateFallbackQualityScore(integrityResult);

    return {
      success: errors.length === 0,
      data: cleaningResult.data,
      integrityResult,
      qualityReport,
      errors,
      warnings: cleaningResult.warnings,
      recoveryOptions: integrityResult.recoveryOptions,
      metadata
    };
  }

  private handleProcessingError(
    error: unknown,
    metadata: ProcessingMetadata,
    fallbackData?: Employee[]
  ): DatabaseOperationResult {
    const errorMessage = `Unexpected error during data processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error(errorMessage);

    return {
      success: false,
      data: fallbackData,
      errors: [errorMessage],
      warnings: [],
      recoveryOptions: [],
      metadata: {
        ...metadata,
        dataQualityScore: 0
      }
    };
  }

  private calculateFallbackQualityScore(integrityResult?: DataIntegrityResult): number {
    return integrityResult?.summary?.integrityScore || 0;
  }

  private buildReportHeader(result: DatabaseOperationResult): string {
    return [
      '=== Data Integrity Report ===',
      `Operation: ${result.metadata.operation}`,
      `Timestamp: ${result.metadata.timestamp}`,
      `Records Processed: ${result.metadata.recordsProcessed}`,
      `Records Recovered: ${result.metadata.recordsRecovered}`,
      `Data Quality Score: ${result.metadata.dataQualityScore}/100`
    ].join('\n');
  }

  private buildErrorSection(errors: string[]): string {
    if (errors.length === 0) return '';
    
    return [
      'ERRORS:',
      ...errors.map((error, index) => `${index + 1}. ${error}`)
    ].join('\n');
  }

  private buildWarningSection(warnings: string[]): string {
    if (warnings.length === 0) return '';
    
    return [
      'WARNINGS:',
      ...warnings.map((warning, index) => `${index + 1}. ${warning}`)
    ].join('\n');
  }

  private buildRecoverySection(options: RecoveryOption[]): string {
    if (options.length === 0) return '';
    
    return [
      'RECOVERY OPTIONS:',
      ...options.map((option, index) => [
        `${index + 1}. ${option.description}`,
        `   Action: ${option.action}`,
        `   Confidence: ${option.confidence}`,
        `   Risk Level: ${option.riskLevel}`
      ].join('\n'))
    ].join('\n\n');
  }

  private buildQualitySection(qualityReport?: QualityReport): string {
    if (!qualityReport) return '';
    
    return [
      'QUALITY ANALYSIS:',
      `Overall Score: ${qualityReport.score}/100 (${qualityReport.level})`,
      `Completeness: ${qualityReport.metrics.completeness}%`,
      `Accuracy: ${qualityReport.metrics.accuracy}%`,
      `Consistency: ${qualityReport.metrics.consistency}%`,
      `Validity: ${qualityReport.metrics.validity}%`
    ].join('\n');
  }

  private buildUserRecommendations(result: DatabaseOperationResult): string[] {
    const recommendations: string[] = [];
    const score = result.metadata.dataQualityScore;

    if (score >= 90) {
      recommendations.push('Data quality is excellent. Safe to proceed.');
    } else if (score >= 70) {
      recommendations.push('Data quality is acceptable with minor issues.');
    } else if (score >= 40) {
      recommendations.push('Data quality has significant issues. Review recommended.');
    } else {
      recommendations.push('Data quality is poor. Manual intervention required.');
    }

    if (result.qualityReport?.recommendations) {
      recommendations.push(...result.qualityReport.recommendations.map(rec => rec.description));
    }

    return recommendations;
  }

  private buildUserActions(recoveryOptions: RecoveryOption[]): Array<{ label: string; action: string; risk: string }> {
    return recoveryOptions.map(option => ({
      label: option.description,
      action: option.action,
      risk: option.riskLevel
    }));
  }
}
