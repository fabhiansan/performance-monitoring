import { useMemo } from 'react';
import { useEmployees, useOrganizationalMappings } from './useEmployeeApi';
import { Employee } from '../types';

export interface DashboardData {
  employees: Employee[];
  organizationalMappings: Record<string, string>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export interface DashboardMetrics {
  totalEmployees: number;
  averageScore: number;
  organizationalSummary: {
    eselon: number;
    asnStaff: number;
    nonAsnStaff: number;
    other: number;
  };
  employeesByLevel: Record<string, Employee[]>;
  topPerformers: Array<{ name: string; score: number }>;
  performanceDistribution: Array<{ level: string; count: number; percentage: number }>;
}

/**
 * Hook to fetch and prepare dashboard data
 */
export const useDashboardData = (sessionId?: string): DashboardData => {
  const { 
    data: employees = [], 
    isLoading: employeesLoading, 
    error: employeesError 
  } = useEmployees(sessionId);
  
  const { 
    data: organizationalMappings = {}, 
    isLoading: mappingsLoading, 
    error: mappingsError 
  } = useOrganizationalMappings();

  return {
    employees,
    organizationalMappings,
    isLoading: employeesLoading || mappingsLoading,
    isError: Boolean(employeesError || mappingsError),
    error: employeesError || mappingsError || null,
  };
};

/**
 * Hook to calculate dashboard metrics from employee data
 */
export const useDashboardMetrics = (employees: Employee[]): DashboardMetrics => {
  return useMemo(() => {
    if (!employees.length) {
      return {
        totalEmployees: 0,
        averageScore: 0,
        organizationalSummary: { eselon: 0, asnStaff: 0, nonAsnStaff: 0, other: 0 },
        employeesByLevel: {},
        topPerformers: [],
        performanceDistribution: [],
      };
    }

    // Calculate total employees
    const totalEmployees = employees.length;

    // Calculate average score
    const totalScore = employees.reduce((sum, emp) => {
      const empAverage = emp.performance && emp.performance.length > 0
        ? emp.performance.reduce((empSum, perf) => empSum + perf.score, 0) / emp.performance.length
        : 0;
      return sum + empAverage;
    }, 0);
    const averageScore = totalEmployees > 0 ? totalScore / totalEmployees : 0;

    // Group employees by organizational level
    const employeesByLevel = employees.reduce((acc, employee) => {
      const level = employee.organizational_level || 'Unknown';
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(employee);
      return acc;
    }, {} as Record<string, Employee[]>);

    // Calculate organizational summary
    let eselonCount = 0;
    let asnStaffCount = 0;
    let nonAsnStaffCount = 0;
    let otherCount = 0;

    Object.entries(employeesByLevel).forEach(([level, levelEmployees]) => {
      const levelLower = level.toLowerCase();
      if (levelLower.includes('eselon')) {
        eselonCount += levelEmployees.length;
      } else if (levelLower.includes('staff asn') || levelLower === 'asn') {
        asnStaffCount += levelEmployees.length;
      } else if (levelLower.includes('staff non asn')) {
        nonAsnStaffCount += levelEmployees.length;
      } else if (levelLower === 'staff') {
        otherCount += levelEmployees.length;
      } else {
        otherCount += levelEmployees.length;
      }
    });

    const organizationalSummary = {
      eselon: eselonCount,
      asnStaff: asnStaffCount,
      nonAsnStaff: nonAsnStaffCount,
      other: otherCount
    };

    // Calculate top performers
    const employeeScores = employees
      .map(emp => {
        const avgScore = emp.performance && emp.performance.length > 0
          ? emp.performance.reduce((sum, perf) => sum + perf.score, 0) / emp.performance.length
          : 0;
        return { name: emp.name, score: avgScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10

    // Calculate performance distribution
    const performanceLevels = {
      'Excellent (85-100)': 0,
      'Good (75-84)': 0,
      'Satisfactory (65-74)': 0,
      'Needs Improvement (< 65)': 0,
    };

    employees.forEach(emp => {
      const avgScore = emp.performance && emp.performance.length > 0
        ? emp.performance.reduce((sum, perf) => sum + perf.score, 0) / emp.performance.length
        : 0;
      
      if (avgScore >= 85) {
        performanceLevels['Excellent (85-100)']++;
      } else if (avgScore >= 75) {
        performanceLevels['Good (75-84)']++;
      } else if (avgScore >= 65) {
        performanceLevels['Satisfactory (65-74)']++;
      } else {
        performanceLevels['Needs Improvement (< 65)']++;
      }
    });

    const performanceDistribution = Object.entries(performanceLevels).map(([level, count]) => ({
      level,
      count,
      percentage: totalEmployees > 0 ? (count / totalEmployees) * 100 : 0,
    }));

    return {
      totalEmployees,
      averageScore,
      organizationalSummary,
      employeesByLevel,
      topPerformers: employeeScores,
      performanceDistribution,
    };
  }, [employees]);
};