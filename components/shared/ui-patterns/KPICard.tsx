/**
 * KPICard Component
 * 
 * Reusable KPI card component for displaying key metrics.
 */

import React from 'react';
import { Card } from '../../../design-system';

interface KPICardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon element */
  icon?: React.ReactNode;
  /** Additional detail text */
  detail?: string;
  /** Background color style */
  bgColor?: string;
  /** Text color style */
  color?: string;
  /** Whether this is a highlight/featured KPI */
  isHighlight?: boolean;
  /** Custom className */
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  detail,
  bgColor = 'bg-white dark:bg-gray-900',
  color = 'text-gray-900 dark:text-white',
  isHighlight = false,
  className = ''
}) => {
  return (
    <Card 
      variant={isHighlight ? "elevated" : "outlined"} 
      size="md"
      className={`${bgColor} ${className}`}
    >
      <Card.Body className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <div className="mt-2">
              <p className={`${isHighlight ? 'text-3xl' : 'text-2xl'} font-bold ${color}`}>
                {value}
              </p>
              {detail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {detail}
                </p>
              )}
            </div>
          </div>
          
          {icon && (
            <div className={`${bgColor.replace('bg-', 'bg-').replace(/dark:bg-\w+-\d+/, 'dark:bg-gray-800')} p-3 rounded-lg flex-shrink-0`}>
              <div className="w-6 h-6 text-gray-600 dark:text-gray-400">
                {icon}
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default KPICard;
