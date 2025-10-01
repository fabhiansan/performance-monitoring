import { Employee } from '../../../types';
import type { Employee as ApiEmployee } from '../../../schemas/employee.schemas';
import { createValidationError } from '../../errorHandler';
import { BaseApiClient } from '../core/ApiClient';
import { 
  EmployeeSuggestion, 
  EmployeeCountResponse, 
  AddEmployeeResponse, 
  ApiClientConfig,
  API_OPERATIONS,
  ERROR_MESSAGES 
} from '../interfaces/ApiInterfaces';

export class EmployeeApiClient extends BaseApiClient {
  constructor(config: ApiClientConfig) {
    super(config);
  }

  async getAllEmployees(signal?: AbortSignal): Promise<Employee[]> {
    const employees = await this.get<ApiEmployee[]>('/employees', {
      operation: 'getAllEmployees',
      signal
    });
    return employees.map(this.mapEmployeeFromApi);
  }

  async getEmployeeById(id: number): Promise<Employee> {
    if (!id || id <= 0) {
      throw createValidationError(
        ERROR_MESSAGES.INVALID_EMPLOYEE_ID,
        { operation: API_OPERATIONS.GET_EMPLOYEE_BY_ID }
      );
    }

    const employee = await this.get<ApiEmployee>(`/employees/${id}`, {
      operation: 'getEmployeeById'
    });
    return this.mapEmployeeFromApi(employee);
  }

  async addEmployee(
    name: string, 
    nip: string, 
    gol: string, 
    pangkat: string, 
    position: string, 
    subPosition: string, 
    organizationalLevel?: string
  ): Promise<number> {
    // Validate required fields
    if (!name || name.trim() === '') {
      throw createValidationError(
        ERROR_MESSAGES.EMPLOYEE_NAME_REQUIRED,
        { operation: API_OPERATIONS.ADD_EMPLOYEE }
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

    const payload = this.mapEmployeeToApi({
      name,
      nip,
      gol,
      pangkat,
      position,
      subPosition,
      organizationalLevel
    });

    const result = await this.post<AddEmployeeResponse>('/employees', payload, {
      operation: 'addEmployee'
    });
    
    // Extract ID from either legacy format (result.id) or standardized format
    return result.id || (result as unknown as number);
  }

  async updateEmployee(
    id: number, 
    name: string, 
    nip: string, 
    gol: string, 
    pangkat: string, 
    position: string, 
    subPosition: string, 
    organizationalLevel?: string
  ): Promise<void> {
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

    const payload = this.mapEmployeeToApi({
      name,
      nip,
      gol,
      pangkat,
      position,
      subPosition,
      organizationalLevel
    });

    await this.put<void>(`/employees/${id}`, payload, {
      operation: 'updateEmployee'
    });
  }

  async deleteEmployee(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw createValidationError(
        'Invalid employee ID: must be a positive number',
        { operation: 'deleteEmployee' }
      );
    }

    await this.delete<void>(`/employees/${id}`, {
      operation: 'deleteEmployee'
    });
  }

  async bulkDeleteEmployees(ids: number[]): Promise<void> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createValidationError(
        'Invalid employee IDs: must be a non-empty array',
        { operation: 'bulkDeleteEmployees' }
      );
    }

    const invalidIds = ids.filter(id => !id || id <= 0);
    if (invalidIds.length > 0) {
      throw createValidationError(
        `Invalid employee IDs: ${invalidIds.join(', ')}`,
        { operation: 'bulkDeleteEmployees' }
      );
    }

    await this.post<void>('/employees/bulk/delete', { ids }, {
      operation: 'bulkDeleteEmployees'
    });
  }

  async importEmployeesFromCSV(employees: Employee[]): Promise<string> {
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

    const apiEmployees = employees.map((employee) =>
      this.mapEmployeeToApi(employee)
    );

    // Use the correct backend endpoint for employee data upload
    const result = await this.post<{ sessionId: string }>('/employee-data', {
      employees: apiEmployees
    }, {
      operation: 'importEmployeesFromCSV'
    });
    
    // Return the session ID instead of count
    return result.sessionId;
  }

  async getEmployeesCount(): Promise<number> {
    const result = await this.get<EmployeeCountResponse>('/employees-count', {
      operation: 'getEmployeesCount'
    });
    return result.count;
  }

  async getEmployeeOrgLevelMapping(signal?: AbortSignal): Promise<Record<string, string>> {
    return this.get<Record<string, string>>('/employees/org-level-mapping', {
      operation: 'getEmployeeOrgLevelMapping',
      signal
    });
  }

  async getEmployeeSuggestions(name: string): Promise<EmployeeSuggestion[]> {
    if (!name || name.trim() === '') {
      throw createValidationError(
        'Employee name is required for suggestions',
        { operation: 'getEmployeeSuggestions' }
      );
    }

    return this.get<EmployeeSuggestion[]>(
      `/employees/suggestions?name=${encodeURIComponent(name)}`,
      { operation: 'getEmployeeSuggestions' }
    );
  }

  async resolveEmployees(mappings: Record<string, string>, sessionId: string): Promise<void> {
    if (!mappings || Object.keys(mappings).length === 0) {
      throw createValidationError(
        'Employee mappings are required',
        { operation: 'resolveEmployees' }
      );
    }

    if (!sessionId || sessionId.trim() === '') {
      throw createValidationError(
        'Session ID is required',
        { operation: 'resolveEmployees' }
      );
    }

    await this.post<void>('/employees/resolve', {
      mappings,
      sessionId
    }, {
      operation: 'resolveEmployees'
    });
  }

  async updateEmployeeSummary(sessionId: string, employeeName: string, summary: string): Promise<void> {
    if (!sessionId || sessionId.trim() === '') {
      throw createValidationError(
        'Session ID is required',
        { operation: 'updateEmployeeSummary' }
      );
    }

    if (!employeeName || employeeName.trim() === '') {
      throw createValidationError(
        'Employee name is required',
        { operation: 'updateEmployeeSummary' }
      );
    }

    if (!summary || summary.trim() === '') {
      throw createValidationError(
        'Summary is required',
        { operation: 'updateEmployeeSummary' }
      );
    }

    await this.put<void>(`/employees/${encodeURIComponent(employeeName)}/summary`, {
      sessionId,
      summary
    }, {
      operation: 'updateEmployeeSummary'
    });
  }

  private mapEmployeeFromApi = (employee: ApiEmployee): Employee => ({
    ...employee,
    subPosition: employee.sub_position ?? '',
    organizationalLevel: employee.organizational_level ?? ''
  });

  private mapEmployeeToApi(
    employee: Pick<Employee, 'name' | 'nip' | 'gol' | 'pangkat' | 'position'> &
      Partial<Pick<Employee, 'subPosition' | 'organizationalLevel'>> &
      Partial<{ sub_position: string; organizational_level: string }>
  ): Pick<ApiEmployee, 'name' | 'nip' | 'gol' | 'pangkat' | 'position'> & {
    sub_position?: string;
    organizational_level?: string;
  } {
    const subPosition = employee.subPosition ?? employee.sub_position;
    const organizationalLevel = employee.organizationalLevel ?? employee.organizational_level;

    return {
      name: employee.name,
      nip: employee.nip ?? '',
      gol: employee.gol ?? '',
      pangkat: employee.pangkat ?? '',
      position: employee.position ?? '',
      ...(subPosition ? { sub_position: subPosition } : {}),
      ...(organizationalLevel ? { organizational_level: organizationalLevel } : {})
    };
  }
}
