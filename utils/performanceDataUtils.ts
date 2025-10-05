/**
 * Performance data processing utilities extracted from parser service
 */

import { Employee } from '../types';
import { extractEmployeeName, cleanCompetencyName, parseScoreValue, isValidScore } from './csvUtils';
import { EmployeeMapping, resolveOrganizationalLevel } from './employeeDataUtils';

export interface ScoreMap {
  [employeeName: string]: {
    scores: { [competency: string]: number[] };
    organizational_level: string | null;
  };
}

export interface CompetencyEmployeeMap {
  [columnIndex: string]: { 
    competency: string; 
    employee: string; 
  };
}

/**
 * Extract employee-competency mappings from CSV headers
 */
export const extractCompetencyEmployeeMappings = (headers: string[]): {
  scoreData: ScoreMap;
  competencyEmployeeMap: CompetencyEmployeeMap;
} => {
  const scoreData: ScoreMap = {};
  const competencyEmployeeMap: CompetencyEmployeeMap = {};

  headers.forEach((header, index) => {
    const employeeName = extractEmployeeName(header);
    const competency = cleanCompetencyName(header);
    
    if (employeeName && competency) {
      // Initialize employee if not exists
      if (!scoreData[employeeName]) {
        scoreData[employeeName] = { scores: {}, organizational_level: null };
      }
      
      // Map column index to competency-employee pair
      competencyEmployeeMap[index] = { competency, employee: employeeName };
      
      // Initialize competency scores array if not exists
      if (!scoreData[employeeName].scores[competency]) {
        scoreData[employeeName].scores[competency] = [];
      }
    }
  });

  return { scoreData, competencyEmployeeMap };
};

/**
 * Check if a data row contains only scores (all numeric or string ratings)
 */
export const isScoreRow = (values: string[]): boolean => {
  return values.length > 0 && values.every(val => {
    const trimmed = val.trim();
    return trimmed === '' || !isNaN(Number(trimmed)) || 
           ['baik', 'sangat baik', 'kurang baik'].includes(trimmed.toLowerCase());
  });
};

/**
 * Extract organizational level info from a data row
 */
export const extractRowOrganizationalLevel = (values: string[], isScoreRow: boolean): string => {
  if (isScoreRow || values.length <= 3 || !values[3] || !values[3].trim()) {
    return '';
  }
  return values[3].trim();
};

/**
 * Process a single score value and add it to employee data
 */
export const processScoreValue = (
  scoreValue: string,
  mapping: { competency: string; employee: string },
  scoreData: ScoreMap,
  dynamicEmployeeMapping: EmployeeMapping,
  employeeOrgLevelMapping: EmployeeMapping,
  rowOrganizationalLevelInfo: string
): void => {
  if (!scoreValue || scoreValue.trim() === '') {
    return;
  }

  const score = parseScoreValue(scoreValue);
  if (score === null || !isValidScore(score)) {
    return;
  }

  // Add score to employee's competency
  if (!scoreData[mapping.employee].scores[mapping.competency]) {
    scoreData[mapping.employee].scores[mapping.competency] = [];
  }
  scoreData[mapping.employee].scores[mapping.competency].push(score);
  
  // Set organizational_level info if not already set
  if (!scoreData[mapping.employee].organizational_level) {
    scoreData[mapping.employee].organizational_level = resolveOrganizationalLevel(
      mapping.employee,
      dynamicEmployeeMapping,
      employeeOrgLevelMapping,
      rowOrganizationalLevelInfo || null
    );
  }
};

/**
 * Process all score values in a data row
 */
export const processDataRow = (
  values: string[],
  competencyEmployeeMap: CompetencyEmployeeMap,
  scoreData: ScoreMap,
  dynamicEmployeeMapping: EmployeeMapping,
  employeeOrgLevelMapping: EmployeeMapping
): void => {
  // Skip rows that don't have any values
  if (values.length === 0) {
    return;
  }
  
  const columnCount = Object.keys(competencyEmployeeMap).length;
  const firstValue = values[0] ?? "";
  const rowLabelDetected =
    columnCount > 0 &&
    typeof firstValue === "string" &&
    firstValue.includes("[") &&
    extractEmployeeName(firstValue) !== null;

  const normalizedValues = [...values];
  const expectedLength = rowLabelDetected ? columnCount + 1 : columnCount;
  while (normalizedValues.length < expectedLength) {
    normalizedValues.push("");
  }

  const hasRowLabel = rowLabelDetected || normalizedValues.length === columnCount + 1;

  const rowIsScoreRow = hasRowLabel
    ? isScoreRow(normalizedValues.slice(1))
    : isScoreRow(normalizedValues);
  const rowOrganizationalLevelInfo = extractRowOrganizationalLevel(normalizedValues, rowIsScoreRow);
  const rowCompetencyName = hasRowLabel ? cleanCompetencyName(normalizedValues[0]) : null;
  
  // Process each column that has a competency-employee mapping
  Object.entries(competencyEmployeeMap).forEach(([colIndex, mapping]) => {
    const index = parseInt(colIndex);
    const valueIndex = hasRowLabel ? index + 1 : index;
    if (valueIndex < normalizedValues.length) {
      const competencyName = rowCompetencyName || mapping.competency;
      processScoreValue(
        normalizedValues[valueIndex],
        { ...mapping, competency: competencyName },
        scoreData,
        dynamicEmployeeMapping,
        employeeOrgLevelMapping,
        rowOrganizationalLevelInfo
      );
    }
  });
};

/**
 * Calculate average scores for an employee's competencies
 */
export const calculateCompetencyAverages = (scores: { [competency: string]: number[] }): Array<{ name: string; score: number }> => {
  return Object.entries(scores)
    .map(([competencyName, scoreArray]) => {
      if (scoreArray.length === 0) return null;
      
      const averageScore = scoreArray.reduce((a, b) => a + b, 0) / scoreArray.length;
      return {
        name: competencyName,
        score: parseFloat(averageScore.toFixed(2)),
      };
    })
    .filter(p => p !== null) as Array<{ name: string; score: number }>;
};

/**
 * Generate final employee data from processed score data
 */
export const generateEmployeeData = (
  scoreData: ScoreMap,
  dynamicEmployeeMapping: EmployeeMapping,
  employeeOrgLevelMapping: EmployeeMapping
): Employee[] => {
  return Object.entries(scoreData).map(([name, data]) => {
    const performance = calculateCompetencyAverages(data.scores);

    // Resolve the most accurate organizational_level
    const organizationalLevel = resolveOrganizationalLevel(
      name,
      dynamicEmployeeMapping,
      employeeOrgLevelMapping,
      data.organizational_level
    );

    return {
      id: 0, // Placeholder, as ID is usually from database
      name,
      nip: '', // Placeholder
      gol: '', // Placeholder
      pangkat: '', // Placeholder
      position: '', // Placeholder
      sub_position: '', // Placeholder
      organizational_level: organizationalLevel,
      organizationalLevel,
      performance,
    };
  });
};

/**
 * Filter out employees with no performance data
 */
export const filterValidEmployees = (employees: Employee[]): Employee[] => {
  return employees.filter(
    employee => Array.isArray(employee.performance) && employee.performance.length > 0
  );
};
