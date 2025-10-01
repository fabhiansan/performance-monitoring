import { Employee } from '../../types';
import { ValidationResult, ValidationError, ValidationWarning, ValidationSummary, validatePerformanceData } from '../validationService';
import { EmployeeValidator } from './EmployeeValidator';
import { ScoreValidator } from './ScoreValidator';
import { CompetencyValidator } from './CompetencyValidator';

export class ValidatorOrchestrator {
  private employeeValidator: EmployeeValidator;
  private scoreValidator: ScoreValidator;
  private competencyValidator: CompetencyValidator;

  constructor() {
    this.employeeValidator = new EmployeeValidator();
    this.scoreValidator = new ScoreValidator();
    this.competencyValidator = new CompetencyValidator();
  }

  /**
   * Comprehensive validation using all specialized validators
   */
  validateEmployeeData(employees: Employee[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    // Run all validators
    const employeeResults = this.employeeValidator.validate(employees);
    const scoreResults = this.scoreValidator.validate(employees);
    const competencyResults = this.competencyValidator.validate(employees);

    // Combine results
    allErrors.push(...employeeResults.errors);
    allErrors.push(...scoreResults.errors);
    allErrors.push(...competencyResults.errors);

    allWarnings.push(...employeeResults.warnings);
    allWarnings.push(...scoreResults.warnings);
    allWarnings.push(...competencyResults.warnings);

    // Generate summary
    const summary = this.generateSummary(employees, allErrors, allWarnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      summary
    };
  }

  /**
   * Backward compatible alias for validateEmployeeData
   */
  validateAll(employees: Employee[]): ValidationResult {
    return this.validateEmployeeData(employees);
  }

  /**
   * Run a selective subset of validators based on options
   */
  validateSelective(
    employees: Employee[],
    options: {
      validateEmployees?: boolean;
      validateCompetencies?: boolean;
      validateScores?: boolean;
    } = {}
  ): ValidationResult {
    const {
      validateEmployees = true,
      validateCompetencies = true,
      validateScores = true
    } = options;

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    if (validateEmployees) {
      const result = this.employeeValidator.validate(employees);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    if (validateCompetencies) {
      const result = this.competencyValidator.validate(employees);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    if (validateScores) {
      const result = this.scoreValidator.validate(employees);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    const summary = this.generateSummary(employees, allErrors, allWarnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      summary
    };
  }

  /**
   * Validate just employee structure and basic fields
   */
  validateEmployeesOnly(employees: Employee[]): ValidationResult {
    const results = this.employeeValidator.validate(employees);
    const summary = this.generateSummary(employees, results.errors, results.warnings);

    return {
      isValid: results.errors.length === 0,
      errors: results.errors,
      warnings: results.warnings,
      summary
    };
  }

  /**
   * Validate just scores
   */
  validateScoresOnly(employees: Employee[]): ValidationResult {
    const results = this.scoreValidator.validate(employees);
    const summary = this.generateSummary(employees, results.errors, results.warnings);

    return {
      isValid: results.errors.length === 0,
      errors: results.errors,
      warnings: results.warnings,
      summary
    };
  }

  /**
   * Validate just competencies
   */
  validateCompetenciesOnly(employees: Employee[]): ValidationResult {
    const results = this.competencyValidator.validate(employees);
    const summary = this.generateSummary(employees, results.errors, results.warnings);

    return {
      isValid: results.errors.length === 0,
      errors: results.errors,
      warnings: results.warnings,
      summary
    };
  }

  /**
   * Get individual validator instances for specialized use
   */
  getValidators() {
    return {
      employee: this.employeeValidator,
      score: this.scoreValidator,
      competency: this.competencyValidator
    };
  }

  private generateSummary(
    employees: Employee[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): ValidationSummary {
    const baseSummary = validatePerformanceData(employees).summary;

    return {
      ...baseSummary,
      errorCount: errors.length,
      warningCount: warnings.length,
      validationTimestamp: new Date().toISOString(),
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      overallScore: baseSummary.dataCompleteness
    };
  }
}
