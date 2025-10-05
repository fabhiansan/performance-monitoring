/**
 * Centralized organizational level utility functions
 * Used across the application for validation and categorization
 *
 * NEW FEATURES:
 * - Data inconsistency validation between golongan and position levels
 * - Automatic warning logging for potential data inconsistencies
 * - Severity-based classification (low, medium, high)
 * - External validation function for programmatic use
 */

// Constants for repeated strings
const STAFF_ASN_PREFIX = "Staff ASN";
const ESELON_II = "Eselon II";
const ESELON_III = "Eselon III";
const ESELON_IV = "Eselon IV";
const STAFF = "Staff";
const NON_ASN = "non asn";

/**
 * Predefined organizational levels in the system
 */
export const ORGANIZATIONAL_LEVELS = [
  ESELON_II,
  ESELON_III,
  ESELON_IV,
  `${STAFF_ASN_PREFIX} Sekretariat`,
  "Staff Non ASN Sekretariat",
  `${STAFF_ASN_PREFIX} Bidang Hukum`,
  `${STAFF_ASN_PREFIX} Bidang Pemberdayaan Sosial`,
  "Staff Non ASN Bidang Pemberdayaan Sosial",
  `${STAFF_ASN_PREFIX} Bidang Rehabilitasi Sosial`,
  "Staff Non ASN Bidang Rehabilitasi Sosial",
  `${STAFF_ASN_PREFIX} Bidang Perlindungan dan Jaminan Sosial`,
  "Staff Non ASN Bidang Perlindungan dan Jaminan Sosial",
  `${STAFF_ASN_PREFIX} Bidang Penanganan Bencana`,
  "Staff Non ASN Bidang Penanganan Bencana",
] as const;

export const SIMPLIFIED_ORGANIZATIONAL_LEVELS = ["Eselon", "Staff"] as const;
export type SimplifiedOrganizationalLevel =
  (typeof SIMPLIFIED_ORGANIZATIONAL_LEVELS)[number];

export type OrganizationalLevel = (typeof ORGANIZATIONAL_LEVELS)[number];

/**
 * Organizational level categories for broader classification
 */
export type OrganizationalCategory =
  | "Eselon II"
  | "Eselon III"
  | "Eselon IV"
  | "Staff"
  | "Other";

/**
 * Position types for performance evaluation
 */
export type PositionType = "eselon" | "staff";

/**
 * Golongan level types (I, II, III, IV)
 */
export type GolonganLevel = "I" | "II" | "III" | "IV";

/**
 * Golongan grade types (a, b, c, d, e)
 */
export type GolonganGrade = "a" | "b" | "c" | "d" | "e";

/**
 * Parsed golongan structure
 */
export interface ParsedGolongan {
  level: GolonganLevel;
  grade: GolonganGrade;
  formatted: string; // e.g., "IV/a"
  displayName?: string; // e.g., "Pembina"
}

/**
 * Normalizes organizational level string for consistent comparison
 * Handles whitespace, case variations, and common abbreviations
 * @param level - The organizational level to normalize
 * @returns Normalized string
 */
const normalizeOrganizationalLevel = (level: string): string => {
  if (!level) return "";

  // Remove extra whitespace and normalize case
  let normalized = level.trim().replace(/\s+/g, " ");

  // Handle common abbreviations and variations
  const abbreviationMap: Record<string, string> = {
    "es ii": "eselon ii",
    "es iii": "eselon iii",
    "es iv": "eselon iv",
    "esl ii": "eselon ii",
    "esl iii": "eselon iii",
    "esl iv": "eselon iv",
    echelon: "eselon",
    "staff asn sek": "staff asn sekretariat",
    "staff non asn sek": "staff non asn sekretariat",
    "staff asn hukum": "staff asn bidang hukum",
    "staff asn pembsos": "staff asn bidang pemberdayaan sosial",
    "staff non asn pembsos": "staff non asn bidang pemberdayaan sosial",
    "staff asn rehsos": "staff asn bidang rehabilitasi sosial",
    "staff non asn rehsos": "staff non asn bidang rehabilitasi sosial",
    "staff asn perlindsos": "staff asn bidang perlindungan dan jaminan sosial",
    "staff non asn perlindsos":
      "staff non asn bidang perlindungan dan jaminan sosial",
    "staff asn bencana": "staff asn bidang penanganan bencana",
    "staff non asn bencana": "staff non asn bidang penanganan bencana",
  };

  const lowerNormalized = normalized.toLowerCase();

  // Apply abbreviation mappings
  for (const [abbrev, full] of Object.entries(abbreviationMap)) {
    if (lowerNormalized === abbrev) {
      normalized = full;
      break;
    }
  }

  return normalized;
};

/**
 * Parses golongan string into structured data
 * Supports various formats: "IV/a", "III-b", "II c", "4/a", etc.
 * @param golongan - The golongan string to parse (e.g., "IV/a", "III/b")
 * @returns ParsedGolongan object or null if invalid format
 */
export const parseGolongan = (
  golongan: string | undefined | null,
): ParsedGolongan | null => {
  if (!golongan || typeof golongan !== "string") return null;

  // Normalize input: trim whitespace and convert to uppercase
  const normalized = golongan.trim().toUpperCase();

  // Regular expression to match various golongan formats
  // Supports: IV/a, III-b, II c, 4/a, 3-b, 2 c, etc.
  const golonganPattern = /^(IV|III|II|I|4|3|2|1)[\s\-/]?([A-E])$/;
  const match = normalized.match(golonganPattern);

  if (!match) return null;

  const [, levelPart, gradePart] = match;

  // Convert Arabic numerals to Roman numerals
  const levelMap: Record<string, GolonganLevel> = {
    "1": "I",
    "2": "II",
    "3": "III",
    "4": "IV",
    I: "I",
    II: "II",
    III: "III",
    IV: "IV",
  };

  const level = levelMap[levelPart];
  const grade = gradePart.toLowerCase() as GolonganGrade;

  if (!level || !["a", "b", "c", "d", "e"].includes(grade)) {
    return null;
  }

  // Get display name based on golongan level and grade
  const displayName = getGolonganDisplayName(level, grade);

  return {
    level,
    grade,
    formatted: `${level}/${grade}`,
    displayName,
  };
};

/**
 * Validates if a golongan string is in valid format
 * @param golongan - The golongan string to validate
 * @returns boolean indicating if the golongan is valid
 */
export const isValidGolongan = (
  golongan: string | undefined | null,
): boolean => {
  return parseGolongan(golongan) !== null;
};

/**
 * Formats golongan to standard display format (e.g., "IV/a")
 * @param golongan - The golongan string to format
 * @returns Formatted golongan string or null if invalid
 */
export const formatGolongan = (
  golongan: string | undefined | null,
): string | null => {
  const parsed = parseGolongan(golongan);
  return parsed ? parsed.formatted : null;
};

/**
 * Gets the Indonesian display name for a golongan level and grade
 * Based on Indonesian civil service golongan naming conventions
 * @param level - The golongan level (I, II, III, IV)
 * @param grade - The golongan grade (a, b, c, d, e)
 * @returns The Indonesian display name
 */
export const getGolonganDisplayName = (
  level: GolonganLevel,
  grade: GolonganGrade,
): string => {
  const golonganNames: Record<string, string> = {
    // Golongan I
    "I/a": "Juru Muda",
    "I/b": "Juru Muda Tingkat I",
    "I/c": "Juru",
    "I/d": "Juru Tingkat I",
    // Golongan II
    "II/a": "Pengatur Muda",
    "II/b": "Pengatur Muda Tingkat I",
    "II/c": "Pengatur",
    "II/d": "Pengatur Tingkat I",
    // Golongan III
    "III/a": "Penata Muda",
    "III/b": "Penata Muda Tingkat I",
    "III/c": "Penata",
    "III/d": "Penata Tingkat I",
    // Golongan IV
    "IV/a": "Pembina",
    "IV/b": "Pembina Tingkat I",
    "IV/c": "Pembina Utama Muda",
    "IV/d": "Pembina Utama Madya",
    "IV/e": "Pembina Utama",
  };

  return golonganNames[`${level}/${grade}`] || `${level}/${grade}`;
};

/**
 * Infers Eselon level from golongan based on Indonesian civil service structure
 * Higher golongan typically correlates with higher structural positions
 * @param golongan - The golongan string to analyze
 * @returns The inferred organizational category
 */
export const inferEselonFromGolongan = (
  golongan: string | undefined | null,
): OrganizationalCategory => {
  const parsed = parseGolongan(golongan);
  if (!parsed) return "Staff";

  const { level, grade } = parsed;

  // Mapping based on Indonesian civil service regulations
  // Higher golongan levels typically hold structural positions

  // Eselon II: Typically Golongan IV/c and above
  if (level === "IV" && ["c", "d", "e"].includes(grade)) {
    return ESELON_II;
  }

  // Eselon III: Typically Golongan IV/a, IV/b, and III/d
  if (
    (level === "IV" && ["a", "b"].includes(grade)) ||
    (level === "III" && grade === "d")
  ) {
    return ESELON_III;
  }

  // Eselon IV: Typically Golongan III/c and III/b
  if (level === "III" && ["b", "c"].includes(grade)) {
    return ESELON_IV;
  }

  // All other golongan levels are typically Staff positions
  // This includes: III/a, II/x, I/x
  return STAFF;
};

export const simplifyOrganizationalLevel = (
  level: string | undefined | null,
  golongan?: string | undefined | null,
): SimplifiedOrganizationalLevel => {
  const normalized = normalizeOrganizationalLevel(level ?? "");

  if (normalized.includes("eselon")) {
    return "Eselon";
  }

  if (normalized.includes("staff") || normalized.includes("staf")) {
    return "Staff";
  }

  if (level) {
    const raw = level.toLowerCase();
    if (raw.includes("eselon")) {
      return "Eselon";
    }

    if (raw.includes("staff") || raw.includes("staf")) {
      return "Staff";
    }
  }

  if (golongan) {
    const inferred = inferEselonFromGolongan(golongan);
    if (inferred.toLowerCase().includes("eselon")) {
      return "Eselon";
    }
  }

  return "Staff";
};

/**
 * Validates if a given organizational level is valid
 * Enhanced with normalization for better matching
 * @param level - The organizational level to validate
 * @returns boolean indicating if the level is valid
 */
export const isValidOrganizationalLevel = (
  level: string,
): level is OrganizationalLevel => {
  if (!level) return false;

  const normalized = normalizeOrganizationalLevel(level);

  // Check exact match first
  if (ORGANIZATIONAL_LEVELS.includes(level as OrganizationalLevel)) {
    return true;
  }

  // Check normalized match
  return ORGANIZATIONAL_LEVELS.some(
    (validLevel) => validLevel.toLowerCase() === normalized.toLowerCase(),
  );
};

/**
 * Enhanced pattern matching for Eselon levels with support for various formats
 * @param normalizedLevel - The normalized level string
 * @returns The Eselon category or null if not an Eselon level
 */
const matchEselonLevel = (
  normalizedLevel: string,
): "Eselon II" | "Eselon III" | "Eselon IV" | null => {
  const lower = normalizedLevel.toLowerCase();

  // Check Eselon II patterns
  if (
    /\b(eselon|echelon|es|esl)\s*(ii|2)\b/.test(lower) ||
    /\beselon\s*2\b/.test(lower)
  ) {
    return ESELON_II;
  }

  // Check Eselon III patterns
  if (
    /\b(eselon|echelon|es|esl)\s*(iii|3)\b/.test(lower) ||
    /\beselon\s*3\b/.test(lower)
  ) {
    return ESELON_III;
  }

  // Check Eselon IV patterns
  if (
    /\b(eselon|echelon|es|esl)\s*(iv|4)\b/.test(lower) ||
    /\beselon\s*4\b/.test(lower)
  ) {
    return ESELON_IV;
  }

  return null;
};

/**
 * Categorizes organizational level into broader categories
 * Enhanced with robust normalization and pattern matching
 * Now supports golongan-based inference with priority over position-based inference
 * @param level - The organizational level to categorize
 * @param golongan - Optional golongan string for enhanced inference (e.g., "IV/a", "III/b")
 * @returns The category (Eselon II, Eselon III, Eselon IV, Staff, or Other)
 */
/**
 * Data inconsistency warning interface
 */
export interface DataInconsistencyWarning {
  type: "golongan_position_mismatch";
  message: string;
  golongan: string;
  positionLevel: OrganizationalCategory;
  golonganSuggestedLevel: OrganizationalCategory;
  severity: "low" | "medium" | "high";
}

/**
 * Validates data consistency between golongan and position level
 * @param golonganLevel - Inferred level from golongan
 * @param positionLevel - Level determined from position title
 * @param golongan - Original golongan string
 * @returns Warning object if inconsistency detected, null otherwise
 */
const validateDataConsistency = (
  golonganLevel: OrganizationalCategory,
  positionLevel: OrganizationalCategory,
  golongan: string,
): DataInconsistencyWarning | null => {
  // Define hierarchy levels for comparison
  const levelHierarchy: Record<OrganizationalCategory, number> = {
    [ESELON_II]: 4,
    [ESELON_III]: 3,
    [ESELON_IV]: 2,
    [STAFF]: 1,
    Other: 0,
  };

  const golonganHierarchyLevel = levelHierarchy[golonganLevel];
  const positionHierarchyLevel = levelHierarchy[positionLevel];

  // Calculate the difference in hierarchy levels
  const levelDifference = golonganHierarchyLevel - positionHierarchyLevel;

  // Detect significant inconsistencies
  if (levelDifference >= 2) {
    // Golongan suggests significantly higher level than position
    const severity: "low" | "medium" | "high" =
      levelDifference >= 3 ? "high" : levelDifference === 2 ? "medium" : "low";

    return {
      type: "golongan_position_mismatch",
      message: `Golongan ${golongan} suggests ${golonganLevel} level, but position indicates ${positionLevel}. This may indicate a data inconsistency or recent promotion/demotion.`,
      golongan,
      positionLevel,
      golonganSuggestedLevel: golonganLevel,
      severity,
    };
  }

  return null;
};

/**
 * Logs data inconsistency warnings
 * @param warning - The warning to log
 */
const logDataInconsistencyWarning = (
  warning: DataInconsistencyWarning,
): void => {
  const logLevel =
    warning.severity === "high"
      ? "error"
      : warning.severity === "medium"
        ? "warn"
        : "info";

  console[logLevel](
    `[Data Inconsistency - ${warning.severity.toUpperCase()}] ${warning.message}`,
  );
};

/**
 * Validates data consistency between golongan and organizational level without logging
 * Useful for external validation and testing
 * @param level - The organizational level
 * @param golongan - The golongan string
 * @returns Warning object if inconsistency detected, null otherwise
 */
export const validateOrganizationalDataConsistency = (
  level: string | undefined | null,
  golongan: string | undefined | null,
): DataInconsistencyWarning | null => {
  if (!golongan || !level) return null;

  const golonganInference = inferEselonFromGolongan(golongan);

  // Get position-based inference (simplified version of the logic in categorizeOrganizationalLevel)
  const normalized = normalizeOrganizationalLevel(level);
  if (!normalized) return null;

  let positionInference: OrganizationalCategory;

  const exactMatch = ORGANIZATIONAL_LEVELS.find(
    (validLevel) => validLevel.toLowerCase() === normalized.toLowerCase(),
  );

  if (exactMatch) {
    const eselonMatch = matchEselonLevel(exactMatch);
    positionInference = eselonMatch || "Staff";
  } else {
    const eselonMatch = matchEselonLevel(normalized);
    if (eselonMatch) {
      positionInference = eselonMatch;
    } else {
      const lower = normalized.toLowerCase();
      if (lower.includes("staff") || lower.includes("staf")) {
        positionInference = "Staff";
      } else {
        positionInference = "Other";
      }
    }
  }

  return validateDataConsistency(
    golonganInference,
    positionInference,
    golongan,
  );
};

export const categorizeOrganizationalLevel = (
  level: string | undefined | null,
  golongan?: string | undefined | null,
): OrganizationalCategory => {
  // Check if the level string itself indicates unknown/unclear position
  // This takes precedence over everything, including golongan
  if (level && typeof level === "string") {
    const lowerLevel = level.toLowerCase();
    if (
      lowerLevel.includes("unknown") ||
      lowerLevel.includes("tidak diketahui")
    ) {
      return "Other";
    }
  }

  const golonganInference = golongan ? inferEselonFromGolongan(golongan) : null;
  const positionInference = determinePositionInference(level);

  if (golonganInference && positionInference && golongan) {
    const warning = validateDataConsistency(
      golonganInference,
      positionInference,
      golongan,
    );
    if (warning) {
      logDataInconsistencyWarning(warning);
    }
  }

  // Priority 1: If position inference is clear (not 'Other'), use it
  if (positionInference && positionInference !== "Other") {
    return positionInference;
  }

  // Priority 2: If position is unclear but golongan exists, use golongan inference
  if (golonganInference && golongan) {
    return golonganInference;
  }

  // Priority 3: Fall back to position inference (including 'Other')
  return positionInference || "Other";
};

const determinePositionInference = (
  level: string | undefined | null,
): OrganizationalCategory | null => {
  if (!level || typeof level !== "string") {
    return "Other";
  }

  const normalized = normalizeOrganizationalLevel(level);
  if (!normalized) {
    return "Other";
  }

  const exactMatch = ORGANIZATIONAL_LEVELS.find(
    (validLevel) => validLevel.toLowerCase() === normalized.toLowerCase(),
  );

  if (exactMatch) {
    const eselonMatch = matchEselonLevel(exactMatch);
    return eselonMatch || STAFF;
  }

  const eselonMatch = matchEselonLevel(normalized);
  if (eselonMatch) {
    return eselonMatch;
  }

  return isStaffDescriptor(normalized) ? STAFF : "Other";
};

const isStaffDescriptor = (value: string): boolean => {
  const lower = value.toLowerCase();
  return lower.includes("staff") || lower.includes("staf");
};

/**
 * Determines if an organizational level is an Eselon level
 * @param level - The organizational level to check
 * @returns boolean indicating if the level is Eselon (II, III, or IV)
 */
export const isEselonLevel = (level: string | undefined | null): boolean => {
  const category = categorizeOrganizationalLevel(level);
  return (
    category === "Eselon II" ||
    category === "Eselon III" ||
    category === "Eselon IV"
  );
};

/**
 * Determines if an organizational level is a Staff level
 * @param level - The organizational level to check
 * @returns boolean indicating if the level is Staff
 */
export const isStaffLevel = (level: string | undefined | null): boolean => {
  return categorizeOrganizationalLevel(level) === "Staff";
};

/**
 * Enhanced position normalization for better matching
 * @param position - The position string to normalize
 * @returns Normalized position string
 */
const normalizePosition = (position: string): string => {
  if (!position) return "";

  // Remove extra whitespace and normalize case
  let normalized = position.trim().replace(/\s+/g, " ").toLowerCase();

  // Handle common position abbreviations and variations
  const positionAbbreviations: Record<string, string> = {
    kep: "kepala",
    mgr: "manager",
    dir: "direktur",
    "ka bag": "kabag",
    "ka sub bag": "kasubag",
    "ka subbag": "kasubag",
    pj: "penanggung jawab",
    plt: "pelaksana tugas",
    plh: "pelaksana harian",
  };

  // Apply abbreviation mappings
  for (const [abbrev, full] of Object.entries(positionAbbreviations)) {
    normalized = normalized.replace(new RegExp(`\\b${abbrev}\\b`, "g"), full);
  }

  return normalized;
};

/**
 * Helper function to check if ASN status matches between input and level
 */
const isAsnStatusMatch = (inputText: string, levelText: string): boolean => {
  const hasNonAsn = inputText.includes(NON_ASN);
  const levelHasNonAsn = levelText.includes(NON_ASN);
  const levelHasAsn = levelText.includes("asn") && !levelHasNonAsn;

  return hasNonAsn ? levelHasNonAsn : levelHasAsn;
};

/**
 * Helper function to match staff department
 */
const matchStaffDepartment = (
  inputText: string,
  levelText: string,
): boolean => {
  const departments = [
    "sekretariat",
    "hukum",
    "pemberdayaan",
    "rehabilitasi",
    "perlindungan",
    "bencana",
  ];

  for (const dept of departments) {
    if (inputText.includes(dept) && levelText.includes(dept)) {
      return isAsnStatusMatch(inputText, levelText);
    }
  }

  return false;
};

/**
 * Matches organizational level directly from sub-position/department string
 * @param subPosition - The sub-position or department information
 * @returns The matched organizational level or null if no match found
 */
export const matchOrganizationalLevelFromSubPosition = (
  subPosition: string | undefined | null,
): OrganizationalLevel | null => {
  if (!subPosition || typeof subPosition !== "string") return null;

  const normalized = normalizeOrganizationalLevel(subPosition);
  if (!normalized) return null;

  // Try exact match first (case-insensitive)
  const exactMatch = ORGANIZATIONAL_LEVELS.find(
    (validLevel) => validLevel.toLowerCase() === normalized.toLowerCase(),
  );

  if (exactMatch) return exactMatch;

  // Try partial matching for staff positions
  const lowerNormalized = normalized.toLowerCase();

  if (lowerNormalized.includes("staff") || lowerNormalized.includes("staf")) {
    const staffMatches = ORGANIZATIONAL_LEVELS.filter((level) => {
      const lowerLevel = level.toLowerCase();
      return (
        lowerLevel.includes("staff") &&
        matchStaffDepartment(lowerNormalized, lowerLevel)
      );
    });

    return staffMatches.length > 0 ? staffMatches[0] : null;
  }

  return null;
};

// Eselon II patterns (Department/Agency level leadership)
const ESELON_II_PATTERNS = [
  /\b(plt\.?\s*)?kepala\s+dinas\b/,
  /\b(plt\.?\s*)?kepala\s+badan\b/,
  /\b(plt\.?\s*)?kepala\s+kantor\b/,
  /\bsekretaris\s+dinas\b/,
  /\b(plt\.?\s*)?direktur\s+utama\b/,
  /\b(plt\.?\s*)?direktur\s+jenderal\b/,
  /\bkepala\s+instansi\b/,
  /\bkepala\s+lembaga\b/,
  /\bwakil\s+(kepala\s+)?(dinas|badan|kantor)\b/,
];

// Eselon III patterns (Division/Bureau level leadership)
const ESELON_III_PATTERNS = [
  /\bsekretaris\s+(dinas|badan|kantor)\b/,
  /\bkepala\s+bidang\b/,
  /\bkepala\s+divisi\b/,
  /\bkepala\s+bureau?\b/,
  /\bkepala\s+bagian\b(?!\s+(umum|keuangan|kepegawaian))/,
  /\bdirekt(ur|or)(?!\s+(utama|jenderal))\b/,
  /\bwakil\s+direktur\b/,
  /\binspekt(ur|or)\s+(utama|madya)\b/,
  /\bkabid\b/,
];

// Eselon IV patterns (Section/Sub-division level leadership)
const ESELON_IV_PATTERNS = [
  /\bkepala\s+sub\s+bagian\b/,
  /\bkepala\s+seksi\b/,
  /\bkepala\s+sub\s+divisi\b/,
  /\bkepala\s+unit\b/,
  /\bkasubag\b/,
  /\bkasi\b/,
  /\bkepala\s+sub\s+bidang\b/,
  /\bkepala\s+bagian\s+(umum|keuangan|kepegawaian|perencanaan|pelaporan)\b/,
  /\binspekt(ur|or)\s+muda\b/,
  /\bkepala\s+urusan\b/,
];

// Staff patterns
const STAFF_PATTERNS = [
  /\bstaf+\b/,
  /\bstaff\b/,
  /\banalis\b/,
  /\bpelaks\b/,
  /\boperator\b/,
  /\badministrasi\b/,
  /\bpengadministrasi\b/,
  /\bfungsional\b/,
];

const matchesAnyPattern = (text: string, patterns: RegExp[]): boolean => {
  return patterns.some((pattern) => pattern.test(text));
};

const isUnknownPosition = (position: string): boolean => {
  const lowerPosition = position.toLowerCase();
  return (
    lowerPosition.includes("unknown") ||
    lowerPosition.includes("tidak diketahui")
  );
};

const isStaffSubPosition = (subPosition?: string): boolean => {
  if (!subPosition || typeof subPosition !== "string") return false;
  const normalized = subPosition.toLowerCase();
  return normalized.includes("staff") || normalized.includes("staf");
};

const hasDepartmentContext = (subPosition: string): boolean => {
  return (
    subPosition.includes("bidang") ||
    subPosition.includes("sekretariat") ||
    subPosition.includes("bagian") ||
    subPosition.includes("seksi")
  );
};

/**
 * Determines organizational level based on position title (Indonesian government positions)
 * @param position - The position title to analyze
 * @param subPosition - The sub-position or department information
 * @returns The organizational level category
 */
export const determineOrganizationalLevelFromPosition = (
  position: string,
  subPosition?: string,
): OrganizationalCategory => {
  if (!position || typeof position !== "string") return "Other";
  if (isUnknownPosition(position)) return "Other";
  if (isStaffSubPosition(subPosition)) return "Staff";

  const normalizedPosition = normalizePosition(position);
  const normalizedSubPosition = subPosition
    ? normalizePosition(subPosition)
    : "";
  const fullContext = `${normalizedPosition} ${normalizedSubPosition}`.trim();

  // Check patterns in order of hierarchy (highest to lowest)
  if (matchesAnyPattern(fullContext, ESELON_II_PATTERNS)) return "Eselon II";
  if (matchesAnyPattern(fullContext, ESELON_III_PATTERNS)) return ESELON_III;
  if (matchesAnyPattern(fullContext, ESELON_IV_PATTERNS)) return "Eselon IV";
  if (matchesAnyPattern(fullContext, STAFF_PATTERNS)) return "Staff";

  // Default: if it contains organizational/department context but no clear leadership role, assume Staff
  if (normalizedSubPosition && hasDepartmentContext(normalizedSubPosition)) {
    return "Staff";
  }

  return "Other";
};

/**
 * Gets the position type for performance evaluation purposes
 * Enhanced with robust normalization and pattern matching
 * @param employee - The employee object with organizational_level and position
 * @returns 'eselon' for Eselon levels, 'staff' for Staff levels
 */
export const getPositionType = (employee: {
  organizational_level?: string;
  position?: string;
}): PositionType => {
  const category = categorizeOrganizationalLevel(employee.organizational_level);

  // Map the centralized categorization to eselon/staff types
  if (
    category === "Eselon II" ||
    category === "Eselon III" ||
    category === "Eselon IV"
  ) {
    return "eselon";
  }

  // Enhanced leadership indicators for legacy data with normalization
  const normalizedPosition = normalizePosition(employee.position || "");

  // Leadership position patterns (more comprehensive)
  const leadershipPatterns = [
    /\bkepala\b/,
    /\bmanager\b/,
    /\bdirekt(ur|or)\b/,
    /\bkabag\b/,
    /\bkasubag\b/,
    /\bpimpinan\b/,
    /\bkoordinator\b/,
    /\bsupervisor\b/,
    /\bpenanggung jawab\b/,
    /\bpelaksana tugas\b/,
    /\bpelaksana harian\b/,
    /\bwakil\b.*\b(kepala|direktur|manager)\b/,
    /\bassisten\b.*\b(direktur|manager)\b/,
  ];

  // Check if position matches leadership patterns
  if (leadershipPatterns.some((pattern) => pattern.test(normalizedPosition))) {
    return "eselon";
  }

  // All other positions default to staff (including all staff variations)
  return "staff";
};

/**
 * Gets the position type based only on organizational level
 * @param level - The organizational level
 * @returns 'eselon' for Eselon levels, 'staff' for Staff levels
 */
export const getPositionTypeByLevel = (
  level: string | undefined | null,
): PositionType => {
  return isEselonLevel(level) ? "eselon" : "staff";
};

/**
 * Filters organizational levels to only include Eselon levels
 * @param level - The organizational level to check
 * @returns The specific Eselon level or 'Staff' for non-Eselon levels
 * @deprecated Use categorizeOrganizationalLevel instead for consistent behavior across the application
 */
export const getSpecificEselonLevel = (
  level: string | undefined | null,
): "Eselon II" | "Eselon III" | "Eselon IV" | "Staff" => {
  const category = categorizeOrganizationalLevel(level);
  if (
    category === "Eselon II" ||
    category === "Eselon III" ||
    category === "Eselon IV"
  ) {
    return category;
  }
  return "Staff";
};

/**
 * Standardized function for organizational level categorization
 * This is the recommended function to use across all components
 * @param level - The organizational level to categorize
 * @returns The category (Eselon II, Eselon III, Eselon IV, Staff, or Other)
 */
export const standardizeOrganizationalLevel = categorizeOrganizationalLevel;

/**
 * Helper function to check if a level is any Eselon level (II, III, or IV)
 * @param category - The organizational category from categorizeOrganizationalLevel
 * @returns boolean indicating if the category is any Eselon level
 */
export const isAnyEselonLevel = (category: OrganizationalCategory): boolean => {
  return (
    category === "Eselon II" ||
    category === "Eselon III" ||
    category === "Eselon IV"
  );
};

/**
 * Gets all unique organizational levels from a list of employees
 * @param employees - Array of employees with organizational_level property
 * @returns Array of unique organizational levels, filtered and sorted
 */
export const getUniqueOrganizationalLevels = (
  employees: Array<{ organizational_level?: string }>,
): string[] => {
  const levels = employees
    .map((emp) => emp.organizational_level)
    .filter((level): level is string => Boolean(level))
    .filter((level, index, arr) => arr.indexOf(level) === index);

  return levels.sort();
};

/**
 * Groups employees by their organizational level categories
 * @param employees - Array of employees with organizational_level property
 * @returns Object with category keys and employee arrays as values
 */
export const groupEmployeesByOrganizationalLevel = <
  T extends { organizational_level?: string },
>(
  employees: T[],
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};

  // Initialize all predefined levels
  ORGANIZATIONAL_LEVELS.forEach((level) => {
    grouped[level] = [];
  });
  grouped["Other"] = [];

  // Group employees
  employees.forEach((emp) => {
    const category = categorizeOrganizationalLevel(emp.organizational_level);
    const categoryKey = String(category);
    if (!grouped[categoryKey]) {
      grouped[categoryKey] = [];
    }
    grouped[categoryKey].push(emp);
  });

  return grouped;
};

/**
 * Counts employees by organizational level categories
 * @param employees - Array of employees with organizational_level property
 * @returns Object with category counts
 */
export const countEmployeesByOrganizationalLevel = (
  employees: Array<{ organizational_level?: string }>,
) => {
  const grouped = groupEmployeesByOrganizationalLevel(employees);
  const counts: Record<string, number> = {};

  Object.keys(grouped).forEach((key) => {
    counts[key] = grouped[key].length;
  });

  return counts;
};

/**
 * Gets organizational summary with major category groupings
 * @param employees - Array of employees with organizational_level property
 * @returns Summary object with Eselon, ASN Staff, and Non-ASN Staff counts
 */
export const getOrganizationalSummary = (
  employees: Array<{ organizational_level?: string }>,
) => {
  const employeesByLevel = groupEmployeesByOrganizationalLevel(employees);

  const eselonCount =
    (employeesByLevel[ESELON_II]?.length || 0) +
    (employeesByLevel[ESELON_III]?.length || 0) +
    (employeesByLevel[ESELON_IV]?.length || 0);

  const asnStaffCount = Object.keys(employeesByLevel)
    .filter((level) => level.includes(STAFF_ASN_PREFIX))
    .reduce((sum, level) => sum + (employeesByLevel[level]?.length || 0), 0);

  const nonAsnStaffCount = Object.keys(employeesByLevel)
    .filter((level) => level.includes("Staff Non ASN"))
    .reduce((sum, level) => sum + (employeesByLevel[level]?.length || 0), 0);

  return {
    eselonCount,
    asnStaffCount,
    nonAsnStaffCount,
    totalCount: employees.length,
  };
};

/**
 * Validates and suggests corrections for organizational level input
 * @param level - The organizational level to validate
 * @returns Object with validation result and suggestions
 */
export const validateOrganizationalLevel = (level: string) => {
  if (!level || typeof level !== "string") {
    return {
      isValid: false,
      normalized: "",
      category: "Other" as OrganizationalCategory,
      suggestions: ORGANIZATIONAL_LEVELS.slice(0, 5),
    };
  }

  const normalized = normalizeOrganizationalLevel(level);
  const isValid = isValidOrganizationalLevel(level);
  const category = categorizeOrganizationalLevel(level);

  // Generate suggestions for invalid inputs
  const suggestions = !isValid
    ? ORGANIZATIONAL_LEVELS.filter((validLevel) => {
        const similarity = calculateStringSimilarity(
          normalized.toLowerCase(),
          validLevel.toLowerCase(),
        );
        return similarity > 0.3; // 30% similarity threshold
      }).slice(0, 3)
    : [];

  return {
    isValid,
    normalized,
    category,
    suggestions,
  };
};

/**
 * Simple string similarity calculation using Levenshtein distance
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Batch process organizational levels for data migration or cleanup
 * @param levels - Array of organizational level strings
 * @returns Array of processed results with validation and normalization
 */
export const batchProcessOrganizationalLevels = (levels: string[]) => {
  return levels.map((level) => {
    const validation = validateOrganizationalLevel(level);
    return {
      original: level,
      ...validation,
    };
  });
};

/**
 * Get all possible organizational level variations for testing
 * @returns Array of test cases with expected results
 */
export const getOrganizationalLevelTestCases = () => {
  return [
    // Standard cases
    { input: "Eselon II", expected: "Eselon II" },
    { input: "Eselon III", expected: "Eselon III" },
    { input: "Eselon IV", expected: "Eselon IV" },

    // Case variations
    { input: "eselon ii", expected: "Eselon II" },
    { input: "ESELON III", expected: "Eselon III" },
    { input: "EsElOn Iv", expected: "Eselon IV" },

    // Whitespace variations
    { input: "  Eselon II  ", expected: "Eselon II" },
    { input: "Eselon   II", expected: "Eselon II" },
    { input: "\tEselon\nIII\t", expected: "Eselon III" },

    // Abbreviations
    { input: "Es II", expected: "Eselon II" },
    { input: "Esl III", expected: "Eselon III" },
    { input: "Echelon IV", expected: "Eselon IV" },

    // Staff positions
    { input: `${STAFF_ASN_PREFIX} Sekretariat`, expected: "Staff" },
    { input: "staff asn sek", expected: "Staff" },
    { input: "STAFF NON ASN BIDANG HUKUM", expected: "Staff" },

    // Golongan-based test cases
    { input: "Staff", golongan: "IV/e", expected: "Eselon II" },
    { input: "Staff", golongan: "IV/d", expected: "Eselon II" },
    { input: "Staff", golongan: "IV/c", expected: "Eselon II" },
    { input: "Staff", golongan: "IV/b", expected: "Eselon III" },
    { input: "Staff", golongan: "IV/a", expected: "Eselon III" },
    { input: "Staff", golongan: "III/d", expected: "Eselon III" },
    { input: "Staff", golongan: "III/c", expected: "Eselon IV" },
    { input: "Staff", golongan: "III/b", expected: "Eselon IV" },
    { input: "Staff", golongan: "III/a", expected: "Staff" },
    { input: "Staff", golongan: "II/d", expected: "Staff" },
    { input: "Staff", golongan: "I/a", expected: "Staff" },

    // Golongan format variations
    { input: "Staff", golongan: "4/a", expected: "Eselon III" },
    { input: "Staff", golongan: "III-c", expected: "Eselon IV" },
    { input: "Staff", golongan: "II c", expected: "Staff" },
    { input: "Staff", golongan: "  IV/e  ", expected: "Eselon II" },

    // Invalid golongan cases
    { input: "Staff", golongan: "invalid", expected: "Staff" },
    { input: "Staff", golongan: "V/a", expected: "Staff" },
    { input: "Staff", golongan: "IV/f", expected: "Staff" },
    { input: "Staff", golongan: "", expected: "Staff" },

    // Golongan priority over position
    { input: "Eselon IV", golongan: "IV/e", expected: "Eselon II" },
    { input: STAFF_ASN_PREFIX, golongan: "III/c", expected: "Eselon IV" },

    // Edge cases
    { input: "", expected: "Other" },
    { input: "   ", expected: "Other" },
    { input: "Invalid Level", expected: "Other" },
    { input: null as unknown, expected: "Other" },
    { input: undefined as unknown, expected: "Other" },
    { input: null as unknown, golongan: "IV/a", expected: "Eselon III" },
  ];
};

/**
 * Get golongan parsing test cases for validation
 * @returns Array of golongan test cases with expected results
 */
export const getGolonganTestCases = () => {
  return [
    // Valid formats
    { input: "IV/a", expected: { level: "IV", grade: "a", formatted: "IV/a" } },
    {
      input: "III/b",
      expected: { level: "III", grade: "b", formatted: "III/b" },
    },
    { input: "II-c", expected: { level: "II", grade: "c", formatted: "II/c" } },
    { input: "I d", expected: { level: "I", grade: "d", formatted: "I/d" } },

    // Arabic numeral formats
    { input: "4/a", expected: { level: "IV", grade: "a", formatted: "IV/a" } },
    {
      input: "3-b",
      expected: { level: "III", grade: "b", formatted: "III/b" },
    },
    { input: "2 c", expected: { level: "II", grade: "c", formatted: "II/c" } },
    { input: "1/d", expected: { level: "I", grade: "d", formatted: "I/d" } },

    // Case variations
    { input: "iv/a", expected: { level: "IV", grade: "a", formatted: "IV/a" } },
    {
      input: "III/B",
      expected: { level: "III", grade: "b", formatted: "III/b" },
    },
    {
      input: "  II/c  ",
      expected: { level: "II", grade: "c", formatted: "II/c" },
    },

    // Invalid formats
    { input: "V/a", expected: null },
    { input: "IV/f", expected: null },
    { input: "IV", expected: null },
    { input: "/a", expected: null },
    { input: "invalid", expected: null },
    { input: "", expected: null },
    { input: null, expected: null },
    { input: undefined, expected: null },
  ];
};
