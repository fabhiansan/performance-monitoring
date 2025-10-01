import React from 'react';
import { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar } from '../../design-system';

// Employee card loading state
export const EmployeeCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    {/* Header with avatar and name */}
    <div className="flex items-center gap-4 mb-4">
      <SkeletonAvatar width={48} height={48} />
      <div className="flex-1">
        <SkeletonText width="60%" height={20} className="mb-2" />
        <SkeletonText width="40%" height={16} />
      </div>
    </div>
    
    {/* Performance chart area */}
    <SkeletonCard height={200} className="mb-4" />
    
    {/* Performance metrics */}
    <div className="space-y-2">
      <SkeletonText lines={3} />
    </div>
  </div>
);

// Dashboard overview loading state
export const DashboardOverviewSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="mb-6">
      <SkeletonText width="300px" height={32} className="mb-2" />
      <SkeletonText width="500px" height={20} />
    </div>
    
    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <SkeletonText width="40%" height={16} className="mb-2" />
          <SkeletonText width="60%" height={24} className="mb-1" />
          <SkeletonText width="30%" height={14} />
        </div>
      ))}
    </div>
    
    {/* Charts section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard height={300} />
      <SkeletonCard height={300} />
    </div>
  </div>
);

// Employee list loading state
export const EmployeeListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Search/Filter bar */}
    <div className="flex gap-4 mb-6">
      <Skeleton width="300px" height={40} />
      <Skeleton width="150px" height={40} />
      <Skeleton width="100px" height={40} />
    </div>
    
    {/* Employee list items */}
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SkeletonAvatar width={40} height={40} />
            <div>
              <SkeletonText width="150px" height={20} className="mb-1" />
              <SkeletonText width="100px" height={16} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SkeletonText width="80px" height={20} />
            <Skeleton width={24} height={24} circular />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Table loading state
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    {/* Table header */}
    <div className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }, (_, i) => (
        <SkeletonText key={i} width="70%" height={16} />
      ))}
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonText key={colIndex} width="80%" height={16} />
        ))}
      </div>
    ))}
  </div>
);

// Data management loading state
export const DataManagementSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Upload area */}
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
      <SkeletonText width="200px" height={24} className="mx-auto mb-2" />
      <SkeletonText width="300px" height={16} className="mx-auto mb-4" />
      <Skeleton width="120px" height={40} className="mx-auto" />
    </div>
    
    {/* Dataset list */}
    <div className="space-y-4">
      <SkeletonText width="150px" height={20} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <SkeletonText width="200px" height={18} className="mb-1" />
              <SkeletonText width="150px" height={14} />
            </div>
            <div className="flex gap-2">
              <Skeleton width={32} height={32} />
              <Skeleton width={32} height={32} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Simple loading spinner for inline use
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg 
        className={`animate-spin text-blue-500 ${sizeClasses[size]}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};