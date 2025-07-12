import React, { useState } from 'react';

interface UserProfileFormProps {
  onProfileSaved: (name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string) => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({ onProfileSaved }) => {
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
      await onProfileSaved(name.trim(), nip.trim(), gol.trim(), pangkat.trim(), position.trim(), subPosition.trim());
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Selamat Datang</h1>
          <p className="text-gray-600 dark:text-gray-400">Silakan masukkan data pegawai Anda untuk melanjutkan ke dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama Lengkap
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
                NIP
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
                Golongan
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
                Pangkat
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
              Jabatan
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
              Sub-Jabatan
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </div>
            ) : (
              'Lanjutkan ke Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Data Anda akan disimpan secara lokal untuk personalisasi dashboard
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileForm;