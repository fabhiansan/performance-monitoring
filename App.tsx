
import React, { useState, useCallback, useEffect } from 'react';
import { Employee } from './types';
import { api, UserProfile } from './services/api';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import EmployeeAnalytics from './components/EmployeeAnalytics';
import RekapKinerja from './components/RekapKinerja';
import DataManagement from './components/DataManagement';
import TableView from './components/TableView';
import UserProfileForm from './components/UserProfileForm';
import EmployeeManagement from './components/EmployeeManagement';
import { IconSparkles } from './components/Icons';

const App: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  const handleDataUpdate = useCallback(async (newEmployeeData: Employee[]) => {
    setEmployeeData(newEmployeeData);
    // Auto-save to database
    try {
      await api.saveCurrentDataset(newEmployeeData);
      setApiError(null);
    } catch (error) {
      console.error('Failed to save data:', error);
      setApiError('Failed to save data to database');
    }
    if (newEmployeeData.length > 0 && activeView === 'data') {
      setActiveView('overview');
    }
  }, [activeView]);

  const updateEmployeeSummary = useCallback(async (employeeName: string, summary: string) => {
    const updatedData = employeeData.map(emp =>
      emp.name === employeeName ? { ...emp, summary } : emp
    );
    setEmployeeData(updatedData);
    // Save summary to database
    try {
      await api.updateEmployeeSummary(employeeName, summary);
      setApiError(null);
    } catch (error) {
      console.error('Failed to save summary:', error);
      setApiError('Failed to save summary to database');
    }
  }, [employeeData]);

  const handleProfileSaved = useCallback(async (name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string) => {
    try {
      await api.saveUserProfile(name, nip, gol, pangkat, position, subPosition);
      const profile = await api.getUserProfile();
      setUserProfile(profile);
      setIsCheckingProfile(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }, []);

  // Load data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if API server is running
        const isHealthy = await api.checkHealth();
        if (!isHealthy) {
          setApiError('API server is not running. Please start the backend server.');
          setIsLoading(false);
          return;
        }

        // Try to load user profile (optional)
        try {
          const profile = await api.getUserProfile();
          if (profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          // User profile is optional, continue without it
          console.log('No user profile found, continuing without it');
        }
        
        // Load employee data
        const currentData = await api.getCurrentDataset();
        if (currentData.length > 0) {
          setEmployeeData(currentData);
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
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading Performance Dashboard...</p>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview employees={employeeData} />;
      case 'analytics':
        return <EmployeeAnalytics employees={employeeData} onSummaryGenerated={updateEmployeeSummary} />;
      case 'rekap-kinerja':
        return <RekapKinerja employees={employeeData} />;
      case 'employees':
        return <EmployeeAnalytics employees={employeeData} onSummaryGenerated={updateEmployeeSummary} />;
      case 'table':
        return <TableView employees={employeeData} />;
      case 'employee-management':
        return <EmployeeManagement />;
      case 'data':
        return <DataManagement employees={employeeData} onDataUpdate={handleDataUpdate} />;
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                User Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your profile information
              </p>
            </div>
            {userProfile ? (
              <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Current Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIP</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.nip}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Golongan</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.gol}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pangkat</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.pangkat}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sub-Jabatan</label>
                    <p className="text-gray-900 dark:text-white">{userProfile.sub_position}</p>
                  </div>
                </div>
              </div>
            ) : (
              <UserProfileForm onProfileSaved={handleProfileSaved} />
            )}
          </div>
        );
      default:
        return <DashboardOverview employees={employeeData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <div className="flex h-screen">
        <Sidebar activeView={activeView} onViewChange={setActiveView} userProfile={userProfile} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {apiError && (
              <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6" role="alert">
                <p className="font-bold">Database Connection Error</p>
                <p>{apiError}</p>
                <p className="text-sm mt-2">To start the backend server, run: <code className="bg-red-200 dark:bg-red-800 px-1 rounded">node server/server.js</code></p>
              </div>
            )}
            {employeeData.length === 0 && activeView !== 'data' ? (
              <div className="text-center py-24">
                <div className="inline-block bg-gradient-to-r from-blue-500 to-teal-400 p-0.5 rounded-lg shadow-lg mb-6">
                   <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                      <IconSparkles className="w-16 h-16 mx-auto text-blue-500" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
                  Performance Dashboard
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                  Import your CSV data to get started with comprehensive performance analytics
                </p>
                <button
                  onClick={() => setActiveView('data')}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-teal-600 transform hover:scale-105 transition-all duration-300"
                >
                  Import Data
                </button>
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
