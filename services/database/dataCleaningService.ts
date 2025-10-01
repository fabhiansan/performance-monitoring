/**
 * Data Cleaning Service
 * 
 * Handles data normalization, validation, and cleaning operations
 */

import { Employee } from '../../types';

// Constants for repeated strings
const DEFAULT_ORGANIZATIONAL_LEVEL = 'Staff/Other';

export interface CleaningOptions {
  useDefaultValues: boolean;
  strictValidation: boolean;
  autoCorrectTypes: boolean;
}

export interface CleaningResult {
  data: Employee[];
  recordsModified: number;
  warnings: string[];
}

export class DataCleaningService {
  private readonly defaultOptions: CleaningOptions = {
    useDefaultValues: true,
    strictValidation: false,
    autoCorrectTypes: true
  };

  /**
   * Clean and normalize employee data
   */
  cleanEmployeeData(data: Record<string, unknown>[], options: Partial<CleaningOptions> = {}): CleaningResult {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];
    let recordsModified = 0;

    const cleanedData = data
      .map((item, index) => {
        try {
          const { employee, wasModified, itemWarnings } = this.cleanSingleEmployee(item, opts);
          
          if (wasModified) recordsModified++;
          warnings.push(...itemWarnings.map(w => `Row ${index + 1}: ${w}`));
          
          return employee;
        } catch (error) {
          warnings.push(`Row ${index + 1}: Failed to clean - ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      })
      .filter((emp): emp is Employee => emp !== null);

    return { data: cleanedData, recordsModified, warnings };
  }

  /**
   * Apply default values to missing fields
   */
  applyDefaultValues(employees: Employee[], options: Partial<CleaningOptions> = {}): CleaningResult {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];
    let recordsModified = 0;

    const processedEmployees = employees.map((employee, index) => {
      const { employee: processed, wasModified, warnings: itemWarnings } = this.applyEmployeeDefaults(employee, opts);
      
      if (wasModified) recordsModified++;
      warnings.push(...itemWarnings.map(w => `Employee ${index + 1} (${employee.name}): ${w}`));
      
      return processed;
    });

    return { data: processedEmployees, recordsModified, warnings };
  }

  /**
   * Fix data integrity issues
   */
  fixDataIntegrityIssues(employees: Employee[]): CleaningResult {
    const warnings: string[] = [];
    let recordsModified = 0;

    const fixedEmployees = employees.map((employee, index) => {
      const { employee: fixed, wasModified, warnings: itemWarnings } = this.fixSingleEmployeeIssues(employee);
      
      if (wasModified) recordsModified++;
      warnings.push(...itemWarnings.map(w => `Employee ${index + 1} (${employee.name}): ${w}`));
      
      return fixed;
    });

    return { data: fixedEmployees, recordsModified, warnings };
  }

  /**
   * Clean a single employee record
   */
  private cleanSingleEmployee(item: Record<string, unknown>, options: CleaningOptions): {
    employee: Employee;
    wasModified: boolean;
    itemWarnings: string[];
  } {
    const warnings: string[] = [];
    let wasModified = false;

    // Extract and clean basic fields
    const name = this.cleanString(item.name);
    if (!name && options.strictValidation) {
      throw new Error('Employee name is required');
    }

    const cleanedName = name || 'Unknown Employee';
    if (name !== cleanedName) {
      warnings.push('Applied default name for missing/invalid name');
      wasModified = true;
    }

    const employee: Employee = {
      id: this.cleanNumber(item.id) || 0,
      name: cleanedName,
      nip: this.cleanString(item.nip) || '',
      gol: this.cleanString(item.gol) || '',
      pangkat: this.cleanString(item.pangkat) || '',
      position: this.cleanString(item.position) || '',
      sub_position: this.cleanString(item.sub_position || item.subPosition) || '',
      organizational_level: this.validateOrgLevel(this.cleanString(item.organizational_level || item.organizationalLevel)) || DEFAULT_ORGANIZATIONAL_LEVEL,
      performance: this.cleanPerformanceData(item.performance) || []
    };

    // Check if any defaults were applied
    if (!options.useDefaultValues && (employee.name === 'Unknown Employee')) {
      wasModified = true;
      warnings.push('Employee excluded due to missing required data');
    }

    return { employee, wasModified, itemWarnings: warnings };
  }

  /**
   * Apply default values to an employee
   */
  private applyEmployeeDefaults(employee: Employee, _options: CleaningOptions): {
    employee: Employee;
    wasModified: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let wasModified = false;
    const processed = { ...employee };

    const defaults = {
      nip: 'N/A',
      gol: 'N/A',
      pangkat: 'N/A',
      position: 'Staff',
      sub_position: 'General',
      organizational_level: DEFAULT_ORGANIZATIONAL_LEVEL
    };

    Object.entries(defaults).forEach(([field, defaultValue]) => {
      const currentValue = processed[field as keyof Employee];
      
      if (!currentValue || (typeof currentValue === 'string' && currentValue.trim() === '')) {
        (processed as Record<string, unknown>)[field] = defaultValue;
        warnings.push(`Applied default value for ${field}: ${defaultValue}`);
        wasModified = true;
      }
    });

    return { employee: processed, wasModified, warnings };
  }

  /**
   * Fix integrity issues in a single employee record
   */
  private fixSingleEmployeeIssues(employee: Employee): {
    employee: Employee;
    wasModified: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let wasModified = false;
    const fixed = { ...employee };

    // Fix missing names
    if (!fixed.name || fixed.name.trim() === '') {
      fixed.name = `Employee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      warnings.push('Generated name for employee with missing name');
      wasModified = true;
    }

    // Fix missing performance data
    if (!fixed.performance || !Array.isArray(fixed.performance)) {
      fixed.performance = [];
      warnings.push('Initialized empty performance array');
      wasModified = true;
    }

    // Fix invalid scores
    const originalPerformanceLength = fixed.performance.length;
    fixed.performance = fixed.performance
      .map(perf => {
        if (typeof perf.score !== 'number' || isNaN(perf.score)) {
          warnings.push(`Fixed invalid score for competency: ${perf.name}`);
          wasModified = true;
          return { ...perf, score: 0 };
        }
        
        if (perf.score < 0 || perf.score > 100) {
          warnings.push(`Clamped score for competency: ${perf.name} (${perf.score} -> ${Math.max(0, Math.min(100, perf.score))})`);
          wasModified = true;
          return { ...perf, score: Math.max(0, Math.min(100, perf.score)) };
        }
        
        return perf;
      })
      .filter(perf => perf.name && perf.name.trim() !== '');

    if (fixed.performance.length !== originalPerformanceLength) {
      warnings.push('Removed invalid performance entries');
      wasModified = true;
    }

    return { employee: fixed, wasModified, warnings };
  }

  /**
   * Clean string data by removing control characters and normalizing whitespace
   */
  private cleanString(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value || '');
    }
    
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\p{Cc}]/gu, '') // Remove control characters
      .replace(/\uFFFD/g, ''); // Remove replacement characters
  }

  /**
   * Clean and validate number data
   */
  private cleanNumber(value: unknown): number | null {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    
    return null;
  }

  /**
   * Validate organizational level against known values
   */
  private validateOrgLevel(value: string): string | null {
    const validLevels = [
      'Kepala Dinas',
      'Sekretaris Dinas',
      'Kepala Bidang',
      'Kepala Sub Bagian',
      'Kepala Seksi',
      DEFAULT_ORGANIZATIONAL_LEVEL
    ];

    if (validLevels.includes(value)) {
      return value;
    }

    // Try to match partial values
    const normalized = value.toLowerCase();
    for (const level of validLevels) {
      if (level.toLowerCase().includes(normalized) || normalized.includes(level.toLowerCase())) {
        return level;
      }
    }

    return null;
  }

  /**
   * Clean performance data array
   */
  private cleanPerformanceData(performance: unknown): Array<{ name: string; score: number }> {
    if (!Array.isArray(performance)) {
      return [];
    }
    
    return performance
      .filter(perf => perf && typeof perf === 'object')
      .map(perf => {
        const perfObj = perf as { name?: unknown; score?: unknown };
        return {
          name: this.cleanString(perfObj.name) || 'Unknown Competency',
          score: this.normalizeScore(perfObj.score)
        };
      })
      .filter(perf => perf.name !== 'Unknown Competency' && !isNaN(perf.score));
  }

  /**
   * Normalize score values to valid range
   */
  private normalizeScore(score: unknown): number {
    const numScore = parseFloat(score as string);
    if (isNaN(numScore)) {
      return 0;
    }
    
    // Clamp score to valid range
    return Math.max(0, Math.min(100, numScore));
  }
}
