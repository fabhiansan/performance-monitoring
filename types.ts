/**
 * Type definitions for Employee Performance Analyzer
 *
 * All types are now generated from Zod schemas for consistency
 * between frontend and backend.
 */

// Import schema-generated types
export type {
  CreateEmployee,
  UpdateEmployee,
  EmployeeSuggestions,
  OrgLevelMapping,
  EmployeeFormData,
  EmployeeSearchData,
  EmployeePerformanceFormData,
  EmployeeSummaryFormData,
  PerformanceScoreData,
} from "./schemas/employee.schemas";

export type {
  ApiResponse,
  ErrorResponse,
  HealthCheck,
  Pagination,
  PaginatedResponse,
  IdParam,
  NameParam,
  TimeRange,
} from "./schemas/api.schemas";

export type {
  UploadSession,
  CreateUploadSession,
  SessionEmployeeData,
  CurrentDataset,
  DatasetList,
  SaveDataset,
  LeadershipScore,
  SetLeadershipScore,
} from "./schemas/session.schemas";

// Import Employee schema type for transformation
import type { Employee as SchemaEmployee } from "./schemas/employee.schemas";

// Legacy compatibility - CompetencyScore interface
export interface CompetencyScore {
  name: string;
  score: number;
  /**
   * Legacy field used by older parsing logic; kept optional for backward compatibility.
   */
  competency?: string | undefined;
}

// Extended types for specific use cases
// UI-friendly employee type with camelCase aliases
export interface Employee extends SchemaEmployee {
  subPosition?: string;
  organizationalLevel?: string;
}

export interface EmployeeWithSummary extends Employee {
  summary?: string;
}

export interface Dataset {
  id: number;
  name: string;
  createdAt: string;
  employeeCount: number;
}

/**
 * Parameter object for employee create/update operations
 * Replaces long parameter lists with a single structured object
 */
export interface EmployeeUpdateParams {
  name: string;
  nip?: string;
  gol?: string;
  pangkat?: string;
  position?: string;
  subPosition?: string;
  organizationalLevel?: string;
}

/**
 * Helper function to convert Employee to EmployeeUpdateParams
 */
export function toEmployeeUpdateParams(
  employee: Employee,
): EmployeeUpdateParams {
  return {
    name: employee.name,
    nip: employee.nip,
    gol: employee.gol,
    pangkat: employee.pangkat,
    position: employee.position,
    subPosition: employee.subPosition,
    organizationalLevel: employee.organizational_level,
  };
}
