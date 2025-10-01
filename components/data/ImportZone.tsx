/**
 * ImportZone Component
 * Handles the drag-and-drop and paste area for data import
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IconClipboardData, IconAnalyze } from '../shared/Icons';
import { Button, Alert } from '../../design-system';

interface ImportZoneProps {
  onImport: (_rawText: string) => void;
  isProcessing: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ImportZone: React.FC<ImportZoneProps> = ({
  onImport,
  isProcessing,
  error,
  onClearError
}) => {
  const [rawText, setRawText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    reader.onload = (e) => {
      if (!abortController.signal.aborted) {
        const text = e.target?.result as string;
        setRawText(text);
      }
    };

    reader.onerror = () => {
      if (!abortController.signal.aborted) {
        onClearError();
        // Error will be handled by the error prop
      }
    };

    reader.readAsText(file);
  }, [onClearError]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const handleProcessData = () => {
    if (!rawText.trim()) {
      return;
    }
    onImport(rawText);
  };

  const handleClear = () => {
    setRawText('');
    onClearError();
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="flex items-center text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        <IconClipboardData className="w-8 h-8 mr-3 text-gray-500" />
        Impor Data
      </h2>

      <div
        className={`border-2 border-dashed rounded-lg p-4 mb-4 transition-colors ${isDragOver
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
            Seret & letakkan file CSV di sini atau
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 ml-1"
            >
              cari
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
        placeholder="Tempel data CSV di sini...

Jenis data yang didukung:

🏢 DATA DAFTAR PEGAWAI (Langkah 1):
- Header: No., Nama, NIP, Gol, Pangkat, Jabatan, Sub-Jabatan
- Impor ini terlebih dahulu untuk mendaftarkan pegawai ke sistem
- Setelah impor, pegawai akan tampil di dashboard tanpa skor

📊 DATA KINERJA (Langkah 2):
- Header berisi nama pegawai dalam kurung: 'Kompetensi [Nama Pegawai]'
- Baris data berisi skor numerik (10, 65, 75, dst.) atau penilaian teks
- Penilaian teks yang didukung: 'Baik' (75), 'Sangat Baik' (85), 'Kurang Baik' (65)
- Nama pegawai harus sama persis dengan nama pada Langkah 1
- Mendukung beberapa baris penilaian untuk setiap pegawai

💡 TIPS:
- Impor daftar pegawai terlebih dahulu, lalu data kinerja
- Sistem mendeteksi jenis data secara otomatis dan memprosesnya
- Nama pada data kinerja harus persis sama dengan nama di daftar pegawai"
        className="w-full h-60 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-mono mb-4"
      />

      <div className="flex gap-3">
        <Button
          onClick={handleProcessData}
          disabled={isProcessing || !rawText.trim()}
          variant="primary"
          size="lg"
          fullWidth
          loading={isProcessing}
          leftIcon={!isProcessing ? <IconAnalyze className="w-5 h-5" /> : undefined}
        >
          {isProcessing ? 'Memproses...' : 'Analisis Data'}
        </Button>

        <Button
          onClick={handleClear}
          variant="outline"
          size="lg"
        >
          Bersihkan
        </Button>
      </div>

      {error && (
        <Alert
          variant="error"
          title="Kesalahan"
          className="mt-4"
          dismissible
          onDismiss={onClearError}
        >
          {error}
        </Alert>
      )}
    </div>
  );
};
