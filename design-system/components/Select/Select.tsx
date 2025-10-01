/**
 * Select Component
 * 
 * A flexible select dropdown component with validation states, search functionality,
 * and accessibility features. Supports labels, help text, error messages, and different sizes.
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { createFormFieldAria, generateId, keyboard, type AriaAttributes } from '../../utils/a11y';

// Base select styles (similar to input)
const selectBase = [
  // Layout and sizing
  'w-full',
  'relative',
  'inline-block',
  
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
  
  // Cursor
  'cursor-pointer',
  
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

// Select variant styles
const selectVariants = createVariantUtil(selectBase, {
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
  
  isOpen: {
    true: 'ring-2 ring-blue-500 border-blue-500 dark:ring-blue-400 dark:border-blue-400',
    false: '',
  },
});

// Dropdown styles
const dropdownBase = [
  'absolute',
  'z-[9999]',
  'w-full',
  'mt-1',
  'bg-white',
  'border',
  'border-gray-300',
  'rounded-md',
  'shadow-lg',
  'max-h-60',
  'overflow-y-auto',
  'dark:bg-gray-900',
  'dark:border-gray-600',
].join(' ');

// Option styles
const optionBase = [
  'px-3',
  'py-2',
  'cursor-pointer',
  'select-none',
  'text-gray-900',
  'dark:text-gray-100',
].join(' ');

const optionVariants = createVariantUtil(optionBase, {
  highlighted: {
    true: 'bg-blue-500 text-white',
    false: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  
  selected: {
    true: 'bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
    false: '',
  },
});

// Label styles
const labelBase = [
  'block',
  'text-sm',
  'font-medium',
  'text-gray-700',
  'dark:text-gray-300',
  'mb-1',
].join(' ');

// Help text styles
const helpTextBase = [
  'mt-1',
  'text-xs',
  'text-gray-600',
  'dark:text-gray-400',
].join(' ');

// Error text styles
const errorTextBase = [
  'mt-1',
  'text-xs',
  'text-red-600',
  'dark:text-red-400',
].join(' ');

// Option interface
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Select props interface
export interface SelectProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  /** Select options */
  options: SelectOption[];
  /** Current value */
  value?: string | number;
  /** Default value for uncontrolled component */
  defaultValue?: string | number;
  /** Change handler */
  onChange?: (_value: string | number) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Select size */
  size?: 'sm' | 'md' | 'lg';
  /** Validation state */
  state?: 'default' | 'error' | 'success' | 'warning';
  /** Whether select is disabled */
  disabled?: boolean;
  /** Whether select is required */
  required?: boolean;
  /** Select label */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Custom class name */
  className?: string;
  /** Custom class name for dropdown */
  dropdownClassName?: string;
  /** Custom class name for options */
  optionClassName?: string;
  /** Whether to enable search functionality */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** No options message */
  noOptionsMessage?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * ChevronDown Icon Component
 */
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * Select Component
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'Select an option...',
      size = 'md',
      state = 'default',
      disabled = false,
      required = false,
      label,
      helpText,
      error,
      className,
      dropdownClassName,
      optionClassName,
      searchable = false,
      searchPlaceholder = 'Search...',
      noOptionsMessage = 'No options found',
      ariaAttributes,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    const selectId = useRef(generateId('select'));
    const labelId = useRef(generateId('select-label'));
    const helpTextId = useRef(generateId('select-help'));
    const errorId = useRef(generateId('select-error'));
    
    // Use controlled or uncontrolled value
    const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
    
    // Filter options based on search
    const filteredOptions = searchable && searchQuery
      ? options.filter(option =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;
    
    // Find selected option
    const selectedOption = options.find(option => option.value === currentValue);
    
    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && event.target && !selectRef.current.contains(event.target as HTMLElement)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }

      return undefined;
    }, [isOpen]);
    
    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);
    
    // Reset highlighted index when options change
    useEffect(() => {
      setHighlightedIndex(-1);
    }, [filteredOptions]);
    
    // Handle option selection
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return;
      
      const newValue = option.value;
      setInternalValue(newValue);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
      
      if (onChange) {
        onChange(newValue);
      }
    };
    
    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      switch (event.key) {
        case keyboard.KEYS.ENTER:
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
          
        case keyboard.KEYS.ESCAPE:
          event.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
          
        case keyboard.KEYS.ARROW_DOWN:
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex(prev => 
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
          
        case keyboard.KEYS.ARROW_UP:
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex(prev => 
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;
          
        case keyboard.KEYS.TAB:
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };
    
    // Handle select trigger click
    const handleTriggerClick = () => {
      if (disabled) return;
      setIsOpen(!isOpen);
    };
    
    // Generate class names
    const selectClasses = selectVariants({
      size,
      state: error ? 'error' : state,
      isOpen: isOpen ? 'true' : 'false',
      className,
    });
    
    // Create ARIA attributes
    const selectAria = createFormFieldAria({
      label,
      required,
      disabled,
      invalid: !!error,
      describedBy: [
        helpText && helpTextId.current,
        error && errorId.current,
      ].filter(Boolean).join(' ') || undefined,
    });
    
    // Combine ARIA attributes
    const allAriaAttributes = {
      ...selectAria,
      ...ariaAttributes,
    };
    
    return (
      <div className="w-full" {...props}>
        {/* Label */}
        {label && (
          <label
            id={labelId.current}
            htmlFor={selectId.current}
            className={labelBase}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {/* Select Container */}
        <div
          ref={selectRef}
          className="relative"
        >
          {/* Select Trigger */}
          <div
            ref={ref}
            id={selectId.current}
            className={selectClasses}
            onClick={handleTriggerClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-labelledby={label ? labelId.current : undefined}
            {...allAriaAttributes}
          >
            <span className="block truncate text-left">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </span>
          </div>
          
          {/* Dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className={`${dropdownBase} ${dropdownClassName || ''}`}
              role="listbox"
              aria-labelledby={label ? labelId.current : undefined}
            >
              {/* Search Input */}
              {searchable && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              )}
              
              {/* Options */}
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                  {noOptionsMessage}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={optionVariants({
                      highlighted: index === highlightedIndex ? 'true' : 'false',
                      selected: option.value === currentValue ? 'true' : 'false',
                      className: optionClassName,
                    })}
                    onClick={() => handleOptionSelect(option)}
                    role="option"
                    aria-selected={option.value === currentValue}
                    aria-disabled={option.disabled}
                  >
                    {option.label}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Help Text */}
        {helpText && !error && (
          <p id={helpTextId.current} className={helpTextBase}>
            {helpText}
          </p>
        )}
        
        {/* Error Message */}
        {error && (
          <p id={errorId.current} className={errorTextBase}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
