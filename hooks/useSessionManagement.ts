/**
 * Custom hook for session management
 * Handles upload sessions, session selection, and session operations
 */

import { useState, useEffect, useCallback } from 'react';
import { api, UploadSession } from '../services/api';
import { useError } from '../contexts/ErrorContext';

interface SessionOperationResult {
  success: boolean;
  error?: string;
}

export function useSessionManagement() {
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const { showError } = useError();

  const loadUploadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessions = await api.getAllUploadSessions();
      setUploadSessions(sessions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load sessions on mount
  useEffect(() => {
    loadUploadSessions();
  }, [loadUploadSessions]);

  const saveSession = useCallback(async (sessionNameToSave: string): Promise<SessionOperationResult> => {
    if (!sessionNameToSave.trim()) {
      return { success: false, error: 'Session name is required' };
    }

    try {
      setIsLoading(true);
      // Session saving logic would go here - this depends on the current implementation
      // For now, we'll just refresh the sessions list
      await loadUploadSessions();
      setSessionName('');
      setShowSaveDialog(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [loadUploadSessions]);

  const deleteSession = useCallback(async (sessionId: string): Promise<SessionOperationResult> => {
    try {
      setIsLoading(true);
      await api.deleteUploadSession(sessionId);
      await loadUploadSessions();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete session';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [loadUploadSessions]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      return await api.getEmployeeDataBySession(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
      showError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const mergeSessions = useCallback(async (sessionIds: string[]): Promise<SessionOperationResult> => {
    if (sessionIds.length < 2) {
      return { success: false, error: 'Select at least 2 sessions to merge' };
    }

    try {
      setIsLoading(true);
      // Merge logic would be implemented here
      // For now, this is a placeholder
      await loadUploadSessions();
      setSelectedSessions(new Set());
      setShowMergeOptions(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to merge sessions';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [loadUploadSessions]);

  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessions(new Set());
  }, []);

  const bulkDeleteSessions = useCallback(async (sessionIds: string[]): Promise<SessionOperationResult> => {
    if (sessionIds.length === 0) {
      return { success: false, error: 'No sessions selected' };
    }

    try {
      setIsLoading(true);
      await Promise.all(sessionIds.map(id => api.deleteUploadSession(id)));
      await loadUploadSessions();
      setSelectedSessions(new Set());
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete sessions';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [loadUploadSessions]);

  return {
    // State
    uploadSessions,
    selectedSessions,
    isLoading,
    showSaveDialog,
    showMergeOptions,
    sessionName,

    // Actions
    loadUploadSessions,
    saveSession,
    deleteSession,
    loadSession,
    mergeSessions,
    toggleSessionSelection,
    clearSelection,
    bulkDeleteSessions,

    // Dialog controls
    setShowSaveDialog,
    setShowMergeOptions,
    setSessionName
  };
}

export default useSessionManagement;