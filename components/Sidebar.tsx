import React from 'react';
import LogoIcon from '../icon.png';
import { IconDashboard, IconChartBar, IconUsers, IconCog, IconCalculator, IconDocument } from './Icons';

interface Dataset {
  id: string;
  name: string;
}

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string;
  onDatasetChange: (id: string) => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ datasets, selectedDatasetId, onDatasetChange, activeView, onViewChange }) => {
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: IconDashboard },
    { id: 'employee-management', label: 'Manage Employees', icon: IconUsers },
    { id: 'analytics', label: 'Analytics', icon: IconChartBar },
    { id: 'rekap-kinerja', label: 'Rekap Kinerja', icon: IconCalculator },
    { id: 'report', label: 'Laporan', icon: IconDocument },
    { id: 'data', label: 'Data', icon: IconCog },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 h-full w-64 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
        <img src={LogoIcon} alt="Logo" className="w-8 h-8" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Employee Analytics</p>
        </div>
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

      {/* Dataset selector */}
      {datasets.length > 0 && (
        <div className="px-4 pb-4">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Dataset (Period)</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => onDatasetChange(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-4 rounded-lg text-white">
          <h3 className="font-semibold text-sm">Employee Performance</h3>
          <p className="text-xs opacity-90 mt-1">Analytics Dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;