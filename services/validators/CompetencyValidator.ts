import { Employee } from '../../types';
import { ValidationError, ValidationWarning, REQUIRED_COMPETENCIES } from '../validationService';

export class CompetencyValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  validate(employees: Employee[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    this.errors = [];
    this.warnings = [];

    this.validateCompetencyNames(employees);
    this.validateRequiredCompetencies(employees);
    this.validateCompetencyDuplicates(employees);
    this.sanitizeAndMergeCompetencies(employees);

    return { errors: [...this.errors], warnings: [...this.warnings] };
  }

  private validateCompetencyNames(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      employee.performance.forEach(perf => {
        if (!perf) return;

        const validation = this.validateCompetencyName(perf.name);
        if (!validation.isValid) {
          this.errors.push({
            type: 'invalid_competency_name',
            message: 'Invalid competency name',
            employeeName: employee.name,
            competencyName: perf.name,
            details: validation.issues.join('; ')
          });
        }

        if (validation.wasSanitized) {
          this.warnings.push({
            type: 'competency_sanitized',
            message: 'Competency name was sanitized',
            employeeName: employee.name,
            competencyName: perf.name,
            details: `Sanitized to: ${validation.sanitizedName}`
          });
        }
      });
    });
  }

  private validateRequiredCompetencies(employees: Employee[]): void {
    // Collect all competencies across all employees
    const allCompetencies = new Set<string>();
    employees.forEach(employee => {
      if (!employee.performance) return;
      employee.performance.forEach(perf => {
        if (perf?.name) {
          allCompetencies.add(this.normalizeCompetencyName(perf.name));
        }
      });
    });

    // Check for missing required competencies globally
    const missingRequiredCompetencies: string[] = [];
    REQUIRED_COMPETENCIES.forEach(required => {
      const hasCompetency = this.findMatchingCompetency(Array.from(allCompetencies), required);
      if (!hasCompetency && required.required) {
        missingRequiredCompetencies.push(required.name);
      }
    });

    if (missingRequiredCompetencies.length > 0) {
      this.errors.push({
        type: 'missing_competency',
        message: 'Missing required competencies in dataset',
        details: `Missing: ${missingRequiredCompetencies.join(', ')}`,
        affectedCount: missingRequiredCompetencies.length
      });
    }

    // Check for missing required competencies per employee
    employees.forEach(employee => {
      if (!employee.performance || employee.performance.length === 0) {
        this.warnings.push({
          type: 'partial_data',
          message: 'Employee has no competency data',
          employeeName: employee.name
        });
        return;
      }

      const empCompetencies = employee.performance.map(p => 
        this.normalizeCompetencyName(p.name || '')
      );
      const missingForEmployee: string[] = [];

      REQUIRED_COMPETENCIES.forEach(required => {
        const hasCompetency = this.findMatchingCompetency(empCompetencies, required);
        if (!hasCompetency && required.required) {
          missingForEmployee.push(required.name);
        }
      });

      if (missingForEmployee.length > 0) {
        this.errors.push({
          type: 'missing_competency',
          message: 'Employee missing required competencies',
          employeeName: employee.name,
          details: `Missing: ${missingForEmployee.join(', ')}`,
          affectedCount: missingForEmployee.length
        });
      }
    });
  }

  private validateCompetencyDuplicates(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      const competencyNames = new Map<string, number>();
      const duplicates: string[] = [];

      employee.performance.forEach(perf => {
        if (!perf?.name) return;

        const normalizedName = this.normalizeCompetencyName(perf.name);
        const count = competencyNames.get(normalizedName) || 0;
        competencyNames.set(normalizedName, count + 1);

        if (count === 1) {
          duplicates.push(perf.name);
        }
      });

      if (duplicates.length > 0) {
        this.warnings.push({
          type: 'competency_merged',
          message: 'Duplicate competencies found and will be merged',
          employeeName: employee.name,
          details: `Duplicates: ${duplicates.join(', ')}`,
          affectedCount: duplicates.length
        });
      }
    });
  }

  private sanitizeAndMergeCompetencies(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      const merged = new Map<string, number[]>();
      const sanitizedCompetencies: typeof employee.performance = [];

      employee.performance.forEach(perf => {
        if (!perf || !perf.name) return;

        const sanitized = this.sanitizeCompetencyName(perf.name);
        const normalized = this.normalizeCompetencyName(sanitized);

        if (!merged.has(normalized)) {
          merged.set(normalized, []);
        }
        
        if (typeof perf.score === 'number' && !isNaN(perf.score)) {
          merged.get(normalized)!.push(perf.score);
        }
      });

      // Convert back to competency format with averaged scores
      merged.forEach((scores, normalizedName) => {
        if (scores.length > 0) {
          const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          sanitizedCompetencies.push({
            name: this.prettifyCompetencyName(normalizedName),
            score: Math.round(averageScore * 100) / 100 // Round to 2 decimal places
          });
        }
      });

      employee.performance = sanitizedCompetencies;
    });
  }

  validateCompetencyName(name: string): { 
    isValid: boolean; 
    issues: string[]; 
    wasSanitized: boolean; 
    sanitizedName?: string;
  } {
    const issues: string[] = [];
    let wasSanitized = false;
    let sanitizedName = name;

    if (!name || typeof name !== 'string') {
      issues.push('Competency name is required');
      return { isValid: false, issues, wasSanitized };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      issues.push('Competency name cannot be empty');
      return { isValid: false, issues, wasSanitized };
    }

    if (trimmed.length < 2) {
      issues.push('Competency name too short (minimum 2 characters)');
    }

    if (trimmed.length > 100) {
      issues.push('Competency name too long (maximum 100 characters)');
    }

    // Check for sanitization needs
    const original = trimmed;
    sanitizedName = this.sanitizeCompetencyName(trimmed);
    wasSanitized = original !== sanitizedName;

    return { 
      isValid: issues.length === 0, 
      issues, 
      wasSanitized,
      sanitizedName: wasSanitized ? sanitizedName : undefined
    };
  }

  private sanitizeCompetencyName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s-()]/g, '') // Remove special characters except basic ones
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .trim();
  }

  private normalizeCompetencyName(name: string): string {
    return this.sanitizeCompetencyName(name).toLowerCase();
  }

  private prettifyCompetencyName(normalizedName: string): string {
    return normalizedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private findMatchingCompetency(
    competencies: string[], 
    required: { name: string; aliases?: string[] }
  ): boolean {
    const searchTerms = [required.name.toLowerCase(), ...(required.aliases || []).map(a => a.toLowerCase())];
    
    return competencies.some(comp => {
      const normalizedComp = comp.toLowerCase();
      return searchTerms.some(term => 
        normalizedComp.includes(term) || term.includes(normalizedComp)
      );
    });
  }
}