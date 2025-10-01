/**
 * Performance Rating Constants
 * Centralized configuration for performance rating strings and thresholds
 */

/**
 * String rating mapping for Indonesian performance categories
 * Maps descriptive text to numeric scores
 */
export const STRING_RATING_MAP = {
  'Kurang Baik': 65,
  'Baik': 75,
  'Sangat Baik': 85,
} as const;

export type StringRating = keyof typeof STRING_RATING_MAP;

/**
 * Numeric rating thresholds for categorizing performance scores
 */
export const NUMERIC_RATING_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 75,
  FAIR: 65,
  POOR: 50,
} as const;

/**
 * Get the descriptive label for a numeric performance score
 * @param score - Numeric performance score (0-100)
 * @returns Descriptive rating label
 */
export function getRatingLabel(score: number): string {
  if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT) return 'Sangat Baik';
  if (score >= NUMERIC_RATING_THRESHOLDS.GOOD) return 'Baik';
  if (score >= NUMERIC_RATING_THRESHOLDS.FAIR) return 'Cukup';
  return 'Kurang Baik';
}

/**
 * Type guard to check if a string is a valid rating
 * @param value - String to check
 * @returns True if value is a valid StringRating
 */
export function isValidStringRating(value: string): value is StringRating {
  return value in STRING_RATING_MAP;
}

/**
 * Convert a string rating to its numeric equivalent
 * @param rating - String rating to convert
 * @returns Numeric score, or undefined if invalid
 */
export function stringRatingToNumeric(rating: string): number | undefined {
  if (isValidStringRating(rating)) {
    return STRING_RATING_MAP[rating];
  }
  return undefined;
}

/**
 * Get color class for a performance score (for UI theming)
 * @param score - Numeric performance score
 * @returns Tailwind color classes
 */
export function getScoreColorClass(score: number): string {
  if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT) {
    return 'text-green-600 dark:text-green-400';
  }
  if (score >= NUMERIC_RATING_THRESHOLDS.GOOD) {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (score >= NUMERIC_RATING_THRESHOLDS.FAIR) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get background color class for a performance score
 * @param score - Numeric performance score
 * @returns Tailwind background color classes
 */
export function getScoreBgColorClass(score: number): string {
  if (score >= NUMERIC_RATING_THRESHOLDS.EXCELLENT) {
    return 'bg-green-100 dark:bg-green-900/20';
  }
  if (score >= NUMERIC_RATING_THRESHOLDS.GOOD) {
    return 'bg-blue-100 dark:bg-blue-900/20';
  }
  if (score >= NUMERIC_RATING_THRESHOLDS.FAIR) {
    return 'bg-yellow-100 dark:bg-yellow-900/20';
  }
  return 'bg-red-100 dark:bg-red-900/20';
}
