/**
 * Custom hook for file operations
 * Handles drag & drop, file input, and text processing
 */

import React, { useState, useRef, useCallback } from 'react';

interface UseFileOperationsOptions {
  onDragStateChange?: (_isDragOver: boolean) => void;
  onProcessingChange?: (_isProcessing: boolean) => void;
}

interface FileOperationResult {
  content: string;
  fileName?: string;
  fileType?: string;
}

const TEXT_PLAIN_TYPE = 'text/plain';

export function useFileOperations(options: UseFileOperationsOptions = {}) {
  const { onDragStateChange, onProcessingChange } = options;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateDragState = useCallback((state: boolean) => {
    setIsDragOver(state);
    onDragStateChange?.(state);
  }, [onDragStateChange]);

  const updateProcessingState = useCallback((state: boolean) => {
    setIsProcessing(state);
    onProcessingChange?.(state);
  }, [onProcessingChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateDragState(true);
  }, [updateDragState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateDragState(false);
  }, [updateDragState]);

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<FileOperationResult | null> => {
    e.preventDefault();
    e.stopPropagation();
    updateDragState(false);
    updateProcessingState(true);

    try {
      const files = Array.from(e.dataTransfer.files);
      
      if (files.length === 0) {
        // Check for text data if no files
        const textData = e.dataTransfer.getData(TEXT_PLAIN_TYPE);
        if (textData) {
          return { content: textData, fileType: TEXT_PLAIN_TYPE };
        }
        return null;
      }

      // Process the first file
      const file = files[0];
      if (!isValidFileType(file)) {
        throw new Error('Unsupported file type. Please use CSV or TXT files.');
      }

      const content = await readFileAsText(file);
      return {
        content,
        fileName: file.name,
        fileType: file.type
      };
    } finally {
      updateProcessingState(false);
    }
  }, [updateDragState, updateProcessingState]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<FileOperationResult | null> => {
    const files = e.target.files;
    if (!files || files.length === 0) return null;

    updateProcessingState(true);

    try {
      const file = files[0];
      if (!isValidFileType(file)) {
        throw new Error('Unsupported file type. Please use CSV or TXT files.');
      }

      const content = await readFileAsText(file);
      return {
        content,
        fileName: file.name,
        fileType: file.type
      };
    } finally {
      updateProcessingState(false);
      // Reset the input value to allow selecting the same file again
      if (e.target) {
        e.target.value = '';
      }
    }
  }, [updateProcessingState]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent): Promise<FileOperationResult | null> => {
    e.preventDefault();
    updateProcessingState(true);

    try {
      // Try to get text data from clipboard
      const textData = e.clipboardData.getData(TEXT_PLAIN_TYPE);
      if (textData) {
        return { content: textData, fileType: TEXT_PLAIN_TYPE };
      }

      // Try to get files from clipboard
      const files = Array.from(e.clipboardData.files);
      if (files.length > 0) {
        const file = files[0];
        if (!isValidFileType(file)) {
          throw new Error('Unsupported file type from clipboard.');
        }

        const content = await readFileAsText(file);
        return {
          content,
          fileName: file.name,
          fileType: file.type
        };
      }

      return null;
    } finally {
      updateProcessingState(false);
    }
  }, [updateProcessingState]);

  const clearDragState = useCallback(() => {
    updateDragState(false);
  }, [updateDragState]);

  return {
    // State
    isDragOver,
    isProcessing,
    fileInputRef,

    // Handlers
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handlePaste,
    triggerFileSelect,
    clearDragState
  };
}

/**
 * Check if file type is supported
 */
function isValidFileType(file: File): boolean {
  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'text/tab-separated-values'
  ];
  
  const validExtensions = ['.csv', '.txt', '.tsv'];
  
  return validTypes.includes(file.type) || 
         validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

/**
 * Read file as text with proper encoding handling
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    // Try UTF-8 first, which handles most cases
    reader.readAsText(file, 'UTF-8');
  });
}

export default useFileOperations;
