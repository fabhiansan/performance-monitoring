// Export all validators for individual use
export { EmployeeValidator } from './EmployeeValidator';
export { ScoreValidator } from './ScoreValidator';
export { CompetencyValidator } from './CompetencyValidator';
export { ValidatorOrchestrator } from './ValidatorOrchestrator';

// Re-export types from the main validation service
export type { ValidationResult, ValidationError, ValidationWarning, ValidationSummary } from '../validationService';

import { Employee } from '../../types';
import { ValidationResult } from '../validationService';
import { ValidatorOrchestrator } from './ValidatorOrchestrator';

// Create a singleton instance for backward compatibility
const validatorOrchestrator = new ValidatorOrchestrator();

/**
 * Main validation function - maintains backward compatibility
 * while using the new modular validator architecture
 */
export function validatePerformanceData(employees: Employee[]): ValidationResult {
  return validatorOrchestrator.validateEmployeeData(employees);
}

/**
 * Specialized validation functions for specific use cases
 */
export function validateEmployeesOnly(employees: Employee[]): ValidationResult {
  return validatorOrchestrator.validateEmployeesOnly(employees);
}

export function validateScoresOnly(employees: Employee[]): ValidationResult {
  return validatorOrchestrator.validateScoresOnly(employees);
}

export function validateCompetenciesOnly(employees: Employee[]): ValidationResult {
  return validatorOrchestrator.validateCompetenciesOnly(employees);
}

/**
 * Get validator instances for custom validation scenarios
 */
export function getValidators() {
  return validatorOrchestrator.getValidators();
}

/**
 * Create a new validator orchestrator instance
 * Useful for parallel validation or custom configurations
 */
export function createValidatorOrchestrator(): ValidatorOrchestrator {
  return new ValidatorOrchestrator();
}