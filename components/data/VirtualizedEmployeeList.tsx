import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Employee } from '../../types';
import { simplifyOrganizationalLevel } from '../../utils/organizationalLevels';

interface VirtualizedEmployeeListProps {
  employees: Employee[];
  maxHeight?: number;
  emptyMessage?: string;
}

const ESTIMATED_ROW_HEIGHT = 56;

export const VirtualizedEmployeeList: React.FC<VirtualizedEmployeeListProps> = ({
  employees,
  maxHeight = 320,
  emptyMessage = 'Belum ada data pegawai.'
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const safeEmployees = useMemo(() => employees ?? [], [employees]);

  const virtualizer = useVirtualizer({
    count: safeEmployees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8
  });

  if (safeEmployees.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ maxHeight }}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => {
          const employee = safeEmployees[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 px-1"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="font-medium text-gray-900 dark:text-white">
                  {employee.name}
                </span>
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  title={employee.organizational_level || undefined}
                >
                  {simplifyOrganizationalLevel(employee.organizational_level, employee.gol)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedEmployeeList;
