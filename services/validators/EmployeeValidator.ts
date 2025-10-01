import { Employee } from '../../types';
import { ValidationError, ValidationWarning } from '../validationService';

export class EmployeeValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  validate(employees: Employee[] | unknown): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    this.errors = [];
    this.warnings = [];

    if (!Array.isArray(employees)) {
      this.errors.push({
        type: 'critical_data',
        message: 'Employee data must be an array',
        details: `Received: ${typeof employees}`
      });
      return { errors: [...this.errors], warnings: [...this.warnings] };
    }

    this.validateBasicStructure(employees);

    if (employees.length === 0) {
      return { errors: [...this.errors], warnings: [...this.warnings] };
    }

    this.validateDuplicateEmployees(employees);
    this.validateRequiredFields(employees);

    return { errors: [...this.errors], warnings: [...this.warnings] };
  }

  private validateBasicStructure(employees: Employee[]): void {
    if (employees.length === 0) {
      const message = 'Employee dataset is empty';

      this.errors.push({
        type: 'critical_data',
        message,
        details: 'No employee records supplied for validation'
      });

      this.warnings.push({
        type: 'partial_data',
        message,
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

    employees.forEach((employee, index) => {
      if (!employee || typeof employee !== 'object') {
        this.errors.push({
          type: 'critical_data',
          message: 'Invalid employee record encountered',
          details: `Employee at index ${index} is not a valid object`
        });
        return;
      }

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
        message: 'duplicate employee names found',
        details: `Employees: ${Array.from(new Set(duplicates)).join(', ')}`,
        affectedCount: duplicates.length
      });
    }
  }

  private validateRequiredFields(employees: Employee[]): void {
    const employeesWithMissingData: string[] = [];
    const missingFieldSet = new Set<string>();

    employees.forEach((employee, _index) => {
      if (!employee || typeof employee !== 'object') {
        return;
      }

      const issues: string[] = [];

      // Check required fields
      if (!employee.name || employee.name.trim() === '') {
        issues.push('name');
      }

      if (!employee.organizational_level || employee.organizational_level.trim() === '') {
        issues.push('organizational_level');
      }

      if (issues.length > 0) {
        issues.forEach(issue => missingFieldSet.add(issue));
        employeesWithMissingData.push(
          `${employee.name || 'Unknown'} (missing: ${issues.join(', ')})`
        );

        this.errors.push({
          type: 'critical_data',
          message: `Missing required employee fields: ${issues.join(', ')}`,
          employeeName: employee.name,
          details: `${employee.name || 'Unknown'} (missing: ${issues.join(', ')})`,
          affectedCount: issues.length
        });
      }
    });

    if (employeesWithMissingData.length > 0) {
      this.errors.push({
        type: 'missing_employee',
        message: `Employees missing required fields: ${Array.from(missingFieldSet).join(', ')}`,
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
