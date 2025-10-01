import { createValidationError, createServerError } from '../../errorHandler';
import { BaseApiClient } from '../core/ApiClient';
import { 
  EmployeeWithSession, 
  EmployeeDataApiResponse,
  ApiClientConfig,
  API_OPERATIONS,
  API_ENDPOINTS 
} from '../interfaces/ApiInterfaces';

export class DataApiClient extends BaseApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
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

    let endpoint = API_ENDPOINTS.EMPLOYEE_DATA_RANGE;
    const params = new URLSearchParams();
    
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const result = await this.get<EmployeeDataApiResponse>(endpoint, {
      operation: API_OPERATIONS.GET_EMPLOYEE_DATA_BY_TIME_RANGE
    });
    
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
    const result = await this.get<EmployeeDataApiResponse>(API_ENDPOINTS.EMPLOYEE_DATA_LATEST, {
      operation: API_OPERATIONS.GET_LATEST_EMPLOYEE_DATA
    });
    
    // Validate the response structure
    if (!result || !Array.isArray(result.employees)) {
      throw createServerError(
        'Invalid response format: employees array not found',
        { operation: 'getLatestEmployeeData' }
      );
    }
    
    return result.employees;
  }
}