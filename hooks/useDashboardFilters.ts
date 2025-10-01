/**
 * Dashboard filtering utilities extracted from DashboardOverview component
 */

import { useState, useMemo } from 'react';
import { Employee } from '../types';
import { getUniqueOrganizationalLevels } from '../utils/organizationalLevels';

export interface FilterState {
  searchTerm: string;
  levelFilter: string;
  showFilters: boolean;
}

export interface FilterActions {
  setSearchTerm: (_term: string) => void;
  setLevelFilter: (_level: string) => void;
  setShowFilters: (_show: boolean) => void;
  resetFilters: () => void;
}

/**
 * Filter employees based on search term and level filter
 */
export const filterEmployees = (
  employees: Employee[], 
  searchTerm: string, 
  levelFilter: string
): Employee[] => {
  return employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.organizational_level || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !levelFilter || emp.organizational_level === levelFilter;
    return matchesSearch && matchesLevel;
  });
};

/**
 * Custom hook for dashboard filtering functionality
 */
export const useDashboardFilters = (employees: Employee[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const uniqueLevels = useMemo(() => {
    return getUniqueOrganizationalLevels(employees);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return filterEmployees(employees, searchTerm, levelFilter);
  }, [employees, searchTerm, levelFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setLevelFilter('');
    setShowFilters(false);
  };

  const filterState: FilterState = {
    searchTerm,
    levelFilter,
    showFilters
  };

  const filterActions: FilterActions = {
    setSearchTerm,
    setLevelFilter,
    setShowFilters,
    resetFilters
  };

  return {
    filterState,
    filterActions,
    uniqueLevels,
    filteredEmployees
  };
};