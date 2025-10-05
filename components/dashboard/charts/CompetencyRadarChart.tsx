import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Employee } from '../../../types';

interface CompetencyRadarChartProps {
  employees: Employee[];
}

interface CompetencyData {
  competency: string;
  score: number;
  fullMark: number;
  shortName: string;
}

const CompetencyRadarChart: React.FC<CompetencyRadarChartProps> = ({ employees }) => {
  const [opacity, setOpacity] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculate average competency scores
  const competencyData = React.useMemo<CompetencyData[]>(() => {
    const competencyMap = new Map<string, { total: number; count: number }>();

    employees.forEach(employee => {
      employee.performance?.forEach(perf => {
        const existing = competencyMap.get(perf.name) || { total: 0, count: 0 };
        competencyMap.set(perf.name, {
          total: existing.total + perf.score,
          count: existing.count + 1,
        });
      });
    });

    // Top 8 competencies

    return Array.from(competencyMap.entries())
      .map(([name, data]) => ({
        competency: name,
        score: Number((data.total / data.count).toFixed(1)),
        fullMark: 100,
        shortName: name.length > 20 ? name.substring(0, 20) + '...' : name,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [employees]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const scoreColor =
      data.score >= 85 ? '#10b981' :
      data.score >= 75 ? '#3b82f6' :
      data.score >= 65 ? '#f59e0b' : '#ef4444';

    return (
      <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-4 shadow-2xl border border-slate-700">
        <p className="text-white font-bold text-sm mb-2">{data.competency}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-300">Skor Rata-rata:</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${data.score}%`,
                  backgroundColor: scoreColor,
                }}
              />
            </div>
            <span className="text-sm font-bold text-white">{data.score}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
    setOpacity(0.5);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    setOpacity(1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 65) return '#f59e0b';
    return '#ef4444';
  };

  if (competencyData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">
          Tidak ada data kompetensi tersedia
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyData}>
            <PolarGrid
              stroke="#cbd5e1"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <PolarAngleAxis
              dataKey="shortName"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Kompetensi"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={opacity}
              strokeWidth={2}
              animationDuration={800}
              dot={(props: any) => {
                const { cx, cy, index, payload } = props;
                const isActive = activeIndex === index;
                const score = payload.score;
                const color = getScoreColor(score);

                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 8 : 5}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Competency List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {competencyData.map((item, index) => {
          const scoreColor = getScoreColor(item.score);
          const isActive = activeIndex === index;

          return (
            <div
              key={item.competency}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {item.competency}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${item.score}%`,
                          backgroundColor: scoreColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold" style={{ color: scoreColor }}>
                    {item.score}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.score >= 85 ? 'Excellent' :
                     item.score >= 75 ? 'Good' :
                     item.score >= 65 ? 'Average' : 'Below Avg'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Excellent (≥85)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Good (75-84)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Average (65-74)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Below Avg (&lt;65)</span>
        </div>
      </div>
    </div>
  );
};

export default CompetencyRadarChart;
