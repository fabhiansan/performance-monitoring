import { Employee } from '../types';
import { validatePerformanceData, ValidationResult } from './validationService';
import { parseCsvLine } from '../utils/csvUtils';
import {
  parseEmployeeData as parseEmployeeDataUtil,
  EmployeeMapping
} from '../utils/employeeDataUtils';
import {
  extractCompetencyEmployeeMappings,
  processDataRow,
  generateEmployeeData,
  filterValidEmployees
} from '../utils/performanceDataUtils';


// CSV parsing, employee name extraction, and score conversion utilities
// have been moved to utils/csvUtils.ts and utils/employeeDataUtils.ts
// The main parsing logic has been refactored to use these utilities

/**
 * Parse employee data from CSV file to get names and position details
 * @param csvText - CSV content with employee data
 * @returns Object mapping employee names to detailed position information
 */
export const parseEmployeeData = (csvText: string): EmployeeMapping => {
  return parseEmployeeDataUtil(csvText);
};


/**
 * Parse performance data using extracted utility functions
 */
export const parsePerformanceData = (
  text: string, 
  employeeDataCsv?: string, 
  orgLevelMapping?: EmployeeMapping
): { employees: Employee[], validation: ValidationResult } => {
  return parsePerformanceDataWithUtils(text, employeeDataCsv, orgLevelMapping);
};

/**
 * Internal function that uses the extracted utilities for parsing
 */
function parsePerformanceDataWithUtils(
  text: string, 
  employeeDataCsv?: string, 
  orgLevelMapping?: EmployeeMapping
): { employees: Employee[], validation: ValidationResult } {
  // Parse employee data if provided, otherwise use empty mapping
  const dynamicEmployeeMapping = employeeDataCsv ? parseEmployeeDataUtil(employeeDataCsv) : {};
  // Use provided organizational level mapping or empty object as fallback
  const employeeOrgLevelMapping = orgLevelMapping || {};
  
  // Filter out empty lines or lines that are just commas
  const lines = text.trim().split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 1 && !/^[,\s]*$/.test(trimmed);
  });
  
  if (lines.length < 2) {
    throw new Error('Data must have a header row and at least one data row.');
  }

  const header = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1);

  // Extract competency-employee mappings from headers
  const { scoreData, competencyEmployeeMap } = extractCompetencyEmployeeMappings(header);

  // Process each data row
  dataRows.forEach(line => {
    const values = parseCsvLine(line);
    processDataRow(values, competencyEmployeeMap, scoreData, dynamicEmployeeMapping, employeeOrgLevelMapping);
  });

  // Generate final employee data
  const employees = generateEmployeeData(scoreData, dynamicEmployeeMapping, employeeOrgLevelMapping);
  
  // Filter out employees with no performance data
  const validEmployees = filterValidEmployees(employees);

  if (validEmployees.length === 0) {
    throw new Error("No valid employee performance data could be parsed. Check that headers are in 'Competency [Employee Name]' format and data rows contain numeric scores.");
  }

  // Validate the parsed data
  const validation = validatePerformanceData(validEmployees);

  return { employees: validEmployees, validation };
}
