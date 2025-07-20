
import { Employee } from '../types';

interface ScoreMap {
  [employeeName: string]: {
    scores: { [competency: string]: number[] };
    organizational_level: string | null;
  };
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


const cleanCompetencyName = (rawName: string): string => {
  const cleaned = rawName
    .replace(/^\d+\s*[.]?\s*/, '') // Remove leading numbers like "1. " or "1 "
    .replace(/\s*\[.*\]\s*/, '') // Remove the employee name in brackets
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' ') // Normalize internal whitespace
    .trim();
  return cleaned;
};

const extractEmployeeName = (rawHeader: string): string | null => {
  const match = rawHeader.match(/\[(.*?)\]/);
  if (!match) {
    return null;
  }
  let name = match[1].trim();
  // Remove leading numbering like "1." or "6 " inside brackets
  name = name.replace(/^\d+\.\s*/,'').replace(/^\d+\s+/,'');
  return name;
};

/**
 * Check if a string represents a valid performance rating
 */
const isStringRating = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  return trimmed === 'baik' || trimmed === 'sangat baik' || trimmed === 'kurang baik';
};

/**
 * Convert string rating to numeric score
 */
const convertStringRatingToScore = (rating: string): number => {
  const trimmed = rating.trim().toLowerCase();
  switch (trimmed) {
    case 'sangat baik':
      return 85;
    case 'baik':
      return 75;
    case 'kurang baik':
      return 65;
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }
};

/**
 * Parse employee data from CSV file to get names and position details
 * @param csvText - CSV content with employee data
 * @returns Object mapping employee names to detailed position information
 */
export const parseEmployeeData = (csvText: string): { [employeeName: string]: string } => {
  const lines = csvText.trim().split('\n').filter(line => line.trim().length > 1);
  const employeeMapping: { [employeeName: string]: string } = {};
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    // Skip empty rows - now expecting at least 6 columns for position and subPosition
    if (values.length < 6 || !values[1] || !values[3]) continue;
    
    const name = values[1].trim();
    const golongan = values[3].trim();
    const position = values[5]?.trim() || '';
    const subPosition = values[6]?.trim() || '';
    
    if (name && golongan) {
      // Extract roman numeral from golongan (e.g., "IV/c" -> "IV", "III/d" -> "III")
      const romanNumeral = golongan.split('/')[0];
      
      let detailedPosition = '';
      
      // Determine position based on roman numeral and position fields
      if (romanNumeral === 'II') {
        detailedPosition = 'Eselon II';
      } else if (romanNumeral === 'III') {
        detailedPosition = 'Eselon III';
      } else if (romanNumeral === 'IV') {
        detailedPosition = 'Eselon IV';
      } else {
        // For staff positions, determine detailed role based on position and subPosition
        detailedPosition = determineStaffPosition(position, subPosition, golongan);
      }
      
      employeeMapping[name] = detailedPosition;
    }
  }
  
  return employeeMapping;
};

/**
 * Determine detailed staff position based on position and subPosition fields
 * @param position - Main position field (Jabatan)
 * @param subPosition - Sub position field (Sub-Jabatan)
 * @param golongan - Golongan field to determine ASN/Non-ASN status
 * @returns Detailed staff position string
 */
const determineStaffPosition = (position: string, subPosition: string, golongan: string): string => {
  const positionLower = position.toLowerCase();
  const subPositionLower = subPosition.toLowerCase();
  
  // Determine ASN/Non-ASN status based on golongan
  // ASN typically have structured golongan like "III/a", "II/b", etc.
  // Non-ASN might have different patterns or be empty
  const isASN = golongan && golongan.match(/^[IVX]+\/[a-d]$/i);
  const asnStatus = isASN ? 'ASN' : 'Non ASN';
  
  // Determine department/bidang based on position and subPosition
  if (positionLower.includes('sekretariat') || subPositionLower.includes('sekretariat')) {
    return `Staff ${asnStatus} Sekretariat`;
  } else if (positionLower.includes('hukum') || subPositionLower.includes('hukum')) {
    return `Staff ${asnStatus} Bidang Hukum`;
  } else if (positionLower.includes('pemberdayaan') || subPositionLower.includes('pemberdayaan')) {
    return `Staff ${asnStatus} Bidang Pemberdayaan Sosial`;
  } else if (positionLower.includes('rehabilitasi') || subPositionLower.includes('rehabilitasi')) {
    return `Staff ${asnStatus} Bidang Rehabilitasi Sosial`;
  } else if (positionLower.includes('perlindungan') || subPositionLower.includes('perlindungan') || 
             positionLower.includes('jaminan') || subPositionLower.includes('jaminan')) {
    return `Staff ${asnStatus} Bidang Perlindungan dan Jaminan Sosial`;
  } else if (positionLower.includes('bencana') || subPositionLower.includes('bencana') ||
             positionLower.includes('penanganan') || subPositionLower.includes('penanganan')) {
    return `Staff ${asnStatus} Bidang Penanganan Bencana`;
  } else {
    // Default fallback for unrecognized positions
    return `Staff ${asnStatus} Sekretariat`;
  }
};


export const parsePerformanceData = (text: string, employeeDataCsv?: string, orgLevelMapping?: { [employeeName: string]: string }): Employee[] => {
  
  // Parse employee data if provided, otherwise use empty mapping
  const dynamicEmployeeMapping = employeeDataCsv ? parseEmployeeData(employeeDataCsv) : {};
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

  const scoreData: ScoreMap = {};
  const competencyEmployeeMap: { [key: string]: { competency: string; employee: string } } = {};

  // Pre-populate employees and map column indices to competency-employee pairs
  header.forEach((h, index) => {
    const employeeName = extractEmployeeName(h);
    const competency = cleanCompetencyName(h);
    
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

  // Process each data row
  dataRows.forEach((line, rowIndex) => {
    const values = parseCsvLine(line);
    
    // Check if this is a pure score row (all numeric values or string ratings)
    const isScoreRow = values.length > 0 && values.every(val => {
      const trimmed = val.trim();
      return trimmed === '' || !isNaN(Number(trimmed)) || isStringRating(trimmed);
    });
    
    // Skip rows that don't have any values
    if (values.length === 0) {
      return;
    }
    
    // For score rows, we don't need job info
    // For mixed rows, extract position/job info from the row (usually in column 3 or 4)
    let rowOrganizationalLevelInfo = '';
    if (!isScoreRow && values.length > 3 && values[3] && values[3].trim()) {
      rowOrganizationalLevelInfo = values[3].trim();
    }
    
    // Process each column that has a competency-employee mapping
    Object.entries(competencyEmployeeMap).forEach(([colIndex, mapping]) => {
      const index = parseInt(colIndex);
      if (index < values.length) {
        const scoreValue = values[index];
        
        if (scoreValue && scoreValue.trim() !== '') {
          let score: number;
          
          // Handle string ratings first
          if (isStringRating(scoreValue)) {
            score = convertStringRatingToScore(scoreValue);
          } else if (!isNaN(Number(scoreValue))) {
            score = parseInt(scoreValue, 10);
            
            // Normalize numeric score values
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
          } else {
            // Skip invalid values
            return;
          }
          
          if (!isNaN(score) && score >= 0 && score <= 100) {
            scoreData[mapping.employee].scores[mapping.competency].push(score);
            
            // Set organizational_level info if not already set
            if (!scoreData[mapping.employee].organizational_level) {
              scoreData[mapping.employee].organizational_level = dynamicEmployeeMapping[mapping.employee] || 
                                                employeeOrgLevelMapping[mapping.employee] || 
                                                rowOrganizationalLevelInfo ||
                                                'Staff/Other';
            }
          }
        }
      }
    });
  });

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

    // Resolve the most accurate organizational_level.
    const organizationalLevelCandidates: string[] = [
      dynamicEmployeeMapping[name],
      employeeOrgLevelMapping[name],
      data.organizational_level,
    ].filter(Boolean) as string[];

    // Prefer any candidate that contains the word "eselon" (covers II/III/IV) over staff placeholders
    const preferredOrganizationalLevel = organizationalLevelCandidates.find(j => /eselon/i.test(j)) || organizationalLevelCandidates[0] || 'Staff/Other';

    return {
      id: 0, // Placeholder, as ID is usually from database
      name,
      nip: '', // Placeholder
      gol: '', // Placeholder
      pangkat: '', // Placeholder
      position: '', // Placeholder
      sub_position: '', // Placeholder
      organizational_level: preferredOrganizationalLevel,
      performance,
    };
  });
  
  // Filter out employees with no performance data
  const validEmployees = employees.filter(e => e.performance.length > 0);

  if (validEmployees.length === 0) {
    throw new Error("No valid employee performance data could be parsed. Check that headers are in 'Competency [Employee Name]' format and data rows contain numeric scores.");
  }

  return validEmployees;
};
