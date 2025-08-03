/**
 * @deprecated This file is deprecated. Please import from '../utils/organizationalLevels' instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

// Re-export everything from the new utils location
export {
  ORGANIZATIONAL_LEVELS,
  type OrganizationalLevel,
  type OrganizationalCategory,
  type PositionType,
  isValidOrganizationalLevel,
  categorizeOrganizationalLevel,
  isEselonLevel,
  isStaffLevel,
  getPositionType,
  getSpecificEselonLevel, // @deprecated
  standardizeOrganizationalLevel,
  isAnyEselonLevel,
  getUniqueOrganizationalLevels,
  groupEmployeesByOrganizationalLevel,
  countEmployeesByOrganizationalLevel,
  getOrganizationalSummary
} from '../utils/organizationalLevels';