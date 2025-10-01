import { Employee } from '../types';
import { logger } from './logger';

export interface RecoveryOptions {
  autoFix: boolean;
  useDefaultValues: boolean;
  maxRecoveryAttempts: number;
}

export interface RecoveryResult {
  success: boolean;
  data?: Employee[];
  errors: string[];
  warnings: string[];
  recordsRecovered: number;
  qualityScore: number;
}

/**
 * Service responsible for data recovery and auto-fixing
 */
export class DataRecoveryService {
  private defaultOptions: RecoveryOptions = {
    autoFix: true,
    useDefaultValues: true,
    maxRecoveryAttempts: 3
  };

  /**
   * Attempt to recover corrupted employee data
   */
  async recoverEmployeeData(
    employees: Employee[], 
    options: Partial<RecoveryOptions> = {}
  ): Promise<RecoveryResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    let recordsRecovered = 0;

    logger.debug('Starting data recovery process', {
      originalRecords: employees.length,
      options: opts
    });

    const recoveredEmployees: Employee[] = [];

    for (const employee of employees) {
      try {
        const fixResult = this.applyAutoFixes(employee, opts);
        
        if (fixResult.fixed) {
          recoveredEmployees.push(fixResult.employee);
          recordsRecovered++;
        } else {
          recoveredEmployees.push(employee);
        }

        warnings.push(...fixResult.warnings);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to recover employee ${employee.name}: ${errorMessage}`);
        logger.error('Employee recovery failed', {
          employee: employee.name,
          error: errorMessage
        });
      }
    }

    const qualityScore = this.calculateQualityScore(recoveredEmployees);

    logger.info('Data recovery completed', {
      originalRecords: employees.length,
      recoveredRecords: recoveredEmployees.length,
      fixedRecords: recordsRecovered,
      qualityScore
    });

    return {
      success: recoveredEmployees.length > 0,
      data: recoveredEmployees,
      errors,
      warnings,
      recordsRecovered,
      qualityScore
    };
  }

  /**
   * Apply automatic fixes to employee data
   */
  private applyAutoFixes(
    employee: Employee, 
    options: RecoveryOptions
  ): { employee: Employee; fixed: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let wasFixed = false;
    const fixedEmployee: Employee = { ...employee };

    // Fix missing or empty name
    if (!fixedEmployee.name || fixedEmployee.name.trim() === '') {
      if (options.useDefaultValues) {
        fixedEmployee.name = `Employee_${Date.now()}`;
        warnings.push('Generated default name for employee with missing name');
        wasFixed = true;
      }
    }

    // Fix missing or invalid performance data
    if (!fixedEmployee.performance || !Array.isArray(fixedEmployee.performance) || fixedEmployee.performance.length === 0) {
      if (options.useDefaultValues) {
        fixedEmployee.performance = [{ name: 'Overall', score: 0 }];
        warnings.push(`Added default performance data for ${fixedEmployee.name}`);
        wasFixed = true;
      }
    } else {
      // Fix individual performance scores
      fixedEmployee.performance = fixedEmployee.performance.map(perf => {
        const fixedPerf = { ...perf };
        
        const competencyLabel = fixedPerf.competency || fixedPerf.name || 'Unknown competency';

        if (typeof fixedPerf.score !== 'number' || isNaN(fixedPerf.score)) {
          fixedPerf.score = 0;
          warnings.push(`Fixed invalid score for ${fixedEmployee.name} - ${competencyLabel}`);
          wasFixed = true;
        }

        if (fixedPerf.score < 0 || fixedPerf.score > 100) {
          fixedPerf.score = Math.max(0, Math.min(100, fixedPerf.score));
          warnings.push(`Normalized out-of-range score for ${fixedEmployee.name} - ${competencyLabel}`);
          wasFixed = true;
        }

        return fixedPerf;
      });
    }

    // Fix missing organizational level
    if (!fixedEmployee.organizational_level || fixedEmployee.organizational_level.trim() === '') {
      if (options.useDefaultValues) {
        fixedEmployee.organizational_level = 'Unknown';
        warnings.push(`Set default organizational level for ${fixedEmployee.name}`);
        wasFixed = true;
      }
    }

    return { employee: fixedEmployee, fixed: wasFixed, warnings };
  }

  /**
   * Apply default values to missing fields
   */
  applyDefaultValues(employees: Employee[]): { data: Employee[]; recordsModified: number } {
    logger.debug('Applying default values to missing fields');

    const defaultValues: Required<Pick<Employee, 'name' | 'performance' | 'organizational_level'>> = {
      name: 'Unknown Employee',
      performance: [{ name: 'Overall', score: 0 }],
      organizational_level: 'Unknown'
    };

    let recordsModified = 0;
    const processedEmployees = employees.map(employee => {
      let wasModified = false;
      const processed = { ...employee };

      if (!processed.name || processed.name.trim() === '') {
        processed.name = defaultValues.name;
        wasModified = true;
      }

      if (!processed.performance || processed.performance.length === 0) {
        processed.performance = [...defaultValues.performance];
        wasModified = true;
      }

      if (!processed.organizational_level || processed.organizational_level.trim() === '') {
        processed.organizational_level = defaultValues.organizational_level;
        wasModified = true;
      }

      if (wasModified) {
        recordsModified++;
      }

      return processed;
    });

    logger.info('Default values applied', {
      totalRecords: employees.length,
      modifiedRecords: recordsModified
    });

    return {
      data: processedEmployees,
      recordsModified
    };
  }

  /**
   * Calculate data quality score based on completeness and validity
   */
  private calculateQualityScore(employees: Employee[]): number {
    if (employees.length === 0) return 0;

    let totalScore = 0;
    const maxScorePerEmployee = 100;

    for (const employee of employees) {
      let employeeScore = 0;

      // Name quality (30 points)
      if (employee.name && employee.name.trim() !== '' && !employee.name.startsWith('Employee_')) {
        employeeScore += 30;
      } else if (employee.name && employee.name.trim() !== '') {
        employeeScore += 15; // Partial credit for generated names
      }

      // Performance data quality (50 points)
      if (employee.performance && Array.isArray(employee.performance) && employee.performance.length > 0) {
        const validPerformances = employee.performance.filter(p => {
          const competency = p.competency || p.name;
          return (
            Boolean(competency) &&
            typeof p.score === 'number' && 
            !isNaN(p.score) && 
            p.score >= 0 && 
            p.score <= 100
          );
        });
        
        const performanceRatio = validPerformances.length / employee.performance.length;
        employeeScore += Math.round(50 * performanceRatio);
      }

      // Organizational level quality (20 points)
      if (employee.organizational_level && employee.organizational_level.trim() !== '' && employee.organizational_level !== 'Unknown') {
        employeeScore += 20;
      } else if (employee.organizational_level && employee.organizational_level.trim() !== '') {
        employeeScore += 10; // Partial credit for default values
      }

      totalScore += employeeScore;
    }

    const averageScore = totalScore / (employees.length * maxScorePerEmployee) * 100;
    return Math.round(averageScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate recovery recommendations
   */
  generateRecoveryRecommendations(result: RecoveryResult): string[] {
    const recommendations: string[] = [];

    if (result.qualityScore < 50) {
      recommendations.push('Data quality is poor. Consider manual review and correction.');
    } else if (result.qualityScore < 70) {
      recommendations.push('Data quality is fair. Some manual corrections may improve accuracy.');
    } else if (result.qualityScore < 90) {
      recommendations.push('Data quality is good. Minor improvements possible.');
    } else {
      recommendations.push('Data quality is excellent.');
    }

    if (result.recordsRecovered > 0) {
      recommendations.push(`${result.recordsRecovered} records were automatically fixed.`);
    }

    if (result.warnings.length > 0) {
      recommendations.push('Review warnings for potential data issues.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const dataRecovery = new DataRecoveryService();
