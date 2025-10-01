/**
 * ImportOrchestrator Service
 * Centralizes and orchestrates the entire data import pipeline
 *
 * Flow: Raw Data → Type Detection → Parsing → Validation → Name Matching → Save
 */

import { Employee } from '../types';
import { parsePerformanceData } from './parser';
import { parseEmployeeCSV, validateEmployeeDataV2 } from './csvParser';
import { ValidationResult, getValidationSeverity } from './validationService';
import { simplifyOrganizationalLevel } from '../utils/organizationalLevels';
import { matchEmployeeNames, autoResolveFuzzyMatches } from './NameMatchingService';
import { logger } from './logger';

/**
 * Data type detection result
 */
export type DataType = 'employee_roster' | 'performance_data';

export interface DataDetectionResult {
  type: DataType;
  confidence: number;
}

/**
 * Import processing result
 */
export interface ImportResult {
  type: DataType;
  employees: Employee[];
  validation: ValidationResult | null;
  requiresResolution: boolean;
  unknownEmployees: string[];
  fuzzyMatches: Record<string, { dbName: string; orgLevel: string; similarity: number }>;
  orgLevelMapping: Record<string, string>;
}

/**
 * Employee resolution mapping (for user to confirm fuzzy matches or provide manual mapping)
 */
export interface EmployeeResolutionMapping {
  [importedName: string]: {
    chosenName: string;
    orgLevel: string;
    isNew: boolean;
  };
}

/**
 * Detect the type of data being imported
 */
export function detectDataType(data: string): DataDetectionResult {
  const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
  if (lines.length < 1) {
    return { type: 'performance_data', confidence: 0.1 };
  }

  const header = lines[0].toLowerCase();

  // Check for employee roster headers (Indonesian)
  const employeeRosterKeywords = ['nama', 'nip', 'gol', 'pangkat', 'jabatan'];
  const foundEmployeeKeywords = employeeRosterKeywords.filter(keyword =>
    header.includes(keyword)
  );

  // Check for performance data headers (employee names in brackets)
  const hasBracketedNames = header.includes('[') && header.includes(']');

  // Calculate confidence based on keyword matches
  const keywordConfidence = foundEmployeeKeywords.length / employeeRosterKeywords.length;

  // If 3+ employee roster keywords found, it's employee roster data
  if (foundEmployeeKeywords.length >= 3) {
    return { type: 'employee_roster', confidence: Math.max(0.8, keywordConfidence) };
  }

  // If bracketed names found, it's performance data
  if (hasBracketedNames) {
    return { type: 'performance_data', confidence: 0.9 };
  }

  // Default to performance data if unclear
  return { type: 'performance_data', confidence: 0.5 };
}

/**
 * Extract employee names from performance data headers
 */
export function extractEmployeeNamesFromData(data: string): string[] {
  const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
  if (lines.length < 1) return [];

  const header = lines[0];
  const employeeNames: string[] = [];

  // Enhanced delimiter detection
  const commaCount = (header.match(/,/g) || []).length;
  const tabCount = (header.match(/\t/g) || []).length;
  const multiSpaceCount = (header.match(/\s{2,}/g) || []).length;

  let fields: string[] = [];

  // Priority: tabs > multiple spaces > commas
  if (tabCount > 0) {
    fields = header.split('\t').map(f => f.trim()).filter(f => f.length > 0);
  } else if (multiSpaceCount > 0 && multiSpaceCount >= commaCount) {
    fields = header.split(/\s{2,}/).map(f => f.trim()).filter(f => f.length > 0);
  } else {
    // Parse CSV with quotes handling
    fields = parseCSVLine(header, ',');
  }

  // Extract employee names from bracketed fields
  for (const field of fields) {
    const bracketMatch = field.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      let employeeName = bracketMatch[1].trim();
      // Remove leading numbering like "1." or "4. "
      employeeName = employeeName.replace(/^\d+\.?\s*/, '').trim();

      // Validate non-empty and minimum length
      if (employeeName &&
          employeeName.length >= 2 &&
          !employeeNames.includes(employeeName)) {
        employeeNames.push(employeeName);
      } else if (employeeName.length > 0 && employeeName.length < 2) {
        logger.warn('Skipped invalid employee name', {
          original: field,
          processed: employeeName
        });
      }
    }
  }

  return employeeNames;
}

/**
 * Parse CSV line with proper quote handling
 */
function parseCSVLine(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  fields.push(current.trim());
  return fields.filter(field => field.length > 0);
}

/**
 * Process employee roster data
 */
async function processEmployeeRoster(rawText: string): Promise<ImportResult> {
  const parsedEmployees = parseEmployeeCSV(rawText);
  const validation = validateEmployeeDataV2(parsedEmployees);

  if (!validation.isValid) {
    const errorMessages = validation.errors.map(e => e.message).join('\n');
    throw new Error(`Data tidak valid:\n${errorMessages}`);
  }

  // Convert EmployeeData to Employee format
  const employees: Employee[] = parsedEmployees.map((emp, index) => ({
    id: index + 1,
    name: emp.name,
    nip: emp.nip || '',
    gol: emp.gol || '',
    pangkat: emp.pangkat || '',
    position: emp.position || '',
    sub_position: emp.subPosition || '',
    organizational_level: simplifyOrganizationalLevel(emp.organizationalLevel, emp.gol),
    performance: []
  }));

  return {
    type: 'employee_roster',
    employees,
    validation, // ✅ Now using ValidationResult directly, no conversion needed
    requiresResolution: false,
    unknownEmployees: [],
    fuzzyMatches: {},
    orgLevelMapping: {}
  };
}

/**
 * Process performance data with name matching
 */
async function processPerformanceData(
  rawText: string,
  orgLevelMapping: Record<string, string>
): Promise<ImportResult> {
  // Extract employee names from the data
  const employeeNamesInData = extractEmployeeNamesFromData(rawText);

  // Match names against database
  const { exactMatches, fuzzyMatches, unknownNames } = matchEmployeeNames(
    employeeNamesInData,
    orgLevelMapping
  );

  logger.info('Name matching results', {
    exact: Object.keys(exactMatches).length,
    fuzzy: Object.keys(fuzzyMatches).length,
    unknown: unknownNames.length
  });

  // Check if user intervention is needed
  const requiresResolution = unknownNames.length > 0;

  // Auto-resolve fuzzy matches for now
  const updatedOrgMapping = {
    ...orgLevelMapping,
    ...exactMatches,
    ...autoResolveFuzzyMatches(fuzzyMatches, orgLevelMapping)
  };

  // If there are unknown names, return early for user resolution
  if (requiresResolution) {
    return {
      type: 'performance_data',
      employees: [],
      validation: null,
      requiresResolution: true,
      unknownEmployees: unknownNames,
      fuzzyMatches,
      orgLevelMapping: updatedOrgMapping
    };
  }

  // Parse the performance data
  const parseResult = parsePerformanceData(rawText, undefined, updatedOrgMapping);
  const sortedEmployees = parseResult.employees.sort((a, b) => a.name.localeCompare(b.name));

  // Check validation severity
  const severity = getValidationSeverity(parseResult.validation);
  if (severity === 'critical') {
    throw new Error('Terjadi kesalahan validasi data kritis. Perbaiki masalah sebelum melanjutkan.');
  }

  return {
    type: 'performance_data',
    employees: sortedEmployees,
    validation: parseResult.validation,
    requiresResolution: false,
    unknownEmployees: [],
    fuzzyMatches,
    orgLevelMapping: updatedOrgMapping
  };
}

/**
 * Main orchestrator function - processes any type of import data
 */
export async function processImportData(
  rawText: string,
  orgLevelMapping: Record<string, string> = {}
): Promise<ImportResult> {
  // Detect data type
  const detection = detectDataType(rawText);
  logger.info('Detected data type', { type: detection.type, confidence: detection.confidence });

  // Route to appropriate processor
  if (detection.type === 'employee_roster') {
    return processEmployeeRoster(rawText);
  } else {
    return processPerformanceData(rawText, orgLevelMapping);
  }
}

/**
 * Continue processing after user has resolved unknown employees
 */
export async function continueImportAfterResolution(
  rawText: string,
  orgLevelMapping: Record<string, string>
): Promise<ImportResult> {
  // Parse with the resolved mapping
  const parseResult = parsePerformanceData(rawText, undefined, orgLevelMapping);
  const sortedEmployees = parseResult.employees.sort((a, b) => a.name.localeCompare(b.name));

  // Check validation severity
  const severity = getValidationSeverity(parseResult.validation);
  if (severity === 'critical') {
    throw new Error('Terjadi kesalahan validasi data kritis. Perbaiki masalah sebelum melanjutkan.');
  }

  return {
    type: 'performance_data',
    employees: sortedEmployees,
    validation: parseResult.validation,
    requiresResolution: false,
    unknownEmployees: [],
    fuzzyMatches: {},
    orgLevelMapping
  };
}
