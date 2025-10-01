/**
 * Modal Component
 * 
 * An accessible modal dialog component with focus management, keyboard navigation,
 * and backdrop handling. Supports different sizes and animations.
 */

import React, { useEffect, useRef, forwardRef } from 'react';
import { createVariantUtil } from '../../utils/cn';
import { createDialogAria, focus, keyboard, generateId, type AriaAttributes } from '../../utils/a11y';

// Constants for repeated string literals
const ITEMS_CENTER_CLASS = 'items-center';
const JUSTIFY_CENTER_CLASS = 'justify-center';
const BORDER_GRAY_200_CLASS = 'border-gray-200';
const DARK_BORDER_GRAY_700_CLASS = 'dark:border-gray-700';

// Backdrop styles
const backdropBase = [
  // Positioning
  'fixed',
  'inset-0',
  'z-50',
  
  // Appearance
  'bg-black',
  'bg-opacity-50',
  'backdrop-blur-sm',
  
  // Interaction
  'flex',
  ITEMS_CENTER_CLASS,
  JUSTIFY_CENTER_CLASS,
  'p-4',
  
  // Transitions
  'transition-all',
  'duration-300',
  'ease-out',
  
  // Dark mode
  'dark:bg-opacity-70',
].join(' ');

// Modal container styles
const modalBase = [
  // Layout
  'relative',
  'w-full',
  'max-h-full',
  'overflow-y-auto',
  
  // Appearance
  'bg-white',
  'rounded-lg',
  'shadow-xl',
  'border',
  BORDER_GRAY_200_CLASS,
  
  // Dark mode
  'dark:bg-gray-800',
  DARK_BORDER_GRAY_700_CLASS,
  
  // Transitions
  'transition-all',
  'duration-300',
  'ease-out',
  'transform',
].join(' ');

// Modal variant styles
const modalVariants = createVariantUtil(modalBase, {
  size: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full mx-4',
  },
  
  animation: {
    scale: 'scale-100 opacity-100',
    slideUp: 'translate-y-0 opacity-100',
    slideDown: 'translate-y-0 opacity-100',
    fade: 'opacity-100',
  },
});

// Header styles
const headerBase = [
  'flex',
  ITEMS_CENTER_CLASS,
  'justify-between',
  'p-6',
  'border-b',
  BORDER_GRAY_200_CLASS,
  DARK_BORDER_GRAY_700_CLASS,
].join(' ');

// Body styles
const bodyBase = [
  'p-6',
  'text-gray-700',
  'dark:text-gray-300',
].join(' ');

// Footer styles
const footerBase = [
  'flex',
  ITEMS_CENTER_CLASS,
  'justify-end',
  'gap-3',
  'p-6',
  'border-t',
  BORDER_GRAY_200_CLASS,
  DARK_BORDER_GRAY_700_CLASS,
  'bg-gray-50',
  'dark:bg-gray-700',
  'rounded-b-lg',
].join(' ');

// Title styles
const titleBase = [
  'text-lg',
  'font-semibold',
  'text-gray-900',
  'dark:text-gray-100',
].join(' ');

// Close button styles
const closeButtonBase = [
  'inline-flex',
  ITEMS_CENTER_CLASS,
  JUSTIFY_CENTER_CLASS,
  'w-8',
  'h-8',
  'rounded-md',
  'text-gray-400',
  'hover:text-gray-600',
  'hover:bg-gray-100',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-blue-500',
  'transition-colors',
  'duration-200',
  'dark:text-gray-500',
  'dark:hover:text-gray-300',
  'dark:hover:bg-gray-700',
].join(' ');

// Modal props interface
export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Function called when modal should close */
  onClose: () => void;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  /** Animation type */
  animation?: 'scale' | 'slideUp' | 'slideDown' | 'fade';
  /** Modal title */
  title?: React.ReactNode;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing escape closes modal */
  closeOnEscape?: boolean;
  /** Custom class name for modal */
  className?: string;
  /** Custom class name for backdrop */
  backdropClassName?: string;
  /** Custom class name for header */
  headerClassName?: string;
  /** Custom class name for body */
  bodyClassName?: string;
  /** Custom class name for footer */
  footerClassName?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Children content */
  children?: React.ReactNode;
  /** ARIA label for modal */
  ariaLabel?: string;
  /** ID of element that labels the modal */
  ariaLabelledBy?: string;
  /** ID of element that describes the modal */
  ariaDescribedBy?: string;
  /** Additional ARIA attributes */
  ariaAttributes?: AriaAttributes;
}

/**
 * Modal Header Component
 */
export const ModalHeader: React.FC<{
  title?: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}> = ({ title, onClose, showCloseButton = true, className }) => {
  if (!title && !showCloseButton) return null;
  
  return (
    <div className={`${headerBase} ${className || ''}`}>
      {title && (
        <h2 className={titleBase}>
          {title}
        </h2>
      )}
      {showCloseButton && onClose && (
        <button
          type="button"
          className={closeButtonBase}
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Modal Body Component
 */
export const ModalBody: React.FC<{
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
 * Modal Footer Component
 */
export const ModalFooter: React.FC<{
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
 * Compound Modal Interface with proper TypeScript support
 */
interface ModalComponent extends React.ForwardRefExoticComponent<ModalProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
}

/**
 * Main Modal Component
 */
const ModalBase = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      size = 'md',
      animation = 'scale',
      title,
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      className,
      backdropClassName,
      headerClassName,
      bodyClassName,
      footerClassName,
      footer,
      children,
      ariaLabel,
      ariaLabelledBy,
      ariaDescribedBy,
      ariaAttributes,
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = useRef(generateId('modal-title'));
    
    // Focus management
    useEffect(() => {
      if (!open) return;
      
      const focusRestoration = focus.createRestoration();
      focusRestoration.save();
      
      // Focus modal after it opens
      const timer = setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        focusRestoration.restore();
      };
    }, [open]);
    
    // Focus trap
    useEffect(() => {
      if (!open || !modalRef.current) return;
      
      return focus.trapFocus(modalRef.current);
    }, [open]);
    
    // Escape key handling
    useEffect(() => {
      if (!open || !closeOnEscape) return;
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === keyboard.KEYS.ESCAPE) {
          event.preventDefault();
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, onClose]);
    
    // Prevent body scroll when modal is open
    useEffect(() => {
      if (!open) return;
      
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }, [open]);
    
    if (!open) return null;
    
    // Generate modal class names
    const modalClasses = modalVariants({
      size,
      animation,
      className,
    });
    
    // Create ARIA attributes
    const modalAria = createDialogAria({
      label: ariaLabel,
      labelledBy: ariaLabelledBy || (title ? titleId.current : undefined),
      describedBy: ariaDescribedBy,
      modal: true,
    });
    
    // Combine ARIA attributes
    const allAriaAttributes = {
      ...modalAria,
      ...ariaAttributes,
    };
    
    // Handle backdrop click
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    };
    
    return (
      <div
        className={`${backdropBase} ${backdropClassName || ''}`}
        onClick={handleBackdropClick}
      >
        <div
          ref={ref || modalRef}
          className={modalClasses}
          tabIndex={-1}
          {...allAriaAttributes}
        >
          {/* Header */}
          <ModalHeader
            title={
              title && ariaLabelledBy === titleId.current ? (
                <span id={titleId.current}>{title}</span>
              ) : (
                title
              )
            }
            onClose={onClose}
            showCloseButton={showCloseButton}
            className={headerClassName}
          />
          
          {/* Body */}
          <ModalBody className={bodyClassName}>
            {children}
          </ModalBody>
          
          {/* Footer */}
          <ModalFooter className={footerClassName}>
            {footer}
          </ModalFooter>
        </div>
      </div>
    );
  }
);

ModalBase.displayName = 'Modal';

// Create compound component with proper TypeScript support
export const Modal = ModalBase as ModalComponent;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;