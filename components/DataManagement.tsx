import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';
import { parsePerformanceData } from '../services/parser';
import { api, Dataset } from '../services/api';
import { IconClipboardData, IconAnalyze, IconSparkles, IconUsers } from './Icons';

interface DataManagementProps {
  employees: Employee[];
  onDataUpdate: (employees: Employee[]) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ employees, onDataUpdate }) => {
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [savedDatasets, setSavedDatasets] = useState<Dataset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessData = async () => {
    if (!rawText.trim()) {
      setError('Please paste the data into the text area.');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const parsedData = parsePerformanceData(rawText);
        const sortedData = parsedData.sort((a, b) => a.name.localeCompare(b.name));
        onDataUpdate(sortedData);
        setRawText('');
      } catch (e) {
        if (e instanceof Error) {
          setError(`An error occurred during parsing: ${e.message}. Please check the data format.`);
        } else {
          setError('An unknown error occurred during parsing.');
        }
      } finally {
        setIsLoading(false);
      }
    }, 50);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv') {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const exportData = () => {
    if (employees.length === 0) return;
    
    const csvData = employees.map(emp => {
      const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
      return {
        Name: emp.name,
        Job: emp.job,
        'Average Score': avgScore.toFixed(2),
        ...emp.performance.reduce((acc, perf) => ({
          ...acc,
          [perf.name]: perf.score
        }), {})
      };
    });

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-performance-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    setRawText('');
    onDataUpdate([]);
    setError(null);
    try {
      await api.clearCurrentDataset();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  const loadSavedDatasets = async () => {
    try {
      const datasets = await api.getAllDatasets();
      setSavedDatasets(datasets);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  };

  const saveCurrentDataset = async () => {
    if (employees.length === 0) return;
    
    try {
      await api.saveDataset(datasetName, employees);
      setShowSaveDialog(false);
      setDatasetName('');
      await loadSavedDatasets();
    } catch (error) {
      setError('Failed to save dataset');
    }
  };

  const loadDataset = async (dataset: Dataset) => {
    try {
      const fullDataset = await api.getDataset(dataset.id);
      if (fullDataset && fullDataset.employees) {
        onDataUpdate(fullDataset.employees);
      }
    } catch (error) {
      setError('Failed to load dataset');
    }
  };

  const deleteDataset = async (id: string) => {
    try {
      await api.deleteDataset(id);
      await loadSavedDatasets();
    } catch (error) {
      setError('Failed to delete dataset');
    }
  };

  useEffect(() => {
    loadSavedDatasets();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Data Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import, export, and manage performance data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconClipboardData className="w-8 h-8 mr-3 text-gray-500"/>
            Import Data
          </h2>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <IconClipboardData className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Drag & drop CSV file here or 
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 ml-1"
                >
                  browse
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Or paste CSV data here..."
            className="w-full h-60 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-mono mb-4"
          />
          
          <div className="flex gap-3">
            <button
              onClick={handleProcessData}
              disabled={isLoading || !rawText.trim()}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <IconAnalyze className="w-5 h-5 mr-2"/>
                  Analyze Data
                </>
              )}
            </button>
            
            <button
              onClick={clearData}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mt-4" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            <IconSparkles className="w-8 h-8 mr-3 text-gray-500"/>
            Current Dataset
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Competencies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees.length > 0 ? employees[0].performance.length : 0}
                </p>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {employees.map((emp, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium text-gray-900 dark:text-white">{emp.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{emp.job}</span>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Dataset
              </button>
              
              <button
                onClick={exportData}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
              
              <button
                onClick={() => {
                  const jsonData = JSON.stringify(employees, null, 2);
                  const blob = new Blob([jsonData], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'employee-data.json';
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={employees.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {savedDatasets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            <IconUsers className="w-8 h-8 mr-3 text-gray-500"/>
            Saved Datasets
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedDatasets.map((dataset) => (
              <div key={dataset.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {dataset.name}
                  </h3>
                  <button
                    onClick={() => deleteDataset(dataset.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="Delete dataset"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {dataset.employee_count} employees
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  {new Date(dataset.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => loadDataset(dataset)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Load Dataset
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dataset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Save Dataset
            </h3>
            <input
              type="text"
              placeholder="Enter dataset name..."
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setDatasetName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentDataset}
                disabled={!datasetName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;