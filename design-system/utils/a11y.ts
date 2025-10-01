/**
 * Accessibility Utilities
 * 
 * Utilities for improving accessibility, ARIA support, and keyboard navigation.
 */

/**
 * ARIA role definitions for common components
 */
export const ARIA_ROLES = {
  button: 'button',
  link: 'link',
  tab: 'tab',
  tabpanel: 'tabpanel',
  tablist: 'tablist',
  dialog: 'dialog',
  alertdialog: 'alertdialog',
  alert: 'alert',
  status: 'status',
  menu: 'menu',
  menuitem: 'menuitem',
  menubar: 'menubar',
  tooltip: 'tooltip',
  combobox: 'combobox',
  listbox: 'listbox',
  option: 'option',
  radiogroup: 'radiogroup',
  radio: 'radio',
  checkbox: 'checkbox',
  switch: 'switch',
  slider: 'slider',
  progressbar: 'progressbar',
  separator: 'separator',
  heading: 'heading',
  banner: 'banner',
  navigation: 'navigation',
  main: 'main',
  contentinfo: 'contentinfo',
  complementary: 'complementary',
  region: 'region',
  article: 'article',
  section: 'section',
  list: 'list',
  listitem: 'listitem',
  grid: 'grid',
  gridcell: 'gridcell',
  row: 'row',
  table: 'table',
  presentation: 'presentation',
  none: 'none',
} as const;

export type AriaRole = typeof ARIA_ROLES[keyof typeof ARIA_ROLES];

/**
 * Common ARIA attributes interface
 */
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean | 'false' | 'true';
  'aria-hidden'?: boolean | 'false' | 'true';
  'aria-disabled'?: boolean | 'false' | 'true';
  'aria-required'?: boolean | 'false' | 'true';
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean | 'false' | 'true';
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-selected'?: boolean | 'false' | 'true';
  'aria-checked'?: boolean | 'false' | 'true' | 'mixed';
  'aria-pressed'?: boolean | 'false' | 'true' | 'mixed';
  'aria-current'?: boolean | 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-busy'?: boolean | 'false' | 'true';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  'aria-level'?: number;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-multiselectable'?: boolean | 'false' | 'true';
  'aria-readonly'?: boolean | 'false' | 'true';
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  role?: AriaRole;
}

/**
 * Generates unique IDs for accessibility
 * 
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 * 
 * @example
 * generateId('button') // 'button-abc123'
 * generateId('input') // 'input-def456'
 */
export function generateId(prefix: string = 'ds'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Creates ARIA attributes for form fields
 * 
 * @param options - Form field options
 * @returns ARIA attributes object
 * 
 * @example
 * createFormFieldAria({
 *   label: 'Email',
 *   required: true,
 *   invalid: false,
 *   describedBy: 'email-help'
 * })
 */
export function createFormFieldAria(options: {
  label?: string;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  errorId?: string;
}): AriaAttributes {
  const attrs: AriaAttributes = {};
  
  if (options.label) {
    attrs['aria-label'] = options.label;
  }
  
  if (options.required) {
    attrs['aria-required'] = true;
  }
  
  if (options.invalid) {
    attrs['aria-invalid'] = true;
  }
  
  if (options.disabled) {
    attrs['aria-disabled'] = true;
  }
  
  if (options.describedBy) {
    attrs['aria-describedby'] = options.invalid && options.errorId 
      ? `${options.describedBy} ${options.errorId}`
      : options.describedBy;
  } else if (options.invalid && options.errorId) {
    attrs['aria-describedby'] = options.errorId;
  }
  
  return attrs;
}

/**
 * Creates ARIA attributes for buttons
 * 
 * @param options - Button options
 * @returns ARIA attributes object
 */
export function createButtonAria(options: {
  label?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  describedBy?: string;
  disabled?: boolean;
  haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}): AriaAttributes {
  const attrs: AriaAttributes = {
    role: 'button',
  };
  
  if (options.label) {
    attrs['aria-label'] = options.label;
  }
  
  if (typeof options.pressed === 'boolean') {
    attrs['aria-pressed'] = options.pressed;
  }
  
  if (typeof options.expanded === 'boolean') {
    attrs['aria-expanded'] = options.expanded;
  }
  
  if (options.controls) {
    attrs['aria-controls'] = options.controls;
  }
  
  if (options.describedBy) {
    attrs['aria-describedby'] = options.describedBy;
  }
  
  if (options.disabled) {
    attrs['aria-disabled'] = true;
  }
  
  if (options.haspopup) {
    attrs['aria-haspopup'] = options.haspopup;
  }
  
  return attrs;
}

/**
 * Creates ARIA attributes for dialogs/modals
 * 
 * @param options - Dialog options
 * @returns ARIA attributes object
 */
export function createDialogAria(options: {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  modal?: boolean;
}): AriaAttributes {
  const attrs: AriaAttributes = {
    role: options.modal ? 'dialog' : 'alertdialog',
  };
  
  if (options.label) {
    attrs['aria-label'] = options.label;
  }
  
  if (options.labelledBy) {
    attrs['aria-labelledby'] = options.labelledBy;
  }
  
  if (options.describedBy) {
    attrs['aria-describedby'] = options.describedBy;
  }
  
  return attrs;
}

/**
 * Creates ARIA attributes for menus
 * 
 * @param options - Menu options
 * @returns ARIA attributes object
 */
export function createMenuAria(options: {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  activedescendant?: string;
}): AriaAttributes {
  const attrs: AriaAttributes = {
    role: 'menu',
  };
  
  if (options.label) {
    attrs['aria-label'] = options.label;
  }
  
  if (options.orientation) {
    attrs['aria-orientation'] = options.orientation;
  }
  
  if (options.activedescendant) {
    attrs['aria-activedescendant'] = options.activedescendant;
  }
  
  return attrs;
}

/**
 * Creates ARIA attributes for tabs
 * 
 * @param options - Tab options
 * @returns ARIA attributes object
 */
export function createTabAria(options: {
  selected?: boolean;
  controls?: string;
  labelledBy?: string;
}): AriaAttributes {
  const attrs: AriaAttributes = {
    role: 'tab',
  };
  
  if (typeof options.selected === 'boolean') {
    attrs['aria-selected'] = options.selected;
  }
  
  if (options.controls) {
    attrs['aria-controls'] = options.controls;
  }
  
  if (options.labelledBy) {
    attrs['aria-labelledby'] = options.labelledBy;
  }
  
  return attrs;
}

/**
 * Creates ARIA live region attributes
 * 
 * @param options - Live region options
 * @returns ARIA attributes object
 */
export function createLiveRegionAria(options: {
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  label?: string;
}): AriaAttributes {
  const attrs: AriaAttributes = {
    'aria-live': options.politeness || 'polite',
  };
  
  if (typeof options.atomic === 'boolean') {
    attrs['aria-atomic'] = options.atomic;
  }
  
  if (options.relevant) {
    attrs['aria-relevant'] = options.relevant;
  }
  
  if (options.label) {
    attrs['aria-label'] = options.label;
  }
  
  return attrs;
}

/**
 * Keyboard navigation utilities
 */
export const keyboard = {
  /**
   * Key codes for common keys
   */
  KEYS: {
    ENTER: 'Enter',
    SPACE: ' ',
    TAB: 'Tab',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    DELETE: 'Delete',
    BACKSPACE: 'Backspace',
  } as const,
  
  /**
   * Checks if key is an arrow key
   * 
   * @param key - Key string
   * @returns True if arrow key
   */
  isArrowKey: (key: string) => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
  },
  
  /**
   * Checks if key is a navigation key
   * 
   * @param key - Key string
   * @returns True if navigation key
   */
  isNavigationKey: (key: string) => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
  },
  
  /**
   * Creates keyboard event handler for buttons
   * 
   * @param onClick - Click handler
   * @returns Keyboard event handler
   */
  createButtonHandler: (onClick: () => void) => (event: KeyboardEvent) => {
    if (event.key === keyboard.KEYS.ENTER || event.key === keyboard.KEYS.SPACE) {
      event.preventDefault();
      onClick();
    }
  },
};

/**
 * Focus management utilities
 */
export const focus = {
  /**
   * Gets all focusable elements within a container
   * 
   * @param container - Container element
   * @returns Array of focusable elements
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  },
  
  /**
   * Traps focus within a container (useful for modals)
   * 
   * @param container - Container element
   * @returns Function to cleanup focus trap
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = focus.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== keyboard.KEYS.TAB) return;
      
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },
  
  /**
   * Creates a focus restoration utility
   * 
   * @returns Object with save and restore methods
   */
  createRestoration: () => {
    let previouslyFocused: HTMLElement | null = null;
    
    return {
      save: () => {
        previouslyFocused = document.activeElement as HTMLElement;
      },
      restore: () => {
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
      },
    };
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Creates text that's only visible to screen readers
   * 
   * @param text - Text for screen readers
   * @returns Object with text and className
   */
  onlyText: (text: string) => ({
    children: text,
    className: 'sr-only',
    style: {
      position: 'absolute' as const,
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap' as const,
      border: '0',
    },
  }),
  
  /**
   * Announces text to screen readers
   * 
   * @param message - Message to announce
   * @param priority - Announcement priority
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    
    document.body.appendChild(announcer);
    announcer.textContent = message;
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
};

/**
 * Color contrast utilities for accessibility
 */
export const contrast = {
  /**
   * Checks if colors meet WCAG AA requirements
   * 
   * @param foreground - Foreground color
   * @param background - Background color
   * @returns True if contrast is sufficient
   */
  meetsAA: (_foreground: string, _background: string): boolean => {
    // This would integrate with the color utilities
    // For now, return true as placeholder
    return true;
  },
  
  /**
   * Checks if colors meet WCAG AAA requirements
   * 
   * @param foreground - Foreground color
   * @param background - Background color
   * @returns True if contrast is sufficient
   */
  meetsAAA: (_foreground: string, _background: string): boolean => {
    // This would integrate with the color utilities
    // For now, return true as placeholder
    return true;
  },
};

/**
 * Reduced motion utilities
 */
export const reducedMotion = {
  /**
   * Checks if user prefers reduced motion
   * 
   * @returns True if reduced motion is preferred
   */
  isPreferred: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  /**
   * Creates a media query listener for reduced motion
   * 
   * @param callback - Callback function
   * @returns Cleanup function
   */
  // eslint-disable-next-line no-unused-vars
  createListener: (callback: (prefersReduced: boolean) => void) => {
    if (typeof window === 'undefined') return () => {};
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: Event) => {
      const target = e.target as unknown as { matches: boolean };
      callback(target.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  },
};