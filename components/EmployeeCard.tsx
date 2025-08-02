
import React from 'react';
import { Employee } from '../types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { IconUser, IconBriefcase } from './Icons';

interface EmployeeCardProps {
  employee: Employee;
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


export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
  // Function to get color based on score range
  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#059669'; // Green for Sangat Baik (85+)
    if (score >= 75) return '#d97706'; // Orange for Baik (75-84)
    if (score >= 65) return '#dc2626'; // Red for Kurang Baik (65-74)
    return '#9333ea'; // Purple for scores below 65
  };

  // Calculate average score for overall color
  const averageScore = employee.performance && employee.performance.length > 0 
    ? employee.performance.reduce((sum, p) => sum + p.score, 0) / employee.performance.length 
    : 0;
  const primaryColor = getScoreColor(averageScore);

  const chartData = employee.performance && employee.performance.length > 0 
    ? employee.performance.map(p => ({
    subject: p.name.split(' ').slice(0, 2).join(' '), // Shorten long names
    A: p.score,
    fullMark: 100
  }))
    : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 p-3 rounded-full" style={{ backgroundColor: `${primaryColor}20` }}>
            <IconUser className={`w-6 h-6 text-[${primaryColor}]`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{employee.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <IconBriefcase className="w-4 h-4 mr-1.5" />
              {employee.organizational_level}
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
            <Radar name={employee.name} dataKey="A" stroke={primaryColor} fill={primaryColor} fillOpacity={0.6} />
            <Tooltip content={<CustomTooltip />} />
             <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
