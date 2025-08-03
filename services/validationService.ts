import { Employee, CompetencyScore } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'missing_employee' | 'invalid_score' | 'missing_competency' | 'malformed_header' | 'duplicate_employee' | 'critical_data' | 'circular_reference' | 'array_size_exceeded' | 'invalid_competency_name' | 'duplicate_competency';
  message: string;
  details?: string;
  employeeName?: string;
  competencyName?: string;
  affectedCount?: number;
}

export interface ValidationWarning {
  type: 'partial_data' | 'score_normalization' | 'org_level_default' | 'competency_mismatch' | 'quality_concern' | 'competency_merged' | 'competency_sanitized';
  message: string;
  details?: string;
  employeeName?: string;
  competencyName?: string;
  affectedCount?: number;
}

export interface ValidationSummary {
  totalEmployees: number;
  validEmployees: number;
  invalidEmployees: number;
  totalCompetencies: number;
  requiredCompetencies: string[];
  missingCompetencies: string[];
  dataCompleteness: number; // percentage
  scoreQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CompetencyRequirement {
  name: string;
  aliases: string[];
  required: boolean;
  scoringCategory: 'perilaku_kinerja' | 'kualitas_kerja' | 'penilaian_pimpinan';
  weight?: number;
}

// Configuration constants for validation limits
export const VALIDATION_LIMITS = {
  MAX_ARRAY_SIZE: 1000,
  MAX_COMPETENCY_COUNT: 50,
  MAX_CIRCULAR_REFERENCE_DEPTH: 10,
  MIN_COMPETENCY_NAME_LENGTH: 2,
  MAX_COMPETENCY_NAME_LENGTH: 100
};

// Define required competencies for performance calculations
export const REQUIRED_COMPETENCIES: CompetencyRequirement[] = [
  // Perilaku Kinerja (5 competencies)
  {
    name: 'inisiatif dan fleksibilitas',
    aliases: ['inisiatif', 'fleksibilitas', 'initiative', 'flexibility'],
    required: true,
    scoringCategory: 'perilaku_kinerja',
    weight: 5
  },
  {
    name: 'kehadiran dan ketepatan waktu',
    aliases: ['kehadiran', 'ketepatan', 'waktu', 'attendance', 'punctuality'],
    required: true,
    scoringCategory: 'perilaku_kinerja',
    weight: 5
  },
  {
    name: 'kerjasama dan team work',
    aliases: ['kerjasama', 'team', 'teamwork', 'cooperation', 'collaboration'],
    required: true,
    scoringCategory: 'perilaku_kinerja',
    weight: 5
  },
  {
    name: 'manajemen waktu kerja',
    aliases: ['manajemen', 'waktu', 'kerja', 'time management', 'work management'],
    required: true,
    scoringCategory: 'perilaku_kinerja',
    weight: 5
  },
  {
    name: 'kepemimpinan',
    aliases: ['kepemimpinan', 'leadership', 'pemimpin'],
    required: true,
    scoringCategory: 'perilaku_kinerja',
    weight: 10
  },
  
  // Kualitas Kerja (3 competencies)
  {
    name: 'kualitas kinerja',
    aliases: ['kualitas', 'kinerja', 'quality', 'performance', 'work quality'],
    required: true,
    scoringCategory: 'kualitas_kerja',
    weight: 25.5 // Eselon weight, Staff gets different weight
  },
  {
    name: 'kemampuan berkomunikasi',
    aliases: ['komunikasi', 'berkomunikasi', 'communication', 'komunikatif'],
    required: true,
    scoringCategory: 'kualitas_kerja',
    weight: 8.5
  },
  {
    name: 'pemahaman tentang permasalahan sosial',
    aliases: ['permasalahan', 'sosial', 'social', 'pemahaman sosial', 'social understanding'],
    required: true,
    scoringCategory: 'kualitas_kerja',
    weight: 8.5
  }
];

/**
 * Comprehensive validation service for performance data
 */
export class PerformanceDataValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private circularReferenceTracker = new Set<string>();

  /**
   * Validate employee performance data comprehensively
   */
  validateEmployeeData(employees: Employee[]): ValidationResult {
    // Reset validation state
    this.errors = [];
    this.warnings = [];
    this.circularReferenceTracker.clear();

    // Perform validation checks
    this.validateBasicStructure(employees);
    this.validateArraySizes(employees);
    this.validateCircularReferences(employees);
    this.validateAndSanitizeCompetencyNames(employees);
    this.validateAndMergeDuplicateCompetencies(employees);
    this.validateCompetencies(employees);
    this.validateScores(employees);
    this.validateDataQuality(employees);

    // Generate summary
    const summary = this.generateSummary(employees);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary
    };
  }

  /**
   * Validate basic data structure
   */
  private validateBasicStructure(employees: Employee[]): void {
    if (employees.length === 0) {
      this.errors.push({
        type: 'critical_data',
        message: 'No employee data found',
        details: 'The dataset contains no employee records'
      });
      return;
    }

    // Check for duplicate employees
    const names = employees.map(e => e.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      this.errors.push({
        type: 'duplicate_employee',
        message: 'Duplicate employee names found',
        details: `Employees: ${[...new Set(duplicates)].join(', ')}`,
        affectedCount: duplicates.length
      });
    }

    // Check for employees with missing names
    const emptyNameEmployees = employees.filter(e => !e.name || e.name.trim() === '');
    if (emptyNameEmployees.length > 0) {
      this.errors.push({
        type: 'missing_employee',
        message: 'Employees with empty names found',
        details: 'Employee names are required for data processing',
        affectedCount: emptyNameEmployees.length
      });
    }
  }

  /**
   * Validate competency coverage and requirements
   */
  private validateCompetencies(employees: Employee[]): void {
    const allCompetencies = new Set<string>();
    const employeeCompetencies = new Map<string, Set<string>>();

    // Collect all competencies across employees
    employees.forEach(employee => {
      const empCompetencies = new Set<string>();
      employee.performance?.forEach(perf => {
        const normalizedName = this.normalizeCompetencyName(perf.name);
        allCompetencies.add(normalizedName);
        empCompetencies.add(normalizedName);
      });
      employeeCompetencies.set(employee.name, empCompetencies);
    });

    // Check for required competencies
    const missingRequiredCompetencies: string[] = [];
    REQUIRED_COMPETENCIES.forEach(required => {
      const hasCompetency = this.findMatchingCompetency([...allCompetencies], required);
      if (!hasCompetency && required.required) {
        missingRequiredCompetencies.push(required.name);
      }
    });

    if (missingRequiredCompetencies.length > 0) {
      this.errors.push({
        type: 'missing_competency',
        message: 'Required competencies missing from dataset',
        details: `Missing: ${missingRequiredCompetencies.join(', ')}`,
        affectedCount: missingRequiredCompetencies.length
      });
    }

    // Check individual employee competency coverage
    employees.forEach(employee => {
      if (!employee.performance || employee.performance.length === 0) {
        this.errors.push({
          type: 'missing_competency',
          message: 'Employee has no performance data',
          employeeName: employee.name
        });
        return;
      }

      const empCompetencies = employeeCompetencies.get(employee.name) || new Set();
      const missingForEmployee: string[] = [];

      REQUIRED_COMPETENCIES.forEach(required => {
        const hasCompetency = this.findMatchingCompetency([...empCompetencies], required);
        if (!hasCompetency && required.required) {
          missingForEmployee.push(required.name);
        }
      });

      if (missingForEmployee.length > 0) {
        if (missingForEmployee.length >= 3) {
          this.errors.push({
            type: 'missing_competency',
            message: 'Employee missing critical competencies',
            employeeName: employee.name,
            details: `Missing: ${missingForEmployee.join(', ')}`,
            affectedCount: missingForEmployee.length
          });
        } else {
          this.warnings.push({
            type: 'partial_data',
            message: 'Employee missing some competencies',
            employeeName: employee.name,
            details: `Missing: ${missingForEmployee.join(', ')}`,
            affectedCount: missingForEmployee.length
          });
        }
      }
    });
  }

  /**
   * Validate score values and ranges
   */
  private validateScores(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      employee.performance.forEach(perf => {
        // Check for invalid score values
        if (typeof perf.score !== 'number' || isNaN(perf.score)) {
          this.errors.push({
            type: 'invalid_score',
            message: 'Invalid score value found',
            employeeName: employee.name,
            competencyName: perf.name,
            details: `Score: ${perf.score}`
          });
        } else if (perf.score < 0 || perf.score > 100) {
          this.errors.push({
            type: 'invalid_score',
            message: 'Score out of valid range (0-100)',
            employeeName: employee.name,
            competencyName: perf.name,
            details: `Score: ${perf.score}`
          });
        } else if (perf.score < 60) {
          this.warnings.push({
            type: 'quality_concern',
            message: 'Very low performance score detected',
            employeeName: employee.name,
            competencyName: perf.name,
            details: `Score: ${perf.score}`
          });
        }
      });
    });
  }

  /**
   * Validate data quality aspects
   */
  private validateDataQuality(employees: Employee[]): void {
    let missingOrgLevelCount = 0;
    let defaultOrgLevelCount = 0;

    employees.forEach(employee => {
      // Check organizational level
      if (!employee.organizational_level || employee.organizational_level.trim() === '') {
        missingOrgLevelCount++;
      } else if (employee.organizational_level === 'Staff/Other') {
        defaultOrgLevelCount++;
      }

      // Check for very low performance counts
      if (employee.performance && employee.performance.length < 3) {
        this.warnings.push({
          type: 'partial_data',
          message: 'Employee has very few competency scores',
          employeeName: employee.name,
          details: `Only ${employee.performance.length} competencies recorded`
        });
      }
    });

    if (missingOrgLevelCount > 0) {
      this.warnings.push({
        type: 'org_level_default',
        message: 'Employees with missing organizational levels',
        details: 'These will default to "Staff/Other"',
        affectedCount: missingOrgLevelCount
      });
    }

    if (defaultOrgLevelCount > employees.length * 0.5) {
      this.warnings.push({
        type: 'quality_concern',
        message: 'High number of employees with default organizational level',
        details: 'Consider importing employee roster data first',
        affectedCount: defaultOrgLevelCount
      });
    }
  }

  /**
   * Validate array sizes to prevent memory issues
   */
  private validateArraySizes(employees: Employee[]): void {
    // Check total employees array size
    if (employees.length > VALIDATION_LIMITS.MAX_ARRAY_SIZE) {
      this.errors.push({
        type: 'array_size_exceeded',
        message: 'Employee array size exceeds maximum limit',
        details: `Found ${employees.length} employees, maximum allowed: ${VALIDATION_LIMITS.MAX_ARRAY_SIZE}`,
        affectedCount: employees.length
      });
      return;
    }

    // Check individual employee performance arrays
    employees.forEach(employee => {
      if (employee.performance && employee.performance.length > VALIDATION_LIMITS.MAX_COMPETENCY_COUNT) {
        this.errors.push({
          type: 'array_size_exceeded',
          message: 'Employee competency count exceeds maximum limit',
          employeeName: employee.name,
          details: `Found ${employee.performance.length} competencies, maximum allowed: ${VALIDATION_LIMITS.MAX_COMPETENCY_COUNT}`,
          affectedCount: employee.performance.length
        });
      }
    });
  }

  /**
   * Detect circular references in employee data
   */
  private validateCircularReferences(employees: Employee[], depth: number = 0): void {
    if (depth > VALIDATION_LIMITS.MAX_CIRCULAR_REFERENCE_DEPTH) {
      this.errors.push({
        type: 'circular_reference',
        message: 'Circular reference detected in employee data',
        details: `Maximum reference depth (${VALIDATION_LIMITS.MAX_CIRCULAR_REFERENCE_DEPTH}) exceeded`
      });
      return;
    }

    employees.forEach(employee => {
      const employeeKey = `${employee.id}-${employee.name}`;
      
      if (this.circularReferenceTracker.has(employeeKey)) {
        this.errors.push({
          type: 'circular_reference',
          message: 'Circular reference detected',
          employeeName: employee.name,
          details: 'Employee data contains circular references'
        });
        return;
      }

      this.circularReferenceTracker.add(employeeKey);
      
      // Check for self-references in performance data
      if (employee.performance) {
        const competencyNames = employee.performance.map(p => p.name.toLowerCase());
        const duplicateRefs = competencyNames.filter((name, index) => 
          competencyNames.indexOf(name) !== index
        );
        
        if (duplicateRefs.length > 0) {
          this.warnings.push({
            type: 'quality_concern',
            message: 'Potential circular reference in competency names',
            employeeName: employee.name,
            details: `Duplicate competency references: ${duplicateRefs.join(', ')}`
          });
        }
      }
    });
  }

  /**
   * Sanitize competency names and validate format
   */
  private validateAndSanitizeCompetencyNames(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance) return;

      employee.performance.forEach((competency, index) => {
        const originalName = competency.name;
        
        // Check for invalid characters and length
        if (!originalName || typeof originalName !== 'string') {
          this.errors.push({
            type: 'invalid_competency_name',
            message: 'Invalid competency name format',
            employeeName: employee.name,
            details: `Competency at index ${index} has invalid name`
          });
          return;
        }

        // Check length constraints
        if (originalName.length < VALIDATION_LIMITS.MIN_COMPETENCY_NAME_LENGTH) {
          this.errors.push({
            type: 'invalid_competency_name',
            message: 'Competency name too short',
            employeeName: employee.name,
            competencyName: originalName,
            details: `Minimum length: ${VALIDATION_LIMITS.MIN_COMPETENCY_NAME_LENGTH} characters`
          });
          return;
        }

        if (originalName.length > VALIDATION_LIMITS.MAX_COMPETENCY_NAME_LENGTH) {
          this.errors.push({
            type: 'invalid_competency_name',
            message: 'Competency name too long',
            employeeName: employee.name,
            competencyName: originalName.substring(0, 50) + '...',
            details: `Maximum length: ${VALIDATION_LIMITS.MAX_COMPETENCY_NAME_LENGTH} characters`
          });
          return;
        }

        // Sanitize the name
        const sanitizedName = this.sanitizeCompetencyName(originalName);
        
        if (sanitizedName !== originalName) {
          competency.name = sanitizedName;
          this.warnings.push({
            type: 'competency_sanitized',
            message: 'Competency name sanitized',
            employeeName: employee.name,
            competencyName: originalName,
            details: `Sanitized to: "${sanitizedName}"`
          });
        }
      });
    });
  }

  /**
   * Detect and merge duplicate competencies within employee data
   */
  private validateAndMergeDuplicateCompetencies(employees: Employee[]): void {
    employees.forEach(employee => {
      if (!employee.performance || employee.performance.length === 0) return;

      const competencyMap = new Map<string, CompetencyScore[]>();
      const duplicatesFound: string[] = [];

      // Group competencies by normalized name
      employee.performance.forEach(competency => {
        const normalizedName = this.normalizeCompetencyName(competency.name);
        
        if (!competencyMap.has(normalizedName)) {
          competencyMap.set(normalizedName, []);
        }
        competencyMap.get(normalizedName)!.push(competency);
      });

      // Identify and merge duplicates
      const mergedCompetencies: CompetencyScore[] = [];
      
      competencyMap.forEach((competencies, normalizedName) => {
        if (competencies.length > 1) {
          duplicatesFound.push(normalizedName);
          
          // Merge strategy: average the scores, use the most complete name
          const avgScore = competencies.reduce((sum, comp) => sum + comp.score, 0) / competencies.length;
          const bestName = competencies.reduce((best, current) => 
            current.name.length > best.name.length ? current : best
          ).name;
          
          mergedCompetencies.push({
            name: bestName,
            score: Math.round(avgScore * 100) / 100 // Round to 2 decimal places
          });
          
          this.warnings.push({
            type: 'competency_merged',
            message: 'Duplicate competencies merged',
            employeeName: employee.name,
            competencyName: normalizedName,
            details: `Merged ${competencies.length} entries with average score: ${Math.round(avgScore * 100) / 100}`
          });
        } else {
          mergedCompetencies.push(competencies[0]);
        }
      });

      // Update employee performance with merged data
      if (duplicatesFound.length > 0) {
        employee.performance = mergedCompetencies;
      }
    });
  }

  /**
   * Sanitize competency name by removing invalid characters and normalizing format
   */
  private sanitizeCompetencyName(name: string): string {
    return name
      .trim() // Remove leading/trailing whitespace
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except hyphens and underscores
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .toLowerCase() // Convert to lowercase for consistency
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  }

  /**
   * Generate validation summary
   */
  private generateSummary(employees: Employee[]): ValidationSummary {
    const validEmployees = employees.filter(emp => 
      emp.performance && emp.performance.length > 0 && 
      !this.errors.some(err => err.employeeName === emp.name)
    );

    const allCompetencies = new Set<string>();
    employees.forEach(emp => {
      emp.performance?.forEach(perf => {
        allCompetencies.add(this.normalizeCompetencyName(perf.name));
      });
    });

    const foundRequired = REQUIRED_COMPETENCIES.filter(req => 
      this.findMatchingCompetency([...allCompetencies], req)
    );

    const missingRequired = REQUIRED_COMPETENCIES.filter(req => 
      !this.findMatchingCompetency([...allCompetencies], req) && req.required
    );

    // Calculate data completeness
    const totalPossibleScores = employees.length * REQUIRED_COMPETENCIES.length;
    const actualScores = employees.reduce((sum, emp) => {
      return sum + (emp.performance?.length || 0);
    }, 0);
    
    const completeness = totalPossibleScores > 0 ? (actualScores / totalPossibleScores) * 100 : 0;

    // Determine score quality
    let scoreQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (completeness >= 90 && this.errors.length === 0) {
      scoreQuality = 'excellent';
    } else if (completeness >= 80 && this.errors.length <= 2) {
      scoreQuality = 'good';
    } else if (completeness >= 70 && this.errors.length <= 5) {
      scoreQuality = 'fair';
    } else {
      scoreQuality = 'poor';
    }

    return {
      totalEmployees: employees.length,
      validEmployees: validEmployees.length,
      invalidEmployees: employees.length - validEmployees.length,
      totalCompetencies: allCompetencies.size,
      requiredCompetencies: foundRequired.map(req => req.name),
      missingCompetencies: missingRequired.map(req => req.name),
      dataCompleteness: Math.round(completeness * 100) / 100,
      scoreQuality
    };
  }

  /**
   * Find matching competency using fuzzy matching
   */
  private findMatchingCompetency(competencies: string[], required: CompetencyRequirement): boolean {
    const normalizedRequired = this.normalizeCompetencyName(required.name);
    
    // Direct match
    if (competencies.includes(normalizedRequired)) {
      return true;
    }

    // Alias matching
    for (const alias of required.aliases) {
      const normalizedAlias = this.normalizeCompetencyName(alias);
      if (competencies.some(comp => comp.includes(normalizedAlias) || normalizedAlias.includes(comp))) {
        return true;
      }
    }

    // Fuzzy matching - check if any competency contains key words
    const keyWords = normalizedRequired.split(' ');
    return competencies.some(comp => {
      return keyWords.some(keyword => keyword.length > 3 && comp.includes(keyword));
    });
  }

  /**
   * Normalize competency name for matching
   */
  private normalizeCompetencyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }
}

/**
 * Validate performance data and return detailed results
 */
export function validatePerformanceData(employees: Employee[]): ValidationResult {
  const validator = new PerformanceDataValidator();
  return validator.validateEmployeeData(employees);
}

/**
 * Get validation severity level
 */
export function getValidationSeverity(result: ValidationResult): 'success' | 'warning' | 'error' | 'critical' {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return 'success';
  }
  
  const criticalErrors = result.errors.filter(err => 
    err.type === 'critical_data' || err.type === 'missing_employee'
  );
  
  if (criticalErrors.length > 0) {
    return 'critical';
  }
  
  if (result.errors.length > 0) {
    return 'error';
  }
  
  return 'warning';
}

/**
 * Generate user-friendly validation message
 */
export function getValidationMessage(result: ValidationResult): string {
  const severity = getValidationSeverity(result);
  
  switch (severity) {
    case 'success':
      return `✅ Data validation passed! ${result.summary.validEmployees} employees with ${result.summary.dataCompleteness}% completeness.`;
    
    case 'warning':
      return `⚠️ Data imported with ${result.warnings.length} warnings. Review data quality before proceeding.`;
    
    case 'error':
      return `❌ Data validation failed with ${result.errors.length} errors. Please fix issues before proceeding.`;
    
    case 'critical':
      return `🚨 Critical data issues found. Cannot proceed with current dataset.`;
    
    default:
      return 'Unknown validation status';
  }
}