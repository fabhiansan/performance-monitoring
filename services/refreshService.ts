import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from './api';
import { Employee } from '../types';

// Define different data types that can be refreshed independently
export type RefreshDataType = 
  | 'employee_data'           // Core employee information (names, positions, etc.)
  | 'organizational_mappings' // Organizational level mappings and hierarchies
  | 'performance_scores'      // Performance data and competency scores
  | 'upload_sessions'         // Session management data
  | 'manual_scores'           // Manual leadership scores
  | 'all';                    // Refresh everything

// Refresh key state interface
interface RefreshKeys {
  employee_data: number;
  organizational_mappings: number;
  performance_scores: number;
  upload_sessions: number;
  manual_scores: number;
  all: number;
}

// Refresh operation metadata
interface RefreshOperation {
  id: string;
  type: RefreshDataType;
  timestamp: number;
  abortController: AbortController;
  promise: Promise<any>;
}

// Hook return type
interface UseGranularRefreshReturn {
  refreshKeys: RefreshKeys;
  isRefreshing: (type: RefreshDataType) => boolean;
  refresh: (type: RefreshDataType, options?: RefreshOptions) => Promise<void>;
  refreshMultiple: (types: RefreshDataType[], options?: RefreshOptions) => Promise<void>;
  cancelRefresh: (type: RefreshDataType) => void;
  cancelAllRefresh: () => void;
  getLastRefreshTime: (type: RefreshDataType) => number | null;
}

// Refresh options
interface RefreshOptions {
  debounceMs?: number;
  force?: boolean; // Skip debouncing
  sessionId?: string;
  onSuccess?: (type: RefreshDataType, data: any) => void;
  onError?: (type: RefreshDataType, error: Error) => void;
}

// Global refresh state manager
class RefreshManager {
  private refreshKeys: RefreshKeys = {
    employee_data: 0,
    organizational_mappings: 0,
    performance_scores: 0,
    upload_sessions: 0,
    manual_scores: 0,
    all: 0
  };

  private operations = new Map<RefreshDataType, RefreshOperation>();
  private timeouts = new Map<RefreshDataType, NodeJS.Timeout>();
  private lastRefreshTimes = new Map<RefreshDataType, number>();
  private listeners = new Set<() => void>();

  // Subscribe to refresh key changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Get current refresh keys
  getRefreshKeys(): RefreshKeys {
    return { ...this.refreshKeys };
  }

  // Check if a specific type is currently refreshing
  isRefreshing(type: RefreshDataType): boolean {
    return this.operations.has(type);
  }

  // Get last refresh time for a type
  getLastRefreshTime(type: RefreshDataType): number | null {
    return this.lastRefreshTimes.get(type) || null;
  }

  // Cancel a specific refresh operation
  cancelRefresh(type: RefreshDataType) {
    const operation = this.operations.get(type);
    if (operation) {
      operation.abortController.abort();
      this.operations.delete(type);
    }

    const timeout = this.timeouts.get(type);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(type);
    }
  }

  // Cancel all refresh operations
  cancelAllRefresh() {
    this.operations.forEach((operation, type) => {
      operation.abortController.abort();
    });
    this.operations.clear();

    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }

  // Perform the actual refresh operation
  private async performRefresh(
    type: RefreshDataType,
    options: RefreshOptions = {}
  ): Promise<any> {
    const operationId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();

    try {
      // Cancel any existing operation of this type
      this.cancelRefresh(type);

      let refreshPromise: Promise<any>;

      // Execute the appropriate refresh operation based on type
      switch (type) {
        case 'employee_data':
          if (!options.sessionId) {
            throw new Error('Session ID required for employee data refresh');
          }
          refreshPromise = api.getEmployeeDataBySession(options.sessionId, abortController.signal);
          break;

        case 'organizational_mappings':
          refreshPromise = api.getEmployeeOrgLevelMapping();
          break;

        case 'performance_scores':
          if (!options.sessionId) {
            throw new Error('Session ID required for performance scores refresh');
          }
          // Get employee data and extract performance scores
          refreshPromise = api.getEmployeeDataBySession(options.sessionId, abortController.signal)
            .then(employees => employees.map(emp => ({
              name: emp.name,
              performance: emp.performance || [],
              overallScore: emp.overallScore
            })));
          break;

        case 'upload_sessions':
          refreshPromise = api.getAllUploadSessions();
          break;

        case 'manual_scores':
          refreshPromise = api.getManualLeadershipScores();
          break;

        case 'all':
          if (!options.sessionId) {
            throw new Error('Session ID required for full refresh');
          }
          // Refresh all data types
          refreshPromise = Promise.all([
            api.getEmployeeDataBySession(options.sessionId, abortController.signal),
            api.getEmployeeOrgLevelMapping(),
            api.getAllUploadSessions(),
            api.getManualLeadershipScores()
          ]).then(([employees, orgMapping, sessions, manualScores]) => ({
            employees,
            orgMapping,
            sessions,
            manualScores
          }));
          break;

        default:
          throw new Error(`Unknown refresh type: ${type}`);
      }

      // Track the operation
      const operation: RefreshOperation = {
        id: operationId,
        type,
        timestamp: Date.now(),
        abortController,
        promise: refreshPromise
      };
      this.operations.set(type, operation);

      // Execute the refresh
      const result = await refreshPromise;

      // Update refresh key and timestamp if not aborted
      if (!abortController.signal.aborted) {
        this.refreshKeys[type] = this.refreshKeys[type] + 1;
        this.lastRefreshTimes.set(type, Date.now());
        
        // Also update 'all' key for any individual refresh
        if (type !== 'all') {
          this.refreshKeys.all = this.refreshKeys.all + 1;
        }

        // Call success callback
        if (options.onSuccess) {
          options.onSuccess(type, result);
        }

        this.notify();
      }

      return result;
    } catch (error) {
      // Only handle error if not aborted
      if (!abortController.signal.aborted) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (options.onError) {
          options.onError(type, errorObj);
        }
        
        throw errorObj;
      }
    } finally {
      // Clean up operation tracking
      this.operations.delete(type);
    }
  }

  // Public refresh method with debouncing
  async refresh(
    type: RefreshDataType,
    options: RefreshOptions = {}
  ): Promise<void> {
    const { debounceMs = 300, force = false } = options;

    // Clear existing timeout for this type
    const existingTimeout = this.timeouts.get(type);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (force) {
      // Execute immediately without debouncing
      return this.performRefresh(type, options);
    }

    // Set up debounced execution
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          await this.performRefresh(type, options);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.timeouts.delete(type);
        }
      }, debounceMs);

      this.timeouts.set(type, timeout);
    });
  }

  // Refresh multiple types
  async refreshMultiple(
    types: RefreshDataType[],
    options: RefreshOptions = {}
  ): Promise<void> {
    const promises = types.map(type => this.refresh(type, options));
    await Promise.all(promises);
  }
}

// Global refresh manager instance
const refreshManager = new RefreshManager();

// React hook for granular refresh functionality
export function useGranularRefresh(): UseGranularRefreshReturn {
  const [refreshKeys, setRefreshKeys] = useState<RefreshKeys>(() => 
    refreshManager.getRefreshKeys()
  );

  // Subscribe to refresh manager updates
  useEffect(() => {
    const unsubscribe = refreshManager.subscribe(() => {
      setRefreshKeys(refreshManager.getRefreshKeys());
    });

    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      refreshManager.cancelAllRefresh();
    };
  }, []);

  const isRefreshing = useCallback((type: RefreshDataType) => {
    return refreshManager.isRefreshing(type);
  }, []);

  const refresh = useCallback(async (
    type: RefreshDataType,
    options?: RefreshOptions
  ) => {
    return refreshManager.refresh(type, options);
  }, []);

  const refreshMultiple = useCallback(async (
    types: RefreshDataType[],
    options?: RefreshOptions
  ) => {
    return refreshManager.refreshMultiple(types, options);
  }, []);

  const cancelRefresh = useCallback((type: RefreshDataType) => {
    refreshManager.cancelRefresh(type);
  }, []);

  const cancelAllRefresh = useCallback(() => {
    refreshManager.cancelAllRefresh();
  }, []);

  const getLastRefreshTime = useCallback((type: RefreshDataType) => {
    return refreshManager.getLastRefreshTime(type);
  }, []);

  return {
    refreshKeys,
    isRefreshing,
    refresh,
    refreshMultiple,
    cancelRefresh,
    cancelAllRefresh,
    getLastRefreshTime
  };
}

// Export the refresh manager for direct access if needed
export { refreshManager };

// Utility function to determine which refresh types are needed based on data changes
export function getRequiredRefreshTypes(changeType: string): RefreshDataType[] {
  switch (changeType) {
    case 'employee_added':
    case 'employee_updated':
    case 'employee_deleted':
      return ['employee_data', 'organizational_mappings'];
    
    case 'performance_updated':
    case 'competency_scores_changed':
      return ['performance_scores'];
    
    case 'organizational_structure_changed':
    case 'position_updated':
      return ['organizational_mappings', 'employee_data'];
    
    case 'session_created':
    case 'session_deleted':
      return ['upload_sessions'];
    
    case 'manual_leadership_score_updated':
      return ['manual_scores'];
    
    case 'bulk_import':
    case 'data_migration':
      return ['all'];
    
    default:
      return ['all'];
  }
}