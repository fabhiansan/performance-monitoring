import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IconUsers, IconUpload, IconPlus, IconClipboardData } from './Icons';
import EmployeeImport from './EmployeeImport';
import AddEmployeeForm from './AddEmployeeForm';

interface Employee {
  id: number;
  name: string;
  nip: string;
  gol: string;
  pangkat: string;
  position: string;
  sub_position: string;
  created_at: string;
  updated_at: string;
}

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Employee>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAllEmployees();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data pegawai');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pegawai ini?')) {
      return;
    }

    try {
      await api.deleteEmployee(id);
      await loadEmployees();
    } catch (err) {
      setError('Gagal menghapus pegawai');
    }
  };

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nip.includes(searchTerm) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * direction;
    }
    return 0;
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  if (showImport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowImport(false)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Kembali ke Daftar Pegawai
          </button>
        </div>
        <EmployeeImport
          onImportComplete={() => {
            setShowImport(false);
            loadEmployees();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manajemen Pegawai
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola data pegawai dengan mudah
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IconUpload className="w-5 h-5 mr-2"/>
            Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <IconPlus className="w-5 h-5 mr-2"/>
            Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <IconUsers className="w-8 h-8 text-blue-500"/>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Daftar Pegawai
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {employees.length} pegawai
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Cari pegawai..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data pegawai...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12">
            <IconClipboardData className="w-16 h-16 mx-auto text-gray-400 mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Belum ada data pegawai
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Mulai dengan mengimpor data dari CSV atau tambah pegawai satu per satu
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <IconUpload className="w-5 h-5 mr-2"/>
                Import CSV
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <IconPlus className="w-5 h-5 mr-2"/>
                Tambah Pegawai
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    Nama {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('nip')}
                  >
                    NIP {sortField === 'nip' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gol/Pangkat
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('position')}
                  >
                    Jabatan {sortField === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sub-Jabatan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {emp.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {emp.nip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{emp.gol}</div>
                      <div className="text-xs">{emp.pangkat}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      <div className="truncate">{emp.position}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      <div className="truncate">{emp.sub_position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Hapus pegawai"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddEmployeeForm
          onEmployeeAdded={() => {
            setShowAddForm(false);
            loadEmployees();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

export default EmployeeManagement;