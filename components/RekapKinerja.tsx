import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Employee, CompetencyScore } from '../types';
import { generateAllEmployeeRecaps, RecapEmployee } from '../services/scoringService';
import { api } from '../services/api';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface RekapKinerjaProps {
  employees: Employee[];
}

const RekapKinerja: React.FC<RekapKinerjaProps> = ({ employees }) => {
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<RecapEmployee | null>(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'eselon' | 'staff'>('all');

  // Generate recap data with manual scores
  const recapData = useMemo(() => {
    return generateAllEmployeeRecaps(employees, manualScores);
  }, [employees, manualScores]);

  // Separate employees by position type
  const eselonEmployees = recapData.filter(emp => emp.performanceRecap.positionType === 'eselon');
  const staffEmployees = recapData.filter(emp => emp.performanceRecap.positionType === 'staff');

  // Filter based on search term and active tab
  const filteredData = useMemo(() => {
    let filtered = recapData;
    
    // Filter by tab
    if (activeTab === 'eselon') {
      filtered = filtered.filter(emp => emp.performanceRecap.positionType === 'eselon');
    } else if (activeTab === 'staff') {
      filtered = filtered.filter(emp => emp.performanceRecap.positionType === 'staff');
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [recapData, searchTerm, activeTab]);

  // Load manual scores from backend on component mount
  useEffect(() => {
    const loadManualScores = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const scores = await api.getManualLeadershipScores();
        setManualScores(scores);
      } catch (error) {
        console.error('Failed to load manual leadership scores:', error);
        setError('Failed to load leadership scores from server');
      } finally {
        setIsLoading(false);
      }
    };

    if (employees.length > 0) {
      loadManualScores();
    } else {
      setIsLoading(false);
    }
  }, [employees.length]);

  // Debounced save function to avoid too many API calls
  const debouncedSave = useCallback(
    debounce(async (scores: Record<string, number>) => {
      try {
        setIsSaving(true);
        await api.bulkUpdateManualLeadershipScores(scores);
        setError(null);
      } catch (error) {
        console.error('Failed to save manual leadership scores:', error);
        setError('Failed to save leadership scores to server');
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    []
  );

  const handleManualScoreChange = useCallback((employeeName: string, score: number) => {
    const newScores = {
      ...manualScores,
      [employeeName]: score
    };
    setManualScores(newScores);
    
    // Auto-save to backend with debounce
    debouncedSave(newScores);
  }, [manualScores, debouncedSave]);

  const openCalculationModal = useCallback((employee: RecapEmployee) => {
    setSelectedEmployee(employee);
    setShowCalculationModal(true);
  }, []);

  const closeCalculationModal = useCallback(() => {
    setSelectedEmployee(null);
    setShowCalculationModal(false);
  }, []);

  // Export final report as CSV
  const handleExportReport = useCallback(() => {
    const headers = ['NO.', 'NAMA', 'POSITION', 'PERILAKU KINERJA (MAX 25.5)', 'KUALITAS KERJA', 'PENILAIAN PIMPINAN', 'TOTAL NILAI'];
    const csvData = [
      headers.join(','),
      ...filteredData.map((employee, index) => [
        index + 1,
        `"${employee.name}"`,
        employee.performanceRecap.positionType === 'eselon' ? 'ESELON' : 'STAFF',
        employee.performanceRecap.perilakuKinerja.toFixed(2),
        employee.performanceRecap.kualitasKerja.toFixed(2),
        employee.performanceRecap.positionType === 'eselon' 
          ? ((employee.performanceRecap.penilaianPimpinan / 100) * 17).toFixed(2)
          : 'N/A',
        employee.performanceRecap.totalNilai.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_kinerja_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData]);

  const averageScores = useMemo(() => {
    if (recapData.length === 0) return { perilaku: 0, kualitas: 0, pimpinan: 0, total: 0 };
    
    const totals = recapData.reduce((acc, emp) => ({
      perilaku: acc.perilaku + emp.performanceRecap.perilakuKinerja,
      kualitas: acc.kualitas + emp.performanceRecap.kualitasKerja,
      pimpinan: acc.pimpinan + emp.performanceRecap.penilaianPimpinan,
      total: acc.total + emp.performanceRecap.totalNilai
    }), { perilaku: 0, kualitas: 0, pimpinan: 0, total: 0 });

    return {
      perilaku: (totals.perilaku / recapData.length),
      kualitas: (totals.kualitas / recapData.length),
      pimpinan: (totals.pimpinan / recapData.length),
      total: (totals.total / recapData.length)
    };
  }, [recapData]);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No employee data available. Please import data first.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 dark:text-gray-400 text-lg mt-4">
          Loading performance data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rekap Kinerja
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Performance recap with weighted scoring system
          </p>
          {/* Tab Navigation */}
          <div className="mt-4 flex space-x-2">
            {(['all', 'eselon', 'staff'] as const).map(tab => {
              const label = tab === 'all' ? 'All Employees' : tab === 'eselon' ? 'Eselon' : 'Staff';
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium focus:outline-none transition-colors duration-200 ${
                    active
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {isSaving && (
            <div className="flex items-center mt-2 text-blue-600 dark:text-blue-400">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Saving changes...</span>
            </div>
          )}
          {error && (
            <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{employees.length}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Perilaku Kinerja</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{averageScores.perilaku.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Max: 25.5 pts (of 85)</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Kualitas Kerja</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{averageScores.kualitas.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Eselon: 50%, Staff: 70%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Penilaian Pimpinan</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{averageScores.pimpinan.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Eselon only: 20%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Total Score</h3>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{averageScores.total.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Final Score</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Position Types</h3>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{eselonEmployees.length} Eselon</p>
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{staffEmployees.length} Staff</p>
        </div>
      </div>

      {/* Search and Export */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Employee
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Save & Export
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => debouncedSave(manualScores)}
                disabled={isSaving}
                className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors duration-200 ${
                  isSaving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Ratings'}
              </button>
              <button
                onClick={handleExportReport}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Position<br/><span className="text-gray-500 text-xs">Type</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Perilaku Kinerja<br/><span className="text-green-600">(Max 25.5)</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kualitas Kerja<br/><span className="text-blue-600">(Eselon:50% | Staff:70%)</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Penilaian Pimpinan<br/><span className="text-purple-600">(Eselon only: max 17 pts)</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Nilai
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((employee, index) => (
                <tr key={employee.name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{employee.organizational_level}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.performanceRecap.positionType === 'eselon' 
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                    }`}>
                      {employee.performanceRecap.positionType === 'eselon' ? 'Eselon' : 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {employee.performanceRecap.perilakuKinerja.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {employee.performanceRecap.kualitasKerja.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {employee.performanceRecap.positionType === 'eselon' ? (
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={manualScores[employee.name] || 80}
                          onChange={(e) => handleManualScoreChange(employee.name, Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center"
                        />
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          ({((employee.performanceRecap.penilaianPimpinan / 100) * 17).toFixed(2)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">
                        N/A (Staff)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {employee.performanceRecap.totalNilai.toFixed(2)}
                      </span>
                      <button
                        onClick={() => openCalculationModal(employee)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Show Calculation
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring Information */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revised Scoring System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Eselon Scoring */}
          <div className="border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg">
            <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-3 text-center">
              ESELON III & IV EVALUATION
            </h4>
            <div className="space-y-3">
              <div>
                <h5 className="font-medium text-green-700 dark:text-green-300 mb-1">
                  1. Perilaku Kerja (Max 25.5)
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• Kehadiran dan Tepat Waktu: <span className="font-bold">5%</span></li>
                  <li>• Manajemen waktu kerja: <span className="font-bold">5%</span></li>
                  <li>• Kerja sama dan teamwork: <span className="font-bold">5%</span></li>
                  <li>• Inisiatif dan Flexibilitas: <span className="font-bold">5%</span></li>
                  <li>• Kepemimpinan (loyalitas): <span className="font-bold text-red-600">10%</span> <span className="font-bold text-red-600">REVISED</span></li>
                </ul>
                <p className="text-xs text-gray-500 mt-1"><span className="font-bold">Max: 25.5</span></p>
              </div>
              <div>
                <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  2. Kualitas Kinerja (50%)
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• Kualitas Kinerja: <span className="font-bold">25.5</span></li>
                  <li>• Kemampuan berkomunikasi: <span className="font-bold">10%</span></li>
                  <li>• Pemahaman urusan sosial: <span className="font-bold">10%</span></li>
                </ul>
                <p className="text-xs text-gray-500 mt-1"><span className="font-bold">Max: 42.5</span></p>
              </div>
              <div>
                <h5 className="font-medium text-purple-700 dark:text-purple-300 mb-1">
                  3. Penilaian Pimpinan (20%)
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">Manual input (Max: 17)</p>
              </div>
            </div>
          </div>

          {/* Staff Scoring */}
          <div className="border border-teal-200 dark:border-teal-800 p-4 rounded-lg">
            <h4 className="font-bold text-teal-700 dark:text-teal-300 mb-3 text-center">
              STAFF EVALUATION
            </h4>
            <div className="space-y-3">
              <div>
                <h5 className="font-medium text-green-700 dark:text-green-300 mb-1">
                  1. Perilaku Kerja (Max 25.5)
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• Kehadiran dan Tepat Waktu: <span className="font-bold">5%</span></li>
                  <li>• Manajemen waktu kerja: <span className="font-bold">5%</span></li>
                  <li>• Kerja sama dan teamwork: <span className="font-bold">5%</span></li>
                  <li>• Inisiatif dan Flexibilitas: <span className="font-bold">5%</span></li>
                  <li>• Kepemimpinan (loyalitas): <span className="font-bold text-red-600">10%</span> <span className="font-bold text-red-600">REVISED</span></li>
                </ul>
                <p className="text-xs text-gray-500 mt-1"><span className="font-bold">Max: 25.5</span></p>
              </div>
              <div>
                <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  2. Kualitas Kinerja (70%)
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>• Kualitas Kinerja: <span className="font-bold">50%</span></li>
                  <li>• Kemampuan berkomunikasi: <span className="font-bold">10%</span></li>
                  <li>• Pemahaman urusan sosial: <span className="font-bold">10%</span></li>
                </ul>
                <p className="text-xs text-gray-500 mt-1"><span className="font-bold">Max: 59.5</span></p>
              </div>
              <div>
                <h5 className="font-medium text-gray-500 dark:text-gray-400 mb-1">
                  3. Penilaian Pimpinan (0%)
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">Not applicable for staff</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Categories */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Performance Categories</h5>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <span className="font-bold text-red-600">Kurang Baik</span>
              <p className="text-xs text-gray-500">60.00-69.99</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-yellow-600">Baik</span>
              <p className="text-xs text-gray-500">70.00-79.99</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-green-600">Sangat Baik</span>
              <p className="text-xs text-gray-500">&gt;80</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Modal */}
      {showCalculationModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Calculation Breakdown for {selectedEmployee.name}
              </h3>
              <button
                onClick={closeCalculationModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Perilaku Kinerja Breakdown */}
              <div className="border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <h4 className="font-medium text-green-700 dark:text-green-300 mb-3">
                  Perilaku Kinerja (25.5 pts)
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedEmployee.performance.filter((p: CompetencyScore) => {
                    const name = p.name.toLowerCase();
                    return name.includes('inisiatif') || name.includes('kehadiran') || 
                           name.includes('kerjasama') || name.includes('manajemen') || 
                           name.includes('kepemimpinan') || name.includes('fleksibilitas') ||
                           name.includes('ketepatan') || name.includes('team');
                  }).map((perf: CompetencyScore, idx: number) => {
                    let weight = 4.25;
                    if (perf.name.toLowerCase().includes('kepemimpinan')) weight = 8.5;
                    const weightPercent = (weight / 85) * 100;
                     const weightedScore = (perf.score / 100) * weight;
                    return (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{perf.name}:</span>
                        <span className="font-medium">
                          {perf.score}% × {weightPercent.toFixed(0)}% = {weightedScore.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 mt-2 font-bold text-green-700 dark:text-green-300">
                    Total: {selectedEmployee.performanceRecap.perilakuKinerja.toFixed(2)} / 25.5
                  </div>
                </div>
              </div>

              {/* Kualitas Kerja Breakdown */}
              <div className="border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3">
                  Kualitas Kerja ({selectedEmployee.performanceRecap.positionType === 'eselon' ? '50%' : '70%'} Weight)
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedEmployee.performance.filter((p: CompetencyScore) => {
                    const name = p.name.toLowerCase();
                    return name.includes('kualitas') || name.includes('komunikasi') || 
                           name.includes('permasalahan') || name.includes('sosial');
                  }).map((perf: CompetencyScore, idx: number) => {
                    let weight = 8.5;
                    if (perf.name.toLowerCase().includes('kualitas')) {
                      weight = selectedEmployee.performanceRecap.positionType === 'eselon' ? 25.5 : 42.5;
                    }
                    const weightedScore = (perf.score / 100) * weight;
                    return (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{perf.name}:</span>
                        <span className="font-medium">
                          {perf.score}% × {(weight / 85) * 100}% = {weightedScore.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 mt-2 font-bold text-blue-700 dark:text-blue-300">
                    Total: {selectedEmployee.performanceRecap.kualitasKerja.toFixed(2)} / {selectedEmployee.performanceRecap.positionType === 'eselon' ? '42.5' : '59.5'}
                  </div>
                </div>
              </div>

              {/* Final Calculation */}
              <div className="border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-3">
                  Final Score Calculation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Perilaku Kinerja:</span>
                    <span className="font-medium">{selectedEmployee.performanceRecap.perilakuKinerja.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Kualitas Kerja:</span>
                    <span className="font-medium">{selectedEmployee.performanceRecap.kualitasKerja.toFixed(2)}</span>
                  </div>
                  {selectedEmployee.performanceRecap.positionType === 'eselon' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Penilaian Pimpinan:</span>
                      <span className="font-medium">
                        {(manualScores[selectedEmployee.name] || 80)}% of 100 × 17 pts = {((selectedEmployee.performanceRecap.penilaianPimpinan / 100) * 17).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 font-bold text-orange-700 dark:text-orange-300">
                    Total Score: {selectedEmployee.performanceRecap.totalNilai.toFixed(2)} / 85
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    Performance Level: {
                      selectedEmployee.performanceRecap.totalNilai >= 80 ? 
                        <span className="text-green-600 font-bold">Sangat Baik</span> :
                      selectedEmployee.performanceRecap.totalNilai >= 70 ? 
                        <span className="text-yellow-600 font-bold">Baik</span> :
                        <span className="text-red-600 font-bold">Kurang Baik</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeCalculationModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapKinerja;