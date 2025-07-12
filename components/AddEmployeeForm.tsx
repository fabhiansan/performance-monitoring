import React, { useState } from 'react';
import { api } from '../services/api';

interface AddEmployeeFormProps {
  onEmployeeAdded: () => void;
  onCancel: () => void;
}

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ onEmployeeAdded, onCancel }) => {
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [gol, setGol] = useState('');
  const [pangkat, setPangkat] = useState('');
  const [position, setPosition] = useState('');
  const [subPosition, setSubPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; nip?: string; gol?: string; pangkat?: string; position?: string; subPosition?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; nip?: string; gol?: string; pangkat?: string; position?: string; subPosition?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }
    
    if (!nip.trim()) {
      newErrors.nip = 'NIP wajib diisi';
    }
    
    if (!gol.trim()) {
      newErrors.gol = 'Golongan wajib diisi';
    }
    
    if (!pangkat.trim()) {
      newErrors.pangkat = 'Pangkat wajib diisi';
    }
    
    if (!position.trim()) {
      newErrors.position = 'Jabatan wajib diisi';
    }
    
    if (!subPosition.trim()) {
      newErrors.subPosition = 'Sub-Jabatan wajib diisi';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await api.addEmployee(name.trim(), nip.trim(), gol.trim(), pangkat.trim(), position.trim(), subPosition.trim());
      onEmployeeAdded();
    } catch (error) {
      console.error('Error adding employee:', error);
      setErrors({ name: 'Gagal menambahkan pegawai. Silakan coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tambah Pegawai Baru</h2>
          <p className="text-gray-600 dark:text-gray-400">Masukkan data pegawai baru</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Lengkap *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Masukkan nama lengkap"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="nip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                NIP *
              </label>
              <input
                type="text"
                id="nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.nip ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="19660419 198910 1 001"
                disabled={isSubmitting}
              />
              {errors.nip && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.nip}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Golongan *
              </label>
              <input
                type="text"
                id="gol"
                value={gol}
                onChange={(e) => setGol(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.gol ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="IV/c"
                disabled={isSubmitting}
              />
              {errors.gol && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gol}</p>
              )}
            </div>

            <div>
              <label htmlFor="pangkat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pangkat *
              </label>
              <input
                type="text"
                id="pangkat"
                value={pangkat}
                onChange={(e) => setPangkat(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.pangkat ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Pembina Utama Muda"
                disabled={isSubmitting}
              />
              {errors.pangkat && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pangkat}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jabatan *
            </label>
            <input
              type="text"
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.position ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Plt. Kepala Dinas Sosial"
              disabled={isSubmitting}
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.position}</p>
            )}
          </div>

          <div>
            <label htmlFor="subPosition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sub-Jabatan *
            </label>
            <input
              type="text"
              id="subPosition"
              value={subPosition}
              onChange={(e) => setSubPosition(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.subPosition ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Provinsi Kalimantan Selatan"
              disabled={isSubmitting}
            />
            {errors.subPosition && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subPosition}</p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </div>
              ) : (
                'Tambah Pegawai'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeForm;