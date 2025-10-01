import { useState, useCallback } from 'react';
import { Employee } from '../types';
import { parsePerformanceData } from '../services/parser';
import { parseEmployeeCSV, validateEmployeeData } from '../services/csvParser';
import { ValidationResult } from '../services/validationService';
import { UploadSession } from '../services/api';

export interface UseDataManagementProps {
  onDataUpdate: (_employees: Employee[], _sessionName?: string) => void;
  onError: (_message: string) => void;
}

export interface UseDataManagementReturn {
  // State
  rawText: string;
  setRawText: (_text: string) => void;
  isLoading: boolean;
  error: string | null;
  setError: (_error: string | null) => void;
  isDragOver: boolean;
  setIsDragOver: (_isDragOver: boolean) => void;
  uploadSessions: UploadSession[];
  setUploadSessions: (_sessions: UploadSession[]) => void;
  showSaveDialog: boolean;
  setShowSaveDialog: (_show: boolean) => void;
  sessionName: string;
  setSessionName: (_name: string) => void;
  selectedSessions: Set<string>;
  setSelectedSessions: (_sessions: Set<string>) => void;
  showMergeOptions: boolean;
  setShowMergeOptions: (_show: boolean) => void;
  validationResult: ValidationResult | null;
  setValidationResult: (_result: ValidationResult | null) => void;
  
  // Actions
  processData: (_data: string, _fileName?: string) => Promise<void>;
  handlePasteProcess: () => Promise<void>;
  saveCurrentSession: () => Promise<void>;
}

export const useDataManagement = ({
  onDataUpdate,
  onError
}: UseDataManagementProps): UseDataManagementReturn => {
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const detectDataType = (data: string): 'employee_roster' | 'performance_data' => {
    const lines = data.trim().split('\n').filter(line => line.trim().length > 1);
    if (lines.length < 1) return 'performance_data';
    
    const header = lines[0].toLowerCase();
    const employeeRosterKeywords = ['nama', 'nip', 'gol', 'pangkat', 'jabatan'];
    const foundEmployeeKeywords = employeeRosterKeywords.filter(keyword => 
      header.includes(keyword)
    ).length;

    return foundEmployeeKeywords >= 2 ? 'employee_roster' : 'performance_data';
  };

  const createValidationResult = useCallback((employees: unknown[], validation: { valid: boolean; errors: string[] }): ValidationResult => {
    return {
      isValid: validation.valid,
      errors: validation.errors.map((error: string) => ({ type: 'critical_data' as const, message: error })),
      warnings: [],
      summary: {
        totalEmployees: employees.length,
        validEmployees: validation.valid ? employees.length : 0,
        invalidEmployees: validation.valid ? 0 : employees.length,
        totalCompetencies: 0,
        requiredCompetencies: [],
        missingCompetencies: [],
        dataCompleteness: validation.valid ? 100 : 0,
        completeness: validation.valid ? 100 : 0,
        scoreQuality: validation.valid ? 'excellent' as const : 'poor' as const
      }
    };
  }, []);

  const convertToEmployeeData = useCallback((employees: Array<{ name: string; nip: string; gol: string; pangkat: string; position: string; organizational_level?: string }>): Employee[] => {
    return employees.map((emp, index) => ({
      id: index + 1,
      name: emp.name,
      nip: emp.nip,
      gol: emp.gol,
      pangkat: emp.pangkat,
      position: emp.position,
      sub_position: 'General',
      organizational_level: emp.organizational_level || 'Staff',
      performance: []
    }));
  }, []);

  const processEmployeeRoster = useCallback((data: string, fileName?: string) => {
    const employees = parseEmployeeCSV(data);
    const validation = validateEmployeeData(employees);
    const validationResult = createValidationResult(employees, validation);
    
    setValidationResult(validationResult);
    
    if (validationResult.isValid) {
      const employeeData = convertToEmployeeData(employees);
      onDataUpdate(employeeData, fileName || 'Employee Roster Import');
    }
  }, [createValidationResult, convertToEmployeeData, onDataUpdate]);

  const processPerformanceData = useCallback((data: string, fileName?: string) => {
    const result = parsePerformanceData(data);
    if (result.employees) {
      setValidationResult(result.validation || null);
      onDataUpdate(result.employees, fileName || 'Performance Data Import');
    } else {
      throw new Error('Failed to parse performance data');
    }
  }, [onDataUpdate]);

  const processData = useCallback(async (data: string, fileName?: string): Promise<void> => {
    if (!data.trim()) {
      setError('No data provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dataType = detectDataType(data);
      
      if (dataType === 'employee_roster') {
        processEmployeeRoster(data, fileName);
      } else {
        processPerformanceData(data, fileName);
      }
      
      setRawText('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [processEmployeeRoster, processPerformanceData, onError]);

  const handlePasteProcess = useCallback(async (): Promise<void> => {
    await processData(rawText);
  }, [rawText, processData]);

  const saveCurrentSession = useCallback(async (): Promise<void> => {
    if (!sessionName.trim()) {
      setError('Silakan isi nama sesi');
      return;
    }

    try {
      setIsLoading(true);
      // This would typically be handled by the parent component
      // since it has access to the current employee data
      setShowSaveDialog(false);
      setSessionName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save session';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sessionName, onError]);

  return {
    // State
    rawText,
    setRawText,
    isLoading,
    error,
    setError,
    isDragOver,
    setIsDragOver,
    uploadSessions,
    setUploadSessions,
    showSaveDialog,
    setShowSaveDialog,
    sessionName,
    setSessionName,
    selectedSessions,
    setSelectedSessions,
    showMergeOptions,
    setShowMergeOptions,
    validationResult,
    setValidationResult,
    
    // Actions
    processData,
    handlePasteProcess,
    saveCurrentSession
  };
};
