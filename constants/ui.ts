/**
 * UI Constants
 * 
 * Centralized UI constants for performance levels, colors, and common patterns.
 * These values are used consistently across all components.
 */

import { colors } from '../design-system/tokens/primitives';

// Performance Level Definitions
export const PERFORMANCE_LEVELS = {
  EXCELLENT: {
    min: 90,
    max: 100,
    label: 'Excellent',
    labelId: 'Sangat Baik',
    color: colors.green[600],
    bgColor: colors.green[50],
    darkBgColor: colors.green[950] + '/30',
    textColor: colors.green[800],
    darkTextColor: colors.green[200],
  },
  GOOD: {
    min: 80,
    max: 89,
    label: 'Good', 
    labelId: 'Baik',
    color: colors.blue[600],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/30',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
  AVERAGE: {
    min: 70,
    max: 79,
    label: 'Average',
    labelId: 'Cukup',
    color: colors.orange[600], // Changed from yellow for better readability
    bgColor: colors.orange[50],
    darkBgColor: colors.orange[950] + '/30',
    textColor: colors.orange[800],
    darkTextColor: colors.orange[200],
  },
  BELOW_AVERAGE: {
    min: 0,
    max: 69,
    label: 'Below Average',
    labelId: 'Perlu Perbaikan',
    color: colors.red[600],
    bgColor: colors.red[50],
    darkBgColor: colors.red[950] + '/30',
    textColor: colors.red[800],
    darkTextColor: colors.red[200],
  },
} as const;

// Legacy performance level mapping for backward compatibility
export const LEGACY_PERFORMANCE_LEVELS = {
  SANGAT_BAIK: {
    min: 85,
    max: 100,
    label: 'Sangat Baik',
    color: colors.green[600],
    bgColor: colors.green[50],
    darkBgColor: colors.green[950] + '/30',
    textColor: colors.green[800],
    darkTextColor: colors.green[200],
  },
  BAIK: {
    min: 75,
    max: 84,
    label: 'Baik',
    color: colors.orange[600], // Changed from yellow for better contrast
    bgColor: colors.orange[50],
    darkBgColor: colors.orange[950] + '/30',
    textColor: colors.orange[800],
    darkTextColor: colors.orange[200],
  },
  KURANG_BAIK: {
    min: 65,
    max: 74,
    label: 'Kurang Baik',
    color: colors.red[600],
    bgColor: colors.red[50],
    darkBgColor: colors.red[950] + '/30',
    textColor: colors.red[800],
    darkTextColor: colors.red[200],
  },
  PERLU_PERBAIKAN: {
    min: 0,
    max: 64,
    label: 'Perlu Perbaikan',
    color: colors.red[700], // Slightly darker for distinction
    bgColor: colors.red[50],
    darkBgColor: colors.red[950] + '/30',
    textColor: colors.red[800],
    darkTextColor: colors.red[200],
  },
} as const;

// Organizational Level Colors
export const ORGANIZATIONAL_LEVELS = {
  ESELON_II: {
    label: 'Eselon II',
    color: colors.blue[700],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/30',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
  ESELON_III: {
    label: 'Eselon III', 
    color: colors.blue[600],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/30',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
  ESELON_IV: {
    label: 'Eselon IV',
    color: colors.blue[500],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/30',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
  STAFF_ASN: {
    label: 'Staff ASN',
    color: colors.green[600],
    bgColor: colors.green[50],
    darkBgColor: colors.green[950] + '/30',
    textColor: colors.green[800],
    darkTextColor: colors.green[200],
  },
  STAFF_NON_ASN: {
    label: 'Staff Non ASN',
    color: colors.orange[600],
    bgColor: colors.orange[50],
    darkBgColor: colors.orange[950] + '/30',
    textColor: colors.orange[800],
    darkTextColor: colors.orange[200],
  },
  OTHER: {
    label: 'Other',
    color: colors.gray[600],
    bgColor: colors.gray[50],
    darkBgColor: colors.gray[800] + '/30',
    textColor: colors.gray[800],
    darkTextColor: colors.gray[200],
  },
} as const;

// Status Colors for various states
export const STATUS_COLORS = {
  SUCCESS: {
    color: colors.green[600],
    bgColor: colors.green[50],
    darkBgColor: colors.green[950] + '/50',
    textColor: colors.green[800],
    darkTextColor: colors.green[200],
  },
  ERROR: {
    color: colors.red[600],
    bgColor: colors.red[50],
    darkBgColor: colors.red[950] + '/50',
    textColor: colors.red[800],
    darkTextColor: colors.red[200],
  },
  WARNING: {
    color: colors.yellow[600],
    bgColor: colors.yellow[50],
    darkBgColor: colors.yellow[950] + '/50',
    textColor: colors.yellow[800],
    darkTextColor: colors.yellow[200],
  },
  INFO: {
    color: colors.blue[600],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/50',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
  LOADING: {
    color: colors.blue[500],
    bgColor: colors.blue[50],
    darkBgColor: colors.blue[950] + '/50',
    textColor: colors.blue[800],
    darkTextColor: colors.blue[200],
  },
} as const;

// Common spacing patterns
export const LAYOUT_SPACING = {
  COMPONENT_GAP: '1.5rem',      // 24px - gap between major components
  SECTION_GAP: '2rem',          // 32px - gap between sections
  PAGE_PADDING: '2rem',         // 32px - main page padding
  CARD_PADDING: '1.5rem',       // 24px - standard card padding
  FORM_GAP: '1rem',             // 16px - gap between form elements
  BUTTON_GAP: '0.75rem',        // 12px - gap between buttons
} as const;

// Common sizes
export const UI_SIZES = {
  SIDEBAR_WIDTH: '16rem',       // 256px
  HEADER_HEIGHT: '4rem',        // 64px
  MOBILE_BREAKPOINT: '768px',   // md breakpoint
  DESKTOP_BREAKPOINT: '1024px', // lg breakpoint
} as const;

// Chart colors for data visualization
export const CHART_COLORS = {
  PRIMARY_SERIES: colors.blue[500],
  SECONDARY_SERIES: colors.green[500],
  TERTIARY_SERIES: colors.orange[500],
  QUATERNARY_SERIES: colors.red[500],
  
  GRID_COLOR: colors.gray[200],
  DARK_GRID_COLOR: colors.gray[700],
  AXIS_COLOR: colors.gray[400],
  DARK_AXIS_COLOR: colors.gray[500],
  
  BACKGROUND: colors.white,
  DARK_BACKGROUND: colors.gray[900],
} as const;

// Animation constants
export const ANIMATION = {
  FAST: '150ms',
  NORMAL: '200ms',
  SLOW: '300ms',
  EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Utility functions for performance levels
export const getPerformanceLevel = (score: number) => {
  if (score >= PERFORMANCE_LEVELS.EXCELLENT.min) return PERFORMANCE_LEVELS.EXCELLENT;
  if (score >= PERFORMANCE_LEVELS.GOOD.min) return PERFORMANCE_LEVELS.GOOD;
  if (score >= PERFORMANCE_LEVELS.AVERAGE.min) return PERFORMANCE_LEVELS.AVERAGE;
  return PERFORMANCE_LEVELS.BELOW_AVERAGE;
};

export const getLegacyPerformanceLevel = (score: number) => {
  if (score >= LEGACY_PERFORMANCE_LEVELS.SANGAT_BAIK.min) return LEGACY_PERFORMANCE_LEVELS.SANGAT_BAIK;
  if (score >= LEGACY_PERFORMANCE_LEVELS.BAIK.min) return LEGACY_PERFORMANCE_LEVELS.BAIK;
  if (score >= LEGACY_PERFORMANCE_LEVELS.KURANG_BAIK.min) return LEGACY_PERFORMANCE_LEVELS.KURANG_BAIK;
  return LEGACY_PERFORMANCE_LEVELS.PERLU_PERBAIKAN;
};

export const getOrganizationalLevelStyle = (level: string) => {
  const levelLower = level.toLowerCase();
  
  if (levelLower.includes('eselon ii')) return ORGANIZATIONAL_LEVELS.ESELON_II;
  if (levelLower.includes('eselon iii')) return ORGANIZATIONAL_LEVELS.ESELON_III;
  if (levelLower.includes('eselon iv')) return ORGANIZATIONAL_LEVELS.ESELON_IV;
  if (levelLower.includes('staff asn')) return ORGANIZATIONAL_LEVELS.STAFF_ASN;
  if (levelLower.includes('staff non asn')) return ORGANIZATIONAL_LEVELS.STAFF_NON_ASN;
  
  return ORGANIZATIONAL_LEVELS.OTHER;
};

// Export types for TypeScript
export type PerformanceLevel = typeof PERFORMANCE_LEVELS[keyof typeof PERFORMANCE_LEVELS];
export type LegacyPerformanceLevel = typeof LEGACY_PERFORMANCE_LEVELS[keyof typeof LEGACY_PERFORMANCE_LEVELS];
export type OrganizationalLevel = typeof ORGANIZATIONAL_LEVELS[keyof typeof ORGANIZATIONAL_LEVELS];
export type StatusColor = typeof STATUS_COLORS[keyof typeof STATUS_COLORS];