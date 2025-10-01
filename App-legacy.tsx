
import React, { useCallback, useEffect, useState } from 'react';
import { Employee } from './types';
import { sessionApi, employeeApi, apiClientFactory, UploadSession } from './services/api';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import ErrorDisplay from './components/shared/ErrorDisplay';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import EmptyState from './components/shared/EmptyState';
import Sidebar from './components/layout/Sidebar';
import DashboardOverview from './components/dashboard/DashboardOverview';
import EmployeeAnalytics from './components/employees/EmployeeAnalytics';
import RekapKinerja from './components/dashboard/RekapKinerja';
import DataManagement from './components/data/DataManagement';
import TableView from './components/dashboard/TableView';
import EmployeeManagement from './components/employees/EmployeeManagement';
import Report from './components/reporting/Report';
import { IconSparkles } from './components/shared/Icons';
import { useAppState } from './hooks/useAppState';
import { LAYOUT_SPACING } from './constants/ui';
import { logger } from './services/logger';

interface PerformanceTracker {
  id: string;
  label: string;
  startMark: string;
  context?: Record<string, unknown> | undefined;
}

const hasPerformanceApi = typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.measure === 'function';

// Constants for view names
const VIEW_NAMES = {
  EMPLOYEE_MANAGEMENT: 'employee-management',
  DATA: 'data',
  OVERVIEW: 'overview'
} as const;

const createPerformanceTracker = (label: string, context?: Record<string, unknown>): PerformanceTracker | null => {
  if (!hasPerformanceApi) {
    logger.performance(`${label} tracking unavailable`, { reason: 'Performance API missing', ...context });
    return null;
  }

  const id = `${label}-${Date.now()}`;
  const startMark = `${id}-start`;

  try {
    performance.mark(startMark);
    logger.performance(`${label} started`, { trackerId: id, ...context });
    return { id, label, startMark, context };
  } catch (error) {
    logger.warn(`${label} mark start failed`, { error, label, trackerId: id }, 'Performance');
    return null;
  }
};

const completePerformanceTracker = (
  tracker: PerformanceTracker | null,
  status: 'success' | 'error',
  extraContext?: Record<string, unknown>
) => {
  if (!tracker || !hasPerformanceApi) {
    return;
  }

  const endMark = `${tracker.id}-end`;
  const measureName = `${tracker.id}-measure`;

  try {
    performance.mark(endMark);
    performance.measure(measureName, tracker.startMark, endMark);
    const entry = performance.getEntriesByName(measureName).pop();
    const duration = entry?.duration ?? 0;

    logger.performance(`${tracker.label} ${status}`, {
      trackerId: tracker.id,
      durationMs: Math.round(duration),
      status,
      ...tracker.context,
      ...extraContext
    });
  } catch (error) {
    logger.warn(`${tracker.label} measurement failed`, { error, trackerId: tracker.id }, 'Performance');
  } finally {
    performance.clearMarks(tracker.startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  }
};

interface RefreshOptions {
  tracker?: PerformanceTracker | null;
  targetSessionId?: string;
}

const AppContent: React.FC = () => {
  // Use centralized state management
  const {
    employeeData,
    organizationalMappings,
    selectedSessionId,
    activeView,
    isLoading,
    pendingSaves,
    savingStatus,
    isDatasetSwitching,
    datasets,
    setEmployeeData,
    setUploadSessions,
    setOrganizationalMappings,
    setSelectedSessionId,
    setActiveView,
    setLoading,
    addPendingSave,
    removePendingSave,
    setSavingStatus,
    setDatasetSwitching,
  } = useAppState();
  
  // Local state for master employees (used in EmployeeManagement)
  const [masterEmployees, setMasterEmployees] = useState<Employee[]>([]);
  
  const { showError } = useError();
  

  const handleDataUpdate = useCallback(async (newEmployeeData: Employee[], sessionName?: string) => {
    setEmployeeData(newEmployeeData);
    
    // Generate unique save operation ID
    const saveOperationId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track this save operation
    addPendingSave(saveOperationId);
    setSavingStatus('saving');
    
    // Auto-save to database using new unified API
    try {
      const sessionId = await sessionApi.saveEmployeeData(newEmployeeData, sessionName);
      setSelectedSessionId(sessionId);
      setSavingStatus('saved');
      
      // Reload upload sessions after data update
      try {
        const sessions = await sessionApi.getAllUploadSessions();
        setUploadSessions(sessions);
      } catch (error) {
        showError(error, {
          component: 'App',
          operation: 'refresh_upload_sessions',
          sessionId
        });
      }
      
      // Auto-reset saving status after 2 seconds
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      showError(error, { 
        component: 'App',
        operation: 'handleDataUpdate',
        dataLength: newEmployeeData.length,
        sessionName 
      });
      setSavingStatus('error');
    } finally {
      // Remove from pending saves
      removePendingSave(saveOperationId);
    }
    
    if (newEmployeeData.length > 0 && activeView === 'data') {
      setActiveView('overview');
    }
  }, [activeView, showError, setEmployeeData, setSelectedSessionId, setSavingStatus, setUploadSessions, addPendingSave, removePendingSave, setActiveView]);

  // Helper function to refresh employee data
  const refreshEmployeeDataCore = useCallback(async (targetSessionId: string, isDatasetSwitch: boolean, tracker: PerformanceTracker | null, refreshErrors: Array<{ type: string; error: unknown }>) => {
    try {
      const employeeData = await sessionApi.getEmployeeDataBySession(targetSessionId);
      setEmployeeData(employeeData);

      // Validate that performance data was loaded
      const employeesWithPerformance = employeeData.filter((emp: Employee) => emp.performance && emp.performance.length > 0);
      logger.performance('Employee data refreshed', {
        trackerId: tracker?.id,
        sessionId: targetSessionId,
        employees: employeeData.length,
        withPerformance: employeesWithPerformance.length,
        isDatasetSwitch
      });
    } catch (error) {
      showError(error, {
        component: 'App',
        operation: 'refreshEmployeeData',
        selectedSessionId: targetSessionId
      });
      refreshErrors.push({ type: 'employee_data', error });
    }
  }, [showError, setEmployeeData]);

  // Helper function to refresh organizational mappings
  const refreshOrganizationalMappingsCore = useCallback(async (targetSessionId: string, refreshErrors: Array<{ type: string; error: unknown }>) => {
    try {
      const data = await employeeApi.getEmployeeOrgLevelMapping();
      setOrganizationalMappings(data);
    } catch (error) {
      showError(error, {
        component: 'App',
        operation: 'refreshOrganizationalMappings',
        selectedSessionId: targetSessionId
      });
      refreshErrors.push({ type: 'organizational_mappings', error });
    }
  }, [showError, setOrganizationalMappings]);

  // Helper function to refresh master employees
  const refreshMasterEmployees = useCallback(async () => {
    try {
      const employees = await employeeApi.getAllEmployees();
      setMasterEmployees(employees);
    } catch (error) {
      showError(error, {
        component: 'App',
        operation: 'refresh_master_employees'
      });
    }
  }, [showError]);

  // Helper function to complete performance tracker
  const completeTracker = useCallback((tracker: PerformanceTracker, refreshErrors: Array<{ type: string; error: unknown }>, targetSessionId: string, isDatasetSwitch: boolean) => {
    if (refreshErrors.length > 0) {
      const [firstError] = refreshErrors;
      completePerformanceTracker(tracker, 'error', {
        sessionId: targetSessionId,
        refreshTypes: refreshErrors.map((item) => item.type),
        reason: firstError?.error instanceof Error ? firstError.error.message : String(firstError?.error)
      });
    } else {
      completePerformanceTracker(tracker, 'success', {
        sessionId: targetSessionId,
        refreshTypes: isDatasetSwitch ? ['employee_data', 'organizational_mappings'] : ['employee_data']
      });
    }
  }, []);

  // Enhanced refresh function using granular refresh system
  const refreshEmployeeData = useCallback(async (isDatasetSwitch = false, options?: RefreshOptions) => {
    const targetSessionId = options?.targetSessionId ?? selectedSessionId;
    if (!targetSessionId) return;

    const tracker = isDatasetSwitch
      ? options?.tracker ?? createPerformanceTracker('dataset-switch', {
        sessionId: targetSessionId,
        previousSessionId: selectedSessionId
      })
      : options?.tracker ?? null;
    const refreshErrors: Array<{ type: string; error: unknown }> = [];
    let trackerCompleted = false;

    try {
      setLoading(true);
      if (isDatasetSwitch) {
        setDatasetSwitching(true);
      }

      // Refresh employee data
      await refreshEmployeeDataCore(targetSessionId, isDatasetSwitch, tracker, refreshErrors);

      // Also refresh organizational mappings if this is a dataset switch
      if (isDatasetSwitch) {
        await refreshOrganizationalMappingsCore(targetSessionId, refreshErrors);
      }

      // Complete tracker if present
      if (tracker && !trackerCompleted) {
        completeTracker(tracker, refreshErrors, targetSessionId, isDatasetSwitch);
        trackerCompleted = true;
      }
    } catch (error) {
      showError(error, {
        component: 'App',
        operation: 'refreshEmployeeData',
        selectedSessionId: targetSessionId
      });
      if (tracker && !trackerCompleted) {
        completePerformanceTracker(tracker, 'error', {
          sessionId: targetSessionId,
          reason: error instanceof Error ? error.message : String(error)
        });
        trackerCompleted = true;
      }
    } finally {
      setLoading(false);
      setDatasetSwitching(false);
    }
  }, [selectedSessionId, refreshEmployeeDataCore, refreshOrganizationalMappingsCore, completeTracker, showError, setLoading, setDatasetSwitching]);

  // Handle dataset selection changes
  const handleDatasetChange = useCallback(async (sessionId: string) => {
    if (sessionId === selectedSessionId) return;

    setSelectedSessionId(sessionId);
    const tracker = createPerformanceTracker('dataset-switch', {
      sessionId,
      previousSessionId: selectedSessionId
    });
    await refreshEmployeeData(true, { tracker, targetSessionId: sessionId });
  }, [selectedSessionId, refreshEmployeeData, setSelectedSessionId]);

  // Load data on app start
  useEffect(() => {
    const initializeApp = async () => {
      const tracker = createPerformanceTracker('initial-load');
      let sessionCount = 0;
      let initialSessionId: string | undefined;
      let sessionLoadError: unknown = null;

      try {
        // Check if API server is running (retry up to 5 times)
        let isHealthy = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          isHealthy = await apiClientFactory.checkHealth();
          if (isHealthy) break;
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!isHealthy) {
          showError(new Error('Server API tidak berjalan. Silakan jalankan server backend.'), {
            component: 'App',
            operation: 'initializeApp',
            healthCheck: 'failed'
          });
          completePerformanceTracker(tracker, 'error', {
            reason: 'health-check-failed'
          });
          setLoading(false);
          return;
        }

        // Load master employees first (needed for Dashboard Overview)
        try {
          const masterEmployeeData = await employeeApi.getAllEmployees();
          setMasterEmployees(masterEmployeeData);
        } catch (error) {
          showError(error, {
            component: 'App',
            operation: 'initializeApp_masterEmployees'
          });
        }

        // Load upload sessions
        try {
          const uploadSessions = await sessionApi.getAllUploadSessions();
          setUploadSessions(uploadSessions);
          sessionCount = uploadSessions.length;
          
          // Load most recent session data if any
          if (uploadSessions.length > 0) {
            const latest = uploadSessions.sort((a: UploadSession, b: UploadSession) => 
              new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()
            )[0];
            setSelectedSessionId(latest.session_id);
            initialSessionId = latest.session_id;
            
            // Load employee data for the latest session
            try {
              const employeeData = await sessionApi.getEmployeeDataBySession(latest.session_id);
              setEmployeeData(employeeData);
            } catch (error) {
              showError(error, {
                component: 'App',
                operation: 'initializeApp_employeeData',
                sessionId: latest.session_id
              });
            }
            
            // Also load organizational mappings
            try {
              const mappings = await employeeApi.getEmployeeOrgLevelMapping();
              setOrganizationalMappings(mappings);
            } catch (error) {
              showError(error, {
                component: 'App',
                operation: 'initializeApp_orgMappings'
              });
            }
          } else {
            // No sessions yet, start with empty data
            setEmployeeData([]);
          }
        } catch (error) {
          showError(error, {
            component: 'App',
            operation: 'initializeApp_sessions'
          });
          sessionLoadError = error;
        }

        if (sessionLoadError) {
          completePerformanceTracker(tracker, 'error', {
            reason: sessionLoadError instanceof Error ? sessionLoadError.message : String(sessionLoadError)
          });
        } else {
          completePerformanceTracker(tracker, 'success', {
            sessionCount,
            initialSessionId: initialSessionId ?? null,
            hasSessions: sessionCount > 0
          });
        }
      } catch (error) {
        showError(error, { 
          component: 'App',
          operation: 'initializeApp' 
        });
        completePerformanceTracker(tracker, 'error', {
          reason: error instanceof Error ? error.message : String(error)
        });
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, [showError, setUploadSessions, setSelectedSessionId, setEmployeeData, setOrganizationalMappings, setLoading]);

  // Load master employees when switching to employee management or overview view
  useEffect(() => {
    if (activeView === VIEW_NAMES.EMPLOYEE_MANAGEMENT || activeView === 'overview') {
      refreshMasterEmployees();
    }
  }, [activeView, refreshMasterEmployees]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <IconSparkles className="w-16 h-16 mx-auto text-blue-500 animate-pulse mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">Memuat Dashboard Penilaian Kinerja Pegawai Dinas Sosial...</p>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <ErrorBoundary>
            <DashboardOverview 
              employees={masterEmployees}
              organizationalMappings={organizationalMappings}
              onNavigateToDataManagement={() => setActiveView('data')}
            />
          </ErrorBoundary>
        );
      case 'analytics':
        return (
          <ErrorBoundary>
            <EmployeeAnalytics 
              employees={employeeData}
            />
          </ErrorBoundary>
        );
      case 'rekap-kinerja':
        return (
          <ErrorBoundary>
            <RekapKinerja 
              employees={employeeData}
            />
          </ErrorBoundary>
        );
      case 'employees':
        return (
          <EmployeeAnalytics 
            employees={employeeData}
          />
        );
      case 'report':
        return (
          <Report 
            employees={employeeData}
          />
        );
      case 'table':
        return (
          <TableView 
            employees={employeeData}
          />
        );
      case VIEW_NAMES.EMPLOYEE_MANAGEMENT:
        return (
          <EmployeeManagement 
            employees={masterEmployees}
            onEmployeeUpdate={async () => {
              // Refresh master employee data and organizational mappings when employees are updated
              try {
                await refreshMasterEmployees();
                const mappings = await employeeApi.getEmployeeOrgLevelMapping();
                setOrganizationalMappings(mappings);
              } catch (error) {
                showError(error, {
                  component: 'App',
                  operation: 'onEmployeeUpdate'
                });
              }
            }}
          />
        );
      case 'data':
        return (
          <ErrorBoundary>
            <DataManagement 
              employees={employeeData} 
              onDataUpdate={handleDataUpdate} 
              pendingSaves={pendingSaves}
              savingStatus={savingStatus}
              selectedSessionId={selectedSessionId}
            />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <DashboardOverview 
              employees={masterEmployees}
              organizationalMappings={organizationalMappings}
              onNavigateToDataManagement={() => setActiveView('data')}
            />
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar 
          datasets={datasets} 
          selectedDatasetId={selectedSessionId} 
          onDatasetChange={handleDatasetChange}
          activeView={activeView} 
          onViewChange={setActiveView} 
          isDatasetSwitching={isDatasetSwitching} 
        />
        
        <main className="flex-1 overflow-auto relative">
          {/* Dataset switching loading overlay */}
          {isDatasetSwitching && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Mengganti Dataset</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Memuat data pegawai...</p>
              </div>
            </div>
          )}
          
          <div style={{ padding: LAYOUT_SPACING.PAGE_PADDING }}>
            <div style={{ marginBottom: LAYOUT_SPACING.COMPONENT_GAP }}>
              <ErrorDisplay />
            </div>
            {masterEmployees.length === 0 && activeView !== VIEW_NAMES.DATA && activeView !== VIEW_NAMES.EMPLOYEE_MANAGEMENT ? (
              <EmptyState onNavigateToManagement={() => setActiveView(VIEW_NAMES.EMPLOYEE_MANAGEMENT)} />
            ) : (
              renderActiveView()
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorProvider>
      <AppContent />
    </ErrorProvider>
  );
};

export default App;
