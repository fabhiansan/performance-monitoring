/**
 * Integrity analysis utilities extracted from dataIntegrityService
 */

import { DataIntegrityError, DataIntegrityWarning, RecoveryOption, DataIntegritySummary } from '../services/dataIntegrityService';
import { ValidationResult } from '../services/validationService';

/**
 * Recovery option generator
 */
export class RecoveryOptionGenerator {
  generateRecoveryOptions(errors: DataIntegrityError[]): RecoveryOption[] {
    const recoveryOptions: RecoveryOption[] = [];

    // Auto-fix options for common issues
    const autoFixableErrors = errors.filter(e => 
      e.recoverable && 
      (e.type === 'schema_violation' || e.type === 'data_corruption')
    );

    if (autoFixableErrors.length > 0) {
      recoveryOptions.push({
        type: 'auto_fix',
        description: 'Automatically fix recoverable data issues',
        action: 'Apply default values and data normalization',
        confidence: 'high',
        riskLevel: 'safe',
        affectedFields: autoFixableErrors.map(e => e.fieldName || 'unknown')
      });
    }

    // Manual review for critical issues
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recoveryOptions.push({
        type: 'manual_review',
        description: 'Critical issues require manual review',
        action: 'Review and manually correct data before proceeding',
        confidence: 'high',
        riskLevel: 'moderate',
        affectedFields: criticalErrors.map(e => e.fieldName || 'unknown')
      });
    }

    // Fallback values for missing data
    const missingDataErrors = errors.filter(e => 
      e.type === 'schema_violation' && e.fieldName
    );
    if (missingDataErrors.length > 0) {
      recoveryOptions.push({
        type: 'fallback_values',
        description: 'Use default values for missing fields',
        action: 'Apply system defaults for missing required fields',
        confidence: 'medium',
        riskLevel: 'safe',
        affectedFields: missingDataErrors.map(e => e.fieldName!)
      });
    }

    // User input for unrecoverable issues
    const unrecoverableErrors = errors.filter(e => !e.recoverable);
    if (unrecoverableErrors.length > 0) {
      recoveryOptions.push({
        type: 'user_input_required',
        description: 'Some issues require user input to resolve',
        action: 'Prompt user for missing or corrupted data',
        confidence: 'low',
        riskLevel: 'moderate',
        affectedFields: unrecoverableErrors.map(e => e.fieldName || 'unknown')
      });
    }

    return recoveryOptions;
  }
}

/**
 * Integrity summary generator
 */
export class IntegritySummaryGenerator {
  generateIntegritySummary(
    data: unknown,
    errors: DataIntegrityError[]
  ): DataIntegritySummary {
    const totalRecords = Array.isArray(data) ? data.length : 0;
    const corruptedRecords = errors.filter(e => e.employeeName).length;
    const recoverableRecords = errors.filter(e => e.recoverable && e.employeeName).length;
    
    const dataLossPercentage = totalRecords > 0 ? (corruptedRecords / totalRecords) * 100 : 0;
    
    // Calculate integrity score (0-100)
    const integrityScore = this.calculateIntegrityScore(errors);

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(integrityScore);

    return {
      totalRecords,
      corruptedRecords,
      recoverableRecords,
      dataLossPercentage,
      integrityScore,
      recommendedAction
    };
  }

  private calculateIntegrityScore(errors: DataIntegrityError[]): number {
    let integrityScore = 100;
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': integrityScore -= 25; break;
        case 'high': integrityScore -= 15; break;
        case 'medium': integrityScore -= 10; break;
        case 'low': integrityScore -= 5; break;
      }
    });
    return Math.max(0, integrityScore);
  }

  private determineRecommendedAction(integrityScore: number): 'proceed' | 'review_required' | 'manual_intervention' | 'abort' {
    if (integrityScore >= 90) {
      return 'proceed';
    } else if (integrityScore >= 70) {
      return 'review_required';
    } else if (integrityScore >= 40) {
      return 'manual_intervention';
    } else {
      return 'abort';
    }
  }
}

/**
 * Validation error converter
 */
export class ValidationErrorConverter {
  convertStandardValidationErrors(validation: ValidationResult): { errors: DataIntegrityError[]; warnings: DataIntegrityWarning[] } {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];

    validation.errors.forEach(error => {
      errors.push({
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
      warnings.push({
        type: 'data_inconsistency',
        message: warning.message,
        details: warning.details || '',
        employeeName: warning.employeeName,
        fieldName: warning.competencyName
      });
    });

    return { errors, warnings };
  }

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
}

/**
 * Integrity message generator
 */
export class IntegrityMessageGenerator {
  getIntegrityMessage(isValid: boolean, errors: DataIntegrityError[]): string {
    if (isValid) {
      return 'Data integrity validation passed successfully';
    }

    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;
    
    if (criticalErrors > 0) {
      return `Critical data integrity issues detected (${criticalErrors} critical, ${errors.length} total errors)`;
    } else if (highErrors > 0) {
      return `Significant data integrity issues detected (${highErrors} high priority, ${errors.length} total errors)`;
    } else {
      return `Minor data integrity issues detected (${errors.length} errors)`;
    }
  }

  getRecoveryRecommendation(recommendedAction: string): string {
    switch (recommendedAction) {
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
}
