/// <reference types="vite/client" />
import { Employee } from '../../../types';

// Core API interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  metadata?: {
    error?: {
      code: string;
      details?: unknown;
      retryable?: boolean;
    };
    [key: string]: unknown;
  };
}

// Employee-related interfaces
export interface EmployeeWithSession extends Employee {
  uploadSession?: string;
  uploadTimestamp?: string;
  sessionName?: string;
  overallScore?: number;
}

export interface EmployeeSuggestion {
  id: number;
  name: string;
  organizational_level: string | null;
}

export interface EmployeeCountResponse {
  count: number;
}

export interface AddEmployeeResponse {
  id: number;
  message?: string;
}

export interface ImportResponse {
  count: number;
  importedCount?: number;
  message?: string;
}

// Session-related interfaces
export interface UploadSession {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count?: number;
}

export interface SessionSaveResponse {
  sessionId: string;
}

export interface EmployeeDataResponse {
  employees: EmployeeWithSession[];
  metadata?: {
    totalEmployees: number;
    employeesWithPerformanceData: number;
    employeesWithoutPerformanceData: number;
    [key: string]: unknown;
  };
}

export interface EmployeeDataApiResponse {
  employees: EmployeeWithSession[];
  metadata?: Record<string, unknown>;
}

// Core client interfaces
export interface ApiClientConfig {
  baseUrl: string;
  useStandardizedFormat: boolean;
  timeout?: number;
}

export interface RequestContext {
  operation: string;
  endpoint?: string;
  signal?: AbortSignal;
}

export interface ApiClient {
  get<T>(_endpoint: string, _context: RequestContext): Promise<T>;
  post<T>(_endpoint: string, _data: unknown, _context: RequestContext): Promise<T>;
  put<T>(_endpoint: string, _data: unknown, _context: RequestContext): Promise<T>;
  delete<T>(_endpoint: string, _context: RequestContext): Promise<T>;
}

// API operation constants
export const API_OPERATIONS = {
  GET_EMPLOYEE_DATA_BY_TIME_RANGE: 'getEmployeeDataByTimeRange',
  GET_LATEST_EMPLOYEE_DATA: 'getLatestEmployeeData',
  GET_EMPLOYEE_BY_ID: 'getEmployeeById',
  ADD_EMPLOYEE: 'addEmployee',
  GET_EMPLOYEE_DATA_BY_SESSION: 'getEmployeeDataBySession'
} as const;

export const API_ENDPOINTS = {
  EMPLOYEE_DATA_RANGE: '/employee-data/range',
  EMPLOYEE_DATA_LATEST: '/employee-data/latest'
} as const;

export const ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'Unknown error',
  INVALID_EMPLOYEE_ID: 'Invalid employee ID: must be a positive number',
  EMPLOYEE_NAME_REQUIRED: 'Employee name is required',
  INVALID_RESPONSE_FORMAT: 'Invalid response format: employees array not found'
} as const;
