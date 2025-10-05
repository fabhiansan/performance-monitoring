import React, { useState } from 'react';
import { Employee } from '../../../types';

interface CompetencyHeatMapProps {
  employees: Employee[];
}

interface HeatMapCell {
  level: string;
  competency: string;
  score: number;
  count: number;
}

const CompetencyHeatMap: React.FC<CompetencyHeatMapProps> = ({ employees }) => {
  const [hoveredCell, setHoveredCell] = useState<{ level: string; competency: string } | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'count'>('score');

  // Generate heat map data
  const { heatMapData, levels, competencies } = React.useMemo(() => {
    const dataMap = new Map<string, Map<string, { total: number; count: number }>>();
    const levelSet = new Set<string>();
    const competencySet = new Set<string>();

    employees.forEach(emp => {
      const level = emp.organizational_level || 'Tidak Diketahui';
      levelSet.add(level);

      if (!dataMap.has(level)) {
        dataMap.set(level, new Map());
      }

      emp.performance?.forEach(perf => {
        competencySet.add(perf.name);
        const levelData = dataMap.get(level)!;
        const existing = levelData.get(perf.name) || { total: 0, count: 0 };
        levelData.set(perf.name, {
          total: existing.total + perf.score,
          count: existing.count + 1,
        });
      });
    });

    const levels = Array.from(levelSet).sort();
    const competencies = Array.from(competencySet)
      .sort()
      .slice(0, 10); // Top 10 competencies

    const heatMapData: HeatMapCell[] = [];

    levels.forEach(level => {
      competencies.forEach(competency => {
        const data = dataMap.get(level)?.get(competency);
        if (data) {
          heatMapData.push({
            level,
            competency,
            score: Number((data.total / data.count).toFixed(1)),
            count: data.count,
          });
        } else {
          heatMapData.push({
            level,
            competency,
            score: 0,
            count: 0,
          });
        }
      });
    });

    return { heatMapData, levels, competencies };
  }, [employees]);

  const getColorByScore = (score: number): string => {
    if (score === 0) return '#f1f5f9'; // slate-100
    if (score >= 90) return '#10b981'; // emerald-500
    if (score >= 80) return '#3b82f6'; // blue-500
    if (score >= 70) return '#f59e0b'; // amber-500
    if (score >= 60) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getColorByCount = (count: number, maxCount: number): string => {
    if (count === 0) return '#f1f5f9'; // slate-100
    const ratio = count / maxCount;
    if (ratio >= 0.8) return '#10b981'; // emerald-500
    if (ratio >= 0.6) return '#3b82f6'; // blue-500
    if (ratio >= 0.4) return '#f59e0b'; // amber-500
    if (ratio >= 0.2) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const maxCount = Math.max(...heatMapData.map(d => d.count), 1);

  const getCellColor = (cell: HeatMapCell): string => {
    if (selectedMetric === 'score') {
      return getColorByScore(cell.score);
    }
    return getColorByCount(cell.count, maxCount);
  };

  const getTextColor = (bgColor: string): string => {
    // Light colors need dark text
    if (bgColor === '#f1f5f9') return '#334155';
    return '#ffffff';
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (heatMapData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">
          Tidak ada data untuk heat map
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMetric('score')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedMetric === 'score'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tampilkan Skor
          </button>
          <button
            onClick={() => setSelectedMetric('count')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedMetric === 'count'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tampilkan Jumlah Data
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedMetric === 'score' ? 'Skor:' : 'Jumlah:'}
          </span>
          {selectedMetric === 'score' ? (
            <>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">&lt;60</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">60-69</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">70-79</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">80-89</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">≥90</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">Rendah</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">Tinggi</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Heat Map */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex bg-slate-50 dark:bg-slate-900">
            <div className="w-40 p-3 border-r border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Level / Kompetensi
              </span>
            </div>
            {competencies.map(comp => (
              <div
                key={comp}
                className="w-32 p-3 border-r border-b border-slate-200 dark:border-slate-700"
              >
                <span
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 block truncate"
                  title={comp}
                >
                  {truncateText(comp, 15)}
                </span>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {levels.map(level => (
            <div key={level} className="flex">
              <div className="w-40 p-3 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <span
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate"
                  title={level}
                >
                  {truncateText(level, 18)}
                </span>
              </div>
              {competencies.map(comp => {
                const cell = heatMapData.find(
                  d => d.level === level && d.competency === comp
                );
                const bgColor = cell ? getCellColor(cell) : '#f1f5f9';
                const textColor = getTextColor(bgColor);
                const isHovered =
                  hoveredCell?.level === level && hoveredCell?.competency === comp;

                return (
                  <div
                    key={`${level}-${comp}`}
                    className={`w-32 p-3 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-200 ${
                      isHovered ? 'ring-2 ring-blue-500 z-10 scale-105' : ''
                    }`}
                    style={{ backgroundColor: bgColor }}
                    onMouseEnter={() => setHoveredCell({ level, competency: comp })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={
                      cell
                        ? `${comp}\n${level}\nSkor: ${cell.score}\nData: ${cell.count} pegawai`
                        : 'Tidak ada data'
                    }
                  >
                    <div className="text-center">
                      <span
                        className="text-sm font-bold block"
                        style={{ color: textColor }}
                      >
                        {cell ? (selectedMetric === 'score' ? cell.score : cell.count) : '-'}
                      </span>
                      {cell && cell.count > 0 && (
                        <span className="text-xs opacity-75" style={{ color: textColor }}>
                          {selectedMetric === 'score' ? `(${cell.count})` : `(${cell.score})`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Details */}
      {hoveredCell && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Level Organisasi</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {hoveredCell.level}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kompetensi</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {hoveredCell.competency}
              </p>
            </div>
            {(() => {
              const cell = heatMapData.find(
                d => d.level === hoveredCell.level && d.competency === hoveredCell.competency
              );
              if (!cell) return null;
              return (
                <>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Skor Rata-rata</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {cell.score}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Jumlah Data</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {cell.count} pegawai
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyHeatMap;
