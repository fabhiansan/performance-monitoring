import { Employee, CompetencyScore } from '../types';
import { REQUIRED_COMPETENCIES, validatePerformanceData, ValidationWarning, CompetencyRequirement, ValidationResult } from './validationService';

export interface DataQualityReport {
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  completeness: number; // 0-100
  employeeQuality: EmployeeQualityInfo[];
  recommendations: string[];
  scoringImpact: ScoringImpact;
}

export interface EmployeeQualityInfo {
  name: string;
  completeness: number;
  missingCompetencies: string[];
  scoringReliability: 'high' | 'medium' | 'low';
  canCalculateRecap: boolean;
}

export interface ScoringImpact {
  affectedEmployees: number;
  unreliableRecaps: number;
  missingCriticalData: string[];
}

/**
 * Generate comprehensive data quality report
 */
export function generateDataQualityReport(employees: Employee[]): DataQualityReport {
  const validation = validatePerformanceData(employees);
  const employeeQuality = employees.map(emp => analyzeEmployeeQuality(emp));
  
  // Calculate overall metrics
  const avgCompleteness = employeeQuality.length > 0 
    ? employeeQuality.reduce((sum, eq) => sum + eq.completeness, 0) / employeeQuality.length 
    : 0;
  
  const affectedEmployees = employeeQuality.filter(eq => eq.scoringReliability !== 'high').length;
  const unreliableRecaps = employeeQuality.filter(eq => !eq.canCalculateRecap).length;
  
  // Generate recommendations
  const recommendations = generateRecommendations(validation, employeeQuality);
  
  // Determine overall quality
  let overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  if (avgCompleteness >= 95 && validation.errors.length === 0) {
    overallQuality = 'excellent';
  } else if (avgCompleteness >= 85 && unreliableRecaps === 0) {
    overallQuality = 'good';
  } else if (avgCompleteness >= 70 && unreliableRecaps <= employees.length * 0.2) {
    overallQuality = 'fair';
  } else {
    overallQuality = 'poor';
  }
  
  return {
    overallQuality,
    completeness: Math.round(avgCompleteness * 100) / 100,
    employeeQuality,
    recommendations,
    scoringImpact: {
      affectedEmployees,
      unreliableRecaps,
      missingCriticalData: validation.summary.missingCompetencies
    }
  };
}

/**
 * Analyze data quality for individual employee
 */
function analyzeEmployeeQuality(employee: Employee): EmployeeQualityInfo {
  if (!employee.performance || employee.performance.length === 0) {
    return {
      name: employee.name,
      completeness: 0,
      missingCompetencies: REQUIRED_COMPETENCIES.map(req => req.name),
      scoringReliability: 'low',
      canCalculateRecap: false
    };
  }
  
  const performance = employee.performance!;

  // Find which required competencies are present
  const foundCompetencies: string[] = [];
  const missingCompetencies: string[] = [];
  
  REQUIRED_COMPETENCIES.forEach(required => {
    const hasCompetency = findMatchingCompetency(performance, required);
    if (hasCompetency) {
      foundCompetencies.push(required.name);
    } else {
      missingCompetencies.push(required.name);
    }
  });
  
  const completeness = (foundCompetencies.length / REQUIRED_COMPETENCIES.length) * 100;
  
  // Determine scoring reliability
  let scoringReliability: 'high' | 'medium' | 'low';
  let canCalculateRecap = true;
  
  // Check for critical missing competencies
  const missingPerilakuKinerja = missingCompetencies.filter(comp => 
    REQUIRED_COMPETENCIES.find(req => req.name === comp)?.scoringCategory === 'perilaku_kinerja'
  ).length;
  
  const missingKualitasKerja = missingCompetencies.filter(comp => 
    REQUIRED_COMPETENCIES.find(req => req.name === comp)?.scoringCategory === 'kualitas_kerja'
  ).length;
  
  if (missingCompetencies.length === 0) {
    scoringReliability = 'high';
  } else if (missingCompetencies.length <= 2 && missingPerilakuKinerja <= 1 && missingKualitasKerja <= 1) {
    scoringReliability = 'medium';
  } else {
    scoringReliability = 'low';
    // Cannot calculate reliable recap if missing too many critical competencies
    if (missingPerilakuKinerja >= 3 || missingKualitasKerja >= 2) {
      canCalculateRecap = false;
    }
  }
  
  return {
    name: employee.name,
    completeness: Math.round(completeness * 100) / 100,
    missingCompetencies,
    scoringReliability,
    canCalculateRecap
  };
}

/**
 * Find matching competency using fuzzy matching
 */
function findMatchingCompetency(performance: CompetencyScore[], required: CompetencyRequirement): boolean {
  const normalizeCompetencyName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  };
  
  const normalizedRequired = normalizeCompetencyName(required.name);
  
  // Direct match
  if (performance.some(p => normalizeCompetencyName(p.name) === normalizedRequired)) {
    return true;
  }
  
  // Alias matching
  for (const alias of required.aliases) {
    const normalizedAlias = normalizeCompetencyName(alias);
    if (performance.some(p => {
      const normalizedPerf = normalizeCompetencyName(p.name);
      return normalizedPerf.includes(normalizedAlias) || normalizedAlias.includes(normalizedPerf);
    })) {
      return true;
    }
  }
  
  // Fuzzy matching - check if any competency contains key words
  const keyWords = normalizedRequired.split(' ');
  return performance.some(p => {
    const normalizedPerf = normalizeCompetencyName(p.name);
    return keyWords.some(keyword => keyword.length > 3 && normalizedPerf.includes(keyword));
  });
}

/**
 * Generate actionable recommendations based on data quality analysis
 */
function generateRecommendations(validation: ValidationResult, employeeQuality: EmployeeQualityInfo[]): string[] {
  const recommendations: string[] = [];
  
  // Critical errors recommendations
  if (validation.errors.length > 0) {
    recommendations.push('❌ Fix critical data errors before proceeding with performance calculations');
  }
  
  // Missing competencies recommendations
  if (validation.summary.missingCompetencies.length > 0) {
    recommendations.push(`📋 Import complete performance data including: ${validation.summary.missingCompetencies.join(', ')}`);
  }
  
  // Low completeness recommendations
  const lowCompletenessEmployees = employeeQuality.filter(eq => eq.completeness < 70);
  if (lowCompletenessEmployees.length > 0) {
    recommendations.push(`⚠️ ${lowCompletenessEmployees.length} employees have incomplete performance data (< 70% complete)`);
  }
  
  // Unreliable scoring recommendations
  const unreliableEmployees = employeeQuality.filter(eq => !eq.canCalculateRecap);
  if (unreliableEmployees.length > 0) {
    recommendations.push(`🔍 ${unreliableEmployees.length} employees cannot have reliable performance recaps calculated`);
  }
  
  // Organizational level recommendations
  const defaultOrgLevelCount = validation.warnings.filter((warning: ValidationWarning) => warning.type === 'org_level_default').length;
  if (defaultOrgLevelCount > 0) {
    recommendations.push('🏢 Import employee roster data to get accurate organizational levels for better scoring');
  }
  
  // Data quality improvement recommendations
  if (validation.summary.dataCompleteness < 90) {
    recommendations.push('📈 Consider collecting additional performance data to improve calculation accuracy');
  }
  
  // Success recommendations
  if (recommendations.length === 0) {
    recommendations.push('✅ Data quality is excellent! All performance calculations will be reliable');
  }
  
  return recommendations;
}

/**
 * Get data quality badge/indicator for UI display
 */
export function getDataQualityBadge(quality: 'excellent' | 'good' | 'fair' | 'poor'): {
  label: string;
  color: string;
  description: string;
} {
  switch (quality) {
    case 'excellent':
      return {
        label: 'Excellent',
        color: 'green',
        description: 'All data complete, calculations fully reliable'
      };
    case 'good':
      return {
        label: 'Good',
        color: 'blue',
        description: 'Minor data gaps, calculations mostly reliable'
      };
    case 'fair':
      return {
        label: 'Fair',
        color: 'yellow',
        description: 'Some data missing, calculations may be affected'
      };
    case 'poor':
      return {
        label: 'Poor',
        color: 'red',
        description: 'Significant data gaps, calculations unreliable'
      };
  }
}

/**
 * Check if employee can have reliable performance recap calculated
 */
export function canCalculateReliableRecap(employee: Employee): boolean {
  const quality = analyzeEmployeeQuality(employee);
  return quality.canCalculateRecap;
}

/**
 * Get warning message for unreliable calculations
 */
export function getCalculationWarning(employee: Employee): string | null {
  const quality = analyzeEmployeeQuality(employee);
  
  if (!quality.canCalculateRecap) {
    return `⚠️ Performance recap may be unreliable due to missing critical competencies: ${quality.missingCompetencies.join(', ')}`;
  }
  
  if (quality.scoringReliability === 'low') {
    return `⚠️ Performance scoring has reduced reliability due to missing data`;
  }
  
  if (quality.scoringReliability === 'medium') {
    return `ℹ️ Performance scoring is mostly reliable with minor data gaps`;
  }
  
  return null;
}
