/**
 * LoadingState Component
 * 
 * Reusable loading state component with consistent styling and animation.
 */

import React from 'react';
import { IconSparkles } from '../Icons';
import { ANIMATION } from '../../../constants/ui';

interface LoadingStateProps {
  /** Message to display during loading */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-12',
      icon: 'w-8 h-8',
      text: 'text-base'
    },
    md: {
      container: 'py-16',
      icon: 'w-12 h-12',
      text: 'text-lg'
    },
    lg: {
      container: 'py-24',
      icon: 'w-16 h-16',
      text: 'text-xl'
    }
  };

  const styles = sizeClasses[size];

  return (
    <div className={`text-center ${styles.container} ${className}`}>
      <div 
        className={`${styles.icon} mx-auto text-blue-500 animate-pulse mb-4`}
        style={{ animationDuration: ANIMATION.SLOW }}
      >
        <IconSparkles className="w-full h-full" />
      </div>
      <p className={`${styles.text} text-gray-600 dark:text-gray-400`}>
        {message}
      </p>
    </div>
  );
};

export default LoadingState;
