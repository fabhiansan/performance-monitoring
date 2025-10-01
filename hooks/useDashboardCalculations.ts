/**
 * Dashboard calculation utilities extracted from DashboardOverview component
 */

import { useMemo } from 'react';
import { Employee } from '../types';

export interface OrganizationalSummary {
  eselon: number;
  asnStaff: number;
  nonAsnStaff: number;
  other: number;
}

export interface CompetencyData {
  competency: string;
  shortName: string;
  average: number;
}

export interface KpiData {
  totalEmployees: number;
  averageScore: number;
  topPerformer: Employee | null;
  topPerformerScore: number | null;
}

/**
 * Calculate average performance score for an employee
 */
export const calculateEmployeeAverageScore = (employee: Employee): number => {
  if (!employee.performance || employee.performance.length === 0) {
    return 0;
  }
  return employee.performance.reduce((sum, perf) => sum + perf.score, 0) / employee.performance.length;
};

/**
 * Calculate overall average score across all employees
 */
export const calculateOverallAverageScore = (employees: Employee[]): number => {
  if (employees.length === 0) return 0;
  
  const validEmployees = employees.filter(emp => emp.performance && emp.performance.length > 0);
  if (validEmployees.length === 0) return 0;
  
  const totalScore = validEmployees.reduce((sum, emp) => {
    return sum + calculateEmployeeAverageScore(emp);
  }, 0);
  
  return totalScore / validEmployees.length;
};

/**
 * Find the top performer among employees
 */
export const findTopPerformer = (employees: Employee[]): { employee: Employee | null; score: number | null } => {
  if (employees.length === 0) {
    return { employee: null, score: null };
  }
  
  const validEmployees = employees.filter(emp => emp.performance && emp.performance.length > 0);
  if (validEmployees.length === 0) {
    return { employee: null, score: null };
  }
  
  let topPerformer = validEmployees[0];
  let topScore = calculateEmployeeAverageScore(topPerformer);
  
  for (let i = 1; i < validEmployees.length; i++) {
    const currentScore = calculateEmployeeAverageScore(validEmployees[i]);
    if (currentScore > topScore) {
      topPerformer = validEmployees[i];
      topScore = currentScore;
    }
  }
  
  return { employee: topPerformer, score: topScore };
};

/**
 * Calculate competency averages across all employees
 */
export const calculateCompetencyAverages = (employees: Employee[]): Record<string, { total: number; count: number }> => {
  const validEmployees = employees.filter(emp => emp.performance && emp.performance.length > 0);
  
  return validEmployees.reduce((acc, emp) => {
    emp.performance!.forEach(perf => {
      // Only include competencies with actual scores > 0
      if (perf.score > 0) {
        if (!acc[perf.name]) {
          acc[perf.name] = { total: 0, count: 0 };
        }
        acc[perf.name].total += perf.score;
        acc[perf.name].count += 1;
      }
    });
    return acc;
  }, {} as Record<string, { total: number; count: number }>);
};

/**
 * Convert competency averages to sorted array
 */
export const processCompetencyData = (competencyAverages: Record<string, { total: number; count: number }>): CompetencyData[] => {
  return Object.entries(competencyAverages).map(([name, data]) => ({
    competency: name,
    shortName: name.length > 20 ? name.substring(0, 20) + '...' : name,
    average: Number((data.total / data.count).toFixed(1))
  })).sort((a, b) => b.average - a.average);
};

/**
 * Group employees by organizational level
 */
export const groupEmployeesByLevel = (employees: Employee[]): Record<string, Employee[]> => {
  const grouped: Record<string, Employee[]> = {};
  
  employees.forEach(emp => {
    const level = emp.organizational_level || 'Other';
    if (!grouped[level]) {
      grouped[level] = [];
    }
    grouped[level].push(emp);
  });
  
  return grouped;
};

/**
 * Calculate organizational summary from grouped employees
 */
export const calculateOrganizationalSummary = (employeesByLevel: Record<string, Employee[]>): OrganizationalSummary => {
  let eselonCount = 0;
  let asnStaffCount = 0;
  let nonAsnStaffCount = 0;
  let otherCount = 0;
  
  Object.entries(employeesByLevel).forEach(([level, levelEmployees]) => {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('eselon')) {
      eselonCount += levelEmployees.length;
    } else if (levelLower.includes('staff asn')) {
      asnStaffCount += levelEmployees.length;
    } else if (levelLower.includes('staff non asn')) {
      nonAsnStaffCount += levelEmployees.length;
    } else if (levelLower === 'staff') {
      // Handle generic "Staff" level - categorize as other for now
      otherCount += levelEmployees.length;
    } else {
      otherCount += levelEmployees.length;
    }
  });
  
  return {
    eselon: eselonCount,
    asnStaff: asnStaffCount,
    nonAsnStaff: nonAsnStaffCount,
    other: otherCount
  };
};

/**
 * Calculate score ranges distribution
 */
export const calculateScoreRanges = (employees: Employee[]): Array<{ name: string; value: number; color: string }> => {
  const scoreRanges = [
    { name: 'Excellent (90-100)', value: 0, color: '#10b981' },
    { name: 'Good (80-89)', value: 0, color: '#3b82f6' },
    { name: 'Average (70-79)', value: 0, color: '#f59e0b' },
    { name: 'Below Average (<70)', value: 0, color: '#ef4444' }
  ];

  employees.forEach(emp => {
    if (!emp.performance || emp.performance.length === 0) return;
    const avgScore = calculateEmployeeAverageScore(emp);
    if (avgScore >= 90) scoreRanges[0].value++;
    else if (avgScore >= 80) scoreRanges[1].value++;
    else if (avgScore >= 70) scoreRanges[2].value++;
    else scoreRanges[3].value++;
  });

  return scoreRanges;
};

/**
 * Custom hook for dashboard calculations
 */
export const useDashboardCalculations = (employees: Employee[]) => {
  const kpiData = useMemo((): KpiData => {
    const { employee: topPerformer, score: topScore } = findTopPerformer(employees);
    return {
      totalEmployees: employees.length,
      averageScore: calculateOverallAverageScore(employees),
      topPerformer,
      topPerformerScore: topScore
    };
  }, [employees]);

  const competencyData = useMemo((): CompetencyData[] => {
    const averages = calculateCompetencyAverages(employees);
    return processCompetencyData(averages);
  }, [employees]);

  const employeesByLevel = useMemo(() => {
    return groupEmployeesByLevel(employees);
  }, [employees]);

  const organizationalSummary = useMemo((): OrganizationalSummary => {
    return calculateOrganizationalSummary(employeesByLevel);
  }, [employeesByLevel]);

  const scoreRanges = useMemo(() => {
    return calculateScoreRanges(employees);
  }, [employees]);

  return {
    kpiData,
    competencyData,
    employeesByLevel,
    organizationalSummary,
    scoreRanges
  };
};