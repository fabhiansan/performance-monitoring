/**
 * Custom hook for data processing logic
 * Extracts data parsing, validation, and transformation logic from DataManagement component
 */

import { useState, useCallback } from 'react';
import { Employee } from '../types';
import { parsePerformanceData } from '../services/parser';
import { parseEmployeeCSV } from '../services/csvParser';
import { ValidationResult } from '../services/validationService';
import { simplifyOrganizationalLevel } from '../utils/organizationalLevels';

interface DataDetectionResult {
  type: 'employee_roster' | 'performance_data';
  confidence: number;
}

interface ProcessingResult {
  employees: Employee[];
  validationResult: ValidationResult | null;
  unknownEmployees: string[];
  orgMap: Record<string, string>;
}

export function useDataProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const detectDataType = useCallback((data: string): DataDetectionResult => {
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
  }, []);

  const extractEmployeeNamesFromData = useCallback((data: string): string[] => {
    const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
    if (lines.length < 1) return [];
    
    const header = lines[0];
    const employeeNames: string[] = [];
    
    // Enhanced delimiter detection for Google Sheets copy-paste
    const commaCount = (header.match(/,/g) || []).length;
    const tabCount = (header.match(/\t/g) || []).length;
    const multiSpaceCount = (header.match(/\s{2,}/g) || []).length; // 2+ consecutive spaces
    
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

    let fields = [];
    if (isSpaceDelimited) {
      // Split on 2+ consecutive spaces, then trim each field
      fields = header.split(/\s{2,}/).map(field => field.trim()).filter(field => field.length > 0);
    } else {
      // Parse CSV with quotes handling
      fields = parseCSVLine(header, delimiter);
    }

    // Extract employee names from bracketed fields
    for (const field of fields) {
      const trimmedField = field.trim();
      
      // Check if field contains bracketed employee name
      const bracketMatch = trimmedField.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        const employeeName = bracketMatch[1].trim();
        if (employeeName && !employeeNames.includes(employeeName)) {
          employeeNames.push(employeeName);
        }
      }
    }

    return employeeNames;
  }, []);

  const processRawData = useCallback(async (rawText: string): Promise<ProcessingResult> => {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const detection = detectDataType(rawText);
      
      if (detection.type === 'employee_roster') {
        // Process employee roster data
        const { employees: employeeRecords, validation: validationResult } = parseEmployeeCSV(rawText);

        // Convert EmployeeData to Employee format
        const employees: Employee[] = employeeRecords.map((emp, index) => {
          const resolvedLevel = emp.organizational_level?.trim()
            ? emp.organizational_level
            : simplifyOrganizationalLevel(emp.organizationalLevel, emp.gol);

          return {
            id: index + 1,
            name: emp.name,
            nip: emp.nip || "",
            gol: emp.gol || "",
            pangkat: emp.pangkat || "",
            position: emp.position || "",
            sub_position: emp.subPosition || "",
            organizational_level: resolvedLevel,
            organizationalLevel: emp.organizationalLevel,
            performance: [],
          };
        });

        return {
          employees,
          validationResult,
          unknownEmployees: [],
          orgMap: {}
        };
      } else {
        // Process performance data
        const result = parsePerformanceData(rawText);
        
        return {
          employees: result.employees,
          validationResult: result.validation ?? null,
          unknownEmployees: [],
          orgMap: {}
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setProcessingError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [detectDataType]);

  return {
    isProcessing,
    processingError,
    detectDataType,
    extractEmployeeNamesFromData,
    processRawData,
    clearError: () => setProcessingError(null)
  };
}

/**
 * Parse a CSV line with proper quote handling
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
        // Escaped quote within quoted field
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field delimiter outside quotes
      fields.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  fields.push(current.trim());
  return fields;
}

export default useDataProcessing;
