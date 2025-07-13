import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { IconUsers, IconChartBar, IconSparkles } from './Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';

interface DashboardOverviewProps {
  employees: Employee[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ employees }) => {
  // Function to get color based on score range
  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#059669'; // Darker green for Sangat Baik (85+) - better contrast
    if (score >= 75) return '#d97706'; // Darker orange for Baik (75-84) - better contrast
    if (score >= 65) return '#dc2626'; // Darker red for Kurang Baik (65-74) - better contrast
    return '#9333ea'; // Purple for scores below 65 - better contrast
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Sangat Baik';
    if (score >= 75) return 'Baik';
    if (score >= 65) return 'Kurang Baik';
    return 'Perlu Perbaikan'; // Changed from N/A to more descriptive label
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 85) return 'bg-green-50 dark:bg-green-900/30'; // Sangat Baik - lighter background for better text contrast
    if (score >= 75) return 'bg-orange-50 dark:bg-orange-900/30'; // Baik - lighter background for better text contrast
    if (score >= 65) return 'bg-red-50 dark:bg-red-900/30'; // Kurang Baik - lighter background for better text contrast
    return 'bg-purple-50 dark:bg-purple-900/30'; // Perlu Perbaikan - lighter background for better text contrast
  };

  // Helper to categorize employees by organizational level
  const categorizeEmployee = (job: string): 'Eselon III' | 'Eselon IV' | 'Staff' => {
    const jobTrimmed = job.trim();
    if (jobTrimmed === 'Eselon III') return 'Eselon III';
    if (jobTrimmed === 'Eselon IV') return 'Eselon IV';
    return 'Staff';
  };

  // --- View Filter State & Memoized Employee List ---
  const [groupFilter, setGroupFilter] = useState<'all' | 'eselon' | 'staff'>('all');

  const filteredEmployees = useMemo(() => {
    if (groupFilter === 'eselon') {
      return employees.filter(emp => {
        const lvl = categorizeEmployee(emp.job);
        return lvl === 'Eselon III' || lvl === 'Eselon IV';
      });
    }
    if (groupFilter === 'staff') {
      return employees.filter(emp => categorizeEmployee(emp.job) === 'Staff');
    }
    return employees;
  }, [groupFilter, employees]);

  const employeesByLevel = {
    'Eselon III': filteredEmployees.filter(emp => categorizeEmployee(emp.job) === 'Eselon III'),
    'Eselon IV': filteredEmployees.filter(emp => categorizeEmployee(emp.job) === 'Eselon IV'),
    'Staff': filteredEmployees.filter(emp => categorizeEmployee(emp.job) === 'Staff')
  };


  const totalEmployees = filteredEmployees.length;
  
  const averageScore = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((sum, emp) => {
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        return sum + empAvg;
      }, 0) / filteredEmployees.length
    : 0;

  const topPerformer = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((top, emp) => {
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        const topAvg = top.performance.reduce((s, p) => s + p.score, 0) / top.performance.length;
        return empAvg > topAvg ? emp : top;
      })
    : null;

  const performanceDistribution = filteredEmployees.map(emp => {
    const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
    return {
      name: emp.name.split(' ')[0],
      score: Math.round(avgScore)
    };
  }).sort((a, b) => b.score - a.score);

  const competencyAverages = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((acc, emp) => {
        emp.performance.forEach(perf => {
          // Only include competencies with actual scores > 0
          if (perf.score > 0) {
            if (!acc[perf.name]) {
              acc[perf.name] = { total: 0, count: 0 };
            }
            acc[perf.name].total += perf.score;
            acc[perf.name].count += 1;
          }
        });
        return acc;
      }, {} as Record<string, { total: number; count: number }>)
    : {};

  const competencyData = Object.entries(competencyAverages).map(([name, data]) => ({
    competency: name,
    shortName: name.length > 20 ? name.substring(0, 20) + '...' : name,
    average: Number((data.total / data.count).toFixed(1))
  })).sort((a, b) => b.average - a.average);

  const scoreRanges = [
    { name: 'Excellent (90-100)', value: 0, color: '#10b981' },
    { name: 'Good (80-89)', value: 0, color: '#3b82f6' },
    { name: 'Average (70-79)', value: 0, color: '#f59e0b' },
    { name: 'Below Average (<70)', value: 0, color: '#ef4444' }
  ];

  filteredEmployees.forEach(emp => {
    const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
    if (avgScore >= 90) scoreRanges[0].value++;
    else if (avgScore >= 80) scoreRanges[1].value++;
    else if (avgScore >= 70) scoreRanges[2].value++;
    else scoreRanges[3].value++;
  });

  const kpiCards = [
    {
      title: 'Total Employees',
      value: totalEmployees.toString(),
      icon: IconUsers,
      color: 'text-blue-800 dark:text-blue-200',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      title: 'Eselon III',
      value: employeesByLevel['Eselon III'].length.toString(),
      icon: IconUsers,
      color: 'text-red-800 dark:text-red-200',
      bgColor: 'bg-red-50 dark:bg-red-900/30'
    },
    {
      title: 'Eselon IV',
      value: employeesByLevel['Eselon IV'].length.toString(),
      icon: IconUsers,
      color: 'text-orange-800 dark:text-orange-200',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30'
    },
    {
      title: 'Staff',
      value: employeesByLevel['Staff'].length.toString(),
      icon: IconUsers,
      color: 'text-green-800 dark:text-green-200',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    },
    {
      title: 'Average Score',
      value: `${averageScore.toFixed(1)}`,
      icon: IconChartBar,
      color: 'text-purple-800 dark:text-purple-200',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30'
    },
    {
      title: 'Top Performer',
      value: topPerformer ? topPerformer.name : 'N/A',
      score: topPerformer ? (topPerformer.performance.reduce((s, p) => s + p.score, 0) / topPerformer.performance.length).toFixed(1) : null,
      icon: IconSparkles,
      color: 'text-indigo-800 dark:text-indigo-200',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive view of team performance metrics
        </p>
        {/* View Filter Tabs */}
        <div className="mt-4 flex space-x-2">
          {(['all', 'eselon', 'staff'] as const).map(key => {
            const label = key === 'all' ? 'All' : key === 'eselon' ? 'Eselon' : 'Staff';
            const active = groupFilter === key;
            return (
              <button
                key={key}
                onClick={() => setGroupFilter(key)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const isTopPerformer = card.title === 'Top Performer';
          return (
            <div key={index} className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${isTopPerformer ? 'xl:col-span-2' : ''}`}>
              <div className="flex items-center justify-between">
                <div className={isTopPerformer ? 'flex-1 pr-4' : ''}>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  {isTopPerformer && card.score ? (
                    <div className="mt-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white break-words">
                        {card.value}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Score:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBgColor(Number(card.score))} ${getScoreColor(Number(card.score))}`}>
                          {card.score} ({getScoreLabel(Number(card.score))})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className={`${isTopPerformer ? 'text-lg' : 'text-3xl'} font-bold text-gray-900 dark:text-white mt-2 ${isTopPerformer ? 'break-words' : ''}`}>
                      {card.value}
                    </p>
                  )}
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      

      {competencyData.length > 0 && (
        <div className="space-y-6">
          
          
          {/* Individual Competency Charts by Organizational Level */}
          {competencyData.map((competency, competencyIndex) => {
            // Check if this competency has any data for the current filter level
            const hasDataForFilter = (() => {
              if (groupFilter === 'eselon') {
                const eselonEmployees = [...employeesByLevel['Eselon III'], ...employeesByLevel['Eselon IV']];
                return eselonEmployees.some(emp => emp.performance.some(p => p.name === competency.competency && p.score > 0));
              } else if (groupFilter === 'staff') {
                return employeesByLevel['Staff'].some(emp => emp.performance.some(p => p.name === competency.competency && p.score > 0));
              } else {
                // For 'all' filter, check if any employee has this competency
                return filteredEmployees.some(emp => emp.performance.some(p => p.name === competency.competency && p.score > 0));
              }
            })();

            // Skip competency if no data for current filter
            if (!hasDataForFilter) return null;

            return (
            <div key={competencyIndex} className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {competency.competency}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                {(['Eselon III', 'Eselon IV', 'Staff'] as const).map((level, levelIndex) => {
                  // Only show chart if filter allows this level
                  if (groupFilter === 'eselon' && level === 'Staff') return null;
                  if (groupFilter === 'staff' && (level === 'Eselon III' || level === 'Eselon IV')) return null;

                  const levelEmployees = employeesByLevel[level];
                  
                  // Filter out employees that don't have this competency or have 0 score
                  const employeeScores = levelEmployees.map(emp => {
                    const score = emp.performance.find(p => p.name === competency.competency)?.score || 0;
                    return {
                      name: emp.name,
                      score: score
                    };
                  }).filter(emp => emp.score > 0).sort((a, b) => b.score - a.score);
                  
                  // Don't show chart if no employees have this competency
                  if (employeeScores.length === 0) return null;

                  const levelColors = {
                    'Eselon III': '#ef4444',
                    'Eselon IV': '#f59e0b',
                    'Staff': '#10b981'
                  };

                  return (
                    <div key={levelIndex} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col min-h-[400px]">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {level} ({employeeScores.length})
                      </h4>
                      {employeeScores.length > 0 ? (
                        <div className="flex-1 min-h-[320px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={employeeScores} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis type="number" stroke="#6b7280" domain={[40, 90]} />
                              <YAxis hide dataKey="name" type="category" width={0} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#ffffff', 
                                  border: '2px solid #374151',
                                  borderRadius: '8px',
                                  color: '#111827',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                }}
                                formatter={(value) => [`${value} (${getScoreLabel(Number(value))})`, 'Score']}
                              />
                              <Bar 
                                dataKey="score" 
                                radius={[0, 4, 4, 0]}
                              >
                                <LabelList dataKey="name" position="insideLeft" style={{ fill: '#111827', fontSize: 10 }} />
                                {employeeScores.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <div className="text-center">
                            <div className="text-6xl mb-4 opacity-20">📊</div>
                            <p>No employees in this level</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;