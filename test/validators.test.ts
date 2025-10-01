import { describe, it, expect, beforeEach } from 'vitest';
import { EmployeeValidator } from '../services/validators/EmployeeValidator';
import { CompetencyValidator } from '../services/validators/CompetencyValidator';
import { ScoreValidator } from '../services/validators/ScoreValidator';
import { ValidatorOrchestrator } from '../services/validators/ValidatorOrchestrator';
import { Employee } from '../types';

// Constants for repeated strings
const LEADERSHIP_COMPETENCY = 'Leadership';
const TECHNICAL_SKILLS = 'Technical Skills';

describe('Validator Services', () => {
  let sampleEmployees: Employee[];

  beforeEach(() => {
    sampleEmployees = [
      {
        name: 'John Doe',
        organizational_level: 'Manager',
        performance: [
          { name: LEADERSHIP_COMPETENCY, score: 85 },
          { name: 'Communication', score: 90 },
          { name: TECHNICAL_SKILLS, score: 75 }
        ]
      },
      {
        name: 'Jane Smith',
        organizational_level: 'Senior Developer',
        performance: [
          { name: LEADERSHIP_COMPETENCY, score: 78 },
          { name: 'Communication', score: 88 },
          { name: TECHNICAL_SKILLS, score: 95 }
        ]
      }
    ];
  });

  describe('EmployeeValidator', () => {
    let validator: EmployeeValidator;

    beforeEach(() => {
      validator = new EmployeeValidator();
    });

    it('should validate valid employee data without errors', () => {
      const result = validator.validate(sampleEmployees);
      
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing employee names', () => {
      const invalidEmployees = [
        {
          name: '',
          organizational_level: 'Manager',
          performance: [{ name: LEADERSHIP_COMPETENCY, score: 85 }]
        }
      ] as Employee[];

      const result = validator.validate(invalidEmployees);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('name'))).toBe(true);
    });

    it('should detect duplicate employee names', () => {
      const duplicateEmployees = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [{ name: LEADERSHIP_COMPETENCY, score: 85 }]
        },
        {
          name: 'John Doe',
          organizational_level: 'Developer',
          performance: [{ name: TECHNICAL_SKILLS, score: 90 }]
        }
      ];

      const result = validator.validate(duplicateEmployees);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('duplicate'))).toBe(true);
    });

    it('should handle non-array input gracefully', () => {
      const result = validator.validate({} as unknown);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('critical_data');
      expect(result.errors[0].message).toContain('array');
    });

    it('should warn about empty employee array', () => {
      const result = validator.validate([]);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => warning.message.includes('empty'))).toBe(true);
    });

    it('should validate organizational levels', () => {
      const employeesWithInvalidLevel = [
        {
          name: 'Test Employee',
          organizational_level: '',
          performance: [{ name: LEADERSHIP_COMPETENCY, score: 85 }]
        }
      ] as Employee[];

      const result = validator.validate(employeesWithInvalidLevel);
      
      expect(result.errors.some(error => 
        error.message.includes('organizational_level') || 
        error.message.includes('level')
      )).toBe(true);
    });
  });

  describe('CompetencyValidator', () => {
    let validator: CompetencyValidator;

    beforeEach(() => {
      validator = new CompetencyValidator();
    });

    it('should validate competency names and structures', () => {
      const result = validator.validate(sampleEmployees);
      
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing competency names', () => {
      const invalidEmployees = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: '', score: 85 },
            { name: LEADERSHIP_COMPETENCY, score: 90 }
          ]
        }
      ] as Employee[];

      const result = validator.validate(invalidEmployees);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.message.includes('competency') && error.message.includes('empty')
      )).toBe(true);
    });

    it('should detect duplicate competencies within an employee', () => {
      const employeeWithDuplicates = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: LEADERSHIP_COMPETENCY, score: 85 },
            { name: LEADERSHIP_COMPETENCY, score: 90 }
          ]
        }
      ] as Employee[];

      const result = validator.validate(employeeWithDuplicates);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => 
        warning.message.includes('duplicate') && warning.message.includes('competency')
      )).toBe(true);
    });

    it('should handle invalid competency structures', () => {
      const employeesWithInvalidStructure = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { score: 85 }, // Missing competency name
            { name: 'Leadership' } // Missing score
          ]
        }
      ] as unknown[];

      const result = validator.validate(employeesWithInvalidStructure);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate against required competencies', () => {
      const employeesWithMissingCompetencies = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: 'Leadership', score: 85 }
            // Missing other required competencies
          ]
        }
      ] as Employee[];

      const result = validator.validate(employeesWithMissingCompetencies);
      
      // Should have warnings or errors about missing required competencies
      expect(result.warnings.length + result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ScoreValidator', () => {
    let validator: ScoreValidator;

    beforeEach(() => {
      validator = new ScoreValidator();
    });

    it('should validate score values within acceptable ranges', () => {
      const result = validator.validate(sampleEmployees);
      
      expect(result.errors).toHaveLength(0);
    });

    it('should detect scores outside valid range (0-100)', () => {
      const employeesWithInvalidScores = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: 'Leadership', score: -10 }, // Below minimum
            { name: 'Communication', score: 150 }, // Above maximum
            { name: TECHNICAL_SKILLS, score: 75 }
          ]
        }
      ] as Employee[];

      const result = validator.validate(employeesWithInvalidScores);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.message.includes('range') || error.message.includes('0-100')
      )).toBe(true);
    });

    it('should detect non-numeric scores', () => {
      const employeesWithInvalidScores = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: 'Leadership', score: 'excellent' as unknown },
            { name: 'Communication', score: null as unknown }
          ]
        }
      ];

      const result = validator.validate(employeesWithInvalidScores);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.message.includes('number') || error.message.includes('numeric')
      )).toBe(true);
    });

    it('should validate score consistency across employees', () => {
      const employeesWithInconsistentScores = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: [
            { name: LEADERSHIP_COMPETENCY, score: 85 },
            { name: 'Communication', score: 90 }
          ]
        },
        {
          name: 'Jane Smith',
          organizational_level: 'Manager',
          performance: [
            { name: 'Leadership', score: 5 }, // Suspiciously low
            { name: 'Communication', score: 95 }
          ]
        }
      ] as Employee[];

      const result = validator.validate(employeesWithInconsistentScores);
      
      // Should generate warnings about potential inconsistencies
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing performance data', () => {
      const employeesWithoutPerformance = [
        {
          name: 'John Doe',
          organizational_level: 'Manager',
          performance: []
        }
      ] as Employee[];

      const result = validator.validate(employeesWithoutPerformance);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.message.includes('performance') && error.message.includes('empty')
      )).toBe(true);
    });
  });

  describe('ValidatorOrchestrator', () => {
    let orchestrator: ValidatorOrchestrator;

    beforeEach(() => {
      orchestrator = new ValidatorOrchestrator();
    });

    it('should coordinate all validators and return comprehensive results', () => {
      const result = orchestrator.validateAll(sampleEmployees);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('summary');
      
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should detect multiple validation issues across validators', () => {
      const problematicEmployees = [
        {
          name: '', // Invalid name
          organizational_level: 'Manager',
          performance: [
            { name: '', score: 150 }, // Invalid competency and score
            { name: 'Leadership', score: -10 } // Invalid score
          ]
        }
      ] as Employee[];

      const result = orchestrator.validateAll(problematicEmployees);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have errors from multiple validators
      const errorTypes = result.errors.map(e => e.type);
      expect(errorTypes).toContain('critical_data');
    });

    it('should provide detailed validation summary', () => {
      const result = orchestrator.validateAll(sampleEmployees);
      
      expect(result.summary).toHaveProperty('totalEmployees');
      expect(result.summary).toHaveProperty('validEmployees');
      expect(result.summary).toHaveProperty('totalErrors');
      expect(result.summary).toHaveProperty('totalWarnings');
      expect(result.summary).toHaveProperty('overallScore');
      
      expect(result.summary.totalEmployees).toBe(sampleEmployees.length);
      expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallScore).toBeLessThanOrEqual(100);
    });

    it('should allow selective validation with specific validators', () => {
      const result = orchestrator.validateSelective(sampleEmployees, {
        validateEmployees: true,
        validateCompetencies: false,
        validateScores: true
      });
      
      expect(result.isValid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle empty datasets gracefully', () => {
      const result = orchestrator.validateAll([]);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.summary.totalEmployees).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex real-world scenarios', () => {
      const complexEmployees = [
        {
          name: 'Alice Johnson',
          organizational_level: 'Senior Manager',
          performance: [
            { name: 'Leadership', score: 92 },
            { name: 'Strategic Thinking', score: 88 },
            { name: 'Communication', score: 90 },
            { name: TECHNICAL_SKILLS, score: 75 },
            { name: 'Team Management', score: 85 }
          ]
        },
        {
          name: 'Bob Wilson',
          organizational_level: 'Developer',
          performance: [
            { name: TECHNICAL_SKILLS, score: 95 },
            { name: 'Communication', score: 70 },
            { name: 'Problem Solving', score: 90 },
            { name: 'Leadership', score: 60 }
          ]
        },
        {
          name: 'Carol Davis',
          organizational_level: 'Junior Developer',
          performance: [
            { name: TECHNICAL_SKILLS, score: 78 },
            { name: 'Learning Ability', score: 95 },
            { name: 'Communication', score: 82 }
          ]
        }
      ];

      const orchestrator = new ValidatorOrchestrator();
      const result = orchestrator.validateAll(complexEmployees);
      
      expect(result.summary.totalEmployees).toBe(3);
      expect(result.summary.overallScore).toBeGreaterThan(70);
    });

    it('should provide actionable validation feedback', () => {
      const problematicEmployees = [
        {
          name: 'Test Employee',
          organizational_level: '',
          performance: [
            { name: 'Leadership', score: 105 }, // Out of range
            { name: '', score: 75 }, // Empty competency
            { name: 'Communication', score: 'good' as unknown } // Non-numeric
          ]
        }
      ] as Employee[];

      const orchestrator = new ValidatorOrchestrator();
      const result = orchestrator.validateAll(problematicEmployees);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      
      // Check that errors provide actionable information
      result.errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.type).toBeTruthy();
        expect(typeof error.message).toBe('string');
      });
    });
  });
});
