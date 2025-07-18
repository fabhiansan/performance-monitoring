import React, { useState, useMemo } from 'react';
import { Employee } from '../types';

interface TableViewProps {
  employees: Employee[];
}

const TableView: React.FC<TableViewProps> = ({ employees }) => {
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'eselon' | 'staff'>('all');

  // Helper to categorize employees by organizational level
  const categorizeEmployee = (level: string): 'Eselon III' | 'Eselon IV' | 'Staff' => {
    const jobTrimmed = level.trim();
    if (jobTrimmed === 'Eselon III') return 'Eselon III';
    if (jobTrimmed === 'Eselon IV') return 'Eselon IV';
    return 'Staff';
  };

  // Get competency names that have actual data for the current filter
  const competencyNames = useMemo(() => {
    const names = new Set<string>();
    
    // Filter employees by tab first
    let relevantEmployees = employees;
    if (activeTab === 'eselon') {
      relevantEmployees = employees.filter(emp => {
        const level = categorizeEmployee(emp.organizational_level);
        return level === 'Eselon III' || level === 'Eselon IV';
      });
    } else if (activeTab === 'staff') {
      relevantEmployees = employees.filter(emp => categorizeEmployee(emp.organizational_level) === 'Staff');
    }
    
    // Then filter by search term
    if (searchTerm) {
      relevantEmployees = relevantEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.organizational_level.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Collect competency names that have actual data
    relevantEmployees.forEach(emp => {
      emp.performance.forEach(comp => {
        // Only include competencies with actual scores > 0
        if (comp.score > 0) {
          names.add(comp.name);
        }
      });
    });
    
    return Array.from(names).sort();
  }, [employees, activeTab, searchTerm]);

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees;

    // Filter by tab
    if (activeTab === 'eselon') {
      filtered = filtered.filter(emp => {
        const level = categorizeEmployee(emp.organizational_level);
        return level === 'Eselon III' || level === 'Eselon IV';
      });
    } else if (activeTab === 'staff') {
      filtered = filtered.filter(emp => categorizeEmployee(emp.organizational_level) === 'Staff');
    }

    // Filter by search term
          filtered = filtered.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.organizational_level.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortColumn === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortColumn === 'organizational_level') {
        aValue = a.organizational_level;
        bValue = b.organizational_level;
      } else if (sortColumn === 'average') {
        aValue = a.performance.reduce((sum, comp) => sum + comp.score, 0) / a.performance.length;
        bValue = b.performance.reduce((sum, comp) => sum + comp.score, 0) / b.performance.length;
      } else {
        // Competency score
        const aComp = a.performance.find(comp => comp.name === sortColumn);
        const bComp = b.performance.find(comp => comp.name === sortColumn);
        aValue = aComp ? aComp.score : 0;
        bValue = bComp ? bComp.score : 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [employees, searchTerm, sortColumn, sortDirection, activeTab]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getCompetencyScore = (employee: Employee, competencyName: string): number => {
    const comp = employee.performance.find(c => c.name === competencyName);
    return comp ? comp.score : 0;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-800 dark:text-green-200'; // Sangat Baik - much darker for better contrast
    if (score >= 75) return 'text-orange-800 dark:text-orange-200'; // Baik - much darker for better contrast
    if (score >= 65) return 'text-red-800 dark:text-red-200'; // Kurang Baik - much darker for better contrast
    return 'text-purple-800 dark:text-purple-200'; // Perlu Perbaikan - much darker for better contrast
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 85) return 'bg-green-50 dark:bg-green-900/30'; // Sangat Baik - lighter background for better text contrast
    if (score >= 75) return 'bg-orange-50 dark:bg-orange-900/30'; // Baik - lighter background for better text contrast
    if (score >= 65) return 'bg-red-50 dark:bg-red-900/30'; // Kurang Baik - lighter background for better text contrast
    return 'bg-purple-50 dark:bg-purple-900/30'; // Perlu Perbaikan - lighter background for better text contrast
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Sangat Baik';
    if (score >= 75) return 'Baik';
    if (score >= 65) return 'Kurang Baik';
    return 'Perlu Perbaikan'; // Changed from N/A to more descriptive label
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 dark:text-gray-400">No employee data available</p>
        <p className="text-gray-500 dark:text-gray-500 mt-2">Import CSV data to view the table</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Table</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Detailed view of all employee performance metrics
          </p>
          {/* Tab Navigation */}
          <div className="mt-4 flex space-x-2">
            {(['all', 'eselon', 'staff'] as const).map(tab => {
              const label = tab === 'all' ? 'All Employees' : tab === 'eselon' ? 'Eselon' : 'Staff';
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium focus:outline-none transition-colors duration-200 ${
                    active
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Employee Name
                    <SortIcon column="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('organizational_level')}
                >
                  <div className="flex items-center gap-2">
                    Position
                    <SortIcon column="organizational_level" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('average')}
                >
                  <div className="flex items-center gap-2">
                    Average Score
                    <SortIcon column="average" />
                  </div>
                </th>
                {competencyNames.map(competency => (
                  <th 
                    key={competency}
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort(competency)}
                  >
                    <div className="flex items-center gap-2">
                      {competency}
                      <SortIcon column={competency} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedEmployees.map((employee, index) => {
                const averageScore = employee.performance.reduce((sum, comp) => sum + comp.score, 0) / employee.performance.length;
                
                return (
                  <tr key={employee.name} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {employee.organizational_level}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgColor(averageScore)} ${getScoreColor(averageScore)}`}>
                        {averageScore.toFixed(1)} ({getScoreLabel(averageScore)})
                      </div>
                    </td>
                    {competencyNames.map(competency => {
                      const score = getCompetencyScore(employee, competency);
                      return (
                        <td key={competency} className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgColor(score)} ${getScoreColor(score)}`}>
                            {score.toFixed(1)} ({getScoreLabel(score)})
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredAndSortedEmployees.length} of {employees.length} employees
      </div>
    </div>
  );
};

export default TableView;