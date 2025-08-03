
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Employee } from './types';
import { api, UploadSession } from './services/api';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import { useGranularRefresh, getRequiredRefreshTypes } from './services/refreshService';
import ErrorDisplay from './components/ErrorDisplay';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import EmployeeAnalytics from './components/EmployeeAnalytics';
import RekapKinerja from './components/RekapKinerja';
import DataManagement from './components/DataManagement';
import TableView from './components/TableView';
import EmployeeManagement from './components/EmployeeManagement';
import Report from './components/Report';
import { IconSparkles } from './components/Icons';

const AppContent: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<Employee[]>([]);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [organizationalMappings, setOrganizationalMappings] = useState<Record<string, string>>({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  
  // Map upload sessions to Dataset-like objects expected by Sidebar
  const datasets = React.useMemo(() => uploadSessions.map(sess => ({ id: sess.session_id, name: sess.session_name })), [uploadSessions]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeView, setActiveView] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDatasetSwitching, setIsDatasetSwitching] = useState(false);
  
  // Use granular refresh system
  const {
    refreshKeys,
    isRefreshing,
    refresh,
    refreshMultiple,
    cancelAllRefresh
  } = useGranularRefresh();
  
  const { showError, clearAllErrors } = useError();
  

  const handleDataUpdate = useCallback(async (newEmployeeData: Employee[], sessionName?: string) => {
    setEmployeeData(newEmployeeData);
    
    // Generate unique save operation ID
    const saveOperationId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track this save operation
    setPendingSaves(prev => new Set(prev).add(saveOperationId));
    setSavingStatus('saving');
    
    // Auto-save to database using new unified API
    try {
      const sessionId = await api.saveEmployeeData(newEmployeeData, sessionName);
      setSelectedSessionId(sessionId);
      setSavingStatus('saved');
      
      // Use granular refresh to update specific data types
      const refreshTypes = getRequiredRefreshTypes('bulk_import');
      await refreshMultiple(refreshTypes, {
        sessionId,
        force: true, // Skip debouncing for immediate update
        onSuccess: (type, data) => {
          switch (type) {
            case 'upload_sessions':
              setUploadSessions(data);
              break;
            case 'organizational_mappings':
              setOrganizationalMappings(data);
              break;
            case 'manual_scores':
              setManualScores(data);
              break;
          }
        },
        onError: (type, error) => {
          showError(error, {
            component: 'App',
            operation: `refresh_${type}`,
            sessionId
          });
        }
      });
      
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
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(saveOperationId);
        return newSet;
      });
    }
    
    if (newEmployeeData.length > 0 && activeView === 'data') {
      setActiveView('overview');
    }
  }, [activeView, showError, refreshMultiple]);

  // Enhanced refresh function using granular refresh system
  const refreshEmployeeData = useCallback(async (isDatasetSwitch = false) => {
    if (!selectedSessionId) return;
    
    try {
      setIsLoading(true);
      if (isDatasetSwitch) {
        setIsDatasetSwitching(true);
      }
      
      // Refresh employee data and related information
      await refresh('employee_data', {
        sessionId: selectedSessionId,
        debounceMs: isDatasetSwitch ? 100 : 300,
        onSuccess: (type, data) => {
          setEmployeeData(data);
          
          // Validate that performance data was loaded
          const employeesWithPerformance = data.filter((emp: Employee) => emp.performance && emp.performance.length > 0);
          console.log(`✅ Refreshed data: ${data.length} employees, ${employeesWithPerformance.length} with performance data`);
        },
        onError: (type, error) => {
          showError(error, {
            component: 'App',
            operation: 'refreshEmployeeData',
            selectedSessionId,
            refreshType: type
          });
        }
      });
      
      // Also refresh organizational mappings if this is a dataset switch
      if (isDatasetSwitch) {
        await refresh('organizational_mappings', {
          onSuccess: (type, data) => {
            setOrganizationalMappings(data);
          },
          onError: (type, error) => {
            showError(error, {
              component: 'App',
              operation: 'refreshOrganizationalMappings',
              selectedSessionId,
              refreshType: type
            });
          }
        });
      }
    } catch (error) {
      showError(error, {
        component: 'App',
        operation: 'refreshEmployeeData',
        selectedSessionId
      });
    } finally {
      setIsLoading(false);
      setIsDatasetSwitching(false);
    }
  }, [selectedSessionId, refresh, showError]);

  // Handle dataset selection changes
  const handleDatasetChange = useCallback(async (sessionId: string) => {
    if (sessionId === selectedSessionId) return;
    
    setSelectedSessionId(sessionId);
    await refreshEmployeeData(true); // isDatasetSwitch = true
  }, [selectedSessionId, refreshEmployeeData]);

  // Load data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if API server is running (retry up to 5 times)
        let isHealthy = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          isHealthy = await api.checkHealth();
          if (isHealthy) break;
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!isHealthy) {
          showError(new Error('API server is not running. Please start the backend server.'), {
            component: 'App',
            operation: 'initializeApp',
            healthCheck: 'failed'
          });
          setIsLoading(false);
          return;
        }

        // Load upload sessions using granular refresh
        await refresh('upload_sessions', {
          force: true,
          onSuccess: (type, sessions) => {
            setUploadSessions(sessions);
            
            // Load most recent session data if any
            if (sessions.length > 0) {
              const latest = sessions.sort((a: UploadSession, b: UploadSession) => 
                new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()
              )[0];
              setSelectedSessionId(latest.session_id);
              
              // Load employee data for the latest session
              refresh('employee_data', {
                sessionId: latest.session_id,
                force: true,
                onSuccess: (type, employeeData) => {
                  setEmployeeData(employeeData);
                },
                onError: (type, error) => {
                  showError(error, {
                    component: 'App',
                    operation: 'initializeApp_employeeData',
                    sessionId: latest.session_id
                  });
                }
              });
              
              // Also load organizational mappings
              refresh('organizational_mappings', {
                force: true,
                onSuccess: (type, mappings) => {
                  setOrganizationalMappings(mappings);
                },
                onError: (type, error) => {
                  showError(error, {
                    component: 'App',
                    operation: 'initializeApp_orgMappings'
                  });
                }
              });
            } else {
              // No sessions yet, start with empty data
              setEmployeeData([]);
            }
          },
          onError: (type, error) => {
            showError(error, {
              component: 'App',
              operation: 'initializeApp_sessions'
            });
          }
        });

      } catch (error) {
        showError(error, { 
          component: 'App',
          operation: 'initializeApp' 
        });
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [showError, refresh]);

  // Cleanup refresh operations on unmount
  useEffect(() => {
    return () => {
      cancelAllRefresh();
    };
  }, [cancelAllRefresh]);

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
          <DashboardOverview 
            key={`overview_${refreshKeys.employee_data}_${refreshKeys.organizational_mappings}`}
            employees={employeeData}
            organizationalMappings={organizationalMappings}
          />
        );
      case 'analytics':
        return (
          <EmployeeAnalytics 
            key={`analytics_${refreshKeys.employee_data}_${refreshKeys.performance_scores}`}
            employees={employeeData}
          />
        );
      case 'rekap-kinerja':
        return (
          <RekapKinerja 
            key={`rekap_${refreshKeys.employee_data}_${refreshKeys.performance_scores}`}
            employees={employeeData}
          />
        );
      case 'employees':
        return (
          <EmployeeAnalytics 
            key={`employees_${refreshKeys.employee_data}_${refreshKeys.performance_scores}`}
            employees={employeeData}
          />
        );
      case 'report':
        return (
          <Report 
            key={`report_${refreshKeys.employee_data}_${refreshKeys.performance_scores}`}
            employees={employeeData}
          />
        );
      case 'table':
        return (
          <TableView 
            key={`table_${refreshKeys.employee_data}_${refreshKeys.organizational_mappings}`}
            employees={employeeData}
          />
        );
      case 'employee-management':
        return (
          <EmployeeManagement 
            key={`mgmt_${refreshKeys.employee_data}`}
            onEmployeeUpdate={() => {
              // Refresh employee data and organizational mappings when employees are updated
              const refreshTypes = getRequiredRefreshTypes('employee_updated');
              refreshMultiple(refreshTypes, {
                sessionId: selectedSessionId,
                force: true,
                onSuccess: (type, data) => {
                  switch (type) {
                    case 'employee_data':
                      setEmployeeData(data);
                      break;
                    case 'organizational_mappings':
                      setOrganizationalMappings(data);
                      break;
                  }
                }
              });
            }}
          />
        );
      case 'data':
        return (
          <DataManagement 
            key={`data_${refreshKeys.upload_sessions}`}
            employees={employeeData} 
            onDataUpdate={handleDataUpdate} 
            pendingSaves={pendingSaves}
            savingStatus={savingStatus}
            selectedSessionId={selectedSessionId}
          />
        );
      default:
        return (
          <DashboardOverview 
            key={`default_${refreshKeys.employee_data}_${refreshKeys.organizational_mappings}`}
            employees={employeeData}
            organizationalMappings={organizationalMappings}
          />
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
          isDatasetSwitching={isDatasetSwitching || isRefreshing('employee_data')} 
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
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Switching Dataset</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Loading employee data...</p>
              </div>
            </div>
          )}
          
          <div className="p-8">
            <ErrorDisplay className="mb-6" />
            {employeeData.length === 0 && activeView !== 'data' && activeView !== 'employee-management' ? (
              <div className="text-center py-24">
                <div className="inline-block bg-gradient-to-r from-blue-500 to-teal-400 p-0.5 rounded-lg shadow-lg mb-6">
                   <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                      <IconSparkles className="w-16 h-16 mx-auto text-blue-500" />
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
                  Dashboard Penilaian Kinerja Pegawai Dinas Sosial
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                  Start by importing employee data, then add performance data for comprehensive analytics
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setActiveView('employee-management')}
                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-600 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-green-700 hover:to-blue-600 transform hover:scale-105 transition-all duration-300"
                  >
                    Import Employee Data
                  </button>
                  <button
                    onClick={() => setActiveView('data')}
                    className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-teal-600 transform hover:scale-105 transition-all duration-300"
                  >
                    Import Performance Data
                  </button>
                </div>
              </div>
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
