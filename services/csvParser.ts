import {
  determineOrganizationalLevelFromPosition,
  categorizeOrganizationalLevel,
  matchOrganizationalLevelFromSubPosition,
} from "../utils/organizationalLevels.js";
import { logger } from "./logger.js";
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./validationService.js";

export interface EmployeeData {
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  subPosition: string;
  organizationalLevel: string;
  organizational_level: string;
}

/**
 * A robust parser that handles CSV, TSV, and Google Sheets copy-paste formats.
 * Auto-detects the delimiter (comma, tab, or multiple spaces) and handles quoted fields correctly.
 * @param line - A single line from a CSV/TSV file.
 * @returns An array of strings representing the fields.
 */
const parseCsvLine = (line: string): string[] => {
  // Enhanced delimiter detection for Google Sheets copy-paste
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  const multiSpaceCount = (line.match(/\s{2,}/g) || []).length; // 2+ consecutive spaces

  let delimiter = ",";
  let isSpaceDelimited = false;

  // Priority: tabs > multiple spaces > commas
  if (tabCount > 0) {
    delimiter = "\t";
  } else if (multiSpaceCount > 0 && multiSpaceCount >= commaCount) {
    // Use regex-based splitting for multiple spaces
    isSpaceDelimited = true;
  } else {
    delimiter = ",";
  }

  if (isSpaceDelimited) {
    // Split on 2+ consecutive spaces, then trim each field
    // Keep empty fields as they represent missing data (e.g., empty NIP for Non-ASN staff)
    return line.split(/\s{2,}/).map((field) => field.trim());
  }

  // Standard delimiter parsing
  const fields = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handles escaped quotes ("") by peeking ahead
      if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
        currentField += '"';
        i++; // Skip the second quote of the pair
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(currentField.trim());
      currentField = "";
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim());
  // Keep empty fields as they represent missing data (e.g., empty NIP/PANGKAT for Non-ASN staff)
  return fields;
};

// Helper function to create employee object from columns
function createEmployeeFromColumns(
  columns: string[],
  nameIndex: number,
  nipIndex: number,
  golIndex: number,
  pangkatIndex: number | null,
  positionIndex: number,
  subPositionIndex: number | null,
): EmployeeData | null {
  const position = columns[positionIndex]?.trim() || "-";
  const subPosition =
    subPositionIndex != null ? columns[subPositionIndex]?.trim() || "-" : "-";

  // First try to match organizational level directly from sub-position
  const directMatch = matchOrganizationalLevelFromSubPosition(subPosition);

  let detailedLevel: string;
  let categoryLevel: string;

  if (directMatch) {
    detailedLevel = directMatch;
    categoryLevel = String(
      categorizeOrganizationalLevel(directMatch, columns[golIndex]?.trim()),
    );
  } else {
    const positionBasedLevel = determineOrganizationalLevelFromPosition(
      position,
      subPosition,
    );
    detailedLevel = positionBasedLevel;

    // Check if position explicitly indicates unknown/unclear
    // In this case, don't use golongan fallback
    const isExplicitlyUnknown =
      position &&
      typeof position === "string" &&
      (position.toLowerCase().includes("unknown") ||
        position.toLowerCase().includes("tidak diketahui"));

    categoryLevel = String(
      categorizeOrganizationalLevel(
        positionBasedLevel === "Other" && isExplicitlyUnknown
          ? "Other"
          : positionBasedLevel,
        positionBasedLevel === "Other" && isExplicitlyUnknown
          ? undefined
          : columns[golIndex]?.trim(),
      ),
    );
  }

  const employee = {
    name: columns[nameIndex]?.trim() || "",
    nip: columns[nipIndex]?.trim() || "-",
    gol: columns[golIndex]?.trim() || "-",
    pangkat: pangkatIndex != null ? columns[pangkatIndex]?.trim() || "-" : "-",
    position: position,
    subPosition: subPosition,
    organizationalLevel: detailedLevel,
    organizational_level: categoryLevel,
  };

  // Only return if name is not empty (minimum required field for both ASN and Non-ASN staff)
  if (employee.name) {
    return employee;
  }
  return null;
}

// Helper function to parse a single line and create employee
function parseEmployeeLine(line: string): EmployeeData | null {
  const columns = parseCsvLine(line).map((col) => col.trim());

  // Format: No, Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan (7 columns)
  if (columns.length >= 7 && columns[1].trim()) {
    return createEmployeeFromColumns(columns, 1, 2, 3, 4, 5, 6);
  }

  // Format: No, Nama, NIP, Gol, Jabatan, Sub-Jabatan (6 columns, no Pangkat)
  if (columns.length === 6 && columns[1].trim()) {
    return createEmployeeFromColumns(columns, 1, 2, 3, null, 4, 5);
  }

  // Fallback: if no number column, assume format: Nama, NIP, Pangkat, Jabatan, Sub-Jabatan
  if (columns.length >= 5 && !columns[0].match(/^\d+$/) && columns[0].trim()) {
    if (columns.length >= 6) {
      return createEmployeeFromColumns(columns, 0, 1, 2, 3, 4, 5);
    }
    // Format without sub-position: Nama, NIP, Gol, Pangkat, Jabatan
    return createEmployeeFromColumns(columns, 0, 1, 2, 3, 4, null);
  }

  return null;
}

export function parseEmployeeCSV(csvText: string): EmployeeData[] {
  try {
    const lines = csvText.trim().split("\n");
    const employees: EmployeeData[] = [];

    // Filter out empty lines
    const dataLines = lines.filter((line) => line.trim().length > 0);
    if (dataLines.length === 0) {
      return employees;
    }

    // Skip header line if it exists (check if first line contains column headers)
    const firstLine = dataLines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("nama") ||
      firstLine.includes("nip") ||
      firstLine.includes("gol");
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const employee = parseEmployeeLine(line);
      if (employee) {
        employees.push(employee);
      }
    }

    return employees;
  } catch (error) {
    logger.error("Error parsing CSV data", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error("Failed to parse CSV data");
  }
}

export function validateEmployeeData(employees: EmployeeData[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (employees.length === 0) {
    errors.push("No employee data found");
    return { valid: false, errors };
  }

  employees.forEach((emp, index) => {
    const lineNumber = index + 1;

    // Critical fields - these MUST be present
    if (!emp.name?.trim()) {
      errors.push(`Baris ${lineNumber}: Nama tidak boleh kosong`);
    }

    // Optional fields - log warnings but don't fail validation
    // Note: gol/pangkat are optional for Non-ASN staff
    if (!emp.gol?.trim() || emp.gol === "-") {
      warnings.push(
        `Baris ${lineNumber}: Golongan kosong (staf Non-ASN atau akan diisi dengan "-")`,
      );
    }

    if (!emp.nip?.trim() || emp.nip === "-") {
      warnings.push(
        `Baris ${lineNumber}: NIP kosong (staf Non-ASN atau akan diisi dengan "-")`,
      );
    }

    if (!emp.pangkat?.trim() || emp.pangkat === "-") {
      warnings.push(
        `Baris ${lineNumber}: Pangkat kosong (staf Non-ASN atau akan diisi dengan "-")`,
      );
    }

    if (!emp.position?.trim()) {
      warnings.push(
        `Baris ${lineNumber}: Jabatan kosong (akan diisi dengan "-")`,
      );
    }

    if (!emp.subPosition?.trim()) {
      warnings.push(
        `Baris ${lineNumber}: Sub-Jabatan kosong (akan diisi dengan "-")`,
      );
    }
  });

  // Log warnings but don't include them in errors
  if (warnings.length > 0) {
    logger.warn("Employee data validation warnings", { warnings });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Enhanced validation that returns structured ValidationResult
 * This replaces the simple {valid, errors} format with a comprehensive validation result
 */
export function validateEmployeeDataV2(
  employees: EmployeeData[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (employees.length === 0) {
    errors.push({
      type: "critical_data",
      message: "No employee data found in the import",
      details: "The imported file does not contain any employee records",
    });

    return {
      isValid: false,
      errors,
      warnings,
      summary: {
        totalEmployees: 0,
        validEmployees: 0,
        invalidEmployees: 0,
        totalCompetencies: 0,
        requiredCompetencies: [],
        missingCompetencies: [],
        dataCompleteness: 0,
        completeness: 0,
        scoreQuality: "poor",
        errorCount: errors.length,
        warningCount: 0,
      },
    };
  }

  let validEmployeeCount = 0;

  employees.forEach((emp, index) => {
    const lineNumber = index + 1;
    let employeeValid = true;

    // Critical field: Name (MUST be present)
    if (!emp.name?.trim()) {
      errors.push({
        type: "missing_employee",
        message: `Baris ${lineNumber}: Nama tidak boleh kosong`,
        details: `Employee name is required at row ${lineNumber}`,
      });
      employeeValid = false;
    }

    // Optional fields - generate warnings but don't fail validation
    // Note: gol/pangkat are optional for Non-ASN staff
    if (!emp.gol?.trim() || emp.gol === "-") {
      warnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Golongan kosong`,
        details:
          'This may be a Non-ASN staff member or will be filled with "-"',
        employeeName: emp.name,
      });
    }

    if (!emp.nip?.trim() || emp.nip === "-") {
      warnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: NIP kosong`,
        details:
          'This may be a Non-ASN staff member or will be filled with "-"',
        employeeName: emp.name,
      });
    }

    if (!emp.pangkat?.trim() || emp.pangkat === "-") {
      warnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Pangkat kosong`,
        details:
          'This may be a Non-ASN staff member or will be filled with "-"',
        employeeName: emp.name,
      });
    }

    if (!emp.position?.trim()) {
      warnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Jabatan kosong`,
        details: 'Position will be filled with "-"',
        employeeName: emp.name,
      });
    }

    if (!emp.subPosition?.trim()) {
      warnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Sub-Jabatan kosong`,
        details: 'Sub-position will be filled with "-"',
        employeeName: emp.name,
      });
    }

    if (employeeValid) {
      validEmployeeCount++;
    }
  });

  const invalidEmployeeCount = employees.length - validEmployeeCount;
  const completeness =
    employees.length > 0 ? validEmployeeCount / employees.length : 0;

  // Determine score quality based on completeness and warnings
  let scoreQuality: "excellent" | "good" | "fair" | "poor";
  if (completeness === 1 && warnings.length === 0) {
    scoreQuality = "excellent";
  } else if (completeness >= 0.9 && warnings.length < employees.length * 0.2) {
    scoreQuality = "good";
  } else if (completeness >= 0.7) {
    scoreQuality = "fair";
  } else {
    scoreQuality = "poor";
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalEmployees: employees.length,
      validEmployees: validEmployeeCount,
      invalidEmployees: invalidEmployeeCount,
      totalCompetencies: 0, // Employee roster doesn't have competency scores
      requiredCompetencies: [],
      missingCompetencies: [],
      dataCompleteness: completeness,
      completeness,
      scoreQuality,
      errorCount: errors.length,
      warningCount: warnings.length,
      validationTimestamp: new Date().toISOString(),
    },
  };
}
