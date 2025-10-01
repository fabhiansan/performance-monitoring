/**
 * Badge Component
 * 
 * A flexible badge component for status indicators, labels, and tags.
 * Supports different variants, sizes, and interactive states.
 */

import React, { forwardRef } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { type AriaAttributes } from '../../utils/a11y';

// Base badge styles
const badgeBase = [
  // Layout
  'inline-flex',
  'items-center',
  'gap-1',
  'justify-center',
  
  // Typography
  'font-medium',
  'text-center',
  'leading-none',
  'whitespace-nowrap',
  
  // Appearance
  'rounded-full',
  'border',
  
  // Transitions
  'transition-all',
  'duration-200',
  'ease-out',
].join(' ');

// Badge variant styles
const badgeVariants = createVariantUtil(badgeBase, {
  variant: {
    default: [
      'bg-gray-100',
      'border-gray-200',
      'text-gray-800',
      'dark:bg-gray-800',
      'dark:border-gray-700',
      'dark:text-gray-200',
    ].join(' '),
    
    primary: [
      'bg-blue-100',
      'border-blue-200',
      'text-blue-800',
      'dark:bg-blue-900',
      'dark:border-blue-800',
      'dark:text-blue-200',
    ].join(' '),
    
    secondary: [
      'bg-purple-100',
      'border-purple-200',
      'text-purple-800',
      'dark:bg-purple-900',
      'dark:border-purple-800',
      'dark:text-purple-200',
    ].join(' '),
    
    success: [
      'bg-green-100',
      'border-green-200',
      'text-green-800',
      'dark:bg-green-900',
      'dark:border-green-800',
      'dark:text-green-200',
    ].join(' '),
    
    warning: [
      'bg-yellow-100',
      'border-yellow-200',
      'text-yellow-800',
      'dark:bg-yellow-900',
      'dark:border-yellow-800',
      'dark:text-yellow-200',
    ].join(' '),
    
    danger: [
      'bg-red-100',
      'border-red-200',
      'text-red-800',
      'dark:bg-red-900',
      'dark:border-red-800',
      'dark:text-red-200',
    ].join(' '),
    
    info: [
      'bg-cyan-100',
      'border-cyan-200',
      'text-cyan-800',
      'dark:bg-cyan-900',
      'dark:border-cyan-800',
      'dark:text-cyan-200',
    ].join(' '),
    
    outline: [
      'bg-transparent',
      'border-gray-300',
      'text-gray-700',
      'dark:border-gray-600',
      'dark:text-gray-300',
    ].join(' '),
  },
  
  size: {
    xs: 'px-1.5 py-0.5 text-xs h-4 min-w-[1rem]',
    sm: 'px-2 py-0.5 text-xs h-5 min-w-[1.25rem]',
    md: 'px-2.5 py-1 text-sm h-6 min-w-[1.5rem]',
    lg: 'px-3 py-1 text-base h-7 min-w-[1.75rem]',
    xl: 'px-3.5 py-1.5 text-lg h-8 min-w-[2rem]',
  },
  
  interactive: {
    true: [
      'cursor-pointer',
      'hover:shadow-sm',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-blue-500',
    ].join(' '),
    false: '',
  },
  
  dot: {
    true: 'p-0 w-2 h-2 min-w-0',
    false: '',
  },
});

// Badge props interface
export interface BadgeProps extends Omit<React.ComponentPropsWithoutRef<'span'>, 'size'> {
  /** Badge variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  /** Badge size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether badge is interactive (clickable) */
  interactive?: boolean;
  /** Whether to display as a dot only */
  dot?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Children content */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
  /** Click handler for interactive badges */
  onClick?: React.MouseEventHandler<React.ElementRef<'span'>>;
  /** Keyboard event handler */
  onKeyDown?: React.KeyboardEventHandler<React.ElementRef<'span'>>;
}

/**
 * Badge Component
 */
export const Badge = forwardRef<React.ElementRef<'span'>, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      interactive = false,
      dot = false,
      leftIcon,
      rightIcon,
      children,
      className,
      ariaLabel,
      ariaAttributes,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      ...props
    },
    ref
  ) => {
    // Generate class names
    const badgeClasses = badgeVariants({
      variant,
      size,
      interactive: interactive ? 'true' : 'false',
      dot: dot ? 'true' : 'false',
      className,
    });
    
    // Handle keyboard events for interactive badges
    const handleKeyDown = (event: React.KeyboardEvent<React.ElementRef<'span'>>) => {
      if (onKeyDown) {
        onKeyDown(event);
      }
      
      // Handle keyboard activation for interactive badges
      if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick(event as unknown as React.MouseEvent<React.ElementRef<'span'>>);
      }
    };
    
    // Handle click events
    const handleClick = (event: React.MouseEvent<React.ElementRef<'span'>>) => {
      if (interactive && onClick) {
        onClick(event);
      }
    };
    
    // Determine ARIA attributes
    const badgeRole = role || (interactive ? 'button' : undefined);
    const badgeTabIndex = interactive ? (tabIndex ?? 0) : tabIndex;
    const badgeAriaLabel = ariaLabel || (dot ? 'Status indicator' : undefined);
    
    // For dot badges, don't render content
    const content = dot ? null : (
      <>
        {leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        {children && (
          <span className="truncate">{children}</span>
        )}
        
        {rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </>
    );
    
    return (
      <span
        ref={ref}
        className={badgeClasses}
        onClick={interactive ? handleClick : onClick}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        tabIndex={badgeTabIndex}
        role={badgeRole}
        aria-label={badgeAriaLabel}
        {...ariaAttributes}
        {...props}
      >
        {content}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;