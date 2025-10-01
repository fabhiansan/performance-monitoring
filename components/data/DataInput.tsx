import React, { useMemo } from 'react';
import { IconClipboardData, IconAnalyze } from '../shared/Icons';
import { Button, Alert } from '../../design-system';
import useFileOperations from '../../hooks/useFileOperations';

export interface DataInputProps {
  rawText: string;
  setRawText: (_text: string) => void;
  isLoading: boolean;
  isDragOver: boolean;
  setIsDragOver: (_isDragOver: boolean) => void;
  onFileProcess: (_data: string, _fileName?: string) => Promise<void>;
  onPasteProcess: () => Promise<void>;
  disabled?: boolean;
  onError?: (_error: string) => void;
}

const DataInput: React.FC<DataInputProps> = ({
  rawText,
  setRawText,
  isLoading,
  isDragOver,
  setIsDragOver,
  onFileProcess,
  onPasteProcess,
  disabled = false,
  onError
}) => {
  const {
    isProcessing: fileProcessing,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handlePaste,
    triggerFileSelect
  } = useFileOperations({
    onDragStateChange: setIsDragOver
  });

  const mergedLoadingState = useMemo(() => isLoading || fileProcessing, [isLoading, fileProcessing]);

  const handleFileOperation = async (
    operation: () => Promise<{ content: string; fileName?: string } | null>
  ) => {
    try {
      const result = await operation();
      if (result?.content) {
        await onFileProcess(result.content, result.fileName);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File operation failed';
      onError?.(errorMessage);
    }
  };

  const handlePasteIntoTextArea = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    await handleFileOperation(() => handlePaste(event));
  };

  const handleTextSubmit = async () => {
    const content = rawText.trim();
    if (!content) {
      return;
    }

    try {
      await onPasteProcess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process data';
      onError?.(errorMessage);
    }
  };

  const handleClearText = () => {
    setRawText('');
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Import Data
        </h3>
        
        {/* Drag & Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={!disabled ? handleDragOver : undefined}
          onDragLeave={!disabled ? handleDragLeave : undefined}
          onDrop={!disabled ? (event) => handleFileOperation(() => handleDrop(event)) : undefined}
          onClick={!disabled && !mergedLoadingState ? triggerFileSelect : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={(event) => handleFileOperation(() => handleFileSelect(event))}
            className="hidden"
            disabled={disabled || mergedLoadingState}
          />
          
          <div className="space-y-2">
            <IconClipboardData className="mx-auto h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                Click to upload
              </span>{' '}
              or drag and drop
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              CSV, TXT, or TSV files
            </p>
          </div>
          
          {mergedLoadingState && (
            <div className="absolute inset-0 bg-white/75 dark:bg-gray-900/75 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* File Upload Button */}
        <div className="flex justify-center">
          <Button
            onClick={triggerFileSelect}
            disabled={disabled || mergedLoadingState}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <IconClipboardData className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Or Paste Data
        </h3>
        
        <div className="space-y-3">
          <textarea
            placeholder="Paste your CSV data here... (Ctrl+V)"
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            onPaste={handlePasteIntoTextArea}
            disabled={disabled || mergedLoadingState}
          />
          
          <div className="flex gap-2 justify-end">
            <Button
              onClick={handleClearText}
              variant="outline"
              size="sm"
              disabled={disabled || mergedLoadingState}
            >
              Clear
            </Button>
            <Button
              onClick={handleTextSubmit}
              size="sm"
              disabled={disabled || mergedLoadingState}
            >
              <IconAnalyze className="w-4 h-4 mr-2" />
              Process Data
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <Alert className="text-sm">
        <IconClipboardData className="h-4 w-4" />
        <div>
          <p className="font-medium">Supported formats:</p>
          <ul className="mt-1 text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <li>• Employee roster data with columns: Nama, NIP, Gol, Pangkat, Jabatan</li>
            <li>• Performance data with employee names in brackets [Employee Name]</li>
            <li>• CSV files with comma, tab, or space-separated values</li>
          </ul>
        </div>
      </Alert>
    </div>
  );
};

export default DataInput;
