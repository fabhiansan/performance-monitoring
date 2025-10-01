/**
 * Responsive Utilities
 * 
 * Utilities for handling responsive design, breakpoints, and media queries.
 */

import { breakpoints } from '../tokens/primitives';

export type Breakpoint = keyof typeof breakpoints;
export type BreakpointValue = typeof breakpoints[Breakpoint];

/**
 * Breakpoint configuration
 */
export const BREAKPOINTS = breakpoints;

/**
 * Creates a media query string for a breakpoint
 * 
 * @param breakpoint - Breakpoint name
 * @param type - Media query type ('min' | 'max')
 * @returns Media query string
 * 
 * @example
 * createMediaQuery('md', 'min') // '@media (min-width: 768px)'
 * createMediaQuery('lg', 'max') // '@media (max-width: 1023px)'
 */
export function createMediaQuery(breakpoint: Breakpoint, type: 'min' | 'max' = 'min'): string {
  const value = BREAKPOINTS[breakpoint];
  
  if (type === 'max') {
    // Subtract 1px for max-width to avoid overlap
    const maxValue = parseInt(value) - 1;
    return `@media (max-width: ${maxValue}px)`;
  }
  
  return `@media (min-width: ${value})`;
}

/**
 * Creates a media query for a range between two breakpoints
 * 
 * @param minBreakpoint - Minimum breakpoint
 * @param maxBreakpoint - Maximum breakpoint
 * @returns Media query string
 * 
 * @example
 * createRangeMediaQuery('md', 'lg') // '@media (min-width: 768px) and (max-width: 1023px)'
 */
export function createRangeMediaQuery(minBreakpoint: Breakpoint, maxBreakpoint: Breakpoint): string {
  const minValue = BREAKPOINTS[minBreakpoint];
  const maxValue = parseInt(BREAKPOINTS[maxBreakpoint]) - 1;
  
  return `@media (min-width: ${minValue}) and (max-width: ${maxValue}px)`;
}

/**
 * Checks if current viewport matches a breakpoint
 * 
 * @param breakpoint - Breakpoint to check
 * @param type - Media query type ('min' | 'max')
 * @returns True if viewport matches breakpoint
 * 
 * @example
 * matchesBreakpoint('md') // true if viewport >= 768px
 * matchesBreakpoint('md', 'max') // true if viewport <= 767px
 */
export function matchesBreakpoint(breakpoint: Breakpoint, type: 'min' | 'max' = 'min'): boolean {
  if (typeof window === 'undefined') return false;
  
  const value = parseInt(BREAKPOINTS[breakpoint]);
  const viewportWidth = window.innerWidth;
  
  return type === 'min' ? viewportWidth >= value : viewportWidth <= value - 1;
}

/**
 * Gets the current active breakpoint
 * 
 * @returns Current breakpoint name
 * 
 * @example
 * getCurrentBreakpoint() // 'md'
 */
export function getCurrentBreakpoint(): Breakpoint | null {
  if (typeof window === 'undefined') return null;
  
  const viewportWidth = window.innerWidth;
  const sortedBreakpoints = Object.entries(BREAKPOINTS)
    .sort(([, a], [, b]) => parseInt(b) - parseInt(a)) as [Breakpoint, BreakpointValue][];
  
  for (const [breakpoint, value] of sortedBreakpoints) {
    if (viewportWidth >= parseInt(value)) {
      return breakpoint;
    }
  }
  
  return null;
}

/**
 * Creates a responsive value resolver
 * 
 * @param values - Responsive values object
 * @returns Function that resolves current value
 * 
 * @example
 * const getColumns = createResponsiveResolver({
 *   base: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4
 * });
 * 
 * getColumns() // Returns appropriate value based on current viewport
 */
export function createResponsiveResolver<T>(values: Partial<Record<Breakpoint | 'base', T>>) {
  return (): T | undefined => {
    if (typeof window === 'undefined') return values.base;
    
    const currentBreakpoint = getCurrentBreakpoint();
    
    // Try current breakpoint first
    if (currentBreakpoint && values[currentBreakpoint] !== undefined) {
      return values[currentBreakpoint];
    }
    
    // Fall back to largest applicable breakpoint
    const sortedBreakpoints = Object.entries(BREAKPOINTS)
      .sort(([, a], [, b]) => parseInt(b) - parseInt(a)) as [Breakpoint, BreakpointValue][];
    
    for (const [breakpoint] of sortedBreakpoints) {
      if (matchesBreakpoint(breakpoint) && values[breakpoint] !== undefined) {
        return values[breakpoint];
      }
    }
    
    return values.base;
  };
}

/**
 * Hook for responsive values (React)
 * 
 * @param values - Responsive values object
 * @returns Current responsive value
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint | 'base', T>>): T | undefined {
  if (typeof window === 'undefined') return values.base;
  
  const resolver = createResponsiveResolver(values);
  return resolver();
}

/**
 * Creates responsive class names
 * 
 * @param classes - Responsive class object
 * @returns Space-separated class string
 * 
 * @example
 * createResponsiveClasses({
 *   base: 'grid-cols-1',
 *   sm: 'grid-cols-2',
 *   lg: 'grid-cols-4'
 * }) // 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
 */
export function createResponsiveClasses(classes: Partial<Record<Breakpoint | 'base', string>>): string {
  const classNames: string[] = [];
  
  // Add base class
  if (classes.base) {
    classNames.push(classes.base);
  }
  
  // Add responsive classes
  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  
  for (const breakpoint of breakpointOrder) {
    if (classes[breakpoint]) {
      classNames.push(`${breakpoint}:${classes[breakpoint]}`);
    }
  }
  
  return classNames.join(' ');
}

/**
 * Responsive container query utilities
 */
export const containerQueries = {
  /**
   * Creates a container query string
   * 
   * @param minWidth - Minimum width for container
   * @returns Container query string
   */
  minWidth: (minWidth: string) => `@container (min-width: ${minWidth})`,
  
  /**
   * Creates a max-width container query string
   * 
   * @param maxWidth - Maximum width for container
   * @returns Container query string
   */
  maxWidth: (maxWidth: string) => `@container (max-width: ${maxWidth})`,
  
  /**
   * Creates a container query range
   * 
   * @param minWidth - Minimum width
   * @param maxWidth - Maximum width
   * @returns Container query string
   */
  range: (minWidth: string, maxWidth: string) => 
    `@container (min-width: ${minWidth}) and (max-width: ${maxWidth})`,
};

/**
 * Viewport utilities
 */
export const viewport = {
  /**
   * Gets viewport dimensions
   * 
   * @returns Viewport width and height
   */
  getDimensions: () => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },
  
  /**
   * Checks if viewport is in portrait orientation
   * 
   * @returns True if portrait
   */
  isPortrait: () => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  },
  
  /**
   * Checks if viewport is in landscape orientation
   * 
   * @returns True if landscape
   */
  isLandscape: () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  },
  
  /**
   * Gets viewport aspect ratio
   * 
   * @returns Aspect ratio as width/height
   */
  getAspectRatio: () => {
    if (typeof window === 'undefined') return 1;
    return window.innerWidth / window.innerHeight;
  },
};

/**
 * Device detection utilities
 */
export const device = {
  /**
   * Checks if device is mobile based on viewport width
   * 
   * @returns True if mobile
   */
  isMobile: () => matchesBreakpoint('md', 'max'),
  
  /**
   * Checks if device is tablet based on viewport width
   * 
   * @returns True if tablet
   */
  isTablet: () => {
    const width = viewport.getDimensions().width;
    return width >= parseInt(BREAKPOINTS.md) && width < parseInt(BREAKPOINTS.lg);
  },
  
  /**
   * Checks if device is desktop based on viewport width
   * 
   * @returns True if desktop
   */
  isDesktop: () => matchesBreakpoint('lg'),
  
  /**
   * Detects touch support
   * 
   * @returns True if touch is supported
   */
  hasTouch: () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
};

/**
 * Responsive image utilities
 */
export const responsiveImage = {
  /**
   * Creates responsive image srcSet
   * 
   * @param baseSrc - Base image source
   * @param sizes - Array of sizes with descriptors
   * @returns srcSet string
   * 
   * @example
   * createSrcSet('image.jpg', [
   *   { size: 480, descriptor: 'w' },
   *   { size: 800, descriptor: 'w' },
   *   { size: 1200, descriptor: 'w' }
   * ]) // 'image-480w.jpg 480w, image-800w.jpg 800w, image-1200w.jpg 1200w'
   */
  createSrcSet: (baseSrc: string, sizes: Array<{ size: number; descriptor: string }>) => {
    return sizes
      .map(({ size, descriptor }) => {
        const [name, ext] = baseSrc.split('.');
        return `${name}-${size}${descriptor}.${ext} ${size}${descriptor}`;
      })
      .join(', ');
  },
  
  /**
   * Creates responsive sizes attribute
   * 
   * @param breakpoints - Breakpoint to size mappings
   * @returns sizes string
   * 
   * @example
   * createSizes({
   *   sm: '100vw',
   *   md: '50vw',
   *   lg: '33vw'
   * }) // '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'
   */
  createSizes: (breakpoints: Partial<Record<Breakpoint, string>>) => {
    const sortedEntries = Object.entries(breakpoints)
      .sort(([a], [b]) => parseInt(BREAKPOINTS[b as Breakpoint]) - parseInt(BREAKPOINTS[a as Breakpoint]));
    
    const mediaQueries = sortedEntries
      .slice(0, -1) // All except the last (default)
      .map(([breakpoint, size]) => `(min-width: ${BREAKPOINTS[breakpoint as Breakpoint]}) ${size}`);
    
    const defaultSize = sortedEntries[sortedEntries.length - 1]?.[1] || '100vw';
    
    return [...mediaQueries, defaultSize].join(', ');
  },
};