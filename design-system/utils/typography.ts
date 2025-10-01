/**
 * Typography Utilities
 *
 * Utility classes and functions for consistent typography across the application
 */

export const typographyClasses = {
  // Display headings (largest)
  display: {
    xl: 'text-5xl md:text-6xl font-extrabold tracking-tight',
    lg: 'text-4xl md:text-5xl font-extrabold tracking-tight',
    md: 'text-3xl md:text-4xl font-extrabold tracking-tight',
    sm: 'text-2xl md:text-3xl font-bold tracking-tight',
  },

  // Page headings
  heading: {
    h1: 'text-3xl md:text-4xl font-extrabold tracking-tight',
    h2: 'text-2xl md:text-3xl font-bold tracking-tight',
    h3: 'text-xl md:text-2xl font-bold',
    h4: 'text-lg md:text-xl font-semibold',
    h5: 'text-base md:text-lg font-semibold',
    h6: 'text-sm md:text-base font-semibold',
  },

  // Body text
  body: {
    xl: 'text-lg md:text-xl leading-relaxed',
    lg: 'text-base md:text-lg leading-relaxed',
    md: 'text-base leading-normal',
    sm: 'text-sm leading-normal',
    xs: 'text-xs leading-normal',
  },

  // Labels
  label: {
    lg: 'text-sm font-semibold tracking-wide uppercase',
    md: 'text-xs font-semibold tracking-wide uppercase',
    sm: 'text-xs font-medium tracking-wide',
  },

  // Utility text
  caption: 'text-sm text-gray-600 dark:text-gray-400',
  overline: 'text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400',

  // Interactive text
  link: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline-offset-2 hover:underline transition-colors duration-200',

  // Monospace
  code: {
    inline: 'font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded',
    block: 'font-mono text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto',
  },
} as const;

/**
 * Get typography class by path
 *
 * @example
 * getTypographyClass('heading.h1') // Returns: 'text-3xl md:text-4xl font-extrabold tracking-tight'
 */
export const getTypographyClass = (path: string): string => {
  const parts = path.split('.');
  let current: unknown = typographyClasses;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }

  return typeof current === 'string' ? current : '';
};

/**
 * Responsive font size utilities
 */
export const responsiveFontSizes = {
  xs: 'text-xs',
  sm: 'text-sm md:text-base',
  md: 'text-base md:text-lg',
  lg: 'text-lg md:text-xl',
  xl: 'text-xl md:text-2xl',
  '2xl': 'text-2xl md:text-3xl',
  '3xl': 'text-3xl md:text-4xl',
  '4xl': 'text-4xl md:text-5xl',
} as const;

/**
 * Text color utilities for different contexts
 */
export const textColors = {
  primary: 'text-gray-900 dark:text-gray-100',
  secondary: 'text-gray-700 dark:text-gray-300',
  tertiary: 'text-gray-600 dark:text-gray-400',
  muted: 'text-gray-500 dark:text-gray-500',
  disabled: 'text-gray-400 dark:text-gray-600',
  inverse: 'text-white dark:text-gray-900',

  // Semantic colors
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-yellow-700 dark:text-yellow-400',
  error: 'text-red-700 dark:text-red-400',
  info: 'text-blue-700 dark:text-blue-400',
} as const;

/**
 * Line height utilities
 */
export const lineHeights = {
  none: 'leading-none',
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
} as const;

/**
 * Font weight utilities
 */
export const fontWeights = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
} as const;

export type TypographyClass = typeof typographyClasses;
export type ResponsiveFontSize = keyof typeof responsiveFontSizes;
export type TextColor = keyof typeof textColors;
export type LineHeight = keyof typeof lineHeights;
export type FontWeight = keyof typeof fontWeights;
