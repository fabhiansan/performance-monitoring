/**
 * Alert Component
 * 
 * A flexible alert component for displaying important messages, notifications,
 * and status updates. Supports different variants, icons, and dismissible states.
 */

import React, { forwardRef, useState } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { type AriaAttributes } from '../../utils/a11y';

// Constants for repeated string literals
const TEXT_CURRENT_CLASS = 'text-current';

// Base alert styles
const alertBase = [
  // Layout
  'relative',
  'w-full',
  'flex',
  'items-start',
  'gap-3',
  
  // Appearance
  'border',
  'rounded-lg',
  'shadow-sm',
  
  // Typography
  'text-sm',
  'leading-relaxed',
  
  // Transitions
  'transition-all',
  'duration-200',
  'ease-out',
].join(' ');

// Alert variant styles
const alertVariants = createVariantUtil(alertBase, {
  variant: {
    info: [
      'bg-blue-50',
      'border-blue-200',
      'text-blue-800',
      'dark:bg-blue-950',
      'dark:border-blue-800',
      'dark:text-blue-200',
    ].join(' '),
    
    success: [
      'bg-green-50',
      'border-green-200',
      'text-green-800',
      'dark:bg-green-950',
      'dark:border-green-800',
      'dark:text-green-200',
    ].join(' '),
    
    warning: [
      'bg-yellow-50',
      'border-yellow-200',
      'text-yellow-800',
      'dark:bg-yellow-950',
      'dark:border-yellow-800',
      'dark:text-yellow-200',
    ].join(' '),
    
    error: [
      'bg-red-50',
      'border-red-200',
      'text-red-800',
      'dark:bg-red-950',
      'dark:border-red-800',
      'dark:text-red-200',
    ].join(' '),
  },
  
  size: {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  },
});

// Icon container styles
const iconContainerBase = [
  'flex-shrink-0',
  'w-5',
  'h-5',
  'mt-0.5',
].join(' ');

// Close button styles
const closeButtonBase = [
  'absolute',
  'top-3',
  'right-3',
  'inline-flex',
  'items-center',
  'justify-center',
  'w-6',
  'h-6',
  'rounded-md',
  TEXT_CURRENT_CLASS,
  'opacity-60',
  'hover:opacity-80',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-current',
  'transition-opacity',
  'duration-200',
].join(' ');

// Title styles
const titleBase = [
  'font-semibold',
  TEXT_CURRENT_CLASS,
  'mb-1',
].join(' ');

// Content styles
const contentBase = [
  'flex-1',
  TEXT_CURRENT_CLASS,
].join(' ');

// Alert props interface
export interface AlertProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  /** Alert variant */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Alert size */
  size?: 'sm' | 'md' | 'lg';
  /** Alert title */
  title?: React.ReactNode;
  /** Whether alert is dismissible */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Whether to show default icon */
  showIcon?: boolean;
  /** Children content */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * Default Icons for each variant
 */
const DefaultIcons = {
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/**
 * Close Icon Component
 */
const CloseIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * Alert Component
 */
export const Alert = forwardRef<React.ElementRef<'div'>, AlertProps>(
  (
    {
      variant = 'info',
      size = 'md',
      title,
      dismissible = false,
      onDismiss,
      icon,
      showIcon = true,
      children,
      className,
      role = 'alert',
      ariaAttributes,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);
    
    // Handle dismiss
    const handleDismiss = () => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    };
    
    // Don't render if dismissed
    if (!isVisible) return null;
    
    // Generate class names
    const alertClasses = alertVariants({
      variant,
      size,
      className,
    });
    
    // Determine icon to show
    const iconToShow = icon || (showIcon ? DefaultIcons[variant] : null);
    
    return (
      <div
        ref={ref}
        className={alertClasses}
        role={role}
        {...ariaAttributes}
        {...props}
      >
        {/* Icon */}
        {iconToShow && (
          <div className={iconContainerBase}>
            {iconToShow}
          </div>
        )}
        
        {/* Content */}
        <div className={contentBase}>
          {/* Title */}
          {title && (
            <div className={titleBase}>
              {title}
            </div>
          )}
          
          {/* Children */}
          {children}
        </div>
        
        {/* Dismiss Button */}
        {dismissible && (
          <button
            type="button"
            className={closeButtonBase}
            onClick={handleDismiss}
            aria-label="Dismiss alert"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;