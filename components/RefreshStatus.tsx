import React from 'react';
import { useGranularRefresh, RefreshDataType, getRequiredRefreshTypes } from '../services/refreshService';
import { IconRefresh, IconClock, IconCheck, IconX } from './Icons';

interface RefreshStatusProps {
  selectedSessionId?: string;
  onDataUpdate?: (type: RefreshDataType, data: any) => void;
  className?: string;
}

const RefreshStatus: React.FC<RefreshStatusProps> = ({ 
  selectedSessionId, 
  onDataUpdate,
  className = '' 
}) => {
  const {
    refreshKeys,
    isRefreshing,
    refresh,
    refreshMultiple,
    getLastRefreshTime
  } = useGranularRefresh();

  const refreshTypes: { type: RefreshDataType; label: string; description: string }[] = [
    { 
      type: 'employee_data', 
      label: 'Employee Data', 
      description: 'Core employee information and performance data' 
    },
    { 
      type: 'organizational_mappings', 
      label: 'Org Mappings', 
      description: 'Organizational level mappings and hierarchies' 
    },
    { 
      type: 'performance_scores', 
      label: 'Performance Scores', 
      description: 'Performance data and competency scores' 
    },
    { 
      type: 'upload_sessions', 
      label: 'Sessions', 
      description: 'Upload session management data' 
    },
    { 
      type: 'manual_scores', 
      label: 'Manual Scores', 
      description: 'Manual leadership scores' 
    }
  ];

  const handleRefresh = async (type: RefreshDataType) => {
    if (!selectedSessionId && (type === 'employee_data' || type === 'performance_scores')) {
      console.warn(`Cannot refresh ${type} without a selected session`);
      return;
    }

    try {
      await refresh(type, {
        sessionId: selectedSessionId,
        force: true,
        onSuccess: (refreshType, data) => {
          if (onDataUpdate) {
            onDataUpdate(refreshType, data);
          }
        }
      });
    } catch (error) {
      console.error(`Failed to refresh ${type}:`, error);
    }
  };

  const handleRefreshAll = async () => {
    if (!selectedSessionId) {
      console.warn('Cannot refresh all data without a selected session');
      return;
    }

    try {
      await refresh('all', {
        sessionId: selectedSessionId,
        force: true,
        onSuccess: (refreshType, data) => {
          if (onDataUpdate) {
            onDataUpdate(refreshType, data);
          }
        }
      });
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    }
  };

  const formatLastRefreshTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getRefreshIcon = (type: RefreshDataType) => {
    if (isRefreshing(type)) {
      return <IconRefresh className="w-4 h-4 animate-spin text-blue-500" />;
    }
    return <IconRefresh className="w-4 h-4 text-gray-400 hover:text-blue-500" />;
  };

  const getStatusColor = (type: RefreshDataType) => {
    if (isRefreshing(type)) return 'text-blue-500';
    const lastRefresh = getLastRefreshTime(type);
    if (!lastRefresh) return 'text-gray-400';
    const age = Date.now() - lastRefresh;
    if (age < 300000) return 'text-green-500'; // Fresh (< 5 min)
    if (age < 1800000) return 'text-yellow-500'; // Stale (< 30 min)
    return 'text-red-500'; // Very stale (> 30 min)
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Refresh Status
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor and control granular data refresh operations
            </p>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={!selectedSessionId || isRefreshing('all')}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRefreshing('all') ? (
              <IconRefresh className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="w-4 h-4 mr-2" />
            )}
            Refresh All
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {refreshTypes.map(({ type, label, description }) => {
            const lastRefresh = getLastRefreshTime(type);
            const refreshing = isRefreshing(type);
            const key = refreshKeys[type];

            return (
              <div
                key={type}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {label}
                  </h4>
                  <button
                    onClick={() => handleRefresh(type)}
                    disabled={refreshing || (!selectedSessionId && (type === 'employee_data' || type === 'performance_scores'))}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={`Refresh ${label}`}
                  >
                    {getRefreshIcon(type)}
                  </button>
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {description}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">Key:</span>
                    <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded">
                      {key}
                    </span>
                  </div>
                  
                  <div className={`flex items-center space-x-1 ${getStatusColor(type)}`}>
                    <IconClock className="w-3 h-3" />
                    <span>{formatLastRefreshTime(lastRefresh)}</span>
                  </div>
                </div>
                
                {refreshing && (
                  <div className="mt-2 flex items-center text-xs text-blue-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                    Refreshing...
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Quick Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const types = getRequiredRefreshTypes('employee_updated');
                refreshMultiple(types, {
                  sessionId: selectedSessionId,
                  force: true,
                  onSuccess: (type, data) => {
                    if (onDataUpdate) onDataUpdate(type, data);
                  }
                });
              }}
              disabled={!selectedSessionId}
              className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Employee Updated
            </button>
            
            <button
              onClick={() => {
                const types = getRequiredRefreshTypes('performance_updated');
                refreshMultiple(types, {
                  sessionId: selectedSessionId,
                  force: true,
                  onSuccess: (type, data) => {
                    if (onDataUpdate) onDataUpdate(type, data);
                  }
                });
              }}
              disabled={!selectedSessionId}
              className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Performance Updated
            </button>
            
            <button
              onClick={() => {
                const types = getRequiredRefreshTypes('organizational_structure_changed');
                refreshMultiple(types, {
                  sessionId: selectedSessionId,
                  force: true,
                  onSuccess: (type, data) => {
                    if (onDataUpdate) onDataUpdate(type, data);
                  }
                });
              }}
              disabled={!selectedSessionId}
              className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Org Structure Changed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefreshStatus;