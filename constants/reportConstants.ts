/**
 * Report Generation Constants
 *
 * Centralized constants for PDF generation and performance calculations
 */

// PDF Configuration
export const PDF_CONFIG = {
  // Dimensions (in mm for A4 landscape)
  IMG_WIDTH: 210,
  PAGE_HEIGHT: 295,

  // Orientation and format
  ORIENTATION: 'landscape' as const,
  FORMAT: 'a4' as const,

  // Canvas rendering options
  SCALE: 2,
  USE_CORS: true,
  ALLOW_TAINT: true,
  BACKGROUND_COLOR: '#ffffff',
} as const;

// Performance Score Weights
export const PERFORMANCE_WEIGHTS = {
  // Perilaku Kerja (5 competencies averaged, then weighted)
  PERILAKU_KERJA: 0.3,

  // Kualitas Kinerja (3 competencies averaged, then weighted)
  KUALITAS_KINERJA: 0.5,

  // Penilaian Pimpinan (fixed score)
  PENILAIAN_PIMPINAN: 17.0, // Represents 20% weight = 17.00 points

  // Number of competencies
  PERILAKU_KERJA_COUNT: 5,
  KUALITAS_KINERJA_COUNT: 3,
} as const;

// Performance Score Thresholds
export const PERFORMANCE_THRESHOLDS = {
  SANGAT_BAIK: 90,
  BAIK: 80,
  KURANG_BAIK: 70,
  SANGAT_KURANG: 0,
} as const;

// Performance Level Labels
export const PERFORMANCE_LEVELS = {
  SANGAT_BAIK: 'SANGAT BAIK',
  BAIK: 'BAIK',
  KURANG_BAIK: 'KURANG BAIK',
  SANGAT_KURANG: 'SANGAT KURANG',
} as const;

// Semester Labels
export const SEMESTER_LABELS = {
  1: 'I',
  2: 'II',
} as const;

/**
 * Utility function to get performance level based on score
 */
export function getPerformanceLevel(score: number): string {
  if (score >= PERFORMANCE_THRESHOLDS.SANGAT_BAIK) {
    return PERFORMANCE_LEVELS.SANGAT_BAIK;
  }
  if (score >= PERFORMANCE_THRESHOLDS.BAIK) {
    return PERFORMANCE_LEVELS.BAIK;
  }
  if (score >= PERFORMANCE_THRESHOLDS.KURANG_BAIK) {
    return PERFORMANCE_LEVELS.KURANG_BAIK;
  }
  return PERFORMANCE_LEVELS.SANGAT_KURANG;
}

/**
 * Utility function to calculate Perilaku Kerja score
 */
export function calculatePerilakuKerjaScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return average * PERFORMANCE_WEIGHTS.PERILAKU_KERJA;
}

/**
 * Utility function to calculate Kualitas Kinerja score
 */
export function calculateKualitasKinerjaScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return average * PERFORMANCE_WEIGHTS.KUALITAS_KINERJA;
}
