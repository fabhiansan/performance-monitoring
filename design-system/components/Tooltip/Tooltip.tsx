/**
 * Tooltip Component
 * 
 * An accessible tooltip component that shows helpful information on hover or focus.
 * Supports different positions, triggers, and accessibility features.
 */

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { generateId, type AriaAttributes } from '../../utils/a11y';

// Base tooltip styles
const tooltipBase = [
  // Positioning
  'absolute',
  'z-50',
  'max-w-xs',
  
  // Appearance
  'px-3',
  'py-2',
  'text-sm',
  'font-medium',
  'text-white',
  'bg-gray-900',
  'rounded-lg',
  'shadow-lg',
  
  // Dark mode
  'dark:bg-gray-700',
  'dark:text-gray-100',
  
  // Transitions
  'transition-opacity',
  'duration-200',
  'ease-out',
].join(' ');

// Arrow styles
const arrowBase = [
  'absolute',
  'w-2',
  'h-2',
  'bg-gray-900',
  'dark:bg-gray-700',
  'rotate-45',
].join(' ');

// Tooltip variant styles
const tooltipVariants = createVariantUtil(tooltipBase, {
  visible: {
    true: 'opacity-100',
    false: 'opacity-0 pointer-events-none',
  },
});

// Position calculations
const getPositionClasses = (position: TooltipPosition) => {
  switch (position) {
    case 'top':
      return {
        tooltip: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        arrow: 'top-full left-1/2 transform -translate-x-1/2 -mt-1',
      };
    case 'bottom':
      return {
        tooltip: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        arrow: 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1',
      };
    case 'left':
      return {
        tooltip: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        arrow: 'left-full top-1/2 transform -translate-y-1/2 -ml-1',
      };
    case 'right':
      return {
        tooltip: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
        arrow: 'right-full top-1/2 transform -translate-y-1/2 -mr-1',
      };
    default:
      return {
        tooltip: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        arrow: 'top-full left-1/2 transform -translate-x-1/2 -mt-1',
      };
  }
};

// Tooltip position type
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

// Tooltip trigger type
type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual';

// Tooltip props interface
export interface TooltipProps {
  /** Content to display in tooltip */
  content: React.ReactNode;
  /** Tooltip position relative to trigger */
  position?: TooltipPosition;
  /** How tooltip is triggered */
  trigger?: TooltipTrigger;
  /** Whether tooltip is visible (for manual control) */
  visible?: boolean;
  /** Delay before showing tooltip (ms) */
  showDelay?: number;
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number;
  /** Whether to show arrow */
  showArrow?: boolean;
  /** Custom class name for tooltip */
  className?: string;
  /** Custom class name for arrow */
  arrowClassName?: string;
  /** Children that trigger the tooltip */
  children: React.ReactElement;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * Tooltip Component
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      position = 'top',
      trigger = 'hover',
      visible: controlledVisible,
      showDelay = 200,
      hideDelay = 100,
      showArrow = true,
      className,
      arrowClassName,
      children,
      ariaAttributes,
    },
    ref
  ) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipId = useRef(generateId('tooltip'));
    
    // Use controlled or internal visibility
    const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible;
    
    // Clear timeouts on unmount
    useEffect(() => {
      return () => {
        if (showTimeoutRef.current) {
          clearTimeout(showTimeoutRef.current);
          showTimeoutRef.current = null;
        }
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      };
    }, []);
    
    // Show tooltip with delay
    const showTooltip = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      showTimeoutRef.current = setTimeout(() => {
        setInternalVisible(true);
      }, showDelay);
    };
    
    // Hide tooltip with delay
    const hideTooltip = () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      
      hideTimeoutRef.current = setTimeout(() => {
        setInternalVisible(false);
      }, hideDelay);
    };
    
    // Handle mouse events
    const handleMouseEnter = () => {
      if (trigger === 'hover' || trigger === 'focus') {
        setIsHovered(true);
        showTooltip();
      }
    };
    
    const handleMouseLeave = () => {
      if (trigger === 'hover' || trigger === 'focus') {
        setIsHovered(false);
        if (!isFocused) {
          hideTooltip();
        }
      }
    };
    
    // Handle focus events
    const handleFocus = () => {
      if (trigger === 'focus' || trigger === 'hover') {
        setIsFocused(true);
        showTooltip();
      }
    };
    
    const handleBlur = () => {
      if (trigger === 'focus' || trigger === 'hover') {
        setIsFocused(false);
        if (!isHovered) {
          hideTooltip();
        }
      }
    };
    
    // Handle click events
    const handleClick = () => {
      if (trigger === 'click') {
        if (isVisible) {
          hideTooltip();
        } else {
          showTooltip();
        }
      }
    };
    
    // Get position classes
    const positionClasses = getPositionClasses(position);
    
    // Generate tooltip classes
    const tooltipClasses = tooltipVariants({
      visible: isVisible ? 'true' : 'false',
      className: `${positionClasses.tooltip} ${className || ''}`,
    });
    
    // Generate arrow classes
    const arrowClasses = `${arrowBase} ${positionClasses.arrow} ${arrowClassName || ''}`;
    
    // Clone children with event handlers
    const childEventHandlers = children.props as React.HTMLAttributes<HTMLElement>;

    const triggerProps: React.HTMLAttributes<HTMLElement> = {
      onMouseEnter: (e) => {
        childEventHandlers.onMouseEnter?.(e);
        handleMouseEnter();
      },
      onMouseLeave: (e) => {
        childEventHandlers.onMouseLeave?.(e);
        handleMouseLeave();
      },
      onFocus: (e) => {
        childEventHandlers.onFocus?.(e);
        handleFocus();
      },
      onBlur: (e) => {
        childEventHandlers.onBlur?.(e);
        handleBlur();
      },
      onClick: (e) => {
        childEventHandlers.onClick?.(e);
        handleClick();
      },
      'aria-describedby': isVisible ? tooltipId.current : undefined,
    };

    const triggerElement = React.cloneElement(children, triggerProps);
    
    return (
      <div ref={containerRef} className="relative inline-block">
        {triggerElement}
        
        {/* Tooltip */}
        <div
          ref={ref}
          id={tooltipId.current}
          className={tooltipClasses}
          role="tooltip"
          {...ariaAttributes}
        >
          {content}
          
          {/* Arrow */}
          {showArrow && (
            <div className={arrowClasses} />
          )}
        </div>
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
