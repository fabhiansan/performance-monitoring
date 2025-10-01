/**
 * Button Component
 * 
 * A versatile button component with multiple variants, sizes, and states.
 * Supports accessibility features and keyboard navigation.
 */

import React, { forwardRef } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { createButtonAria, keyboard, type AriaAttributes } from '../../utils/a11y';

// Constants
const TEXT_WHITE = 'text-white';

// Base button styles
const buttonBase = [
  // Layout and positioning
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'relative',
  
  // Typography
  'font-medium',
  'text-center',
  'leading-none',
  'whitespace-nowrap',
  
  // Interaction
  'cursor-pointer',
  'select-none',
  'outline-none',
  'transition-all',
  'duration-200',
  'ease-out',
  
  // Focus styles
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-blue-500',
  
  // Disabled styles
  'disabled:cursor-not-allowed',
  'disabled:opacity-50',
  'disabled:pointer-events-none',
  
  // Border and radius
  'border',
  'rounded-md',
].join(' ');

// Variant styles
const buttonVariants = createVariantUtil(buttonBase, {
  variant: {
    primary: [
      'bg-blue-600',
      'border-blue-600',
      TEXT_WHITE,
      'hover:bg-blue-700',
      'hover:border-blue-700',
      'active:bg-blue-800',
      'active:border-blue-800',
    ].join(' '),
    
    secondary: [
      'bg-gray-100',
      'border-gray-300',
      'text-gray-900',
      'hover:bg-gray-200',
      'hover:border-gray-400',
      'active:bg-gray-300',
      'active:border-gray-500',
      'dark:bg-gray-800',
      'dark:border-gray-600',
      'dark:text-gray-100',
      'dark:hover:bg-gray-700',
      'dark:hover:border-gray-500',
      'dark:active:bg-gray-600',
    ].join(' '),
    
    tertiary: [
      'bg-transparent',
      'border-transparent',
      'text-gray-700',
      'hover:bg-gray-100',
      'hover:text-gray-900',
      'active:bg-gray-200',
      'dark:text-gray-300',
      'dark:hover:bg-gray-800',
      'dark:hover:text-gray-100',
      'dark:active:bg-gray-700',
    ].join(' '),
    
    danger: [
      'bg-red-600',
      'border-red-600',
      TEXT_WHITE,
      'hover:bg-red-700',
      'hover:border-red-700',
      'active:bg-red-800',
      'active:border-red-800',
    ].join(' '),
    
    success: [
      'bg-green-600',
      'border-green-600',
      TEXT_WHITE,
      'hover:bg-green-700',
      'hover:border-green-700',
      'active:bg-green-800',
      'active:border-green-800',
    ].join(' '),
    
    warning: [
      'bg-yellow-500',
      'border-yellow-500',
      TEXT_WHITE,
      'hover:bg-yellow-600',
      'hover:border-yellow-600',
      'active:bg-yellow-700',
      'active:border-yellow-700',
    ].join(' '),
    
    outline: [
      'bg-transparent',
      'border-gray-300',
      'text-gray-700',
      'hover:bg-gray-50',
      'hover:border-gray-400',
      'active:bg-gray-100',
      'dark:border-gray-600',
      'dark:text-gray-300',
      'dark:hover:bg-gray-800',
      'dark:hover:border-gray-500',
      'dark:active:bg-gray-700',
    ].join(' '),
  },
  
  size: {
    xs: 'px-2 py-1 text-xs h-6 min-w-[1.5rem]',
    sm: 'px-3 py-1.5 text-sm h-8 min-w-[2rem]',
    md: 'px-4 py-2 text-base h-10 min-w-[2.5rem]',
    lg: 'px-6 py-3 text-lg h-12 min-w-[3rem]',
    xl: 'px-8 py-4 text-xl h-14 min-w-[3.5rem]',
  },
  
  iconOnly: {
    true: 'p-0 aspect-square',
    false: '',
  },
  
  fullWidth: {
    true: 'w-full',
    false: 'w-auto',
  },
  
  loading: {
    true: 'cursor-wait pointer-events-none',
    false: '',
  },
});

// Button props interface
export interface ButtonProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'size'> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'outline';
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether button contains only an icon */
  iconOnly?: boolean;
  /** Whether button should take full width */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
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
  /** Whether button is pressed (for toggle buttons) */
  pressed?: boolean;
  /** Whether button controls an expanded element */
  expanded?: boolean;
  /** ID of element controlled by this button */
  controls?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * Loading Spinner Component
 */
const LoadingSpinner: React.FC<{ size: ButtonProps['size'] }> = ({ size = 'md' }) => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };
  
  return (
    <svg
      className={`animate-spin ${sizeMap[size]}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/**
 * Button Component
 */
export const Button = forwardRef<React.ElementRef<'button'>, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ariaLabel,
      pressed,
      expanded,
      controls,
      ariaAttributes,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // Generate class names
    const buttonClasses = buttonVariants({
      variant,
      size,
      iconOnly: iconOnly ? 'true' : 'false',
      fullWidth: fullWidth ? 'true' : 'false',
      loading: loading ? 'true' : 'false',
      className,
    });
    
    // Create ARIA attributes
    const buttonAria = createButtonAria({
      label: ariaLabel,
      pressed,
      expanded,
      controls,
      disabled: disabled || loading,
    });
    
    // Combine ARIA attributes
    const allAriaAttributes = {
      ...buttonAria,
      ...ariaAttributes,
    };
    
    // Handle keyboard events
    const handleKeyDown = (event: React.KeyboardEvent<React.ElementRef<'button'>>) => {
      if (onKeyDown) {
        onKeyDown(event);
      }
      
      // Handle keyboard activation
      const keyboardHandler = keyboard.createButtonHandler(() => {
        if (onClick && !disabled && !loading) {
          onClick(event as unknown as React.MouseEvent<React.ElementRef<'button'>>);
        }
      });
      
      keyboardHandler(event.nativeEvent);
    };
    
    // Handle click events
    const handleClick = (event: React.MouseEvent<React.ElementRef<'button'>>) => {
      if (!disabled && !loading && onClick) {
        onClick(event);
      }
    };
    
    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...allAriaAttributes}
        {...props}
      >
        {/* Loading state */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size={size} />
          </span>
        )}
        
        {/* Button content */}
        <span className={loading ? 'invisible' : 'flex items-center gap-2'}>
          {leftIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          
          {children && (
            <span className={iconOnly ? 'sr-only' : ''}>{children}</span>
          )}
          
          {rightIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;