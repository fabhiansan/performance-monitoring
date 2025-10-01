/**
 * Advanced Card Variants
 *
 * Specialized card components for common use cases
 */

import React from 'react';
import { Card, type CardProps } from './Card';

/**
 * Stats Card - For displaying KPIs and metrics
 */
interface StatsCardProps extends Omit<CardProps, 'title'> {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  trend?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  trend,
  ...cardProps
}) => {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    negative: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    neutral: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50',
  };

  return (
    <Card variant="elevated" {...cardProps}>
      <Card.Body className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${changeColors[changeType]}`}
              >
                {change}
              </span>
              {trend && <div className="text-gray-500 dark:text-gray-400">{trend}</div>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            {icon}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/**
 * Feature Card - For highlighting features or capabilities
 */
interface FeatureCardProps extends Omit<CardProps, 'title'> {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  action,
  ...cardProps
}) => {
  return (
    <Card
      variant="outlined"
      className="hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-lg group"
      {...cardProps}
    >
      <Card.Body className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </Card.Body>
    </Card>
  );
};

/**
 * Profile Card - For displaying user/employee information
 */
interface ProfileCardProps extends Omit<CardProps, 'title'> {
  avatar?: React.ReactNode;
  name: string;
  role?: string;
  meta?: string;
  actions?: React.ReactNode;
  stats?: Array<{ label: string; value: string | number }>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  avatar,
  name,
  role,
  meta,
  actions,
  stats,
  ...cardProps
}) => {
  return (
    <Card variant="elevated" {...cardProps}>
      <Card.Body>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {avatar && (
            <div className="flex-shrink-0">
              {avatar}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {name}
            </h3>
            {role && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {role}
              </p>
            )}
            {meta && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {meta}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/**
 * Alert Card - For notifications and important messages
 */
interface AlertCardProps extends Omit<CardProps, 'title' | 'variant'> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  variant = 'info',
  title,
  message,
  icon,
  action,
  ...cardProps
}) => {
  const variantStyles = {
    info: {
      container: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-700 dark:text-blue-300',
    },
    success: {
      container: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-100',
      message: 'text-green-700 dark:text-green-300',
    },
    warning: {
      container: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-900 dark:text-yellow-100',
      message: 'text-yellow-700 dark:text-yellow-300',
    },
    error: {
      container: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300',
    },
  };

  const styles = variantStyles[variant];

  const defaultIcons = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <Card
      variant="outlined"
      className={`border-2 ${styles.container}`}
      {...cardProps}
    >
      <Card.Body>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {icon || defaultIcons[variant]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold ${styles.title} mb-1`}>
              {title}
            </h4>
            <p className={`text-sm ${styles.message}`}>
              {message}
            </p>
            {action && (
              <div className="mt-3">
                {action}
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Compact Card - Minimal card for dense layouts
 */
interface CompactCardProps extends Omit<CardProps, 'size'> {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  onClick?: () => void;
}

export const CompactCard: React.FC<CompactCardProps> = ({
  icon,
  label,
  value,
  onClick,
  ...cardProps
}) => {
  return (
    <Card
      variant="outlined"
      size="sm"
      interactive={!!onClick}
      onClick={onClick}
      className="hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200"
      {...cardProps}
    >
      <Card.Body className="flex items-center gap-3 py-3">
        {icon && (
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </Card.Body>
    </Card>
  );
};
