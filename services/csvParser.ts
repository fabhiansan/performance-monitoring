import { determineOrganizationalLevelFromPosition, categorizeOrganizationalLevel, matchOrganizationalLevelFromSubPosition } from '../utils/organizationalLevels.js';
import { logger } from './logger.js';

export interface EmployeeData {
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  subPosition: string;
  organizationalLevel: string;
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
  
  let delimiter = ',';
  let isSpaceDelimited = false;
  
  // Priority: tabs > multiple spaces > commas
  if (tabCount > 0) {
    delimiter = '\t';
  } else if (multiSpaceCount > 0 && multiSpaceCount >= commaCount) {
    // Use regex-based splitting for multiple spaces
    isSpaceDelimited = true;
  } else {
    delimiter = ',';
  }

  if (isSpaceDelimited) {
    // Split on 2+ consecutive spaces, then trim each field
    return line.split(/\s{2,}/).map(field => field.trim()).filter(field => field.length > 0);
  }

  // Standard delimiter parsing
  const fields = [];
  let currentField = '';
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
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim());
  return fields.filter(field => field.length > 0);
};

// Helper function to create employee object from columns
function createEmployeeFromColumns(columns: string[], nameIndex: number, nipIndex: number, golIndex: number, positionIndex: number, subPositionIndex: number): EmployeeData | null {
  const position = columns[positionIndex]?.trim() || '-';
  const subPosition = columns[subPositionIndex]?.trim() || '-';
  
  // First try to match organizational level directly from sub-position
  const directMatch = matchOrganizationalLevelFromSubPosition(subPosition);
  
  let organizationalLevel: string;
  if (directMatch) {
    // Use the direct match from sub-position
    organizationalLevel = directMatch;
  } else {
    // Fall back to position-based determination
    const positionBasedLevel = determineOrganizationalLevelFromPosition(position, subPosition);
    organizationalLevel = String(categorizeOrganizationalLevel(positionBasedLevel, columns[golIndex]?.trim()));
  }
  
  const employee = {
    name: columns[nameIndex]?.trim() || '',
    nip: columns[nipIndex]?.trim() || '-',
    gol: columns[golIndex]?.trim() || '',
    pangkat: columns[golIndex]?.trim() || '-',
    position: position,
    subPosition: subPosition,
    organizationalLevel: organizationalLevel
  };
  
  // Only return if name and gol are not empty (minimum required fields)
  if (employee.name && employee.gol) {
    return employee;
  }
  return null;
}

// Helper function to parse a single line and create employee
function parseEmployeeLine(line: string): EmployeeData | null {
  const columns = parseCsvLine(line).map(col => col.trim());
  
  // Handle format: No, Nama, NIP, Pangkat, Jabatan, Sub-Jabatan (6 columns)
  if (columns.length >= 6 && columns[1].trim()) {
    return createEmployeeFromColumns(columns, 1, 2, 3, 4, 5);
  }
  
  // Fallback: if no number column, assume format: Nama, NIP, Pangkat, Jabatan, Sub-Jabatan
  if (columns.length >= 5 && !columns[0].match(/^\d+$/) && columns[0].trim()) {
    return createEmployeeFromColumns(columns, 0, 1, 2, 3, 4);
  }
  
  return null;
}

export function parseEmployeeCSV(csvText: string): EmployeeData[] {
  try {
    const lines = csvText.trim().split('\n');
    const employees: EmployeeData[] = [];
    
    // Filter out empty lines
    const dataLines = lines.filter(line => line.trim().length > 0);
    if (dataLines.length === 0) {
      return employees;
    }
    
    // Skip header line if it exists (check if first line contains column headers)
    const firstLine = dataLines[0].toLowerCase();
    const hasHeader = firstLine.includes('nama') || firstLine.includes('nip') || firstLine.includes('gol');
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
    logger.error('Error parsing CSV data', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    throw new Error('Failed to parse CSV data');
  }
}

export function validateEmployeeData(employees: EmployeeData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (employees.length === 0) {
    errors.push('No employee data found');
    return { valid: false, errors };
  }
  
  employees.forEach((emp, index) => {
    const lineNumber = index + 1;
    
    // Critical fields - these MUST be present
    if (!emp.name?.trim()) {
      errors.push(`Baris ${lineNumber}: Nama tidak boleh kosong`);
    }
    
    if (!emp.gol?.trim()) {
      errors.push(`Baris ${lineNumber}: Golongan tidak boleh kosong`);
    }
    
    // Optional fields - log warnings but don't fail validation
    if (!emp.nip?.trim()) {
      warnings.push(`Baris ${lineNumber}: NIP kosong (akan diisi dengan "-")`);
    }
    
    if (!emp.pangkat?.trim()) {
      warnings.push(`Baris ${lineNumber}: Pangkat kosong (akan diisi dengan "-")`);
    }
    
    if (!emp.position?.trim()) {
      warnings.push(`Baris ${lineNumber}: Jabatan kosong (akan diisi dengan "-")`);
    }
    
    if (!emp.subPosition?.trim()) {
      warnings.push(`Baris ${lineNumber}: Sub-Jabatan kosong (akan diisi dengan "-")`);
    }
  });
  
  // Log warnings but don't include them in errors
  if (warnings.length > 0) {
    logger.warn('Employee data validation warnings', { warnings });
  }
  
  return { valid: errors.length === 0, errors };
}
