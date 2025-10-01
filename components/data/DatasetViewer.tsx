/**
 * DatasetViewer Component
 * Displays current dataset stats and export options
 */

import React from 'react';
import { Employee } from '../../types';
import { IconSparkles } from '../shared/Icons';
import { Button } from '../../design-system';
import { VirtualizedEmployeeList } from './VirtualizedEmployeeList';

interface DatasetViewerProps {
  employees: Employee[];
  onSave: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  canExport: boolean;
  savingStatus?: 'idle' | 'saving' | 'saved' | 'error';
  pendingSaves?: number;
}

export const DatasetViewer: React.FC<DatasetViewerProps> = ({
  employees,
  onSave,
  onExportCSV,
  onExportJSON,
  canExport,
  savingStatus = 'idle',
  pendingSaves = 0
}) => {
  const getSaveStatusMessage = () => {
    if (pendingSaves > 0 || savingStatus === 'saving') {
      return 'Menyimpan data...';
    }
    if (savingStatus === 'saved') {
      return 'Data berhasil disimpan!';
    }
    if (savingStatus === 'error') {
      return 'Gagal menyimpan. Silakan coba lagi.';
    }
    return null;
  };

  const statusMessage = getSaveStatusMessage();

  return (
    <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        <IconSparkles className="w-8 h-8 mr-3 text-gray-500" />
        Dataset Saat Ini
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Pegawai</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Kompetensi</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {employees.length > 0 && employees[0].performance ? employees[0].performance.length : 0}
            </p>
          </div>
        </div>

        <VirtualizedEmployeeList employees={employees} maxHeight={160} />

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onSave}
            disabled={employees.length === 0}
            variant="primary"
            size="md"
            fullWidth
          >
            Simpan Dataset
          </Button>

          <Button
            onClick={onExportCSV}
            disabled={!canExport}
            variant="success"
            size="md"
            fullWidth
            loading={pendingSaves > 0 || savingStatus === 'saving'}
            title={!canExport && pendingSaves > 0 ? 'Menunggu penyimpanan selesai...' : 'Ekspor data sebagai CSV'}
          >
            Ekspor CSV
          </Button>

          <Button
            onClick={onExportJSON}
            disabled={!canExport}
            variant="secondary"
            size="md"
            fullWidth
            loading={pendingSaves > 0 || savingStatus === 'saving'}
            title={!canExport && pendingSaves > 0 ? 'Menunggu penyimpanan selesai...' : 'Ekspor data sebagai JSON'}
          >
            Ekspor JSON
          </Button>
        </div>
      </div>

      {/* Save Status Indicator */}
      {statusMessage && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${savingStatus === 'saving' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
            savingStatus === 'saved' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' :
              savingStatus === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
          }`}>
          <div className="flex items-center">
            {(pendingSaves > 0 || savingStatus === 'saving') && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {savingStatus === 'saved' && (
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {savingStatus === 'error' && (
              <svg className="-ml-1 mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {statusMessage}
          </div>
        </div>
      )}
    </div>
  );
};
