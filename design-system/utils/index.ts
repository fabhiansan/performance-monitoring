/**
 * Design System Utils Index
 * 
 * Central export point for all utility functions.
 */

// Export utilities
export * from './cn';
export * from './colors';
export * from './responsive';
export * from './a11y';

// Re-export for convenience
export { cn as default } from './cn';
export { cn, createVariantUtil, createResponsiveUtil, createConditionalUtil } from './cn';
export { 
  hexToRgb, 
  rgbToHex, 
  lighten, 
  darken, 
  withAlpha, 
  getBestTextColor,
  getContrastRatio,
  meetsContrastRequirement 
} from './colors';
export { 
  getCurrentBreakpoint, 
  matchesBreakpoint, 
  createResponsiveClasses,
  device,
  viewport 
} from './responsive';
export { 
  generateId, 
  createFormFieldAria, 
  createButtonAria,
  keyboard,
  focus,
  screenReader 
} from './a11y';