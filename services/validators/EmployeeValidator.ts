import { Employee } from '../../types';
import { ValidationError, ValidationWarning } from '../validationService';

export class EmployeeValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  validate(employees: Employee[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    this.errors = [];
    this.warnings = [];

    this.validateBasicStructure(employees);
    this.validateDuplicateEmployees(employees);
    this.validateRequiredFields(employees);

    return { errors: [...this.errors], warnings: [...this.warnings] };
  }

  private validateBasicStructure(employees: Employee[]): void {
    if (!Array.isArray(employees)) {
      this.errors.push({
        type: 'critical_data',
        message: 'Employee data must be an array',
        details: `Received: ${typeof employees}`
      });
      return;
    }

    if (employees.length === 0) {
      this.warnings.push({
        type: 'partial_data',
        message: 'No employee data provided',
        details: 'Empty employee array'
      });
      return;
    }

    // Check array size limits
    const MAX_EMPLOYEES = 10000;
    if (employees.length > MAX_EMPLOYEES) {
      this.errors.push({
        type: 'array_size_exceeded',
        message: 'Too many employees',
        details: `Maximum ${MAX_EMPLOYEES} employees allowed, received ${employees.length}`,
        affectedCount: employees.length - MAX_EMPLOYEES
      });
    }
  }

  private validateDuplicateEmployees(employees: Employee[]): void {
    const nameCount = new Map<string, number>();
    const duplicates: string[] = [];

    employees.forEach(employee => {
      if (!employee?.name) return;
      
      const normalizedName = employee.name.trim().toLowerCase();
      const count = nameCount.get(normalizedName) || 0;
      nameCount.set(normalizedName, count + 1);
      
      if (count === 1) {
        duplicates.push(employee.name);
      }
    });

    if (duplicates.length > 0) {
      this.errors.push({
        type: 'duplicate_employee',
        message: 'Duplicate employee names found',
        details: `Employees: ${Array.from(new Set(duplicates)).join(', ')}`,
        affectedCount: duplicates.length
      });
    }
  }

  private validateRequiredFields(employees: Employee[]): void {
    const employeesWithMissingData: string[] = [];

    employees.forEach(employee => {
      const issues: string[] = [];

      // Check required fields
      if (!employee.name || employee.name.trim() === '') {
        issues.push('name');
      }

      if (!employee.organizational_level || employee.organizational_level.trim() === '') {
        issues.push('organizational_level');
      }

      if (issues.length > 0) {
        employeesWithMissingData.push(
          `${employee.name || 'Unknown'} (missing: ${issues.join(', ')})`
        );
      }
    });

    if (employeesWithMissingData.length > 0) {
      this.errors.push({
        type: 'missing_employee',
        message: 'Employees with missing required fields',
        details: `Affected employees: ${employeesWithMissingData.join('; ')}`,
        affectedCount: employeesWithMissingData.length
      });
    }
  }

  validateEmployeeName(name: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!name || typeof name !== 'string') {
      issues.push('Name is required');
      return { isValid: false, issues };
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      issues.push('Name cannot be empty');
    }

    if (trimmedName.length > 100) {
      issues.push('Name is too long (maximum 100 characters)');
    }

    if (trimmedName.length < 2) {
      issues.push('Name is too short (minimum 2 characters)');
    }

    // Check for invalid characters
    const invalidChars = /[<>{}[\]\\|`~!@#$%^&*()_+=;:"'?/]/;
    if (invalidChars.test(trimmedName)) {
      issues.push('Name contains invalid characters');
    }

    return { isValid: issues.length === 0, issues };
  }

  validateOrganizationalLevel(level: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const validLevels = ['Eselon', 'Staff', 'Kepala Dinas', 'Sekretaris', 'Kabid', 'Kasubbid', 'Pelaksana'];

    if (!level || typeof level !== 'string') {
      issues.push('Organizational level is required');
      return { isValid: false, issues };
    }

    if (!validLevels.includes(level.trim())) {
      issues.push(`Invalid organizational level. Must be one of: ${validLevels.join(', ')}`);
    }

    return { isValid: issues.length === 0, issues };
  }
}