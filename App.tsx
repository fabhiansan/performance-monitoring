
import React, { useState, useCallback, useEffect } from 'react';
import { Employee } from './types';
import { api, UploadSession } from './services/api';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import EmployeeAnalytics from './components/EmployeeAnalytics';
import RekapKinerja from './components/RekapKinerja';
import DataManagement from './components/DataManagement';
import TableView from './components/TableView';
import EmployeeManagement from './components/EmployeeManagement';
import Report from './components/Report';
import { IconSparkles } from './components/Icons';

const App: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<Employee[]>([]);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  // Map upload sessions to Dataset-like objects expected by Sidebar
  const datasets = React.useMemo(() => uploadSessions.map(sess => ({ id: sess.session_id, name: sess.session_name })), [uploadSessions]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeView, setActiveView] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  

  const handleDataUpdate = useCallback(async (newEmployeeData: Employee[], sessionName?: string) => {
    setEmployeeData(newEmployeeData);
    // Auto-save to database using new unified API
    try {
      const sessionId = await api.saveEmployeeData(newEmployeeData, sessionName);
      setSelectedSessionId(sessionId);
      // Refresh upload sessions list
      const sessions = await api.getAllUploadSessions();
      setUploadSessions(sessions);
      setApiError(null);
    } catch (error) {
      console.error('Failed to save data:', error);
      setApiError('Failed to save data to database');
    }
    if (newEmployeeData.length > 0 && activeView === 'data') {
      setActiveView('overview');
    }
  }, [activeView]);

  const refreshEmployeeData = useCallback(async () => {
    try {
      if (selectedSessionId) {
        const employeeData = await api.getEmployeeDataBySession(selectedSessionId);
        setEmployeeData(employeeData);
        
      }
    } catch (error) {
      console.error('Failed to refresh employee data:', error);
    }
  }, [selectedSessionId]);

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
          setApiError('API server is not running. Please start the backend server.');
          setIsLoading(false);
          return;
        }

        
        // Load upload sessions list
        const sessions = await api.getAllUploadSessions();
        setUploadSessions(sessions);
        // Load most recent session data if any
        if (sessions.length > 0) {
          const latest = sessions.sort((a,b)=> new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime())[0];
          setSelectedSessionId(latest.session_id);
          const employeeData = await api.getEmployeeDataBySession(latest.session_id);
          setEmployeeData(employeeData);
        } else {
          // No sessions yet, start with empty data
          setEmployeeData([]);
        }

        
        setApiError(null);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setApiError('Failed to connect to database. Please check if the backend server is running.');
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, []);

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
        return <DashboardOverview employees={employeeData} />;
      case 'analytics':
        return <EmployeeAnalytics employees={employeeData} />;
      case 'rekap-kinerja':
        return <RekapKinerja employees={employeeData} />;
      case 'employees':
        return <EmployeeAnalytics employees={employeeData} />;
      case 'report':
        return <Report employees={employeeData} />;
      case 'table':
        return <TableView employees={employeeData} />;
      case 'employee-management':
        return <EmployeeManagement onEmployeeUpdate={refreshEmployeeData} />;
      case 'data':
        return <DataManagement employees={employeeData} onDataUpdate={handleDataUpdate} />;
      default:
        return <DashboardOverview employees={employeeData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar datasets={datasets} selectedDatasetId={selectedSessionId} onDatasetChange={async (id: string) => { setSelectedSessionId(id); /* fetch data for session */ const emp = await api.getEmployeeDataBySession(id); setEmployeeData(emp); }} activeView={activeView} onViewChange={setActiveView} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {apiError && (
              <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6" role="alert">
                <p className="font-bold">Database Connection Error</p>
                <p>{apiError}</p>
                <p className="text-sm mt-2">To start the backend server, run: <code className="bg-red-200 dark:bg-red-800 px-1 rounded">node server/server.js</code></p>
              </div>
            )}
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

export default App;
