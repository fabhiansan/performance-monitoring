/**
 * Refactored DataManagement Component
 * Simplified data management with composition pattern and React Query
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Employee, CompetencyScore } from '../../types';
import { useError } from '../../contexts/ErrorContext';
import { ImportZone } from './ImportZone';
import { DatasetViewer } from './DatasetViewer';
import ResolveEmployeesDialog from '../shared/ResolveEmployeesDialog';
import ValidationFeedback from './ValidationFeedback';
import { Alert } from '../../design-system';
import { simplifyOrganizationalLevel } from '../../utils/organizationalLevels';
import { prepareCSVCell } from '../../utils/csvSecurity';
import { useOrganizationalMappings } from '../../hooks/useEmployeeData';
import { useSaveEmployeeData } from '../../hooks/useEmployeeData';
import { employeeApi } from '../../services/api';
import { useImportState } from '../../hooks/useImportState';
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast
} from '../../services/toast';
import {
  processImportData,
  continueImportAfterResolution,
  EmployeeResolutionMapping
} from '../../services/ImportOrchestrator';
import { ValidationResult } from '../../services/validationService';

interface DataManagementRefactoredProps {
  employees: Employee[];
  onDataUpdate: (_employees: Employee[], _sessionName?: string) => void;
}

export const DataManagementRefactored: React.FC<DataManagementRefactoredProps> = ({
  employees,
  onDataUpdate
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [rawTextBuffer, setRawTextBuffer] = useState('');
  const [resolveModal, setResolveModal] = useState<{
    unknown: string[];
    orgMap: Record<string, string>;
  } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionNameError, setSessionNameError] = useState<string | null>(null);

  const { showError } = useError();
  const { data: orgLevelMapping = {} } = useOrganizationalMappings();
  const saveEmployeeData = useSaveEmployeeData();
  const { setIsImporting } = useImportState();

  const getDefaultSessionValue = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const formatSessionName = useCallback((value: string) => {
    if (!value) return '';

    if (value.includes('/')) {
      const [monthPart = '', yearPart = ''] = value.split('/');
      if (!monthPart || !yearPart) {
        return value;
      }
      return `${monthPart.padStart(2, '0')}/${yearPart}`;
    }

    const [yearPart = '', monthPart = ''] = value.split('-');
    if (!yearPart || !monthPart) {
      return value;
    }

    return `${monthPart.padStart(2, '0')}/${yearPart}`;
  }, []);

  const validateSessionName = useCallback((value: string): { valid: boolean; error?: string } => {
    if (!value || value.trim().length === 0) {
      return { valid: false, error: 'Nama sesi wajib diisi.' };
    }

    const trimmed = value.trim();
    let monthPart: string | undefined;
    let yearPart: string | undefined;

    if (trimmed.includes('/')) {
      const [monthCandidate, yearCandidate] = trimmed.split('/');
      monthPart = monthCandidate;
      yearPart = yearCandidate;
    } else if (trimmed.includes('-')) {
      const [yearCandidate, monthCandidate] = trimmed.split('-');
      monthPart = monthCandidate;
      yearPart = yearCandidate;
    } else {
      return { valid: false, error: 'Format sesi harus MM/YYYY.' };
    }

    if (!monthPart || !yearPart) {
      return { valid: false, error: 'Format sesi harus MM/YYYY.' };
    }

    const month = Number(monthPart);
    const year = Number(yearPart);

    if (!Number.isFinite(month) || !Number.isInteger(month)) {
      return { valid: false, error: 'Bulan tidak valid.' };
    }

    if (!Number.isFinite(year) || !Number.isInteger(year)) {
      return { valid: false, error: 'Tahun tidak valid.' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, error: 'Bulan harus antara 01 dan 12.' };
    }

    if (year < 2000) {
      return { valid: false, error: 'Tahun harus 2000 atau lebih baru.' };
    }

    const now = new Date();
    const selectedDate = new Date(year, month - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (selectedDate > currentMonth) {
      return { valid: false, error: 'Periode tidak boleh di masa depan.' };
    }

    return { valid: true };
  }, []);

  const handleImport = useCallback(async (rawText: string) => {
    setIsProcessing(true);
    setIsImporting(true); // ✅ Lock session switching during import
    setError(null);
    setRawTextBuffer(rawText);

    try {
      const result = await processImportData(rawText, orgLevelMapping);

      // Handle employee roster import
      if (result.type === 'employee_roster') {
        await employeeApi.importEmployeesFromCSV(result.employees as unknown as Employee[]);

        try {
          const allEmployees = await employeeApi.getAllEmployees();
          const employeesForState = allEmployees.map(emp => ({
            ...emp,
            performance: []
          }));

          onDataUpdate(employeesForState);
          setError(null);
          const successCopy = `Berhasil mengimpor ${result.employees.length} data pegawai! Data pegawai sekarang ditampilkan di dashboard. Untuk melihat analisis kinerja, silakan impor data kinerja yang berisi skor kompetensi dengan format: "Kompetensi [Nama Pegawai]".`;
          setSuccessMessage(successCopy);
          showSuccessToast(successCopy, 6000);
        } catch (fetchError) {
          showError(fetchError, {
            component: 'DataManagement',
            operation: 'fetchEmployeesAfterImport'
          });
          const partialMessage = 'Data pegawai berhasil diimpor ke database, tetapi gagal memuat ke tampilan. Silakan refresh halaman atau navigasi ke bagian lain untuk melihat data.';
          setSuccessMessage(partialMessage);
          showWarningToast(partialMessage, 6000);
        }
        return;
      }

      // Handle performance data import
      if (result.requiresResolution) {
        setResolveModal({
          unknown: result.unknownEmployees,
          orgMap: result.orgLevelMapping
        });
        return;
      }

      // No resolution needed, proceed with import
      setValidationResult(result.validation);
      onDataUpdate(result.employees);

      // Auto-open save dialog
      const defaultMonthValue = getDefaultSessionValue();
      setSessionName(defaultMonthValue);
      setSessionNameError(null);
      setShowSaveDialog(true);
      setRawTextBuffer('');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui';
      setError(errorMessage);
      showErrorToast(errorMessage);
      showError(err, {
        component: 'DataManagement',
        operation: 'handleImport'
      });
    } finally {
      setIsProcessing(false);
      setIsImporting(false); // ✅ Unlock session switching after import completes
    }
  }, [getDefaultSessionValue, orgLevelMapping, onDataUpdate, showError, setIsImporting]);

  const handleResolveSubmit = useCallback(async (mapping: Record<string, EmployeeResolutionMapping[string]>) => {
    if (!resolveModal) return;

    // Handle new employees
    const newEmployees = Object.entries(mapping).filter(([, value]) => value.isNew);

    if (newEmployees.length > 0) {
      try {
        for (const [, value] of newEmployees) {
          await employeeApi.addEmployee(
            value.chosenName,
            '-',
            '-',
            '-',
            '-',
            '-',
            value.orgLevel
          );
        }

        const updatedOrgMapping = await employeeApi.getEmployeeOrgLevelMapping();

        for (const [orig] of Object.entries(mapping)) {
          resolveModal.orgMap[orig] = updatedOrgMapping[mapping[orig].chosenName] || mapping[orig].orgLevel;
        }
      } catch (err) {
        const creationError = 'Failed to create new employees in database.';
        setError(creationError);
        showErrorToast(creationError);
        showError(err, {
          component: 'DataManagement',
          operation: 'createNewEmployees'
        });
        return;
      }
    } else {
      for (const [orig, value] of Object.entries(mapping)) {
        resolveModal.orgMap[orig] = value.orgLevel;
      }
    }

    setResolveModal(null);
    setIsProcessing(true);

    try {
      const result = await continueImportAfterResolution(rawTextBuffer, resolveModal.orgMap);
      setValidationResult(result.validation);
      onDataUpdate(result.employees);

      setShowSaveDialog(true);
      const defaultMonthValue = getDefaultSessionValue();
      setSessionName(defaultMonthValue);
      setSessionNameError(null);
      setRawTextBuffer('');
      showSuccessToast('Data kinerja berhasil diimpor dan siap disimpan.', 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed after resolving employees.';
      setError(errorMessage);
      showErrorToast(errorMessage);
      showError(err, {
        component: 'DataManagement',
        operation: 'continueAfterResolution'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [getDefaultSessionValue, onDataUpdate, resolveModal, rawTextBuffer, showError]);

  const handleSaveSession = useCallback(async () => {
    if (employees.length === 0) return;

    const validation = validateSessionName(sessionName);
    if (!validation.valid) {
      setSessionNameError(validation.error ?? 'Nama sesi tidak valid.');
      return;
    }

    const formattedSessionName = formatSessionName(sessionName);

    try {
      await onDataUpdate(employees, formattedSessionName);
      setShowSaveDialog(false);
      setSessionName('');
      setSessionNameError(null);
      if (formattedSessionName) {
        showSuccessToast(`Dataset ${formattedSessionName} berhasil disimpan.`, 4000);
      }
    } catch (err) {
      showError(err, {
        component: 'DataManagement',
        operation: 'saveSession',
        sessionName: formattedSessionName
      });
      showErrorToast('Gagal menyimpan dataset. Silakan coba lagi.');
    }
  }, [employees, formatSessionName, onDataUpdate, sessionName, showError, validateSessionName]);

  // Memoize CSV export data computation (only recompute when employees change)
  const csvExportData = useMemo(() => {
    if (employees.length === 0) return null;

    return employees.map<Record<string, string | number>>((emp: Employee) => {
      const avgScore = emp.performance && emp.performance.length > 0
        ? emp.performance.reduce((s: number, p: CompetencyScore) => s + p.score, 0) / emp.performance.length
        : 0;
      return {
        Name: emp.name,
        Job: simplifyOrganizationalLevel(emp.organizational_level, emp.gol),
        'Average Score': avgScore.toFixed(2),
        ...(emp.performance && emp.performance.length > 0
          ? emp.performance.reduce((acc: Record<string, number>, perf: CompetencyScore) => ({
            ...acc,
            [perf.name]: perf.score
          }), {})
          : {})
      };
    });
  }, [employees]);

  const handleExportCSV = useCallback(() => {
    if (!csvExportData || csvExportData.length === 0) return;

    const headers = Object.keys(csvExportData[0]);
    const csvContent = [
      headers.map(header => prepareCSVCell(header)).join(','),
      ...csvExportData.map(row =>
        headers.map(header => prepareCSVCell(row[header])).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-kinerja-pegawai-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [csvExportData]);

  const handleExportJSON = useCallback(() => {
    if (employees.length === 0) return;

    const jsonData = JSON.stringify(employees, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-pegawai-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [employees]);

  const canExport = employees.length > 0 && !saveEmployeeData.isPending;

  const handleOpenSaveDialog = useCallback(() => {
    if (!sessionName) {
      setSessionName(getDefaultSessionValue());
    }
    setSessionNameError(null);
    setShowSaveDialog(true);
  }, [getDefaultSessionValue, sessionName]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Manajemen Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Impor, ekspor, dan kelola data kinerja
        </p>
      </div>

      {successMessage && (
        <Alert
          variant="success"
          title="Import Berhasil"
          dismissible
          onDismiss={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportZone
          onImport={handleImport}
          isProcessing={isProcessing}
          error={error}
          onClearError={() => setError(null)}
        />

        <DatasetViewer
          employees={employees}
          onSave={handleOpenSaveDialog}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          canExport={canExport}
          savingStatus={saveEmployeeData.isPending ? 'saving' : saveEmployeeData.isSuccess ? 'saved' : saveEmployeeData.isError ? 'error' : 'idle'}
          pendingSaves={saveEmployeeData.isPending ? 1 : 0}
        />
      </div>

      {validationResult && (
        <ValidationFeedback validation={validationResult} className="mt-4" />
      )}
      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="save-dataset-title">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 border border-gray-200 dark:border-gray-700">
            <h3 id="save-dataset-title" className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Simpan Dataset
            </h3>
            <input
              type="month"
              placeholder="MM/YYYY mis. 07/2025"
              value={sessionName}
              onChange={(e) => {
                const value = e.target.value;
                setSessionName(value);
                const validation = validateSessionName(value);
                setSessionNameError(validation.valid ? null : validation.error ?? 'Nama sesi tidak valid.');
              }}
              onBlur={() => {
                if (!sessionName) return;
                const validation = validateSessionName(sessionName);
                setSessionNameError(validation.valid ? null : validation.error ?? 'Nama sesi tidak valid.');
              }}
              className={`w-full px-3 py-2 border ${
                sessionNameError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
              } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2`}
              aria-label="Periode dataset (MM/YYYY)"
              autoFocus
            />
            {sessionNameError && (
              <p className="text-sm text-red-500 dark:text-red-400 mb-2">
                {sessionNameError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSessionName('');
                  setSessionNameError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                aria-label="Batal menyimpan dataset"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSession}
                disabled={!sessionName || !!sessionNameError}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Simpan dataset"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {resolveModal && (
        <ResolveEmployeesDialog
          unknownEmployees={resolveModal.unknown}
          onSubmit={handleResolveSubmit}
          onCancel={() => setResolveModal(null)}
        />
      )}
    </div>
  );
};

export default DataManagementRefactored;
