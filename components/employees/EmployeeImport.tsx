import React, { useState, useRef } from 'react';
import { parseEmployeeCSV, validateEmployeeData, EmployeeData } from '../../services/csvParser';
import { api } from '../../services/api';
import { Employee } from '../../types';
import { IconClipboardData, IconUsers, IconUpload } from '../shared/Icons';
import { Button, Input, Alert } from '../../design-system';

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
      await api.importEmployeesFromCSV(parsedEmployees as unknown as Employee[]);
      setRawText('');
      setParsedEmployees([]);
      setShowPreview(false);
      setError(null);
      onImportComplete();
    } catch {
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level Organisasi</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        emp.organizationalLevel.startsWith('Eselon') 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {emp.organizationalLevel}
                      </span>
                    </td>
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
          <Button
            onClick={() => setShowPreview(false)}
            variant="outline"
            size="lg"
          >
            Kembali
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading}
            variant="success"
            size="lg"
            fullWidth
            loading={isLoading}
            leftIcon={!isLoading ? <IconUpload className="w-5 h-5"/> : undefined}
          >
            {isLoading ? 'Mengimpor...' : `Impor ${parsedEmployees.length} Pegawai`}
          </Button>
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
              Drag & drop file CSV di sini atau{' '}
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="tertiary"
                size="sm"
                className="!p-0 !h-auto !min-w-0 text-blue-600 hover:text-blue-700 font-medium"
              >
                pilih file
              </Button>
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
          <Input
            multiline
            rows={10}
            label="Atau paste data CSV di sini:"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste data CSV di sini..."
            className="font-mono text-sm"
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
          <Button
            onClick={handleParseCSV}
            disabled={!rawText.trim()}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<IconUsers className="w-5 h-5"/>}
          >
            Parse Data CSV
          </Button>
          
          <Button
            onClick={() => {
              setRawText('');
              setError(null);
              setParsedEmployees([]);
              setShowPreview(false);
            }}
            variant="outline"
            size="lg"
          >
            Clear
          </Button>
        </div>

        {error && (
          <Alert
            variant="error"
            title="Error"
            className="mt-4"
            dismissible
            onDismiss={() => setError(null)}
          >
            <pre className="text-sm whitespace-pre-wrap">{error}</pre>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EmployeeImport;
