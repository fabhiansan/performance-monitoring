export interface EmployeeData {
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  subPosition: string;
}

export function parseEmployeeCSV(csvText: string): EmployeeData[] {
  try {
    const lines = csvText.trim().split('\n');
    const employees: EmployeeData[] = [];
    
    // Skip header line if it exists
    const dataLines = lines.filter(line => line.trim().length > 0);
    const startIndex = dataLines[0].toLowerCase().includes('nama') ? 1 : 0;
    
    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      // Split by tab first, then by multiple spaces if no tabs
      let columns = line.split('\t');
      if (columns.length === 1) {
        // If no tabs, split by 2+ spaces
        columns = line.split(/\s{2,}/);
      }
      
      // Clean up columns
      columns = columns.map(col => col.trim()).filter(col => col.length > 0);
      
      if (columns.length >= 6) {
        employees.push({
          name: columns[0],
          nip: columns[1],
          gol: columns[2],
          pangkat: columns[3],
          position: columns[4],
          subPosition: columns[5]
        });
      }
    }
    
    return employees;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV data');
  }
}

export function validateEmployeeData(employees: EmployeeData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (employees.length === 0) {
    errors.push('No employee data found');
    return { valid: false, errors };
  }
  
  employees.forEach((emp, index) => {
    const lineNumber = index + 1;
    
    if (!emp.name?.trim()) {
      errors.push(`Baris ${lineNumber}: Nama tidak boleh kosong`);
    }
    
    if (!emp.nip?.trim()) {
      errors.push(`Baris ${lineNumber}: NIP tidak boleh kosong`);
    }
    
    if (!emp.gol?.trim()) {
      errors.push(`Baris ${lineNumber}: Golongan tidak boleh kosong`);
    }
    
    if (!emp.pangkat?.trim()) {
      errors.push(`Baris ${lineNumber}: Pangkat tidak boleh kosong`);
    }
    
    if (!emp.position?.trim()) {
      errors.push(`Baris ${lineNumber}: Jabatan tidak boleh kosong`);
    }
    
    if (!emp.subPosition?.trim()) {
      errors.push(`Baris ${lineNumber}: Sub-Jabatan tidak boleh kosong`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}