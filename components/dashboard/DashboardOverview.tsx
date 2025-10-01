import React, { useMemo } from 'react';
import { Employee } from '../../types';
import { Button, Card } from '../../design-system';
import { getLegacyPerformanceLevel, CHART_COLORS } from '../../constants/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { 
  useResizeObserver, 
  useViewportObserver,
  calculateYAxisWidth, 
  calculateChartMargins, 
  calculateDynamicHeight,
  getResponsiveChartConfig,
  calculateOptimalItemCount
} from '../../utils/useResizeObserver';
import { useDashboardCalculations } from '../../hooks/useDashboardCalculations';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { generateKpiCards, isTopPerformerCard, hasCardDetail } from '../../utils/kpiCardUtils';

interface DashboardOverviewProps {
  employees: Employee[];
  organizationalMappings?: Record<string, string>;
  onNavigateToDataManagement?: () => void;
}

interface ChartContainerProps {
  employeeScores: Array<{ name: string; score: number }>;
  getScoreColor: (_score: number) => string;
  getScoreLabel: (_score: number) => string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ employeeScores, getScoreColor, getScoreLabel }) => {
  const { width, height, ref, isSmallScreen, isMediumScreen } = useResizeObserver();
  const viewport = useViewportObserver();
  
  // Memoize chart configuration for performance
  const chartConfig = useMemo(() => getResponsiveChartConfig(width), [width]);
  
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
  }, [width, viewport.height, employeeScores.length, isSmallScreen, isMediumScreen, height]);
  
  // Memoize layout calculations
  const layoutConfig = useMemo(() => {
    const yAxisWidth = calculateYAxisWidth(width);
    const margins = calculateChartMargins(width);
    const optimalItemCount = calculateOptimalItemCount(width, dynamicHeight, chartConfig.spacing.categoryGap + 20);
    
    return {
      yAxisWidth,
      margins,
      optimalItemCount,
      displayedScores: employeeScores.slice(0, optimalItemCount)
    };
  }, [width, dynamicHeight, chartConfig.spacing.categoryGap, employeeScores]);
  
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
            stroke={CHART_COLORS.GRID_COLOR} 
            strokeWidth={chartConfig.strokeWidth}
          />
          <XAxis 
            type="number" 
            stroke={CHART_COLORS.AXIS_COLOR} 
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
            stroke={CHART_COLORS.AXIS_COLOR} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.BACKGROUND,
              border: `2px solid ${CHART_COLORS.GRID_COLOR}`,
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

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ employees, onNavigateToDataManagement }) => {
  // Function to get color based on score range using UI constants
  const getScoreColor = (score: number): string => {
    const level = getLegacyPerformanceLevel(score);
    return level.color;
  };

  const getScoreLabel = (score: number): string => {
    const level = getLegacyPerformanceLevel(score);
    return level.label;
  };

  const getScoreBgColor = (score: number): string => {
    const level = getLegacyPerformanceLevel(score);
    return level.bgColor;
  };


  // Use custom hooks for filtering and calculations
  const { filterState, filterActions, uniqueLevels, filteredEmployees } = useDashboardFilters(employees);
  const { searchTerm, levelFilter, showFilters } = filterState;
  const { setSearchTerm, setLevelFilter, setShowFilters } = filterActions;

  // Use dashboard calculations hook
  const { kpiData, competencyData, employeesByLevel, organizationalSummary } = useDashboardCalculations(filteredEmployees);
  
  // Generate KPI cards using extracted utility
  const kpiCards = generateKpiCards(kpiData, organizationalSummary, employeesByLevel);

  // All calculations are now handled by the custom hooks above


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
          <Button 
            onClick={()=>setShowFilters(!showFilters)} 
            variant="secondary" 
            size="md"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-15 7.5h12m-9 7.5h6" />
              </svg>
            }
          >
            Filters
          </Button>
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
          const isTopPerformer = isTopPerformerCard(card);
          const hasDetail = hasCardDetail(card);
          
          return (
            <Card 
              key={index} 
              variant="elevated" 
              size="md"
              className={isTopPerformer ? 'lg:col-span-2' : ''}
            >
              <Card.Body>
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
                        {hasDetail && 'detail' in card && card.detail && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {card.detail}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-lg flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Show message when employees exist but no performance data */}
      {filteredEmployees.length > 0 && competencyData.length === 0 && (
        <Card variant="elevated" size="md" className="border-blue-200 dark:border-blue-800">
          <Card.Body>
            <div className="text-center py-8">
              <div className="inline-block bg-gradient-to-r from-blue-500 to-teal-400 p-0.5 rounded-lg shadow-lg mb-6">
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                  <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Employee Data Imported Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You have {filteredEmployees.length} employees in the system, but no performance data yet.
                <br />
                Import performance data to see analytics and insights.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Next Step:</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Import performance data with format: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Kompetensi [Nama Pegawai]</code>
                  <br />
                  The employee names in performance data should match the names you just imported.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (onNavigateToDataManagement) {
                    onNavigateToDataManagement();
                  } else {
                    // Fallback: scroll to top if navigation function not provided
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                variant="primary"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                }
              >
                Import Performance Data
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Show employee distribution when we have employees but no performance data */}
      {filteredEmployees.length > 0 && competencyData.length === 0 && (
        <Card variant="elevated" size="md">
          <Card.Header title="Current Employee Roster" />
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(employeesByLevel)
                .filter(([, employees]) => employees.length > 0)
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
                        {((employees.length / filteredEmployees.length) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Ready for performance data
                    </div>
                  </div>
                ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {competencyData.length > 0 && (
        <div className="space-y-6">
          {/* Organizational Level Overview */}
          <Card variant="elevated" size="md">
            <Card.Header title="Employee Distribution by Organizational Level" />
            <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(employeesByLevel)
                .filter(([, employees]) => employees.length > 0)
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
                        {((employees.length / kpiData.totalEmployees) * 100).toFixed(1)}%
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
            </Card.Body>
          </Card>

          {/* Competency Performance Charts - Now showing top 3 organizational levels by size */}
          {competencyData.map((competency, competencyIndex) => {
            const topLevels = Object.entries(employeesByLevel)
              .filter(([, employees]) => employees.length > 0)
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
                        <ChartContainer employeeScores={employeeScores.slice(0, 10)} getScoreColor={getScoreColor} getScoreLabel={getScoreLabel} />
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
