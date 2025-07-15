export interface EmployeeData {
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  subPosition: string;
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

export function parseEmployeeCSV(csvText: string): EmployeeData[] {
  try {
    console.log('Starting CSV parse with text:', csvText.substring(0, 200) + '...');
    const lines = csvText.trim().split('\n');
    const employees: EmployeeData[] = [];
    
    // Filter out empty lines
    const dataLines = lines.filter(line => line.trim().length > 0);
    console.log('Data lines count:', dataLines.length);
    if (dataLines.length === 0) {
      return employees;
    }
    
    // Skip header line if it exists (check if first line contains column headers)
    const firstLine = dataLines[0].toLowerCase();
    const hasHeader = firstLine.includes('nama') || firstLine.includes('nip') || firstLine.includes('gol');
    const startIndex = hasHeader ? 1 : 0;
    console.log('Has header:', hasHeader, 'Start index:', startIndex);
    
    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      console.log(`Processing line ${i}:`, line);
      
      // Use the robust CSV parser to handle comma-separated values with quotes
      const columns = parseCsvLine(line).map(col => col.trim());
      console.log(`Parsed columns (${columns.length}):`, columns);
      
      // Expect at least 7 columns: No, Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
      if (columns.length >= 7 && columns[1].trim()) { // Check that name is not empty
        const employee = {
          name: columns[1]?.trim() || '',           // Nama (index 1)
          nip: columns[2]?.trim() || '-',           // NIP (index 2) - default to "-"
          gol: columns[3]?.trim() || '',            // Gol (index 3)
          pangkat: columns[4]?.trim() || '-',       // Pangkat (index 4) - default to "-"
          position: columns[5]?.trim() || '-',      // Jabatan (index 5) - default to "-"
          subPosition: columns[6]?.trim() || '-'    // Sub-Jabatan (index 6) - default to "-"
        };
        
        console.log('Created employee object:', employee);
        
        // Only add if name and gol are not empty (minimum required fields)
        if (employee.name && employee.gol) {
          employees.push(employee);
          console.log('Added employee:', employee.name);
        } else {
          console.log('Skipped employee due to missing name or gol:', employee);
        }
      } else if (columns.length >= 6 && !columns[0].match(/^\d+$/) && columns[0].trim()) {
        // Fallback: if no number column, assume format: Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
        const employee = {
          name: columns[0]?.trim() || '',
          nip: columns[1]?.trim() || '-',
          gol: columns[2]?.trim() || '',
          pangkat: columns[3]?.trim() || '-',
          position: columns[4]?.trim() || '-',
          subPosition: columns[5]?.trim() || '-'
        };
        
        console.log('Created fallback employee object:', employee);
        
        // Only add if name and gol are not empty (minimum required fields)
        if (employee.name && employee.gol) {
          employees.push(employee);
          console.log('Added fallback employee:', employee.name);
        } else {
          console.log('Skipped fallback employee due to missing name or gol:', employee);
        }
      } else {
        console.log('Skipped line due to insufficient columns or empty name:', columns);
      }
    }
    
    console.log('Final employees array:', employees);
    return employees;
  } catch (error) {
    console.error('Error parsing CSV:', error);
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
  
  // Log warnings to console but don't include them in errors
  if (warnings.length > 0) {
    console.log('Data warnings:', warnings);
  }
  
  return { valid: errors.length === 0, errors };
}