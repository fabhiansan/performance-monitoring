import { useState, useCallback, useRef } from 'react';
import { Employee } from '../types';
import { 
  ReportGenerationService, 
  ReportConfig, 
  PdfGenerationOptions 
} from '../services/reportGenerationService';
import { 
  PerformanceCalculationService, 
  PerformanceScores,
  PerformanceLevel 
} from '../services/performanceCalculationService';
import { 
  ReportFormattingService, 
  ReportMetadata, 
  FormattedTableRow 
} from '../services/reportFormattingService';

export interface UseReportGenerationState {
  isGenerating: boolean;
  error: string | null;
  selectedEmployee: Employee | null;
  semester: number;
  year: number;
}

export interface UseReportGenerationActions {
  setSelectedEmployee: (_employee: Employee | null) => void;
  setSemester: (_semester: number) => void;
  setYear: (_year: number) => void;
  generatePDF: () => Promise<void>;
  clearError: () => void;
}

export interface UseReportGenerationData {
  performanceScores: PerformanceScores | null;
  performanceLevel: PerformanceLevel | null;
  reportMetadata: ReportMetadata | null;
  formattedTableData: FormattedTableRow[] | null;
  isValidConfig: boolean;
}

export interface UseReportGenerationReturn {
  state: UseReportGenerationState;
  actions: UseReportGenerationActions;
  data: UseReportGenerationData;
  reportRef: { current: HTMLDivElement | null };
}

export const useReportGeneration = (
  options: Partial<PdfGenerationOptions> = {}
): UseReportGenerationReturn => {
  const [state, setState] = useState<UseReportGenerationState>({
    isGenerating: false,
    error: null,
    selectedEmployee: null,
    semester: 1,
    year: new Date().getFullYear()
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const setSelectedEmployee = useCallback((employee: Employee | null) => {
    setState(prev => ({ ...prev, selectedEmployee: employee, error: null }));
  }, []);

  const setSemester = useCallback((semester: number) => {
    setState(prev => ({ ...prev, semester, error: null }));
  }, []);

  const setYear = useCallback((year: number) => {
    setState(prev => ({ ...prev, year, error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const generatePDF = useCallback(async () => {
    if (!state.selectedEmployee || !reportRef.current) {
      setState(prev => ({ 
        ...prev, 
        error: 'Pilih pegawai dan pastikan laporan telah dimuat' 
      }));
      return;
    }

    const config: ReportConfig = {
      employee: state.selectedEmployee,
      semester: state.semester,
      year: state.year
    };

    if (!ReportGenerationService.validateReportConfig(config)) {
      setState(prev => ({ 
        ...prev, 
        error: 'Konfigurasi laporan tidak valid' 
      }));
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      await ReportGenerationService.generatePDF(reportRef.current, config, options);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? `Terjadi kesalahan saat menghasilkan PDF: ${error.message}`
        : 'Terjadi kesalahan saat menghasilkan PDF';
      
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedEmployee, state.semester, state.year, options]);

  // Computed data
  const performanceScores = state.selectedEmployee 
    ? PerformanceCalculationService.calculatePerformanceScores(state.selectedEmployee)
    : null;

  const performanceLevel = performanceScores 
    ? PerformanceCalculationService.getPerformanceLevel(performanceScores.totalScore)
    : null;

  const reportMetadata = state.selectedEmployee 
    ? ReportFormattingService.generateReportMetadata(
        state.selectedEmployee, 
        state.semester, 
        state.year
      )
    : null;

  const formattedTableData = state.selectedEmployee && performanceScores
    ? ReportFormattingService.formatPerformanceTable(state.selectedEmployee, performanceScores)
    : null;

  const isValidConfig = !!(
    state.selectedEmployee &&
    state.semester >= 1 &&
    state.semester <= 2 &&
    state.year >= 2020 &&
    state.year <= 2030 &&
    PerformanceCalculationService.validatePerformanceData(state.selectedEmployee)
  );

  const actions: UseReportGenerationActions = {
    setSelectedEmployee,
    setSemester,
    setYear,
    generatePDF,
    clearError
  };

  const data: UseReportGenerationData = {
    performanceScores,
    performanceLevel,
    reportMetadata,
    formattedTableData,
    isValidConfig
  };

  return {
    state,
    actions,
    data,
    reportRef
  };
};