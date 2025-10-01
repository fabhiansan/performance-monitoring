import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';
import { EmployeeCard } from './EmployeeCard';
import { IconFilter, IconSearch, IconUsers } from '../shared/Icons';
import { Button, Input, Card } from '../../design-system';
import { getPerformanceLevel } from '../../constants/ui';

interface EmployeeAnalyticsProps {
  employees: Employee[];
}

const EmployeeAnalytics: React.FC<EmployeeAnalyticsProps> = ({ employees }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationalLevelFilter, setOrganizationalLevelFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'organizational_level'>('name');
  const [showFilters, setShowFilters] = useState(false);

  const getOrgLevel = (emp: Employee): string => {
    return emp.organizational_level || emp.organizationalLevel || 'N/A';
  };

  const uniqueJobs = useMemo(() => {
    const jobs = [...new Set(employees.map(emp => getOrgLevel(emp)))];
    return jobs.filter(job => job && job !== 'N/A').sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredAndSortedEmployees = useMemo(() => {
    const filtered = employees.filter(emp => {
      const orgLevel = getOrgLevel(emp);
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           orgLevel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesJob = !organizationalLevelFilter || orgLevel === organizationalLevelFilter;
      return matchesSearch && matchesJob;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'organizational_level':
          return getOrgLevel(a).localeCompare(getOrgLevel(b));
        case 'performance': {
          const aAvg = a.performance && a.performance.length > 0 
            ? a.performance.reduce((s, p) => s + p.score, 0) / a.performance.length 
            : 0;
          const bAvg = b.performance && b.performance.length > 0 
            ? b.performance.reduce((s, p) => s + p.score, 0) / b.performance.length 
            : 0;
          return bAvg - aAvg;
        }
        default:
          return 0;
      }
    });
  }, [employees, searchTerm, organizationalLevelFilter, sortBy]);

  const getPerformanceLevelStyles = (score: number) => {
    const level = getPerformanceLevel(score);
    return { 
      label: level.label, 
      color: level.textColor, 
      bgColor: level.bgColor + ' dark:' + level.darkBgColor
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Employee Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed view of individual employee performance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
            {filteredAndSortedEmployees.length} of {employees.length} employees
          </span>
        </div>
      </div>

      <Card variant="elevated" size="lg">
        <Card.Body>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search employees or job titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<IconSearch className="w-5 h-5" />}
                className="w-full"
              />
            </div>
            
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              leftIcon={<IconFilter className="w-5 h-5" />}
            >
              Filters
            </Button>
          </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Organizational Level
              </label>
              <select
                value={organizationalLevelFilter}
                onChange={(e) => setOrganizationalLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Organizational Levels</option>
                {uniqueJobs.map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'performance' | 'organizational_level')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name (A-Z)</option>
                <option value="performance">Performance (High-Low)</option>
                <option value="organizational_level">Organizational Level</option>
              </select>
            </div>
          </div>
        )}

        {filteredAndSortedEmployees.length === 0 ? (
          <div className="text-center py-12">
            <IconUsers className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No employees found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Excellent', 'Good', 'Average', 'Below Average'].map((level, index) => {
                  const count = filteredAndSortedEmployees.filter(emp => {
                    if (!emp.performance || emp.performance.length === 0) return false;
                    const avg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
                    const perfLevel = getPerformanceLevelStyles(avg);
                    return perfLevel.label === level;
                  }).length;
                  
                  const levelColors = ['Excellent', 'Good', 'Average', 'Below Average'].map((_levelName, idx) => {
                    const score = [95, 85, 75, 65][idx]; // Representative scores for each level
                    const styles = getPerformanceLevelStyles(score);
                    return { bg: styles.bgColor, text: styles.color };
                  });
                  
                  return (
                    <div key={level} className={`p-4 rounded-lg ${levelColors[index].bg}`}>
                      <p className={`text-2xl font-bold ${levelColors[index].text}`}>{count}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{level}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredAndSortedEmployees.map(employee => (
                <EmployeeCard 
                  key={employee.name} 
                  employee={employee} 
 
                />
              ))}
            </div>
          </>
        )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeAnalytics;
