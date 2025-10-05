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
  const sanitizedLine = line.replace(/"(?:[^"]|""|\n)*"/g, "");
  const commaCount = (sanitizedLine.match(/,/g) || []).length;
  const tabCount = (sanitizedLine.match(/\t/g) || []).length;
  const multiSpaceCount = (sanitizedLine.match(/\s{2,}/g) || []).length; // 2+ consecutive spaces

  let delimiter = ",";
  let isSpaceDelimited = false;

  // Priority: tabs > multiple spaces > commas
  if (tabCount > 0) {
    delimiter = "\t";
  } else if (multiSpaceCount > 0 && commaCount === 0) {
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

type HeaderField =
  | "name"
  | "nip"
  | "gol"
  | "pangkat"
  | "position"
  | "subPosition";

type HeaderIndexMap = Partial<Record<HeaderField, number>>;

interface EmployeeFieldSet {
  name?: string;
  nip?: string;
  gol?: string;
  pangkat?: string;
  position?: string;
  subPosition?: string;
}

const sanitizeNip = (value: string): { display: string; digits: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { display: "", digits: "" };
  }
  const compact = trimmed.replace(/\s+/g, "");
  const digitsOnly = compact.replace(/[^0-9]/g, "");
  // Prefer digits when available, otherwise keep compact form for display
  const displayValue = digitsOnly.length > 0 ? digitsOnly : compact;
  return { display: displayValue, digits: digitsOnly };
};

const deriveOrganizationalLevels = (
  position: string,
  subPosition: string,
  gol: string,
): { detailed: string; categorized: string } => {
  const safePosition = position?.trim() || "";
  const safeSubPosition = subPosition?.trim() || "";

  const directMatch = matchOrganizationalLevelFromSubPosition(safeSubPosition);
  const detailedLevel =
    directMatch ||
    determineOrganizationalLevelFromPosition(safePosition, safeSubPosition) ||
    "Staff";

  const isExplicitlyUnknown =
    safePosition &&
    (safePosition.toLowerCase().includes("unknown") ||
      safePosition.toLowerCase().includes("tidak diketahui"));

  const categorySource =
    detailedLevel === "Other" && isExplicitlyUnknown ? "Other" : detailedLevel;

  const categorized = categorizeOrganizationalLevel(
    categorySource,
    detailedLevel === "Other" && isExplicitlyUnknown ? undefined : gol,
  );

  return {
    detailed: detailedLevel,
    categorized:
      typeof categorized === "string" ? categorized : String(categorized),
  };
};

const buildEmployee = (fields: EmployeeFieldSet): EmployeeData | null => {
  const name = fields.name?.trim() || "";
  if (!name) {
    return null;
  }

  const { display: nip } = sanitizeNip(fields.nip || "");
  const gol = fields.gol?.trim() || "";
  const pangkat = fields.pangkat?.trim() || "";
  const position = fields.position?.trim() || "";
  const subPosition = fields.subPosition?.trim() || "";

  const { detailed, categorized } = deriveOrganizationalLevels(
    position,
    subPosition,
    gol,
  );

  return {
    name,
    nip,
    gol,
    pangkat,
    position,
    subPosition,
    organizationalLevel: detailed,
    organizational_level: categorized,
  };
};

const buildHeaderIndexMap = (headers: string[]): HeaderIndexMap => {
  const map: HeaderIndexMap = {};

  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();
    if (!normalized) return;

    if (normalized.includes("nama")) {
      map.name ??= index;
      return;
    }

    if (normalized.includes("nip")) {
      map.nip ??= index;
      return;
    }

    if (normalized.includes("gol")) {
      map.gol ??= index;
      return;
    }

    if (normalized.includes("pangkat")) {
      map.pangkat ??= index;
      return;
    }

    if (
      normalized.includes("sub posisi") ||
      normalized.includes("sub-posisi") ||
      normalized.includes("subposisi") ||
      (normalized.includes("sub") && normalized.includes("jabat"))
    ) {
      map.subPosition ??= index;
      return;
    }

    if (normalized.includes("jabatan")) {
      map.position ??= index;
    }
  });

  return map;
};

const parseEmployeeRowWithHeader = (
  row: string[],
  headerColumns: string[],
  headerMap: HeaderIndexMap,
): EmployeeData | null => {
  if (headerMap.name === undefined) {
    return null;
  }

  const paddedRow = headerColumns.map((_, index) => row[index] ?? "");

  const getField = (field: HeaderField): string => {
    const index = headerMap[field];
    if (index === undefined) {
      return "";
    }
    return paddedRow[index]?.trim() || "";
  };

  return buildEmployee({
    name: getField("name"),
    nip: getField("nip"),
    gol: getField("gol"),
    pangkat: getField("pangkat"),
    position: getField("position"),
    subPosition: getField("subPosition"),
  });
};

const parseEmployeeRowFallback = (columns: string[]): EmployeeData | null => {
  const trimmed = columns.map((col) => col.trim());

  if (trimmed.length >= 7 && trimmed[1]) {
    return buildEmployee({
      name: trimmed[1],
      nip: trimmed[2],
      gol: trimmed[3],
      pangkat: trimmed[4],
      position: trimmed[5],
      subPosition: trimmed[6],
    });
  }

  if (trimmed.length === 6 && trimmed[1]) {
    return buildEmployee({
      name: trimmed[1],
      nip: trimmed[2],
      gol: trimmed[3],
      position: trimmed[4],
      subPosition: trimmed[5],
    });
  }

  if (trimmed.length >= 5 && !/^\d+$/.test(trimmed[0]) && trimmed[0]) {
    if (trimmed.length >= 6) {
      return buildEmployee({
        name: trimmed[0],
        nip: trimmed[1],
        gol: trimmed[2],
        pangkat: trimmed[3],
        position: trimmed[4],
        subPosition: trimmed[5],
      });
    }

    return buildEmployee({
      name: trimmed[0],
      nip: trimmed[1],
      gol: trimmed[2],
      pangkat: trimmed[3],
      position: trimmed[4],
    });
  }

  return null;
};

export interface ParseEmployeeCSVResult {
  employees: EmployeeData[];
  validation: ValidationResult;
}

// Helper function to process CSV data lines
function processDataLines(
  dataLines: string[],
  startIndex: number,
  hasUsableHeader: boolean,
  firstLineColumns: string[]
): { employees: EmployeeData[]; parseWarnings: ValidationWarning[] } {
  const employees: EmployeeData[] = [];
  const parseWarnings: ValidationWarning[] = [];
  const headerMap = buildHeaderIndexMap(firstLineColumns);

  for (let i = startIndex; i < dataLines.length; i++) {
    const rawLine = dataLines[i];
    const columns = parseCsvLine(rawLine).map((col) => col.trim());

    if (columns.length === 0 || columns.every((value) => value === "")) {
      continue;
    }

    const lineNumber = i + 1;
    let employee: EmployeeData | null = null;

    if (hasUsableHeader) {
      employee = parseEmployeeRowWithHeader(columns, firstLineColumns, headerMap);
    }

    if (!employee) {
      employee = parseEmployeeRowFallback(columns);
    }

    if (!employee) {
      parseWarnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Baris data dilewati karena format tidak dikenali`,
        details: "Baris tidak memiliki nama pegawai atau kolom wajib.",
      });
      continue;
    }

    const numericNip = employee.nip.replace(/[^0-9]/g, "");
    if (numericNip && numericNip.length !== 18) {
      parseWarnings.push({
        type: "partial_data",
        message: `Baris ${lineNumber}: Panjang NIP tidak standar`,
        details: `NIP memiliki ${numericNip.length} digit (standar 18 digit).`,
        employeeName: employee.name,
      });
    }

    employees.push(employee);
  }

  return { employees, parseWarnings };
}

export function parseEmployeeCSV(csvText: string): ParseEmployeeCSVResult {
  try {
    const normalizedText = csvText?.replace(/\r\n/g, "\n") ?? "";
    if (!normalizedText.trim()) {
      return { employees: [], validation: validateEmployeeDataV2([]) };
    }

    const lines = normalizedText.split("\n");
    const dataLines = lines.filter((line) => line.trim().length > 0);

    if (dataLines.length === 0) {
      return { employees: [], validation: validateEmployeeDataV2([]) };
    }

    const firstLineRaw = dataLines[0];
    const firstLineColumns = parseCsvLine(firstLineRaw);
    const headerMap = buildHeaderIndexMap(firstLineColumns);
    const looksLikeHeader = /nama|nip|gol|pangkat|jabatan/i.test(firstLineRaw);
    const hasUsableHeader = looksLikeHeader && headerMap.name !== undefined;
    const startIndex = hasUsableHeader ? 1 : 0;

    const { employees, parseWarnings } = processDataLines(
      dataLines,
      startIndex,
      hasUsableHeader,
      firstLineColumns
    );

    let validation = validateEmployeeDataV2(employees);

    if (parseWarnings.length > 0) {
      const combinedWarnings = [...validation.warnings, ...parseWarnings];
      validation = {
        ...validation,
        warnings: combinedWarnings,
        summary: {
          ...validation.summary,
          warningCount: combinedWarnings.length,
          totalWarnings: combinedWarnings.length,
        },
      };
    }

    return { employees, validation };
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
