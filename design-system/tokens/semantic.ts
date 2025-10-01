/**
 * Semantic Design Tokens
 * 
 * Contextual tokens that map to primitive values.
 * These are themeable and should be used directly in components.
 */

import { colors } from './primitives';

// Semantic Color Tokens
export const semanticColors = {
  // Background Colors
  bg: {
    primary: colors.white,
    secondary: colors.gray[50],
    tertiary: colors.gray[100],
    inverse: colors.gray[900],
    brand: colors.blue[500],
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text Colors
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[700],
    tertiary: colors.gray[500],
    inverse: colors.white,
    brand: colors.blue[600],
    link: colors.blue[600],
    linkHover: colors.blue[800],
  },
  
  // Border Colors
  border: {
    primary: colors.gray[200],
    secondary: colors.gray[300],
    tertiary: colors.gray[400],
    focus: colors.blue[500],
    brand: colors.blue[500],
  },
  
  // Interactive States
  interactive: {
    primary: colors.blue[600],
    primaryHover: colors.blue[700],
    primaryActive: colors.blue[800],
    primaryDisabled: colors.gray[300],
    
    secondary: colors.gray[100],
    secondaryHover: colors.gray[200],
    secondaryActive: colors.gray[300],
    secondaryDisabled: colors.gray[100],
    
    tertiary: 'transparent',
    tertiaryHover: colors.gray[100],
    tertiaryActive: colors.gray[200],
    tertiaryDisabled: 'transparent',
  },
  
  // Status Colors
  status: {
    success: colors.green[600],
    successBg: colors.green[50],
    successBorder: colors.green[200],
    
    warning: colors.yellow[600],
    warningBg: colors.yellow[50],
    warningBorder: colors.yellow[200],
    
    error: colors.red[600],
    errorBg: colors.red[50],
    errorBorder: colors.red[200],
    
    info: colors.blue[600],
    infoBg: colors.blue[50],
    infoBorder: colors.blue[200],
  },
  
  // Form Colors
  form: {
    bg: colors.white,
    border: colors.gray[300],
    borderHover: colors.gray[400],
    borderFocus: colors.blue[500],
    borderError: colors.red[500],
    placeholder: colors.gray[400],
    label: colors.gray[700],
    help: colors.gray[600],
  },
} as const;

// Dark Theme Overrides
export const darkSemanticColors = {
  // Background Colors
  bg: {
    primary: colors.gray[900],
    secondary: colors.gray[800],
    tertiary: colors.gray[700],
    inverse: colors.white,
    brand: colors.blue[600],
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Text Colors
  text: {
    primary: colors.gray[100],
    secondary: colors.gray[300],
    tertiary: colors.gray[400],
    inverse: colors.gray[900],
    brand: colors.blue[400],
    link: colors.blue[400],
    linkHover: colors.blue[300],
  },
  
  // Border Colors
  border: {
    primary: colors.gray[700],
    secondary: colors.gray[600],
    tertiary: colors.gray[500],
    focus: colors.blue[400],
    brand: colors.blue[500],
  },
  
  // Interactive States
  interactive: {
    primary: colors.blue[500],
    primaryHover: colors.blue[400],
    primaryActive: colors.blue[600],
    primaryDisabled: colors.gray[700],
    
    secondary: colors.gray[800],
    secondaryHover: colors.gray[700],
    secondaryActive: colors.gray[600],
    secondaryDisabled: colors.gray[800],
    
    tertiary: 'transparent',
    tertiaryHover: colors.gray[800],
    tertiaryActive: colors.gray[700],
    tertiaryDisabled: 'transparent',
  },
  
  // Status Colors
  status: {
    success: colors.green[400],
    successBg: colors.green[950],
    successBorder: colors.green[800],
    
    warning: colors.yellow[400],
    warningBg: colors.yellow[950],
    warningBorder: colors.yellow[800],
    
    error: colors.red[400],
    errorBg: colors.red[950],
    errorBorder: colors.red[800],
    
    info: colors.blue[400],
    infoBg: colors.blue[950],
    infoBorder: colors.blue[800],
  },
  
  // Form Colors
  form: {
    bg: colors.gray[900],
    border: colors.gray[600],
    borderHover: colors.gray[500],
    borderFocus: colors.blue[400],
    borderError: colors.red[400],
    placeholder: colors.gray[500],
    label: colors.gray[300],
    help: colors.gray[400],
  },
} as const;

// Component-specific semantic tokens
export const componentTokens = {
  button: {
    height: {
      sm: '2rem',     // 32px
      md: '2.5rem',   // 40px
      lg: '3rem',     // 48px
    },
    padding: {
      sm: '0.5rem 0.75rem',
      md: '0.625rem 1rem',
      lg: '0.75rem 1.5rem',
    },
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
    borderRadius: '0.375rem',
    fontWeight: '500',
  },
  
  input: {
    height: {
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem',
    },
    padding: {
      sm: '0.375rem 0.75rem',
      md: '0.5rem 0.75rem',
      lg: '0.625rem 1rem',
    },
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
    borderRadius: '0.375rem',
    borderWidth: '1px',
  },
  
  card: {
    padding: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
    borderRadius: '0.5rem',
    borderWidth: '1px',
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  
  modal: {
    borderRadius: '0.5rem',
    padding: '1.5rem',
    maxWidth: '32rem',
    backdropBlur: 'blur(4px)',
  },
  
  tooltip: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    borderRadius: '0.25rem',
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    maxWidth: '20rem',
  },
  
  badge: {
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '9999px',
    height: '1.25rem',
  },
  
  avatar: {
    size: {
      xs: '1.5rem',
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem',
      xl: '4rem',
    },
    borderRadius: '9999px',
    borderWidth: '2px',
  },
} as const;

// Animation tokens
export const animationTokens = {
  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    fadeOut: {
      from: { opacity: '1' },
      to: { opacity: '0' },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      from: { transform: 'translateY(-10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  },
} as const;

export type SemanticColors = typeof semanticColors;
export type DarkSemanticColors = typeof darkSemanticColors;
export type ComponentTokens = typeof componentTokens;
export type AnimationTokens = typeof animationTokens;