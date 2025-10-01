/**
 * Input Component
 * 
 * A flexible input component with validation states, various types, and accessibility features.
 * Supports labels, help text, error messages, and different sizes.
 */

import React, { forwardRef, useState } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { createFormFieldAria, generateId, type AriaAttributes } from '../../utils/a11y';

// Base input styles
const inputBase = [
  // Layout and sizing
  'w-full',
  'inline-flex',
  'items-center',
  'relative',
  
  // Typography
  'font-normal',
  'text-base',
  'leading-normal',
  
  // Appearance
  'bg-white',
  'border',
  'border-gray-300',
  'rounded-md',
  'shadow-sm',
  
  // States
  'transition-all',
  'duration-200',
  'ease-out',
  
  // Focus styles
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-0',
  'focus:ring-blue-500',
  'focus:border-blue-500',
  
  // Hover styles
  'hover:border-gray-400',
  
  // Disabled styles
  'disabled:bg-gray-50',
  'disabled:border-gray-200',
  'disabled:text-gray-500',
  'disabled:cursor-not-allowed',
  
  // Dark mode
  'dark:bg-gray-900',
  'dark:border-gray-600',
  'dark:text-gray-100',
  'dark:hover:border-gray-500',
  'dark:focus:border-blue-400',
  'dark:disabled:bg-gray-800',
  'dark:disabled:border-gray-700',
  'dark:disabled:text-gray-500',
].join(' ');

// Input variant styles
const inputVariants = createVariantUtil(inputBase, {
  size: {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-3 py-2 text-base h-10',
    lg: 'px-4 py-3 text-lg h-12',
  },
  
  state: {
    default: '',
    error: [
      'border-red-500',
      'focus:border-red-500',
      'focus:ring-red-500',
      'dark:border-red-400',
      'dark:focus:border-red-400',
      'dark:focus:ring-red-400',
    ].join(' '),
    success: [
      'border-green-500',
      'focus:border-green-500',
      'focus:ring-green-500',
      'dark:border-green-400',
      'dark:focus:border-green-400',
      'dark:focus:ring-green-400',
    ].join(' '),
    warning: [
      'border-yellow-500',
      'focus:border-yellow-500',
      'focus:ring-yellow-500',
      'dark:border-yellow-400',
      'dark:focus:border-yellow-400',
      'dark:focus:ring-yellow-400',
    ].join(' '),
  },
  
  hasIcon: {
    left: 'pl-10',
    right: 'pr-10',
    both: 'px-10',
    none: '',
  },
});

// Input container styles
const containerBase = 'relative w-full';

// Label styles
const labelBase = [
  'block',
  'text-sm',
  'font-medium',
  'text-gray-700',
  'mb-1',
  'dark:text-gray-300',
].join(' ');

// Help text styles
const helpTextBase = [
  'mt-1',
  'text-sm',
  'text-gray-600',
  'dark:text-gray-400',
].join(' ');

// Error text styles
const errorTextBase = [
  'mt-1',
  'text-sm',
  'text-red-600',
  'dark:text-red-400',
].join(' ');

// Success text styles
const successTextBase = [
  'mt-1',
  'text-sm',
  'text-green-600',
  'dark:text-green-400',
].join(' ');

// Warning text styles
const warningTextBase = [
  'mt-1',
  'text-sm',
  'text-yellow-600',
  'dark:text-yellow-400',
].join(' ');

// Icon container styles
const iconContainerBase = [
  'absolute',
  'inset-y-0',
  'flex',
  'items-center',
  'pointer-events-none',
  'text-gray-400',
  'dark:text-gray-500',
].join(' ');

const leftIconContainer = `${iconContainerBase} left-0 pl-3`;
const rightIconContainer = `${iconContainerBase} right-0 pr-3`;

// Input props interface for input elements
interface BaseInputProps {
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Input state for validation */
  state?: 'default' | 'error' | 'success' | 'warning';
  /** Label text */
  label?: string;
  /** Help text displayed below input */
  helpText?: string;
  /** Error message displayed below input */
  errorMessage?: string;
  /** Success message displayed below input */
  successMessage?: string;
  /** Warning message displayed below input */
  warningMessage?: string;
  /** Left icon element */
  leftIcon?: React.ReactNode;
  /** Right icon element */
  rightIcon?: React.ReactNode;
  /** Whether the input is required */
  required?: boolean;
  /** Custom class name for the input */
  className?: string;
  /** Custom class name for the container */
  containerClassName?: string;
  /** Custom class name for the label */
  labelClassName?: string;
  /** Whether to hide the label visually (still accessible to screen readers) */
  hideLabel?: boolean;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

// Single line input props
interface SingleLineInputProps extends BaseInputProps, Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> {
  /** Whether input is multiline (textarea) */
  multiline?: false;
}

// Multiline input props  
interface MultiLineInputProps extends BaseInputProps, Omit<React.ComponentPropsWithoutRef<'textarea'>, 'size'> {
  /** Whether input is multiline (textarea) */
  multiline: true;
  /** Number of visible text lines for textarea */
  rows?: number;
}

export type InputProps = SingleLineInputProps | MultiLineInputProps;

/**
 * Input Component
 */
export const Input = forwardRef<React.ElementRef<'input'> | React.ElementRef<'textarea'>, InputProps>(
  (
    {
      size = 'md',
      state = 'default',
      label,
      helpText,
      errorMessage,
      successMessage,
      warningMessage,
      leftIcon,
      rightIcon,
      required = false,
      className,
      containerClassName,
      labelClassName,
      hideLabel = false,
      disabled,
      id: providedId,
      ariaAttributes,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs
    const [inputId] = useState(() => providedId || generateId('input'));
    const [helpTextId] = useState(() => generateId('help-text'));
    const [errorId] = useState(() => generateId('error'));
    
    // Determine the actual state based on messages
    const actualState = (() => {
      if (errorMessage) return 'error';
      if (successMessage) return 'success';
      if (warningMessage) return 'warning';
      return state;
    })();
    
    // Determine icon positioning (no icons for multiline)
    const hasIcon = (() => {
      const isMultiline = 'multiline' in props && props.multiline;
      if (isMultiline) return 'none';
      if (leftIcon && rightIcon) return 'both';
      if (leftIcon) return 'left';
      if (rightIcon) return 'right';
      return 'none';
    })();
    
    // Generate input class names
    const inputClasses = inputVariants({
      size,
      state: actualState,
      hasIcon,
      className,
    });
    
    // Create ARIA attributes
    const inputAria = createFormFieldAria({
      label,
      required,
      invalid: actualState === 'error',
      disabled,
      describedBy: helpText ? helpTextId : undefined,
      errorId: errorMessage ? errorId : undefined,
    });
    
    // Combine ARIA attributes
    const allAriaAttributes = {
      ...inputAria,
      ...ariaAttributes,
    };
    
    // Determine feedback message and styles
    const feedbackMessage = errorMessage || successMessage || warningMessage;
    const feedbackClassName = (() => {
      if (errorMessage) return errorTextBase;
      if (successMessage) return successTextBase;
      if (warningMessage) return warningTextBase;
      return helpTextBase;
    })();
    
    return (
      <div className={`${containerBase} ${containerClassName || ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`${labelBase} ${hideLabel ? 'sr-only' : ''} ${labelClassName || ''}`}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {/* Left Icon - only for single line inputs */}
          {leftIcon && !('multiline' in props && props.multiline) && (
            <div className={leftIconContainer}>
              {leftIcon}
            </div>
          )}
          
          {/* Input or Textarea */}
          {('multiline' in props && props.multiline) ? (
            <textarea
              ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
              id={inputId}
              className={inputClasses}
              disabled={disabled}
              required={required}
              rows={('rows' in props && props.rows) ? props.rows : 4}
              {...allAriaAttributes}
              {...(props as Omit<MultiLineInputProps, keyof BaseInputProps>)}
            />
          ) : (
            <input
              ref={ref as React.ForwardedRef<HTMLInputElement>}
              id={inputId}
              className={inputClasses}
              disabled={disabled}
              required={required}
              {...allAriaAttributes}
              {...(props as Omit<SingleLineInputProps, keyof BaseInputProps>)}
            />
          )}
          
          {/* Right Icon - only for single line inputs */}
          {rightIcon && !('multiline' in props && props.multiline) && (
            <div className={rightIconContainer}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {/* Help Text */}
        {helpText && !feedbackMessage && (
          <p id={helpTextId} className={helpTextBase}>
            {helpText}
          </p>
        )}
        
        {/* Feedback Message */}
        {feedbackMessage && (
          <p
            id={errorMessage ? errorId : helpTextId}
            className={feedbackClassName}
            role={actualState === 'error' ? 'alert' : 'status'}
          >
            {feedbackMessage}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;