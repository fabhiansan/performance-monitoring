
import React, { useState, useCallback } from 'react';
import { Employee, CompetencyScore } from '../types';
import { generatePerformanceSummary } from '../services/geminiService';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { IconSparkles, IconUser, IconBriefcase } from './Icons';

interface EmployeeCardProps {
  employee: Employee;
  onSummaryGenerated: (employeeName: string, summary: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl">
        <p className="label font-bold text-gray-900 dark:text-gray-100 mb-1">{`${label}`}</p>
        <p className="intro text-blue-700 dark:text-blue-300 font-medium">{`Score : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};


export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onSummaryGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const summary = await generatePerformanceSummary(employee);
      onSummaryGenerated(employee.name, summary);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [employee, onSummaryGenerated]);

  const chartData = employee.performance.map(p => ({
    subject: p.name.split(' ').slice(0, 2).join(' '), // Shorten long names
    A: p.score,
    fullMark: 100
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
            <IconUser className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{employee.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <IconBriefcase className="w-4 h-4 mr-1.5" />
              {employee.job}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow h-80 w-full p-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke="#a1a1aa" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a1a1aa" />
            <Radar name={employee.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Tooltip content={<CustomTooltip />} />
             <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
            <IconSparkles className="w-5 h-5 mr-2 text-blue-500"/>
            AI Performance Summary
        </h3>
        
        {employee.summary ? (
          <p className="text-gray-700 dark:text-gray-300 text-sm italic leading-relaxed">{employee.summary}</p>
        ) : (
          <div>
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-md shadow-sm hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : "Generate Summary"}
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
