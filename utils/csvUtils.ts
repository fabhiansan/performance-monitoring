/**
 * CSV parsing utilities extracted from parser service
 * These utilities handle CSV/TSV/Google Sheets copy-paste formats
 */

import {
  STRING_RATING_MAP,
  StringRating,
  NUMERIC_RATING_THRESHOLDS
} from '../constants/performanceRatings.js';

export interface ParsedCsvLine {
  fields: string[];
  delimiter: string;
  isSpaceDelimited: boolean;
}

/**
 * Auto-detect delimiter for CSV data
 */
export const detectDelimiter = (line: string): { delimiter: string; isSpaceDelimited: boolean } => {
  const sanitizedLine = line.replace(/"(?:[^"]|""|\n)*"/g, "");
  const commaCount = (sanitizedLine.match(/,/g) || []).length;
  const tabCount = (sanitizedLine.match(/\t/g) || []).length;
  const multiSpaceCount = (sanitizedLine.match(/\s{2,}/g) || []).length; // 2+ consecutive spaces

  // Priority: tabs > multiple spaces (when comma absent) > commas
  if (tabCount > 0) {
    return { delimiter: '\t', isSpaceDelimited: false };
  } else if (multiSpaceCount > 0 && commaCount === 0) {
    return { delimiter: '', isSpaceDelimited: true };
  } else {
    return { delimiter: ',', isSpaceDelimited: false };
  }
};

/**
 * Parse a single CSV line with proper quote handling
 */
export const parseCsvLine = (line: string): string[] => {
  const { delimiter, isSpaceDelimited } = detectDelimiter(line);

  if (isSpaceDelimited) {
    // Split on 2+ consecutive spaces, then trim each field
    return line.split(/\s{2,}/).map(field => field.trim()).filter(field => field.length > 0);
  }

  // Standard delimiter parsing with quote handling
  const fields = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handles escaped quotes ("") by peeking ahead
      if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
        currentField += '"';
        i++; // Skip the second quote of the pair
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim());
  return fields.filter(field => field.length > 0);
};

/**
 * Clean competency name by removing numbering and employee brackets
 */
export const cleanCompetencyName = (rawName: string): string => {
  return rawName
    .replace(/^\d+\s*[.]?\s*/, '') // Remove leading numbers like "1. " or "1 "
    .replace(/\s*\[.*\]\s*/, '') // Remove the employee name in brackets
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' ') // Normalize internal whitespace
    .trim();
};

/**
 * Extract employee name from bracketed header
 */
export const extractEmployeeName = (rawHeader: string): string | null => {
  const match = rawHeader.match(/\[(.*?)\]/);
  if (!match) {
    return null;
  }
  let name = match[1].trim();
  // Remove leading numbering like "1." or "6 " inside brackets
  name = name.replace(/^\d+\.\s*/, '').replace(/^\d+\s+/, '');
  return name;
};

/**
 * Check if a string represents a valid performance rating
 */
export const isStringRating = (value: string): boolean => {
  const trimmed = value.trim();
  // Check both with and without case-sensitivity
  return trimmed in STRING_RATING_MAP ||
         trimmed.toLowerCase() === 'baik' ||
         trimmed.toLowerCase() === 'sangat baik' ||
         trimmed.toLowerCase() === 'kurang baik';
};

/**
 * Convert string rating to numeric score
 * @deprecated Use stringRatingToNumeric from constants/performanceRatings instead
 */
export const convertStringRatingToScore = (rating: string): number => {
  const trimmed = rating.trim();

  // Try exact match first (case-sensitive)
  if (trimmed in STRING_RATING_MAP) {
    return STRING_RATING_MAP[trimmed as StringRating];
  }

  // Fall back to case-insensitive match
  const lowerTrimmed = trimmed.toLowerCase();
  switch (lowerTrimmed) {
    case 'sangat baik':
      return STRING_RATING_MAP['Sangat Baik'];
    case 'baik':
      return STRING_RATING_MAP['Baik'];
    case 'kurang baik':
      return STRING_RATING_MAP['Kurang Baik'];
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }
};

/**
 * Normalize numeric score values based on business rules
 */
export const normalizeNumericScore = (score: number): number => {
  if (score === 10) {
    return NUMERIC_RATING_THRESHOLDS.FAIR; // Kurang Baik
  } else if (score === 65) {
    return NUMERIC_RATING_THRESHOLDS.FAIR; // Kurang Baik (already correct)
  } else if (score === 75) {
    return NUMERIC_RATING_THRESHOLDS.GOOD; // Baik
  } else if (score >= 75) {
    return NUMERIC_RATING_THRESHOLDS.EXCELLENT; // Sangat Baik
  }
  // Keep original score for other values
  return score;
};

/**
 * Parse and normalize a score value (string rating or numeric)
 */
export const parseScoreValue = (scoreValue: string): number | null => {
  if (!scoreValue || scoreValue.trim() === '') {
    return null;
  }

  // Handle string ratings first
  if (isStringRating(scoreValue)) {
    return convertStringRatingToScore(scoreValue);
  }

  // Handle numeric values
  const numericScore = parseInt(scoreValue, 10);
  if (!isNaN(numericScore)) {
    return normalizeNumericScore(numericScore);
  }

  return null;
};

/**
 * Validate if a score is within acceptable range
 */
export const isValidScore = (score: number): boolean => {
  return !isNaN(score) && score >= 0 && score <= 100;
};

/**
 * Convert a score represented as string into a numeric value.
 * Supports numeric strings (integer/float), rating labels, and trims whitespace.
 * Returns 0 for empty or invalid inputs to keep downstream calculations safe.
 */
export const convertScoreToNumber = (rawScore: string | number | null | undefined): number => {
  if (rawScore === null || rawScore === undefined) {
    return 0;
  }

  if (typeof rawScore === 'number') {
    return Number.isFinite(rawScore) ? rawScore : 0;
  }

  const trimmedScore = rawScore.trim();
  if (trimmedScore === '') {
    return 0;
  }

  if (isStringRating(trimmedScore)) {
    try {
      return convertStringRatingToScore(trimmedScore);
    } catch (error) {
      // Fall through to numeric parsing if conversion fails unexpectedly
    }
  }

  const numericValue = Number(trimmedScore.replace(/,/g, '.'));
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return 0;
};
