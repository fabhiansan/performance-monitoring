import { Employee } from '../../types';
import { ValidationError, ValidationWarning } from '../validationService';

export class ScoreValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  validate(employees: Employee[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    this.errors = [];
    this.warnings = [];

    this.validateScoreStructure(employees);
    this.validateScoreValues(employees);
    this.validateScoreConsistency(employees);

    return { errors: [...this.errors], warnings: [...this.warnings] };
  }

  private validateScoreStructure(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance || !Array.isArray(employee.performance)) {
        this.warnings.push({
          type: 'partial_data',
          message: 'Employee has no performance data',
          employeeName: employee.name,
          details: 'Performance array is missing or invalid'
        });
        return;
      }

      employee.performance.forEach((perf, index) => {
        if (!perf || typeof perf !== 'object') {
          this.errors.push({
            type: 'invalid_score',
            message: 'Invalid performance data structure',
            employeeName: employee.name,
            details: `Performance item ${index + 1} is not a valid object`
          });
          return;
        }

        if (!perf.name || typeof perf.name !== 'string') {
          this.errors.push({
            type: 'missing_competency',
            message: 'Performance item missing competency name',
            employeeName: employee.name,
            details: `Performance item ${index + 1} has invalid or missing name`
          });
        }

        if (perf.score === undefined || perf.score === null) {
          this.errors.push({
            type: 'invalid_score',
            message: 'Performance item missing score',
            employeeName: employee.name,
            competencyName: perf.name,
            details: 'Score value is required'
          });
        }
      });
    });
  }

  private validateScoreValues(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      employee.performance.forEach(perf => {
        if (!perf || perf.score === undefined || perf.score === null) return;

        const validation = this.validateSingleScore(perf.score);
        if (!validation.isValid) {
          this.errors.push({
            type: 'invalid_score',
            message: 'Invalid score value',
            employeeName: employee.name,
            competencyName: perf.name,
            details: validation.issues.join('; ')
          });
        }

        // Check for score normalization issues
        if (validation.wasNormalized) {
          this.warnings.push({
            type: 'score_normalization',
            message: 'Score was automatically normalized',
            employeeName: employee.name,
            competencyName: perf.name,
            details: `Original: ${perf.score}, Normalized: ${validation.normalizedValue}`
          });
        }
      });
    });
  }

  private validateScoreConsistency(employees: Employee[]): void {
    const competencyScores = new Map<string, number[]>();

    // Collect all scores for each competency
    employees.forEach(employee => {
      if (!employee.performance) return;

      employee.performance.forEach(perf => {
        if (!perf || !perf.name || perf.score === undefined) return;

        const competencyName = this.normalizeCompetencyName(perf.name);
        if (!competencyScores.has(competencyName)) {
          competencyScores.set(competencyName, []);
        }
        competencyScores.get(competencyName)!.push(perf.score);
      });
    });

    // Check for unusual score distributions
    competencyScores.forEach((scores, competencyName) => {
      if (scores.length < 2) return;

      const stats = this.calculateScoreStatistics(scores);
      
      // Check for suspicious patterns
      if (stats.uniqueValues === 1) {
        this.warnings.push({
          type: 'quality_concern',
          message: 'All employees have identical scores for competency',
          competencyName,
          details: `All ${scores.length} scores are ${scores[0]}`,
          affectedCount: scores.length
        });
      }

      if (stats.standardDeviation < 5 && scores.length > 10) {
        this.warnings.push({
          type: 'quality_concern',
          message: 'Very low score variance detected',
          competencyName,
          details: `Standard deviation: ${stats.standardDeviation.toFixed(2)}`,
          affectedCount: scores.length
        });
      }

      if (stats.outliers.length > 0) {
        this.warnings.push({
          type: 'quality_concern',
          message: 'Score outliers detected',
          competencyName,
          details: `Outlier values: ${stats.outliers.join(', ')}`,
          affectedCount: stats.outliers.length
        });
      }
    });
  }

  validateSingleScore(score: number): { 
    isValid: boolean; 
    issues: string[]; 
    wasNormalized: boolean; 
    normalizedValue?: number;
  } {
    const issues: string[] = [];
    let wasNormalized = false;
    let normalizedValue = score;

    if (typeof score !== 'number') {
      issues.push('Score must be a number');
      return { isValid: false, issues, wasNormalized };
    }

    if (isNaN(score)) {
      issues.push('Score cannot be NaN');
      return { isValid: false, issues, wasNormalized };
    }

    if (!isFinite(score)) {
      issues.push('Score must be finite');
      return { isValid: false, issues, wasNormalized };
    }

    // Normalize score to 0-100 range if needed
    if (score < 0) {
      normalizedValue = 0;
      wasNormalized = true;
    } else if (score > 100) {
      normalizedValue = 100;
      wasNormalized = true;
    }

    // Check for questionable values
    if (score > 100) {
      issues.push('Score above 100 (will be capped)');
    }

    if (score < 0) {
      issues.push('Negative score (will be set to 0)');
    }

    return { 
      isValid: issues.length === 0, 
      issues, 
      wasNormalized, 
      normalizedValue: wasNormalized ? normalizedValue : undefined
    };
  }

  private normalizeCompetencyName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private calculateScoreStatistics(scores: number[]): {
    mean: number;
    standardDeviation: number;
    uniqueValues: number;
    outliers: number[];
  } {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const uniqueValues = new Set(scores).size;

    // Simple outlier detection using 2 standard deviations
    const outliers = scores.filter(score => 
      Math.abs(score - mean) > 2 * standardDeviation
    );

    return {
      mean,
      standardDeviation,
      uniqueValues,
      outliers: Array.from(new Set(outliers))
    };
  }
}
