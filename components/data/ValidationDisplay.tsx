import React from 'react';
import { ValidationResult, getValidationSeverity } from '../../services/validationService';
import ValidationFeedback from './ValidationFeedback';
import { IconAnalyze } from '../shared/Icons';

export interface ValidationDisplayProps {
  validationResult: ValidationResult | null;
  onClearValidation: () => void;
}

const getSeverityConfig = (severity: string, hasIssues: boolean) => {
  if (!hasIssues) {
    return {
      color: 'green',
      bgClass: 'bg-green-50 border-green-400 dark:bg-green-900/20',
      textClass: 'text-green-800 dark:text-green-200',
      subtextClass: 'text-green-600 dark:text-green-300',
      icon: '✅'
    };
  }

  const configs = {
    critical: {
      color: 'red',
      bgClass: 'bg-red-50 border-red-400 dark:bg-red-900/20',
      textClass: 'text-red-800 dark:text-red-200',
      subtextClass: 'text-red-600 dark:text-red-300',
      icon: '⚠️'
    },
    high: {
      color: 'orange',
      bgClass: 'bg-orange-50 border-orange-400 dark:bg-orange-900/20',
      textClass: 'text-orange-800 dark:text-orange-200',
      subtextClass: 'text-orange-600 dark:text-orange-300',
      icon: '⚠️'
    },
    medium: {
      color: 'yellow',
      bgClass: 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20',
      textClass: 'text-yellow-800 dark:text-yellow-200',
      subtextClass: 'text-yellow-600 dark:text-yellow-300',
      icon: '⚠️'
    },
    low: {
      color: 'blue',
      bgClass: 'bg-blue-50 border-blue-400 dark:bg-blue-900/20',
      textClass: 'text-blue-800 dark:text-blue-200',
      subtextClass: 'text-blue-600 dark:text-blue-300',
      icon: '⚠️'
    }
  };

  return configs[severity as keyof typeof configs] || configs.low;
};

const ValidationDisplay: React.FC<ValidationDisplayProps> = ({
  validationResult,
  onClearValidation
}) => {
  if (!validationResult) {
    return null;
  }

  const severity = getValidationSeverity(validationResult);
  const hasIssues = validationResult.errors.length > 0 || validationResult.warnings.length > 0;
  const config = getSeverityConfig(severity, hasIssues);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <IconAnalyze className="w-5 h-5 mr-2 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Data Validation Results
          </h3>
        </div>
        
        <button
          onClick={onClearValidation}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          ✕ Clear
        </button>
      </div>

      <div className="space-y-4">
        {/* Validation Summary */}
        <div className={`p-4 rounded-lg border-l-4 ${config.bgClass}`}>
          <div className="flex items-center">
            <div className="text-2xl mr-3">
              {config.icon}
            </div>
            <div>
              <h4 className={`font-semibold ${config.textClass}`}>
                {hasIssues ? `Validation Issues Found (${severity.toUpperCase()} severity)` : 'Data Validation Passed'}
              </h4>
              <p className={`text-sm ${config.subtextClass}`}>
                {validationResult.errors.length} errors, {validationResult.warnings.length} warnings
              </p>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {validationResult.summary.totalEmployees}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Employees
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {validationResult.summary.validEmployees}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Valid Employees
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {validationResult.summary.totalCompetencies}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Competencies
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(validationResult.summary.completeness * 100)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completeness
            </div>
          </div>
        </div>

        {/* Detailed Validation Feedback */}
        <ValidationFeedback validation={validationResult} />
      </div>
    </div>
  );
};

export default ValidationDisplay;
