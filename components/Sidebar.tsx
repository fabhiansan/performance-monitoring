import React from 'react';
import { IconDashboard, IconChartBar, IconUsers, IconCog, IconTable, IconUser, IconCalculator } from './Icons';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userProfile?: { name: string; nip: string; gol: string; pangkat: string; position: string; sub_position: string } | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, userProfile }) => {
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: IconDashboard },
    { id: 'analytics', label: 'Analytics', icon: IconChartBar },
    { id: 'rekap-kinerja', label: 'Rekap Kinerja', icon: IconCalculator },

    { id: 'table', label: 'Table View', icon: IconTable },
    { id: 'employee-management', label: 'Manage Employees', icon: IconUsers },
    { id: 'data', label: 'Data Management', icon: IconCog },
    { id: 'profile', label: 'User Profile', icon: IconUser },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 h-full w-64 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Performance Dashboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Employee Analytics
        </p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {userProfile ? (
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-4 rounded-lg text-white">
            <h3 className="font-semibold text-sm truncate">{userProfile.name}</h3>
            <p className="text-xs opacity-90 mt-1">NIP: {userProfile.nip}</p>
            <p className="text-xs opacity-90">{userProfile.gol} - {userProfile.pangkat}</p>
            <p className="text-xs opacity-90 mt-1 truncate">{userProfile.position}</p>
            <p className="text-xs opacity-75 truncate">{userProfile.sub_position}</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-4 rounded-lg text-white">
            <h3 className="font-semibold text-sm">Employee Performance</h3>
            <p className="text-xs opacity-90 mt-1">Analytics Dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;