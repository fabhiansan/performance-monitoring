/**
 * Service for fuzzy name matching and employee name resolution
 * Handles name normalization, similarity calculation, and matching logic
 */

import { logger } from './logger';

// List of common Indonesian academic titles and honorifics to strip out
const STOP_WORDS = [
  'st', 'sh', 'se', 'mm', 'si', 'sk', 'sos', 'ssos', 'sap', 'skep',
  'ners', 'mi', 'mps', 'sp', 'kom', 'stp', 'ap', 'pd', 'map', 'msc',
  'ma', 'mph', 'dra', 'dr', 'ir', 'amd'
];

const SIMILARITY_THRESHOLD = 0.8; // 80% similarity required for fuzzy matching

/**
 * Normalize a name for comparison by:
 * - Converting to lowercase
 * - Removing punctuation
 * - Removing academic titles
 * - Collapsing multiple spaces
 */
export function normalizeName(name: string): string {
  const titleRegex = new RegExp(`\\b(${STOP_WORDS.join('|')})\\b`, 'g');

  return name
    .toLowerCase()
    .replace(/[.,\-_]/g, '') // Remove punctuation characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces first
    .replace(titleRegex, '') // Remove detected titles/qualifications
    .replace(/\s+/g, ' ') // Collapse spaces again after removals
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0 to 1)
 * Higher score means more similar
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Find the best match for a name from a list of candidates
 * Returns null if no match meets the similarity threshold
 */
export function findBestMatch(
  targetName: string,
  candidates: string[],
  threshold: number = SIMILARITY_THRESHOLD
): { name: string; similarity: number } | null {
  const normalizedTarget = normalizeName(targetName);

  let bestMatch = '';
  let bestSimilarity = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);
    const similarity = calculateSimilarity(normalizedTarget, normalizedCandidate);

    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  if (bestMatch) {
    return { name: bestMatch, similarity: bestSimilarity };
  }

  return null;
}

/**
 * Match employee names from imported data to existing database records
 * Returns matches, fuzzy matches, and unmatched names
 */
export function matchEmployeeNames(
  importedNames: string[],
  databaseMapping: Record<string, string> // name -> org level
): {
  exactMatches: Record<string, string>; // imported name -> org level
  fuzzyMatches: Record<string, { dbName: string; orgLevel: string; similarity: number }>;
  unknownNames: string[];
} {
  const exactMatches: Record<string, string> = {};
  const fuzzyMatches: Record<string, { dbName: string; orgLevel: string; similarity: number }> = {};
  const unknownNames: string[] = [];

  const databaseNames = Object.keys(databaseMapping);

  // Create normalized mapping for faster lookups
  const normalizedDbMapping = new Map<string, string>();
  databaseNames.forEach(name => {
    normalizedDbMapping.set(normalizeName(name), name);
  });

  for (const importedName of importedNames) {
    // Try exact match first
    if (databaseMapping[importedName]) {
      exactMatches[importedName] = databaseMapping[importedName];
      continue;
    }

    // Try normalized exact match
    const normalizedImported = normalizeName(importedName);
    const normalizedMatch = normalizedDbMapping.get(normalizedImported);
    if (normalizedMatch) {
      exactMatches[importedName] = databaseMapping[normalizedMatch];
      continue;
    }

    // Try fuzzy matching
    const fuzzyMatch = findBestMatch(importedName, databaseNames);
    if (fuzzyMatch) {
      fuzzyMatches[importedName] = {
        dbName: fuzzyMatch.name,
        orgLevel: databaseMapping[fuzzyMatch.name],
        similarity: fuzzyMatch.similarity
      };
      logger.info('Fuzzy matched employee name', {
        imported: importedName,
        matched: fuzzyMatch.name,
        similarity: (fuzzyMatch.similarity * 100).toFixed(1) + '%'
      });
      continue;
    }

    // No match found
    unknownNames.push(importedName);
  }

  return { exactMatches, fuzzyMatches, unknownNames };
}

/**
 * Auto-resolve fuzzy matches by adding them to the organizational mapping
 * This allows the import to proceed without user intervention for high-confidence matches
 */
export function autoResolveFuzzyMatches(
  fuzzyMatches: Record<string, { dbName: string; orgLevel: string; similarity: number }>,
  orgLevelMapping: Record<string, string>
): Record<string, string> {
  const updatedMapping = { ...orgLevelMapping };

  Object.entries(fuzzyMatches).forEach(([importedName, match]) => {
    updatedMapping[importedName] = match.orgLevel;
  });

  return updatedMapping;
}
