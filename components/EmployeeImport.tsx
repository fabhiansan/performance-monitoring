import React, { useState, useRef } from 'react';
import { parseEmployeeCSV, validateEmployeeData, EmployeeData } from '../services/csvParser';
import { api } from '../services/api';
import { IconClipboardData, IconUsers, IconUpload } from './Icons';

interface EmployeeImportProps {
  onImportComplete: () => void;
}

const EmployeeImport: React.FC<EmployeeImportProps> = ({ onImportComplete }) => {
  const [rawText, setRawText] = useState('');
  const [parsedEmployees, setParsedEmployees] = useState<EmployeeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParseCSV = () => {
    if (!rawText.trim()) {
      setError('Silakan masukkan data CSV terlebih dahulu.');
      return;
    }

    try {
      setError(null);
      const employees = parseEmployeeCSV(rawText);
      const validation = validateEmployeeData(employees);
      
      if (!validation.valid) {
        setError(`Data tidak valid:\n${validation.errors.join('\n')}`);
        return;
      }
      
      setParsedEmployees(employees);
      setShowPreview(true);
    } catch (err) {
      console.error('Parse error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Gagal memproses data CSV: ${errorMessage}. Pastikan format data sudah benar.`);
    }
  };

  const handleImport = async () => {
    if (parsedEmployees.length === 0) return;
    
    setIsLoading(true);
    try {
      await api.importEmployeesFromCSV(parsedEmployees);
      setRawText('');
      setParsedEmployees([]);
      setShowPreview(false);
      setError(null);
      onImportComplete();
    } catch (err) {
      setError('Gagal mengimpor data pegawai ke database.');
    } finally {
      setIsLoading(false);
    }
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
    if (files.length > 0) {
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

  const sampleCSV = `Nama	NIP	Gol	Pangkat	Jabatan	Sub-Jabatan
MUHAMMADUN, A.KS, M.I.Kom	19660419 198910 1 001	IV/c	Pembina Utama Muda	Plt. Kepala Dinas Sosial	Provinsi Kalimantan Selatan
MURJANI, S.Pd, MM	19680307 199802 1 003	IV/b	Pembina Tk.I	Sekretaris Dinas Sosial	Provinsi Kalimantan Selatan
GUSNANDA EFFENDI, S.Pd, MM	19681007 199303 1 012	IV/b	Pembina Tk.I	Kepala Bidang	Perlindungan dan Jaminan Sosial
H. ACHMADI, S.Sos	19680714 199202 1 002	III/d	Penata Tk.I	Kepala Bidang	Penanganan Bencana`;

  if (showPreview) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Preview Data Pegawai
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {parsedEmployees.length} pegawai siap diimpor
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">NIP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pangkat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jabatan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub-Jabatan</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {parsedEmployees.slice(0, 10).map((emp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{emp.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.nip}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.gol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.pangkat}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{emp.subPosition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedEmployees.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
              Dan {parsedEmployees.length - 10} pegawai lainnya...
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowPreview(false)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Kembali
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-green-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengimpor...
              </>
            ) : (
              <>
                <IconUpload className="w-5 h-5 mr-2"/>
                Impor {parsedEmployees.length} Pegawai
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Import Data Pegawai
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Import data pegawai dalam format CSV atau paste data langsung
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <div 
          className={`border-2 border-dashed rounded-lg p-6 mb-6 transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <IconClipboardData className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              Drag & drop file CSV di sini atau 
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 ml-1 font-medium"
              >
                pilih file
              </button>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Format: Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Atau paste data CSV di sini:
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste data CSV di sini..."
            className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-mono"
          />
        </div>

        <div className="mb-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 mb-2">
              Lihat contoh format CSV
            </summary>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                {sampleCSV}
              </pre>
            </div>
          </details>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleParseCSV}
            disabled={!rawText.trim()}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
          >
            <IconUsers className="w-5 h-5 mr-2"/>
            Parse Data CSV
          </button>
          
          <button
            onClick={() => {
              setRawText('');
              setError(null);
              setParsedEmployees([]);
              setShowPreview(false);
            }}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mt-4" role="alert">
            <p className="font-bold">Error</p>
            <pre className="text-sm whitespace-pre-wrap">{error}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeImport;