/**
 * Data validation and auto-fixing utilities extracted from enhancedDatabaseService
 */

import { Employee } from '../types';
import { DataIntegrityResult } from '../services/dataIntegrityService';

export interface AutoFixResult {
  data: Employee[];
  recordsFixed: number;
}

export interface DefaultValuesResult {
  data: Employee[];
  recordsModified: number;
}

/**
 * Auto-fix strategy for common data issues
 */
export class AutoFixStrategy {
  applyAutoFixes(employees: Employee[], _integrityResult: DataIntegrityResult): AutoFixResult {
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
      fixedEmployee.performance = this.fixPerformanceScores(fixedEmployee.performance);
      if (this.hasInvalidScores(employee.performance || [])) {
        wasFixed = true;
      }
      
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

  private fixPerformanceScores(performance: Array<{ name: string; score: number }>): Array<{ name: string; score: number }> {
    return performance.map(perf => {
      if (typeof perf.score !== 'number' || isNaN(perf.score)) {
        return { ...perf, score: 0 };
      }
      if (perf.score < 0 || perf.score > 100) {
        return { ...perf, score: Math.max(0, Math.min(100, perf.score)) };
      }
      return perf;
    });
  }

  private hasInvalidScores(performance: Array<{ name: string; score: number }>): boolean {
    return performance.some(perf => 
      typeof perf.score !== 'number' || 
      isNaN(perf.score) || 
      perf.score < 0 || 
      perf.score > 100
    );
  }
}

/**
 * Default values strategy for missing fields
 */
export class DefaultValuesStrategy {
  applyDefaultValues(employees: Employee[]): DefaultValuesResult {
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
          (processed as Record<string, unknown>)[field] = defaultValue;
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
}

/**
 * Data quality score calculator
 */
export class DataQualityCalculator {
  calculateDataQualityScore(
    integrityResult: DataIntegrityResult,
    validationResult?: { errors: string[]; warnings: string[] }
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

  getDataQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }
}

/**
 * Recovery options analyzer
 */
export class RecoveryOptionsAnalyzer {
  getRecoveryOptionsForUser(
    success: boolean,
    dataQualityScore: number,
    recoveryOptions: Array<{ type: string; description: string; action: string; riskLevel: string }>
  ): {
    canProceed: boolean;
    requiresUserAction: boolean;
    recommendations: string[];
    actions: { label: string; action: string; risk: string }[];
  } {
    const canProceed = success || dataQualityScore >= 70;
    const requiresUserAction = recoveryOptions.some(opt => 
      opt.type === 'user_input_required' || opt.type === 'manual_review'
    );
    
    const recommendations: string[] = [];
    const actions: { label: string; action: string; risk: string }[] = [];
    
    if (dataQualityScore >= 90) {
      recommendations.push('Data quality is excellent. Safe to proceed.');
    } else if (dataQualityScore >= 70) {
      recommendations.push('Data quality is acceptable with minor issues.');
    } else if (dataQualityScore >= 40) {
      recommendations.push('Data quality has significant issues. Review recommended.');
    } else {
      recommendations.push('Data quality is poor. Manual intervention required.');
    }
    
    recoveryOptions.forEach(option => {
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

/**
 * Error report generator
 */
export class ErrorReportGenerator {
  generateErrorReport(
    operation: string,
    timestamp: string,
    recordsProcessed: number,
    recordsRecovered: number,
    dataQualityScore: number,
    errors: string[],
    warnings: string[],
    recoveryOptions: Array<{ description: string; action: string; confidence: string; riskLevel: string }>
  ): string {
    const report: string[] = [];
    
    report.push('=== Data Integrity Report ===');
    report.push(`Operation: ${operation}`);
    report.push(`Timestamp: ${timestamp}`);
    report.push(`Records Processed: ${recordsProcessed}`);
    report.push(`Records Recovered: ${recordsRecovered}`);
    report.push(`Data Quality Score: ${dataQualityScore}/100`);
    report.push('');
    
    if (errors.length > 0) {
      report.push('ERRORS:');
      errors.forEach((error, index) => {
        report.push(`${index + 1}. ${error}`);
      });
      report.push('');
    }
    
    if (warnings.length > 0) {
      report.push('WARNINGS:');
      warnings.forEach((warning, index) => {
        report.push(`${index + 1}. ${warning}`);
      });
      report.push('');
    }
    
    if (recoveryOptions.length > 0) {
      report.push('RECOVERY OPTIONS:');
      recoveryOptions.forEach((option, index) => {
        report.push(`${index + 1}. ${option.description}`);
        report.push(`   Action: ${option.action}`);
        report.push(`   Confidence: ${option.confidence}`);
        report.push(`   Risk Level: ${option.riskLevel}`);
        report.push('');
      });
    }
    
    return report.join('\n');
  }
}