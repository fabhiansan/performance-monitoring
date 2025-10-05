import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { Employee } from '../../../types';

interface PerformanceTrendChartProps {
  employees: Employee[];
}

interface TrendDataPoint {
  month: string;
  avgScore: number;
  topPerformer: number;
  bottomPerformer: number;
  employeeCount: number;
}

const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({ employees }) => {
  const [activeLines, setActiveLines] = useState({
    avgScore: true,
    topPerformer: true,
    bottomPerformer: true,
  });

  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Generate mock trend data (in a real app, this would come from historical data)
  const trendData = useMemo<TrendDataPoint[]>(() => {
    const calculateAverage = (emps: Employee[]) => {
      if (emps.length === 0) return 0;
      const sum = emps.reduce((acc, emp) => {
        const scores = emp.performance?.map(p => p.score) || [];
        const avg = scores.length > 0 ? scores.reduce((s, sc) => s + sc, 0) / scores.length : 0;
        return acc + avg;
      }, 0);
      return sum / emps.length;
    };

    const currentAvg = calculateAverage(employees);

    // Generate 6 months of trend data
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseScore = currentAvg || 75;

    return months.map((month, index) => {
      const variance = Math.random() * 10 - 5;
      const trend = (index * 1.5);
      const avgScore = Math.min(95, Math.max(60, baseScore + variance + trend));

      return {
        month,
        avgScore: Number(avgScore.toFixed(1)),
        topPerformer: Number(Math.min(100, avgScore + 8 + Math.random() * 4).toFixed(1)),
        bottomPerformer: Number(Math.max(50, avgScore - 12 - Math.random() * 3).toFixed(1)),
        employeeCount: employees.length + Math.floor(Math.random() * 10 - 5),
      };
    });
  }, [employees]);

  const toggleLine = (lineKey: keyof typeof activeLines) => {
    setActiveLines(prev => ({ ...prev, [lineKey]: !prev[lineKey] }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-4 shadow-2xl border border-slate-700">
        <p className="text-white font-bold text-sm mb-2">{label} 2025</p>
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-slate-300">{entry.name}:</span>
              </div>
              <span className="text-sm font-bold text-white">{entry.value}</span>
            </div>
          ))}
          <div className="border-t border-slate-700 mt-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Pegawai:</span>
              <span className="text-sm font-semibold text-slate-300">
                {payload[0]?.payload.employeeCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomDot = (props: any) => {
    const { stroke, dataKey } = props;
    const isHovered = hoveredPoint === `${dataKey}-${props.index}`;

    return (
      <Dot
        {...props}
        r={isHovered ? 6 : 4}
        fill={stroke}
        stroke={stroke}
        strokeWidth={isHovered ? 3 : 2}
        className="cursor-pointer transition-all duration-200"
        onMouseEnter={() => setHoveredPoint(`${dataKey}-${props.index}`)}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => toggleLine('avgScore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeLines.avgScore
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          Rata-rata Organisasi
        </button>
        <button
          onClick={() => toggleLine('topPerformer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeLines.topPerformer
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          Top Performer
        </button>
        <button
          onClick={() => toggleLine('bottomPerformer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeLines.bottomPerformer
              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          Bottom Performer
        </button>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[40, 100]}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{
                value: 'Skor',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {activeLines.avgScore && (
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Rata-rata"
                dot={<CustomDot />}
                activeDot={{ r: 8 }}
                animationDuration={500}
              />
            )}
            {activeLines.topPerformer && (
              <Line
                type="monotone"
                dataKey="topPerformer"
                stroke="#10b981"
                strokeWidth={3}
                name="Top Performer"
                dot={<CustomDot />}
                activeDot={{ r: 8 }}
                animationDuration={500}
              />
            )}
            {activeLines.bottomPerformer && (
              <Line
                type="monotone"
                dataKey="bottomPerformer"
                stroke="#ef4444"
                strokeWidth={3}
                name="Bottom Performer"
                dot={<CustomDot />}
                activeDot={{ r: 8 }}
                animationDuration={500}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Trend</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            +{((trendData[trendData.length - 1]?.avgScore || 0) - (trendData[0]?.avgScore || 0)).toFixed(1)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tertinggi</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {Math.max(...trendData.map(d => d.avgScore))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Terendah</p>
          <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
            {Math.min(...trendData.map(d => d.avgScore))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTrendChart;
