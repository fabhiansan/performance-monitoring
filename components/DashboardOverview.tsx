import React from 'react';
import { Employee } from '../types';
import { IconUsers, IconChartBar, IconSparkles } from './Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  // Categorize employees by organizational level (only Eselon III and IV)
  const categorizeEmployee = (job: string): 'Eselon III' | 'Eselon IV' | null => {
    const jobTrimmed = job.trim();
    
    // Only return Eselon III or IV, null for others
    if (jobTrimmed === 'Eselon III') {
      return 'Eselon III';
    } else if (jobTrimmed === 'Eselon IV') {
      return 'Eselon IV';
    } else {
      return null; // Exclude staff/other employees
    }
  };

  const employeesByLevel = {
    'Eselon III': employees.filter(emp => categorizeEmployee(emp.job) === 'Eselon III'),
    'Eselon IV': employees.filter(emp => categorizeEmployee(emp.job) === 'Eselon IV')
  };

  const totalEmployees = employees.length;
  
  const averageScore = employees.length > 0 
    ? employees.reduce((sum, emp) => {
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        return sum + empAvg;
      }, 0) / employees.length
    : 0;

  const topPerformer = employees.length > 0 
    ? employees.reduce((top, emp) => {
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        const topAvg = top.performance.reduce((s, p) => s + p.score, 0) / top.performance.length;
        return empAvg > topAvg ? emp : top;
      })
    : null;

  const performanceDistribution = employees.map(emp => {
    const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
    return {
      name: emp.name.split(' ')[0],
      score: Math.round(avgScore)
    };
  }).sort((a, b) => b.score - a.score);

  const competencyAverages = employees.length > 0 
    ? employees.reduce((acc, emp) => {
        emp.performance.forEach(perf => {
          if (!acc[perf.name]) {
            acc[perf.name] = { total: 0, count: 0 };
          }
          acc[perf.name].total += perf.score;
          acc[perf.name].count += 1;
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

  employees.forEach(emp => {
    const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
    if (avgScore >= 90) scoreRanges[0].value++;
    else if (avgScore >= 80) scoreRanges[1].value++;
    else if (avgScore >= 70) scoreRanges[2].value++;
    else scoreRanges[3].value++;
  });

  const kpiCards = [
    {
      title: 'Total Employees',
      value: (employeesByLevel['Eselon III'].length + employeesByLevel['Eselon IV'].length).toString(),
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
      title: 'Average Score',
      value: `${averageScore.toFixed(1)}`,
      icon: IconChartBar,
      color: 'text-purple-800 dark:text-purple-200',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30'
    },
    {
      title: 'Top Performer',
      value: topPerformer?.name.split(' ')[0] || 'N/A',
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {card.value}
                  </p>
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
          {competencyData.map((competency, competencyIndex) => (
            <div key={competencyIndex} className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {competency.competency}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(['Eselon III', 'Eselon IV'] as const).map((level, levelIndex) => {
                  const levelEmployees = employeesByLevel[level];
                  const employeeScores = levelEmployees.map(emp => {
                    const score = emp.performance.find(p => p.name === competency.competency)?.score || 0;
                    return {
                      name: emp.name,
                      score: score
                    };
                  }).sort((a, b) => b.score - a.score);

                  const levelColors = {
                    'Eselon III': '#ef4444',
                    'Eselon IV': '#f59e0b'
                  };

                  return (
                    <div key={levelIndex} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {level} ({employeeScores.length})
                      </h4>
                      {employeeScores.length > 0 ? (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={employeeScores} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis type="number" stroke="#6b7280" domain={[40, 90]} />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                stroke="#6b7280" 
                                width={110}
                                tick={{ fontSize: 10 }}
                              />
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
                                formatter={(value) => [`${value} (${getScoreLabel(value)})`, 'Score']}
                              />
                              <Bar 
                                dataKey="score" 
                                radius={[0, 4, 4, 0]}
                              >
                                {employeeScores.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          No employees in this level
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;