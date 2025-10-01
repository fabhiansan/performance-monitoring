/**
 * Card Component
 * 
 * A flexible card component with header, body, and footer sections.
 * Supports different variants, sizes, and interactive states.
 */

import React, { forwardRef } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { type AriaAttributes } from '../../utils/a11y';

// Constants for repeated string literals
const BORDER_GRAY_200_CLASS = 'border-gray-200';
const DARK_BORDER_GRAY_700_CLASS = 'dark:border-gray-700';

// Base card styles
const cardBase = [
  // Layout
  'relative',
  'flex',
  'flex-col',
  'w-full',
  
  // Appearance
  'bg-white',
  'border',
  BORDER_GRAY_200_CLASS,
  'rounded-lg',
  'shadow-sm',
  
  // Dark mode
  'dark:bg-gray-800',
  DARK_BORDER_GRAY_700_CLASS,
  
  // Transitions
  'transition-all',
  'duration-200',
  'ease-out',
].join(' ');

// Card variant styles
const cardVariants = createVariantUtil(cardBase, {
  variant: {
    default: '',
    elevated: [
      'shadow-md',
      'hover:shadow-lg',
    ].join(' '),
    outlined: [
      'border-2',
      'shadow-none',
    ].join(' '),
    filled: [
      'bg-gray-50',
      'border-gray-300',
      'dark:bg-gray-700',
      'dark:border-gray-600',
    ].join(' '),
  },
  
  size: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  
  interactive: {
    true: [
      'cursor-pointer',
      'hover:shadow-md',
      'hover:border-gray-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-blue-500',
      'dark:hover:border-gray-600',
    ].join(' '),
    false: '',
  },
  
  fullHeight: {
    true: 'h-full',
    false: '',
  },
});

// Header styles
const headerBase = [
  'flex',
  'items-center',
  'justify-between',
  'pb-4',
  'border-b',
  BORDER_GRAY_200_CLASS,
  DARK_BORDER_GRAY_700_CLASS,
  'mb-4',
].join(' ');

// Body styles
const bodyBase = [
  'flex-1',
  'text-gray-700',
  'dark:text-gray-300',
].join(' ');

// Footer styles
const footerBase = [
  'flex',
  'items-center',
  'justify-between',
  'pt-4',
  'border-t',
  BORDER_GRAY_200_CLASS,
  DARK_BORDER_GRAY_700_CLASS,
  'mt-4',
].join(' ');

// Title styles
const titleBase = [
  'text-lg',
  'font-semibold',
  'text-gray-900',
  'dark:text-gray-100',
].join(' ');

// Subtitle styles
const subtitleBase = [
  'text-sm',
  'font-normal',
  'text-gray-600',
  'dark:text-gray-400',
  'mt-1',
].join(' ');

// Card props interface
export interface CardProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  /** Card size (affects padding) */
  size?: 'sm' | 'md' | 'lg';
  /** Whether card is interactive (clickable) */
  interactive?: boolean;
  /** Whether card should take full height */
  fullHeight?: boolean;
  /** Card title */
  title?: React.ReactNode;
  /** Card subtitle */
  subtitle?: React.ReactNode;
  /** Header actions (typically buttons) */
  headerActions?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Custom class name for header */
  headerClassName?: string;
  /** Custom class name for body */
  bodyClassName?: string;
  /** Custom class name for footer */
  footerClassName?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * Card Header Component
 */
export const CardHeader: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, actions, className }) => {
  if (!title && !subtitle && !actions) return null;
  
  return (
    <div className={`${headerBase} ${className || ''}`}>
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className={titleBase}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={subtitleBase}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * Card Body Component
 */
export const CardBody: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={`${bodyBase} ${className || ''}`}>
      {children}
    </div>
  );
};

/**
 * Card Footer Component
 */
export const CardFooter: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  if (!children) return null;
  
  return (
    <div className={`${footerBase} ${className || ''}`}>
      {children}
    </div>
  );
};

/**
 * Compound Card Interface with proper TypeScript support
 */
interface CardComponent extends React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
}

/**
 * Main Card Component
 */
const CardBase = forwardRef<React.ElementRef<'div'>, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      interactive = false,
      fullHeight = false,
      title,
      subtitle,
      headerActions,
      footer,
      children,
      className,
      headerClassName,
      bodyClassName,
      footerClassName,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      ariaAttributes,
      ...props
    },
    ref
  ) => {
    // Generate card class names
    const cardClasses = cardVariants({
      variant,
      size,
      interactive: interactive ? 'true' : 'false',
      fullHeight: fullHeight ? 'true' : 'false',
      className,
    });
    
    // Handle keyboard navigation for interactive cards
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (onKeyDown) {
        onKeyDown(event);
      }
      
      if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
    };
    
    // Determine ARIA attributes
    const cardRole = role || (interactive ? 'button' : undefined);
    const cardTabIndex = interactive ? (tabIndex ?? 0) : tabIndex;
    
    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={interactive ? onClick : undefined}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        tabIndex={cardTabIndex}
        role={cardRole}
        {...ariaAttributes}
        {...props}
      >
        {/* Header */}
        <CardHeader
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          className={headerClassName}
        />
        
        {/* Body */}
        <CardBody className={bodyClassName}>
          {children}
        </CardBody>
        
        {/* Footer */}
        <CardFooter className={footerClassName}>
          {footer}
        </CardFooter>
      </div>
    );
  }
);

CardBase.displayName = 'Card';

// Create compound component with proper TypeScript support
export const Card = CardBase as CardComponent;
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;