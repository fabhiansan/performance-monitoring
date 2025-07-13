
import { Employee } from '../types';

interface ScoreMap {
  [employeeName: string]: {
    scores: { [competency: string]: number[] };
    job: string | null;
  };
}

interface EmployeeData {
  name: string;
  golongan: string;
  eselonLevel: string;
}

/**
 * A simple CSV parser that handles fields quoted with double quotes.
 * It correctly processes fields that contain commas and handles escaped quotes.
 * @param line - A single line from a CSV file.
 * @returns An array of strings representing the fields.
 */
const parseCsvLine = (line: string): string[] => {
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
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField);
  return fields;
};


const cleanCompetencyName = (rawName: string): string => {
  return rawName
    .replace(/^\d+\s*[.]?\s*/, '') // Remove leading numbers like "1. " or "1 "
    .replace(/\s*\[.*\]\s*/, '') // Remove the employee name in brackets
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' ') // Normalize internal whitespace
    .trim();
};

const extractEmployeeName = (rawHeader: string): string | null => {
  const match = rawHeader.match(/\[(.*?)\]/);
  if (!match) return null;
  let name = match[1].trim();
  // Remove leading numbering like "1." or "6 " inside brackets
  name = name.replace(/^\d+\.\s*/,'').replace(/^\d+\s+/,'');
  return name;
};

/**
 * Parse employee data from CSV file to get names and golongan levels
 * @param csvText - CSV content with employee data
 * @returns Object mapping employee names to eselon levels
 */
export const parseEmployeeData = (csvText: string): { [employeeName: string]: string } => {
  const lines = csvText.trim().split('\n').filter(line => line.trim().length > 1);
  const employeeMapping: { [employeeName: string]: string } = {};
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    // Skip empty rows
    if (values.length < 4 || !values[1] || !values[3]) continue;
    
    const name = values[1].trim();
    const golongan = values[3].trim();
    
    if (name && golongan) {
      // Extract roman numeral from golongan (e.g., "IV/c" -> "IV", "III/d" -> "III")
      const romanNumeral = golongan.split('/')[0];
      
      // Map roman numerals to eselon levels
      let eselonLevel = 'Staff/Other';
      if (romanNumeral === 'IV') {
        eselonLevel = 'Eselon IV';
      } else if (romanNumeral === 'III') {
        eselonLevel = 'Eselon III';
      }
      
      employeeMapping[name] = eselonLevel;
    }
  }
  
  return employeeMapping;
};


export const parsePerformanceData = (text: string, employeeDataCsv?: string, orgLevelMapping?: { [employeeName: string]: string }): Employee[] => {
  console.log('Starting parsePerformanceData with text length:', text.length);
  
  // Parse employee data if provided, otherwise use empty mapping
  const dynamicEmployeeMapping = employeeDataCsv ? parseEmployeeData(employeeDataCsv) : {};
  // Use provided organizational level mapping or empty object as fallback
  const employeeOrgLevelMapping = orgLevelMapping || {};
  
  // Filter out empty lines or lines that are just commas
  const lines = text.trim().split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 1 && !/^[,\s]*$/.test(trimmed);
  });
  
  console.log('Filtered lines count:', lines.length);
  
  if (lines.length < 2) {
    throw new Error('Data must have a header row and at least one data row.');
  }

  const header = parseCsvLine(lines[0]);
  console.log('Header parsed, columns count:', header.length);
  console.log('First few header columns:', header.slice(0, 5));
  
  const dataRows = lines.slice(1);
  console.log('Data rows count:', dataRows.length);

  const scoreData: ScoreMap = {};
  const competencyEmployeeMap: { [key: string]: { competency: string; employee: string } } = {};

  // Pre-populate employees and map column indices to competency-employee pairs
  header.forEach((h, index) => {
    const employeeName = extractEmployeeName(h);
    const competency = cleanCompetencyName(h);
    
    if (employeeName && competency) {
      // Initialize employee if not exists
      if (!scoreData[employeeName]) {
        scoreData[employeeName] = { scores: {}, job: null };
        console.log('Initialized employee:', employeeName);
      }
      
      // Map column index to competency-employee pair
      competencyEmployeeMap[index] = { competency, employee: employeeName };
      
      // Initialize competency scores array if not exists
      if (!scoreData[employeeName].scores[competency]) {
        scoreData[employeeName].scores[competency] = [];
      }
    }
  });
  
  console.log('Employees found in header:', Object.keys(scoreData));
  console.log('Competency-employee mappings:', Object.keys(competencyEmployeeMap).length);

  // Process each data row
  dataRows.forEach((line, rowIndex) => {
    const values = parseCsvLine(line);
    console.log(`Processing row ${rowIndex + 1}, values count:`, values.length);
    
    // Skip rows that don't have enough values or are metadata rows
    if (values.length < 5) {
      console.log(`Skipping row ${rowIndex + 1} - insufficient values`);
      return;
    }
    
    // Extract position/job info from the row (usually in column 3 or 4)
    let rowJobInfo = '';
    if (values.length > 3 && values[3] && values[3].trim()) {
      rowJobInfo = values[3].trim();
    }
    
    // Process each column that has a competency-employee mapping
    Object.entries(competencyEmployeeMap).forEach(([colIndex, mapping]) => {
      const index = parseInt(colIndex);
      if (index < values.length) {
        const scoreValue = values[index];
        
        if (scoreValue && scoreValue.trim() !== '' && !isNaN(Number(scoreValue))) {
          let score = parseInt(scoreValue, 10);
          
          // Normalize score values
          if (score === 10) {
            score = 65; // Kurang Baik
          } else if (score === 65) {
            score = 65; // Kurang Baik (already correct)
          } else if (score === 75) {
            score = 75; // Baik
          } else if (score >= 75) {
            score = 85; // Sangat Baik
          } else {
            // Keep original score for other values
            score = score;
          }
          
          if (!isNaN(score) && score >= 0 && score <= 100) {
            scoreData[mapping.employee].scores[mapping.competency].push(score);
            
            // Set job info if not already set
            if (!scoreData[mapping.employee].job && rowJobInfo) {
              scoreData[mapping.employee].job = dynamicEmployeeMapping[mapping.employee] || 
                                                employeeOrgLevelMapping[mapping.employee] || 
                                                rowJobInfo;
            }
          }
        }
      }
    });
  });
  
  console.log('Score processing completed');

  // Generate final employee data
  const employees: Employee[] = Object.entries(scoreData).map(([name, data]) => {
    const performance = Object.entries(data.scores).map(([competencyName, scores]) => {
      if (scores.length === 0) return null;
      
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        name: competencyName,
        score: parseFloat(averageScore.toFixed(2)),
      };
    }).filter(p => p !== null) as Array<{ name: string; score: number }>;

    return {
      name,
      job: data.job || 
           dynamicEmployeeMapping[name] || 
           employeeOrgLevelMapping[name] || 
           'Staff/Other',
      performance,
    };
  });
  
  // Filter out employees with no performance data
  const validEmployees = employees.filter(e => e.performance.length > 0);
  
  console.log('Valid employees generated:', validEmployees.length);
  console.log('Employee names:', validEmployees.map(e => e.name));

  if (validEmployees.length === 0) {
    throw new Error("No valid employee performance data could be parsed. Check that headers are in 'Competency [Employee Name]' format and data rows contain numeric scores.");
  }

  return validEmployees;
};
