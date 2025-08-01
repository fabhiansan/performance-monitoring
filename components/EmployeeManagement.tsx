import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IconUsers, IconUpload, IconPlus, IconClipboardData, IconEdit, IconTrash } from './Icons';
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
  organizational_level: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeManagementProps {
  onEmployeeUpdate?: () => void;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ onEmployeeUpdate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Employee>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');

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

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus pegawai "${name}"?\n\n` +
      'Data yang dihapus tidak dapat dikembalikan. Pastikan ini adalah tindakan yang benar.'
    );
    
    if (!isConfirmed) {
      return;
    }

    try {
      await api.deleteEmployee(id);
      await loadEmployees();
      if (onEmployeeUpdate) {
        onEmployeeUpdate();
      }
      
      // Show success message briefly
      const successMessage = `Pegawai "${name}" berhasil dihapus.`;
      setError(null);
      
      // Success - employee deleted
    } catch (err) {
      setError(`Gagal menghapus pegawai "${name}". Silakan coba lagi.`);
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

  const handleSelectEmployee = (employeeId: number) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === sortedEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(sortedEmployees.map(emp => emp.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;
    
    const employeeNames = employees.filter(emp => selectedEmployees.has(emp.id)).map(emp => emp.name);
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus ${selectedEmployees.size} pegawai berikut?\n\n${employeeNames.join(', ')}\n\nData yang dihapus tidak dapat dikembalikan.`
    );
    
    if (!isConfirmed) return;

    try {
      setIsLoading(true);
      for (const employeeId of selectedEmployees) {
        await api.deleteEmployee(employeeId);
      }
      setSelectedEmployees(new Set());
      await loadEmployees();
      if (onEmployeeUpdate) {
        onEmployeeUpdate();
      }
      setError(null);
    } catch (err) {
      setError('Gagal menghapus pegawai. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedEmployees.size === 0 || !bulkEditField || !bulkEditValue) return;
    
    const isConfirmed = window.confirm(
      `Apakah Anda yakin ingin mengubah ${bulkEditField} untuk ${selectedEmployees.size} pegawai terpilih menjadi "${bulkEditValue}"?`
    );
    
    if (!isConfirmed) return;

    try {
      setIsLoading(true);
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (employee) {
          const updatedData = {
            name: employee.name,
            nip: employee.nip,
            gol: employee.gol,
            pangkat: employee.pangkat,
            position: employee.position,
            subPosition: employee.sub_position,
            organizationalLevel: employee.organizational_level
          };
          
          // Update specific field
          switch (bulkEditField) {
            case 'gol':
              updatedData.gol = bulkEditValue;
              break;
            case 'pangkat':
              updatedData.pangkat = bulkEditValue;
              break;
            case 'position':
              updatedData.position = bulkEditValue;
              break;
            case 'sub_position':
              updatedData.subPosition = bulkEditValue;
              break;
            case 'organizational_level':
              updatedData.organizationalLevel = bulkEditValue;
              break;
          }
          
          await api.updateEmployee(
            employeeId,
            updatedData.name,
            updatedData.nip,
            updatedData.gol,
            updatedData.pangkat,
            updatedData.position,
            updatedData.subPosition,
            updatedData.organizationalLevel
          );
        }
      }
      setSelectedEmployees(new Set());
      setShowBulkActions(false);
      setBulkEditField('');
      setBulkEditValue('');
      await loadEmployees();
      if (onEmployeeUpdate) {
        onEmployeeUpdate();
      }
      setError(null);
    } catch (err) {
      setError('Gagal mengubah data pegawai. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
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
            if (onEmployeeUpdate) {
              onEmployeeUpdate();
            }
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
          {selectedEmployees.size > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <IconEdit className="w-5 h-5 mr-2"/>
              Bulk Actions ({selectedEmployees.size})
            </button>
          )}
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

        {showBulkActions && selectedEmployees.size > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
              Bulk Actions ({selectedEmployees.size} pegawai terpilih)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Field yang akan diubah
                </label>
                <select
                  value={bulkEditField}
                  onChange={(e) => setBulkEditField(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Pilih field...</option>
                  <option value="gol">Golongan</option>
                  <option value="pangkat">Pangkat</option>
                  <option value="position">Jabatan</option>
                  <option value="sub_position">Sub-Jabatan</option>
                  <option value="organizational_level">Tingkat Organisasi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Nilai baru
                </label>
                {bulkEditField === 'organizational_level' ? (
                  <select
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Pilih tingkat organisasi...</option>
                    <option value="Eselon II">Eselon II</option>
                    <option value="Eselon III">Eselon III</option>
                    <option value="Eselon IV">Eselon IV</option>
                    <option value="Staff ASN Sekretariat">Staff ASN Sekretariat</option>
                    <option value="Staff Non ASN Sekretariat">Staff Non ASN Sekretariat</option>
                    <option value="Staff ASN Bidang Hukum">Staff ASN Bidang Hukum</option>
                    <option value="Staff ASN Bidang Pemberdayaan Sosial">Staff ASN Bidang Pemberdayaan Sosial</option>
                    <option value="Staff Non ASN Bidang Pemberdayaan Sosial">Staff Non ASN Bidang Pemberdayaan Sosial</option>
                    <option value="Staff ASN Bidang Rehabilitasi Sosial">Staff ASN Bidang Rehabilitasi Sosial</option>
                    <option value="Staff Non ASN Bidang Rehabilitasi Sosial">Staff Non ASN Bidang Rehabilitasi Sosial</option>
                    <option value="Staff ASN Bidang Perlindungan dan Jaminan Sosial">Staff ASN Bidang Perlindungan dan Jaminan Sosial</option>
                    <option value="Staff Non ASN Bidang Perlindungan dan Jaminan Sosial">Staff Non ASN Bidang Perlindungan dan Jaminan Sosial</option>
                    <option value="Staff ASN Bidang Penanganan Bencana">Staff ASN Bidang Penanganan Bencana</option>
                    <option value="Staff Non ASN Bidang Penanganan Bencana">Staff Non ASN Bidang Penanganan Bencana</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="Masukkan nilai baru..."
                    className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBulkEdit}
                disabled={!bulkEditField || !bulkEditValue}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Terapkan Perubahan
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Hapus Terpilih
              </button>
              <button
                onClick={() => {
                  setShowBulkActions(false);
                  setBulkEditField('');
                  setBulkEditValue('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
            </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === sortedEmployees.length && sortedEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('organizational_level')}
                  >
                    Tingkat Organisasi {sortField === 'organizational_level' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(emp.id)}
                        onChange={() => handleSelectEmployee(emp.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.organizational_level === 'Eselon III' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                        emp.organizational_level === 'Eselon IV' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                      }`}>
                        {emp.organizational_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEmployee(emp)}
                          className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit pegawai"
                        >
                          <IconEdit className="w-4 h-4 mr-1"/>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus pegawai"
                        >
                          <IconTrash className="w-4 h-4 mr-1"/>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showAddForm || editingEmployee) && (
        <AddEmployeeForm
          employee={editingEmployee || undefined}
          isEditMode={!!editingEmployee}
          onEmployeeAdded={() => {
            setShowAddForm(false);
            setEditingEmployee(null);
            loadEmployees();
            if (onEmployeeUpdate) {
              onEmployeeUpdate();
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
};

export default EmployeeManagement;