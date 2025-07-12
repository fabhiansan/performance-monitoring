
import { Employee } from '../types';

interface ScoreMap {
  [employeeName: string]: {
    scores: { [competency: string]: number[] };
    job: string | null;
  };
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
    .trim();
};

const extractEmployeeName = (rawHeader: string): string | null => {
  const match = rawHeader.match(/\[(.*?)\]/);
  return match ? match[1].trim() : null;
};

// Employee organizational level mapping
// Based on the provided organizational structure
const employeeOrgLevelMapping: { [employeeName: string]: string } = {
  // Eselon III employees
  'MURJANI, S.Pd, MM': 'Eselon III',
  'GUSNANDA EFFENDI, S.Pd, MM': 'Eselon III',
  'H. ACHMADI, S.Sos': 'Eselon III',
  'SELAMAT RIADI, S.Sos, M.AP': 'Eselon III',
  
  // Eselon IV employees
  'HANDIASTY EKA WARDHANI, SE, MM': 'Eselon IV',
  'MASWIAH, SE': 'Eselon IV',
  'SUSANTI, SE': 'Eselon IV',
  'SUGIYONO, S.ST': 'Eselon IV',
  'AKHMAD YULIADIE, ST': 'Eselon IV',
  'MUSTAQIM, S.Sos': 'Eselon IV',
  'RIZDIE PRIMA SURYA, SE': 'Eselon IV',
  'YOEFI FAHROMI, SE': 'Eselon IV',
  'SYARIF MAULIDDIN NUR, S.Sos': 'Eselon IV',
  'ACHMAD EDDY SEPTIADI, SH': 'Eselon IV',
  'YUDHIANA KHUSNAN K, S.STP': 'Eselon IV',
  'Drs. AGUS MULYANA, M.I.Kom': 'Eselon IV',
  'DION MULIA ANGGARA PUTRA, S.Kep.,Ners': 'Eselon IV',
  'RAHMAT, MPS SP': 'Eselon IV',
  'YAHYA, S.AP': 'Eselon IV',
  
  // Staff/Other employees (any employee not listed above will default to this)
};

export const parsePerformanceData = (text: string): Employee[] => {
  // Filter out empty lines or lines that are just commas
  const lines = text.trim().split('\n').filter(line => line.trim().length > 1 && !/^[,\s]*$/.test(line));
  if (lines.length < 2) {
    throw new Error('Data must have a header row and at least one data row.');
  }

  const header = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1);

  const scoreData: ScoreMap = {};

  // Pre-populate employees from the header to ensure everyone is included
  header.forEach(h => {
    const employeeName = extractEmployeeName(h);
    if (employeeName && !scoreData[employeeName]) {
      scoreData[employeeName] = { scores: {}, job: null };
    }
  });

  dataRows.forEach(line => {
    const values = parseCsvLine(line);
    const reviewerJob = values[3]?.trim();

    header.forEach((h, index) => {
      const employeeName = extractEmployeeName(h);
      const competency = cleanCompetencyName(h);
      
      if (employeeName && competency && index < values.length) {
        const scoreValue = values[index];
        if (scoreValue && scoreValue.trim() !== '') {
            let score = parseInt(scoreValue, 10);
            
            // Convert score values: 10->65 (Kurang Baik), 75->75 (Baik), other high values->85 (Sangat Baik)
            if (score === 10) {
              score = 65; // Kurang Baik
            } else if (score === 75) {
              score = 75; // Baik
            } else if (score >= 75) {
              score = 85; // Sangat Baik
            } else if (score === 65) {
              score = 65; // Kurang Baik
            } else {
              // For any other values, assume they follow the same pattern
              score = score; // Keep original if already in correct format
            }
            
            if (!isNaN(score)) {
              if (!scoreData[employeeName].scores[competency]) {
                scoreData[employeeName].scores[competency] = [];
              }
              scoreData[employeeName].scores[competency].push(score);

              // Assign job title based on organizational level mapping
              if (!scoreData[employeeName].job) {
                scoreData[employeeName].job = employeeOrgLevelMapping[employeeName] || 'Staff/Other';
              }
            }
        }
      }
    });
  });

  const employees: Employee[] = Object.entries(scoreData).map(([name, data]) => {
    const performance = Object.entries(data.scores).map(([competencyName, scores]) => {
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        name: competencyName,
        score: parseFloat(averageScore.toFixed(2)),
      };
    });

    return {
      name,
      job: data.job || 'N/A',
      performance,
    };
  });
  
  // Filter out any employees who had headers but no actual scores were parsed for them.
  const validEmployees = employees.filter(e => e.performance.length > 0);

  if (validEmployees.length === 0) {
      throw new Error("No valid employee performance data could be parsed. Check that headers are in 'Competency [Employee Name]' format and data rows contain numeric scores.");
  }

  return validEmployees;
};
