import React, { useCallback, useReducer } from 'react';
import { Employee } from '../types';
import { UploadSession } from '../services/api';

// Define the app state interface
interface AppState {
  employeeData: Employee[];
  uploadSessions: UploadSession[];
  organizationalMappings: Record<string, string>;
  manualScores: Record<string, number>;
  selectedSessionId: string;
  activeView: string;
  isLoading: boolean;
  pendingSaves: Set<string>;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDatasetSwitching: boolean;
}

// Define action types
type AppAction = 
  | { type: 'SET_EMPLOYEE_DATA'; payload: Employee[] }
  | { type: 'SET_UPLOAD_SESSIONS'; payload: UploadSession[] }
  | { type: 'SET_ORGANIZATIONAL_MAPPINGS'; payload: Record<string, string> }
  | { type: 'SET_MANUAL_SCORES'; payload: Record<string, number> }
  | { type: 'SET_SELECTED_SESSION_ID'; payload: string }
  | { type: 'SET_ACTIVE_VIEW'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_PENDING_SAVE'; payload: string }
  | { type: 'REMOVE_PENDING_SAVE'; payload: string }
  | { type: 'SET_SAVING_STATUS'; payload: AppState['savingStatus'] }
  | { type: 'SET_DATASET_SWITCHING'; payload: boolean }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  employeeData: [],
  uploadSessions: [],
  organizationalMappings: {},
  manualScores: {},
  selectedSessionId: '',
  activeView: 'overview',
  isLoading: true,
  pendingSaves: new Set(),
  savingStatus: 'idle',
  isDatasetSwitching: false,
};

// Reducer function
const appStateReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_EMPLOYEE_DATA':
      return { ...state, employeeData: action.payload };
    
    case 'SET_UPLOAD_SESSIONS':
      return { ...state, uploadSessions: action.payload };
    
    case 'SET_ORGANIZATIONAL_MAPPINGS':
      return { ...state, organizationalMappings: action.payload };
    
    case 'SET_MANUAL_SCORES':
      return { ...state, manualScores: action.payload };
    
    case 'SET_SELECTED_SESSION_ID':
      return { ...state, selectedSessionId: action.payload };
    
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'ADD_PENDING_SAVE':
      return {
        ...state,
        pendingSaves: new Set(state.pendingSaves).add(action.payload),
      };
    
    case 'REMOVE_PENDING_SAVE': {
      const newPendingSaves = new Set(state.pendingSaves);
      newPendingSaves.delete(action.payload);
      return { ...state, pendingSaves: newPendingSaves };
    }
    
    case 'SET_SAVING_STATUS':
      return { ...state, savingStatus: action.payload };
    
    case 'SET_DATASET_SWITCHING':
      return { ...state, isDatasetSwitching: action.payload };
    
    case 'RESET_STATE':
      return { ...initialState, isLoading: false };
    
    default:
      return state;
  }
};

// Custom hook
export const useAppState = () => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Computed values
  const datasets = React.useMemo(
    () => state.uploadSessions.map(sess => ({ 
      id: sess.session_id, 
      name: sess.session_name 
    })), 
    [state.uploadSessions]
  );

  // Action creators
  const setEmployeeData = useCallback((data: Employee[]) => {
    dispatch({ type: 'SET_EMPLOYEE_DATA', payload: data });
  }, []);

  const setUploadSessions = useCallback((sessions: UploadSession[]) => {
    dispatch({ type: 'SET_UPLOAD_SESSIONS', payload: sessions });
  }, []);

  const setOrganizationalMappings = useCallback((mappings: Record<string, string>) => {
    dispatch({ type: 'SET_ORGANIZATIONAL_MAPPINGS', payload: mappings });
  }, []);

  const setManualScores = useCallback((scores: Record<string, number>) => {
    dispatch({ type: 'SET_MANUAL_SCORES', payload: scores });
  }, []);

  const setSelectedSessionId = useCallback((id: string) => {
    dispatch({ type: 'SET_SELECTED_SESSION_ID', payload: id });
  }, []);

  const setActiveView = useCallback((view: string) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const addPendingSave = useCallback((saveId: string) => {
    dispatch({ type: 'ADD_PENDING_SAVE', payload: saveId });
  }, []);

  const removePendingSave = useCallback((saveId: string) => {
    dispatch({ type: 'REMOVE_PENDING_SAVE', payload: saveId });
  }, []);

  const setSavingStatus = useCallback((status: AppState['savingStatus']) => {
    dispatch({ type: 'SET_SAVING_STATUS', payload: status });
  }, []);

  const setDatasetSwitching = useCallback((switching: boolean) => {
    dispatch({ type: 'SET_DATASET_SWITCHING', payload: switching });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  return {
    // State
    ...state,
    datasets,
    
    // Actions
    setEmployeeData,
    setUploadSessions,
    setOrganizationalMappings,
    setManualScores,
    setSelectedSessionId,
    setActiveView,
    setLoading,
    addPendingSave,
    removePendingSave,
    setSavingStatus,
    setDatasetSwitching,
    resetState,
  };
};