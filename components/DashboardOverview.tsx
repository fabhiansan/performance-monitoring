import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { IconUsers, IconChartBar, IconSparkles } from './Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { 
  ORGANIZATIONAL_LEVELS, 
  categorizeOrganizationalLevel,
  getUniqueOrganizationalLevels,
  groupEmployeesByOrganizationalLevel,
  getOrganizationalSummary
} from '../utils/organizationalLevels';
import { 
  useResizeObserver, 
  useViewportObserver,
  calculateYAxisWidth, 
  calculateChartMargins, 
  calculateDynamicHeight,
  getResponsiveChartConfig,
  calculateOptimalItemCount
} from '../utils/useResizeObserver';

interface DashboardOverviewProps {
  employees: Employee[];
  organizationalMappings?: Record<string, string>;
}

interface ChartContainerProps {
  employeeScores: Array<{ name: string; score: number }>;
  competency: { competency: string };
  getScoreColor: (score: number) => string;
  getScoreLabel: (score: number) => string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ employeeScores, competency, getScoreColor, getScoreLabel }) => {
  const { width, height, ref, isSmallScreen, isMediumScreen, isLargeScreen } = useResizeObserver();
  const viewport = useViewportObserver();
  
  // Memoize chart configuration for performance
  const chartConfig = useMemo(() => getResponsiveChartConfig(width, height), [width, height]);
  
  // Calculate dynamic height based on content, screen size, and viewport
  const dynamicHeight = useMemo(() => {
    const availableViewportHeight = viewport.height * 0.8; // Use 80% of viewport height
    return calculateDynamicHeight(
      {
        baseHeight: 250,
        minHeight: isSmallScreen ? 200 : isMediumScreen ? 250 : 300,
        maxHeight: Math.min(
          isSmallScreen ? 400 : isMediumScreen ? 500 : 600,
          availableViewportHeight
        ),
        contentCount: employeeScores.length,
        itemHeight: isSmallScreen ? 35 : isMediumScreen ? 40 : 45
      },
      width,
      Math.max(height, availableViewportHeight)
    );
  }, [width, height, viewport.height, employeeScores.length, isSmallScreen, isMediumScreen]);
  
  // Memoize layout calculations
  const layoutConfig = useMemo(() => {
    const yAxisWidth = calculateYAxisWidth(width);
    const margins = calculateChartMargins(width, height);
    const optimalItemCount = calculateOptimalItemCount(width, dynamicHeight, chartConfig.spacing.categoryGap + 20);
    
    return {
      yAxisWidth,
      margins,
      optimalItemCount,
      displayedScores: employeeScores.slice(0, optimalItemCount)
    };
  }, [width, height, dynamicHeight, chartConfig.spacing.categoryGap, employeeScores]);
  
  // Dynamic CSS custom properties for container queries
  const containerStyle = useMemo(() => ({
    '--chart-min-height': `${dynamicHeight}px`,
    '--chart-max-height': `${Math.min(dynamicHeight * 1.5, viewport.height * 0.9)}px`
  } as React.CSSProperties), [dynamicHeight, viewport.height]);

  return (
    <div 
      ref={ref} 
      className="chart-container chart-dynamic-height responsive-chart-wrapper"
      style={{
        ...containerStyle,
        height: `${dynamicHeight}px`,
        minHeight: `${dynamicHeight}px`
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={layoutConfig.displayedScores} 
          layout="vertical" 
          margin={layoutConfig.margins}
          barGap={chartConfig.spacing.barGap}
          barCategoryGap={chartConfig.spacing.categoryGap}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            strokeWidth={chartConfig.strokeWidth}
          />
          <XAxis 
            type="number" 
            stroke="#6b7280" 
            domain={[0, 100]}
            tick={{ fontSize: chartConfig.fontSize.tick }}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={layoutConfig.yAxisWidth} 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: chartConfig.fontSize.tick }}
            stroke="#6b7280" 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '2px solid #374151',
              borderRadius: `${chartConfig.radius.tooltip}px`,
              color: '#111827',
              fontSize: `${chartConfig.fontSize.tooltip}px`,
              fontWeight: 500,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            formatter={(value: number) => [`${value} (${getScoreLabel(value)})`, 'Score']}
          />
          <Bar 
            dataKey="score" 
            radius={[0, chartConfig.radius.bar, chartConfig.radius.bar, 0]}
          >
            <LabelList 
              dataKey="name" 
              position="insideLeft" 
              style={{ 
                fill: '#111827', 
                fontSize: chartConfig.fontSize.label,
                fontWeight: isSmallScreen ? 'normal' : 'medium'
              }} 
            />
            {layoutConfig.displayedScores.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Show indicator if items were truncated */}
      {employeeScores.length > layoutConfig.optimalItemCount && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
          +{employeeScores.length - layoutConfig.optimalItemCount} more
        </div>
      )}
    </div>
  );
};

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ employees, organizationalMappings }) => {
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

  // Use centralized categorization function
  const categorizeEmployee = categorizeOrganizationalLevel;

  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Use predefined organizational levels from constants
  const predefinedLevels = ORGANIZATIONAL_LEVELS;

  const uniqueLevels = useMemo(() => {
    return getUniqueOrganizationalLevels(employees);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (emp.organizational_level || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = !levelFilter || emp.organizational_level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [employees, searchTerm, levelFilter]);

  // Group employees by their exact organizational level (use actual values, not categorized)
  const employeesByLevel = useMemo(() => {
    const grouped: Record<string, typeof filteredEmployees> = {};
    
    filteredEmployees.forEach(emp => {
      const level = emp.organizational_level || 'Other';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(emp);
    });
    
    return grouped;
  }, [filteredEmployees]);

  const totalEmployees = filteredEmployees.length;
  
  const averageScore = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((sum, emp) => {
        if (!emp.performance || emp.performance.length === 0) return sum;
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        return sum + empAvg;
      }, 0) / filteredEmployees.length
    : 0;

  const topPerformer = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((top, emp) => {
        if (!emp.performance || emp.performance.length === 0) return top;
        if (!top.performance || top.performance.length === 0) return emp;
        const empAvg = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
        const topAvg = top.performance.reduce((s, p) => s + p.score, 0) / top.performance.length;
        return empAvg > topAvg ? emp : top;
      })
    : null;

  const competencyAverages = filteredEmployees.length > 0 
    ? filteredEmployees.reduce((acc, emp) => {
        if (!emp.performance || emp.performance.length === 0) return acc;
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
    if (!emp.performance || emp.performance.length === 0) return;
    const avgScore = emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length;
    if (avgScore >= 90) scoreRanges[0].value++;
    else if (avgScore >= 80) scoreRanges[1].value++;
    else if (avgScore >= 70) scoreRanges[2].value++;
    else scoreRanges[3].value++;
  });

  // Group organizational levels by major categories for display
  const organizationalSummary = useMemo(() => {
    let eselonCount = 0;
    let asnStaffCount = 0;
    let nonAsnStaffCount = 0;
    let otherCount = 0;
    
    Object.entries(employeesByLevel).forEach(([level, employees]) => {
      const levelLower = level.toLowerCase();
      if (levelLower.includes('eselon') || levelLower.includes('eselon ii') || levelLower.includes('eselon iii') || levelLower.includes('eselon iv')) {
        eselonCount += employees.length;
      } else if (levelLower.includes('staff asn')) {
        asnStaffCount += employees.length;
      } else if (levelLower.includes('staff non asn')) {
        nonAsnStaffCount += employees.length;
      } else if (levelLower === 'staff') {
        // Handle generic "Staff" level - categorize as other for now
        otherCount += employees.length;
      } else {
        otherCount += employees.length;
      }
    });
    
    return {
      eselon: eselonCount,
      asnStaff: asnStaffCount,
      nonAsnStaff: nonAsnStaffCount,
      other: otherCount
    };
  }, [employeesByLevel]);

  const kpiCards = [
    {
      title: 'Total Employees',
      value: totalEmployees.toString(),
      icon: IconUsers,
      color: 'text-blue-800 dark:text-blue-200',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      title: 'Eselon (II-IV)',
      value: organizationalSummary.eselon.toString(),
      detail: `II: ${(employeesByLevel['Eselon II'] || []).length}, III: ${(employeesByLevel['Eselon III'] || []).length}, IV: ${(employeesByLevel['Eselon IV'] || []).length}`,
      icon: IconUsers,
      color: 'text-purple-800 dark:text-purple-200',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30'
    },
    {
      title: 'Staff ASN',
      value: organizationalSummary.asnStaff.toString(),
      icon: IconUsers,
      color: 'text-green-800 dark:text-green-200',
      bgColor: 'bg-green-50 dark:bg-green-900/30'
    },
    {
      title: 'Staff Non ASN',
      value: organizationalSummary.nonAsnStaff.toString(),
      icon: IconUsers,
      color: 'text-orange-800 dark:text-orange-200',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30'
    },
    {
      title: 'Average Score',
      value: `${averageScore.toFixed(1)}`,
      icon: IconChartBar,
      color: 'text-indigo-800 dark:text-indigo-200',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30'
    },
    {
      title: 'Top Performer',
      value: topPerformer ? topPerformer.name : 'N/A',
      score: topPerformer && topPerformer.performance && topPerformer.performance.length > 0 ? (topPerformer.performance.reduce((s, p) => s + p.score, 0) / topPerformer.performance.length).toFixed(1) : null,
      icon: IconSparkles,
      color: 'text-yellow-800 dark:text-yellow-200',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="adaptive-title font-bold text-gray-900 dark:text-white mb-2" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
          Dashboard Overview
        </h1>
        <p className="adaptive-text text-gray-600 dark:text-gray-400">
          Comprehensive view of team performance metrics
        </p>
        {/* Search + filter controls */}
        <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search employees or organizational levels..."
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <button onClick={()=>setShowFilters(!showFilters)} className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            {/* simple filter icon svg */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-15 7.5h12m-9 7.5h6" />
            </svg>
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Org Level</label>
              <select value={levelFilter} onChange={(e)=>setLevelFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Levels</option>
                {uniqueLevels.map(l => (<option key={l} value={l}>{l}</option>))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const isTopPerformer = card.title === 'Top Performer';
          const hasDetail = 'detail' in card;
          
          return (
            <div key={index} className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${isTopPerformer ? 'lg:col-span-2' : ''}`}>
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
                    <div className="mt-2">
                      <p className={`${isTopPerformer ? 'text-lg' : 'text-3xl'} font-bold text-gray-900 dark:text-white ${isTopPerformer ? 'break-words' : ''}`}>
                        {card.value}
                      </p>
                      {hasDetail && (card as any).detail && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(card as any).detail}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {competencyData.length > 0 && (
        <div className="space-y-6">
          {/* Organizational Level Overview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="adaptive-title font-bold text-gray-900 dark:text-white mb-6">
              Employee Distribution by Organizational Level
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(employeesByLevel)
                .filter(([_, employees]) => employees.length > 0)
                .sort(([a], [b]) => {
                  // Sort order: Eselon levels first, then Staff levels, then Other
                  if (a.includes('Eselon') && !b.includes('Eselon')) return -1;
                  if (!a.includes('Eselon') && b.includes('Eselon')) return 1;
                  if (a.includes('Staff') && b === 'Other') return -1;
                  if (a === 'Other' && b.includes('Staff')) return 1;
                  return a.localeCompare(b);
                })
                .map(([level, employees]) => (
                  <div key={level} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {level}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {employees.length}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {((employees.length / totalEmployees) * 100).toFixed(1)}%
                      </span>
                    </div>
                    {employees.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Avg Score: {(employees.reduce((sum, emp) => {
                            if (!emp.performance || emp.performance.length === 0) return sum;
                            return sum + (emp.performance.reduce((s, p) => s + p.score, 0) / emp.performance.length);
                          }, 0) / employees.length).toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Competency Performance Charts - Now showing top 3 organizational levels by size */}
          {competencyData.map((competency, competencyIndex) => {
            const topLevels = Object.entries(employeesByLevel)
              .filter(([_, employees]) => employees.length > 0)
              .sort(([, a], [, b]) => b.length - a.length)
              .slice(0, 3);

            return (
              <div key={competencyIndex} className="space-y-4">
                <h3 className="adaptive-title font-bold text-gray-900 dark:text-white mb-4">
                  {competency.competency} - Top 3 Organizational Levels
                </h3>
                <div className="chart-grid">
                  {topLevels.map(([level, levelEmployees], levelIndex) => {
                    const employeeScores = levelEmployees.map(emp => {
                      if (!emp.performance || emp.performance.length === 0) {
                        return {
                          name: emp.name.length > 15 ? emp.name.substring(0, 15) + '...' : emp.name,
                          score: 0
                        };
                      }
                      const score = emp.performance.find(p => p.name === competency.competency)?.score || 0;
                      return {
                        name: emp.name.length > 15 ? emp.name.substring(0, 15) + '...' : emp.name,
                        score: score
                      };
                    }).filter(emp => emp.score > 0).sort((a, b) => b.score - a.score);

                    if (employeeScores.length === 0) return (
                      <div key={levelIndex} className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <div className="text-6xl mb-4 opacity-20">📊</div>
                          <p>No data for {level}</p>
                        </div>
                      </div>
                    );

                    return (
                      <div key={levelIndex} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col chart-container">
                        <h4 className="chart-title font-semibold text-gray-900 dark:text-white mb-4">
                          <span className="adaptive-title">
                            {level.length > 25 ? level.substring(0, 25) + '...' : level}
                          </span>
                          <span className="adaptive-text text-gray-500 ml-2">({employeeScores.length})</span>
                        </h4>
                        <ChartContainer employeeScores={employeeScores.slice(0, 10)} competency={competency} getScoreColor={getScoreColor} getScoreLabel={getScoreLabel} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;