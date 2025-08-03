/// <reference types="vite/client" />
import { Employee } from '../types';
import { createNetworkError, createServerError, createValidationError, AppError } from './errorHandler';


interface UploadSession {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count: number;
}

interface EmployeeWithSession extends Employee {
  uploadSession?: string;
  uploadTimestamp?: string;
  sessionName?: string;
}


class ApiService {
  private baseUrl: string;
  private useStandardizedFormat: boolean;

  constructor() {
    // Handle different environments: development (Vite), production (packaged), and fallback
    let apiBaseUrl = 'http://localhost:3002/api'; // Default fallback
    
    try {
      // In development with Vite, import.meta.env is available
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
        apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
      }
      // In packaged Electron app, check for process.env
      else if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
        apiBaseUrl = process.env.VITE_API_BASE_URL;
      }
    } catch (error) {
      // Silently fall back to default if import.meta is not available
      console.warn('Using default API base URL due to environment detection error:', error);
    }
    
    this.baseUrl = apiBaseUrl;
    // Enable standardized format by default for new implementations
    this.useStandardizedFormat = true;
  }

  // Method to toggle between legacy and standardized response formats
  setResponseFormat(useStandardized: boolean) {
    this.useStandardizedFormat = useStandardized;
  }

  // Helper method to add appropriate headers for API version
  private getRequestHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
    
    if (this.useStandardizedFormat) {
      headers['Accept-API-Version'] = '2.0';
    }
    
    return headers;
  }

  // Helper method to extract data from standardized or legacy response
  private extractResponseData<T>(responseData: any): T {
    // Check if it's a standardized response format
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      if (responseData.success) {
        return responseData.data;
      } else {
        // Handle standardized error format
        const errorMessage = responseData.message || 'An error occurred';
        const errorCode = responseData.metadata?.error?.code || 'UNKNOWN_ERROR';
        const errorDetails = responseData.metadata?.error?.details;
        
        throw new AppError(errorMessage, {
          code: errorCode,
          userMessage: errorMessage,
          context: { errorDetails },
          retryable: responseData.metadata?.error?.retryable || false
        });
      }
    }
    
    // Handle legacy response format
    return responseData;
  }

  // Helper method for consistent error handling
  private async handleApiCall<T>(
    operation: () => Promise<Response>,
    context: { operation: string; endpoint?: string }
  ): Promise<T> {
    try {
      const response = await operation();
      
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle standardized error responses
        if (responseData && typeof responseData === 'object' && 'success' in responseData && !responseData.success) {
          const errorMessage = responseData.message || 'An error occurred';
          const errorCode = responseData.metadata?.error?.code || 'UNKNOWN_ERROR';
          const errorDetails = responseData.metadata?.error?.details;
          
          throw new AppError(errorMessage, {
            code: errorCode,
            userMessage: errorMessage,
            context: { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status,
                errorDetails
              }
            },
            retryable: responseData.metadata?.error?.retryable || false
          });
        }
        
        // Handle legacy error responses
        const errorText = responseData.error || responseData.message || 'Unknown error';
        
        if (response.status >= 500) {
          throw createServerError(
            `Server error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        } else if (response.status >= 400) {
          throw createValidationError(
            `Request error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        } else {
          throw createNetworkError(
            `HTTP error (${response.status}): ${errorText}`,
            { 
              operation: context.operation,
              additionalData: {
                endpoint: context.endpoint,
                status: response.status
              }
            }
          );
        }
      }

      const responseData = await response.json();
      return this.extractResponseData<T>(responseData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle network/fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw createNetworkError(
          'Failed to connect to server. Please check your connection.',
          { 
            operation: context.operation,
            additionalData: {
              endpoint: context.endpoint,
              originalError: error.message
            }
          }
        );
      }
      
      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        throw createServerError(
          'Invalid response from server',
          { 
            operation: context.operation,
            additionalData: {
              endpoint: context.endpoint,
              originalError: error.message
            }
          }
        );
      }
      
      // Re-throw unknown errors with context
      throw new AppError(error instanceof Error ? error.message : 'Unknown error', {
        code: 'UNKNOWN_API_ERROR',
        userMessage: 'An unexpected error occurred while communicating with the server',
        severity: 'medium',
        category: 'unknown',
        context: { 
          operation: context.operation,
          additionalData: {
            endpoint: context.endpoint
          }
        },
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Try the Electron-specific health endpoint first
      const response = await fetch('http://localhost:3002/health');
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Don't throw for first attempt, just log
      console.warn('Electron health check failed:', error);
    }
    
    // Fallback to API health endpoint
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      // Don't throw for health check, just return false
      console.error('API health check failed:', error);
      return false;
    }
  }


  async getAllEmployees(): Promise<any[]> {
    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees`),
      { operation: 'getAllEmployees' }
    );
  }

  async getEmployeeById(id: number): Promise<any> {
    if (!id || id <= 0) {
      throw createValidationError(
        'Invalid employee ID: must be a positive number',
        { operation: 'getEmployeeById' }
      );
    }

    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/${id}`, {
        headers: this.getRequestHeaders(),
      }),
      { operation: 'getEmployeeById', endpoint: `/employees/${id}` }
    );
  }

  // Add employee with full fields
  async addEmployee(name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string, organizationalLevel?: string): Promise<number> {
    // Validate required fields
    if (!name || name.trim() === '') {
      throw createValidationError(
        'Employee name is required',
        { operation: 'addEmployee' }
      );
    }
    
    if (!nip || nip.trim() === '') {
      throw createValidationError(
        'Employee NIP is required',
        { operation: 'addEmployee' }
      );
    }
    
    if (!position || position.trim() === '') {
      throw createValidationError(
        'Employee position is required',
        { operation: 'addEmployee' }
      );
    }

    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition, organizationalLevel }),
      }),
      { operation: 'addEmployee', endpoint: '/employees' }
    ).then((result: any) => {
      // Extract ID from either legacy format (result.id) or standardized format
      return result.id || result;
    });
  }

  async importEmployeesFromCSV(employees: any[]): Promise<number> {
    if (!employees || !Array.isArray(employees)) {
      throw createValidationError(
        'Invalid employees data: must be an array',
        { operation: 'importEmployeesFromCSV' }
      );
    }
    
    if (employees.length === 0) {
      throw createValidationError(
        'Cannot import empty employee list',
        { operation: 'importEmployeesFromCSV' }
      );
    }

    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/import-csv`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({ employees }),
      }),
      { operation: 'importEmployeesFromCSV', endpoint: '/employees/import-csv' }
    ).then((result: any) => {
      // Extract count from either legacy format (result.count) or standardized format (result.importedCount)
      return result.count || result.importedCount || 0;
    });
  }

  async updateEmployee(id: number, name: string, nip: string, gol: string, pangkat: string, position: string, subPosition: string, organizationalLevel?: string): Promise<void> {
    // Validate employee ID
    if (!id || id <= 0) {
      throw createValidationError(
        'Invalid employee ID: must be a positive number',
        { operation: 'updateEmployee' }
      );
    }
    
    // Validate required fields
    if (!name || name.trim() === '') {
      throw createValidationError(
        'Employee name is required',
        { operation: 'updateEmployee' }
      );
    }
    
    if (!nip || nip.trim() === '') {
      throw createValidationError(
        'Employee NIP is required',
        { operation: 'updateEmployee' }
      );
    }
    
    if (!position || position.trim() === '') {
      throw createValidationError(
        'Employee position is required',
        { operation: 'updateEmployee' }
      );
    }

    await this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/${id}`, {
        method: 'PUT',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({ name, nip, gol, pangkat, position, subPosition, organizationalLevel }),
      }),
      { operation: 'updateEmployee', endpoint: `/employees/${id}` }
    );
  }

  async deleteEmployee(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw createValidationError(
        'Invalid employee ID: must be a positive number',
        { operation: 'deleteEmployee' }
      );
    }

    await this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/${id}`, {
        method: 'DELETE',
        headers: this.getRequestHeaders(),
      }),
      { operation: 'deleteEmployee', endpoint: `/employees/${id}` }
    );
  }

  async getEmployeesCount(): Promise<number> {
    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees-count`),
      { operation: 'getEmployeesCount' }
    ).then((result: any) => {
      return result.count;
    });
  }

  async getEmployeeOrgLevelMapping(): Promise<Record<string, string>> {
    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/org-level-mapping`),
      { operation: 'getEmployeeOrgLevelMapping' }
    );
  }

  async getEmployeeSuggestions(name: string): Promise<{name: string; organizational_level: string; similarity: number}[]> {
    if (!name || name.trim() === '') {
      throw createValidationError(
        'Employee name is required for suggestions',
        { operation: 'getEmployeeSuggestions' }
      );
    }

    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/employees/suggestions?name=${encodeURIComponent(name)}`, {
        headers: this.getRequestHeaders(),
      }),
      { operation: 'getEmployeeSuggestions', endpoint: '/employees/suggestions' }
    );
  }

  // Manual Leadership Scores Methods

  async getManualLeadershipScores(): Promise<Record<string, number>> {
    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/current-dataset/leadership-scores`, {
        headers: this.getRequestHeaders(),
      }),
      { operation: 'getManualLeadershipScores', endpoint: '/current-dataset/leadership-scores' }
    );
  }

  async setManualLeadershipScore(employeeName: string, score: number): Promise<void> {
    if (!employeeName || employeeName.trim() === '') {
      throw createValidationError(
        'Employee name is required',
        { operation: 'setManualLeadershipScore' }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw createValidationError(
        'Score must be a number between 0 and 100',
        { operation: 'setManualLeadershipScore' }
      );
    }

    await this.handleApiCall(
      () => fetch(`${this.baseUrl}/current-dataset/leadership-scores/${encodeURIComponent(employeeName)}`, {
        method: 'PUT',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({ score }),
      }),
      { operation: 'setManualLeadershipScore', endpoint: `/current-dataset/leadership-scores/${employeeName}` }
    );
  }

  async bulkUpdateManualLeadershipScores(scores: Record<string, number>): Promise<void> {
    if (!scores || typeof scores !== 'object') {
      throw createValidationError(
        'Scores must be an object with employee names as keys and scores as values',
        { operation: 'bulkUpdateManualLeadershipScores' }
      );
    }

    // Validate each score
    for (const [employeeName, score] of Object.entries(scores)) {
      if (!employeeName || employeeName.trim() === '') {
        throw createValidationError(
          'All employee names must be non-empty strings',
          { operation: 'bulkUpdateManualLeadershipScores' }
        );
      }
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw createValidationError(
          `Score for ${employeeName} must be a number between 0 and 100`,
          { operation: 'bulkUpdateManualLeadershipScores' }
        );
      }
    }

    await this.handleApiCall(
      () => fetch(`${this.baseUrl}/current-dataset/leadership-scores`, {
        method: 'PUT',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({ scores }),
      }),
      { operation: 'bulkUpdateManualLeadershipScores', endpoint: '/current-dataset/leadership-scores' }
    );
  }

  // NEW UNIFIED TIMESTAMP-BASED METHODS

  async saveEmployeeData(employees: Employee[], sessionName?: string): Promise<string> {
    // Validate input data
    if (!employees || !Array.isArray(employees)) {
      throw createValidationError(
        'Invalid employees data: must be an array',
        { operation: 'uploadEmployeeData' }
      );
    }
    
    if (employees.length === 0) {
      throw createValidationError(
        'Cannot save empty employee data',
        { operation: 'uploadEmployeeData' }
      );
    }

    // Validate employee data structure before sending
    const validatedEmployees = employees.map((emp, index) => {
      if (!emp.name || emp.name.trim() === '') {
        throw createValidationError(
          `Employee at index ${index} is missing a name`,
          { operation: 'uploadEmployeeData' }
        );
      }
      
      // Ensure performance data is properly formatted
      const performance = emp.performance || [];
      if (!Array.isArray(performance)) {
        console.warn(`Invalid performance data for employee ${emp.name}, converting to array`);
      }
      
      return {
        ...emp,
        performance: Array.isArray(performance) ? performance : []
      };
    });

    const result = await this.handleApiCall<{ sessionId: string }>(
      () => fetch(`${this.baseUrl}/employee-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employees: validatedEmployees, sessionName }),
      }),
      { operation: 'saveEmployeeData', endpoint: '/employee-data' }
    );
    
    if (!result.sessionId) {
      throw createServerError(
        'Server did not return a session ID',
        { operation: 'uploadEmployeeData' }
      );
    }
    
    console.log(`✅ Saved ${validatedEmployees.length} employees to session ${result.sessionId}`);
    return result.sessionId;
  }

  async getAllUploadSessions(): Promise<UploadSession[]> {
    return this.handleApiCall(
      () => fetch(`${this.baseUrl}/upload-sessions`),
      { operation: 'getAllUploadSessions', endpoint: '/upload-sessions' }
    );
  }

  async getEmployeeDataBySession(sessionId: string, signal?: AbortSignal): Promise<EmployeeWithSession[]> {
    if (!sessionId || sessionId.trim() === '') {
      throw createValidationError(
        'Session ID is required',
        { operation: 'getEmployeeDataBySession' }
      );
    }

    const result = await this.handleApiCall<{ employees: EmployeeWithSession[]; metadata?: any }>(
      () => fetch(`${this.baseUrl}/employee-data/session/${encodeURIComponent(sessionId)}`, {
        signal,
        headers: this.getRequestHeaders()
      }),
      { operation: 'getEmployeeDataBySession', endpoint: `/employee-data/session/${sessionId}` }
    );
    
    // Validate the response structure
    if (!result || !Array.isArray(result.employees)) {
      throw createServerError(
        'Invalid response format: employees array not found',
        { operation: 'getEmployeeDataBySession' }
      );
    }
    
    // Validate employee data structure and performance data
    const employees = result.employees.map((emp: any) => {
      // Ensure performance data is properly structured
      if (emp.performance && !Array.isArray(emp.performance)) {
        console.warn(`Invalid performance data for employee ${emp.name}, converting to empty array`);
        emp.performance = [];
      }
      
      // Ensure required fields exist and map to correct property names
      return {
        id: emp.id || 0,
        name: emp.name || '',
        nip: emp.nip || '',
        gol: emp.gol || '',
        pangkat: emp.pangkat || '',
        position: emp.position || '',
        sub_position: emp.subPosition || emp.sub_position || '',
        organizational_level: emp.organizationalLevel || emp.organizational_level || '',
        performance: emp.performance || [],
        created_at: emp.created_at,
        uploadSession: emp.uploadSession,
        uploadTimestamp: emp.uploadTimestamp,
        sessionName: emp.sessionName
      };
    });
    
    // Log metadata for debugging
    if (result.metadata) {
      console.log('Session data metadata:', result.metadata);
      
      if (result.metadata.employeesWithoutPerformanceData > 0) {
        console.warn(`⚠️ ${result.metadata.employeesWithoutPerformanceData} employees loaded without performance data`);
      }
    }
    
    return employees;
  }

  async getEmployeeDataByTimeRange(startTime?: string, endTime?: string): Promise<EmployeeWithSession[]> {
    // Validate time format if provided
    if (startTime && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(startTime)) {
      throw createValidationError(
        'Start time must be in ISO format (YYYY-MM-DDTHH:mm:ss)',
        { operation: 'getEmployeeDataByTimeRange' }
      );
    }
    
    if (endTime && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(endTime)) {
      throw createValidationError(
        'End time must be in ISO format (YYYY-MM-DDTHH:mm:ss)',
        { operation: 'getEmployeeDataByTimeRange' }
      );
    }

    let url = `${this.baseUrl}/employee-data/range`;
    const params = new URLSearchParams();
    
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const result = await this.handleApiCall<{ employees: EmployeeWithSession[]; metadata?: any }>(
      () => fetch(url, {
        headers: this.getRequestHeaders(),
      }),
      { operation: 'getEmployeeDataByTimeRange', endpoint: '/employee-data/range' }
    );
    
    // Validate the response structure
    if (!result || !Array.isArray(result.employees)) {
      throw createServerError(
        'Invalid response format: employees array not found',
        { operation: 'getEmployeeDataByTimeRange' }
      );
    }
    
    return result.employees;
  }

  async getLatestEmployeeData(): Promise<EmployeeWithSession[]> {
    const result = await this.handleApiCall<{ employees: EmployeeWithSession[]; metadata?: any }>(
      () => fetch(`${this.baseUrl}/employee-data/latest`, {
        headers: this.getRequestHeaders(),
      }),
      { operation: 'getLatestEmployeeData', endpoint: '/employee-data/latest' }
    );
    
    // Validate the response structure
    if (!result || !Array.isArray(result.employees)) {
      throw createServerError(
        'Invalid response format: employees array not found',
        { operation: 'getLatestEmployeeData' }
      );
    }
    
    return result.employees;
  }

  async deleteUploadSession(sessionId: string): Promise<void> {
    if (!sessionId || sessionId.trim() === '') {
      throw createValidationError(
        'Session ID is required',
        { operation: 'deleteUploadSession' }
      );
    }

    await this.handleApiCall(
      () => fetch(`${this.baseUrl}/upload-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.getRequestHeaders(),
      }),
      { operation: 'deleteUploadSession', endpoint: `/upload-sessions/${sessionId}` }
    );
  }

}

export const api = new ApiService();
export type { UploadSession, EmployeeWithSession };