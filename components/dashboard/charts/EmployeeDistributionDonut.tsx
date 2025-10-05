import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { Employee } from '../../../types';

interface EmployeeDistributionDonutProps {
  employees: Employee[];
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

const EmployeeDistributionDonut: React.FC<EmployeeDistributionDonutProps> = ({ employees }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const distributionData = React.useMemo<DistributionData[]>(() => {
    const levelMap = new Map<string, number>();

    employees.forEach(employee => {
      const level = employee.organizational_level || 'Tidak Diketahui';
      levelMap.set(level, (levelMap.get(level) || 0) + 1);
    });

    const total = employees.length;

    return Array.from(levelMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
        percentage: Number(((value / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-4 shadow-2xl border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <p className="text-white font-bold text-sm">{data.name}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-slate-300">Jumlah Pegawai:</span>
            <span className="text-sm font-bold text-white">{data.value} orang</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs text-slate-300">Persentase:</span>
            <span className="text-sm font-bold text-emerald-400">{data.percentage}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="transition-all duration-300"
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 16}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (distributionData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">
          Tidak ada data distribusi pegawai
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.percentage}%`}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              activeShape={activeIndex !== null ? renderActiveShape : undefined}
              animationDuration={800}
            >
              {distributionData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="cursor-pointer transition-all duration-300"
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {employees.length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Pegawai</p>
        </div>
      </div>

      {/* Distribution List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {distributionData.map((item, index) => {
          const isActive = activeIndex === index;

          return (
            <div
              key={item.name}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: item.color }}>
                    {item.percentage}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Level</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {distributionData.length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Level Terbesar</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate px-2">
            {distributionData[0]?.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {distributionData[0]?.value} orang
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Level Terkecil</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate px-2">
            {distributionData[distributionData.length - 1]?.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {distributionData[distributionData.length - 1]?.value} orang
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDistributionDonut;
