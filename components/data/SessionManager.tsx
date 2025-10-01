import React, { useEffect, useCallback } from 'react';
import { api, UploadSession } from '../../services/api';
import { IconUsers } from '../shared/Icons';
import { Employee } from '../../types';

export interface SessionManagerProps {
  uploadSessions: UploadSession[];
  setUploadSessions: (_sessions: UploadSession[]) => void;
  selectedSessions: Set<string>;
  setSelectedSessions: (_sessions: Set<string>) => void;
  showMergeOptions: boolean;
  setShowMergeOptions: (_show: boolean) => void;
  showSaveDialog: boolean;
  setShowSaveDialog: (_show: boolean) => void;
  sessionName: string;
  setSessionName: (_name: string) => void;
  onDataUpdate: (_employees: Employee[], _sessionName?: string) => void;
  onError: (_message: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  uploadSessions,
  setUploadSessions,
  selectedSessions,
  setSelectedSessions,
  showMergeOptions,
  setShowMergeOptions,
  showSaveDialog,
  setShowSaveDialog,
  sessionName,
  setSessionName,
  onDataUpdate,
  onError
}) => {
  const loadUploadSessions = useCallback(async (): Promise<void> => {
    try {
      const sessions = await api.getAllUploadSessions();
      setUploadSessions(sessions);
    } catch (_error) {
      onError('Failed to load upload sessions');
    }
  }, [setUploadSessions, onError]);

  useEffect(() => {
    loadUploadSessions();
  }, [loadUploadSessions]);

  const handleSessionToggle = (sessionId: string): void => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleMergeSessions = async (): Promise<void> => {
    if (selectedSessions.size === 0) {
      onError('Please select at least one session to merge');
      return;
    }

    try {
      const allEmployees: Employee[] = [];
      
      for (const sessionId of selectedSessions) {
        const employees = await api.getEmployeeDataBySession(sessionId);
        allEmployees.push(...employees);
      }

      // Remove duplicates based on employee name
      const uniqueEmployees = allEmployees.reduce((acc: Employee[], employee) => {
        const existing = acc.find((emp: Employee) => emp.name === employee.name);
        if (!existing) {
          acc.push(employee);
        } else {
          // Merge performance data if employee exists
          if (employee.performance && existing.performance) {
            existing.performance = [...existing.performance, ...employee.performance];
          }
        }
        return acc;
      }, []);

      onDataUpdate(uniqueEmployees, `Merged Sessions (${selectedSessions.size} sessions)`);
      setShowMergeOptions(false);
      setSelectedSessions(new Set());
    } catch (_error) {
      onError('Failed to merge sessions');
    }
  };

  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }

    try {
      await api.deleteUploadSession(sessionId);
      await loadUploadSessions();
    } catch (_error) {
      onError('Failed to delete session');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <IconUsers className="w-5 h-5 mr-2 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Saved Sessions
          </h3>
        </div>
        
        {uploadSessions.length > 1 && (
          <button
            onClick={() => setShowMergeOptions(!showMergeOptions)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showMergeOptions ? 'Cancel Merge' : 'Merge Sessions'}
          </button>
        )}
      </div>

      {uploadSessions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl text-gray-400 dark:text-gray-500 mb-2">📊</div>
          <p className="text-gray-500 dark:text-gray-400">No saved sessions yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Import data to create your first session
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {uploadSessions.map((session) => (
            <div
              key={session.session_id}
              className={`p-4 border rounded-lg transition-colors ${
                showMergeOptions
                  ? selectedSessions.has(session.session_id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
              onClick={showMergeOptions ? () => handleSessionToggle(session.session_id) : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {showMergeOptions && (
                      <input
                        type="checkbox"
                        checked={selectedSessions.has(session.session_id)}
                        onChange={() => handleSessionToggle(session.session_id)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {session.session_name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {session.employee_count} employees • {formatDate(session.upload_timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {!showMergeOptions && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteSession(session.session_id)}
                      className="px-2 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                      title="Delete session"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {showMergeOptions && selectedSessions.size > 0 && (
            <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleMergeSessions}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
              >
                Merge {selectedSessions.size} Sessions
              </button>
              <button
                onClick={() => {
                  setShowMergeOptions(false);
                  setSelectedSessions(new Set());
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Save Session
            </h3>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (sessionName.trim()) {
                    // This will be handled by the parent component
                    setShowSaveDialog(false);
                  }
                }}
                disabled={!sessionName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
