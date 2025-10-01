import React from 'react';
import { Skeleton } from '../../design-system/components/Skeleton/Skeleton';

export const EmployeeCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col animate-pulse">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={16} />
          </div>
        </div>
      </div>

      <div className="flex-grow h-80 w-full p-4 flex items-center justify-center">
        <Skeleton variant="circular" width={240} height={240} />
      </div>
    </div>
  );
};

/**
 * Grid of skeleton employee cards for loading states
 */
interface EmployeeCardSkeletonGridProps {
  count?: number;
}

export const EmployeeCardSkeletonGrid: React.FC<EmployeeCardSkeletonGridProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <EmployeeCardSkeleton key={index} />
      ))}
    </div>
  );
};
