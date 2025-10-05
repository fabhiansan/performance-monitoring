import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmployeeApiClient } from '../EmployeeApiClient';
import { Employee, EmployeeUpdateParams } from '../../../../types';
import type { Employee as ApiEmployee } from '../../../../schemas/employee.schemas';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EmployeeApiClient', () => {
  let client: EmployeeApiClient;
  const baseUrl = 'http://localhost:3002/api';

  beforeEach(() => {
    client = new EmployeeApiClient({ baseUrl, useStandardizedFormat: true });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => ({ success: ok, data, metadata: {} }),
    text: async () => JSON.stringify({ success: ok, data, metadata: {} }),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  const mockEmployee: ApiEmployee = {
    id: 1,
    name: 'John Doe',
    nip: '123456789012345678',
    gol: 'III/d',
    pangkat: 'Penata Tingkat I',
    position: 'Kepala Sub Bagian',
    sub_position: 'Staff Perencanaan',
    organizational_level: 'Staff',
    performance: [],
  };

  describe('getAllEmployees', () => {
    it('should fetch all employees successfully', async () => {
      const mockData = [mockEmployee];
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getAllEmployees();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].subPosition).toBe('Staff Perencanaan');
      expect(result[0].organizationalLevel).toBe('Staff');
    });

    it('should map API employee format to internal format', async () => {
      const mockData = [mockEmployee];
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const result = await client.getAllEmployees();

      expect(result[0]).toHaveProperty('subPosition');
      expect(result[0]).toHaveProperty('organizationalLevel');
      expect(result[0].subPosition).toBe(mockEmployee.sub_position);
      expect(result[0].organizationalLevel).toBe(mockEmployee.organizational_level);
    });

    it('should support abort signal', async () => {
      const mockData = [mockEmployee];
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const controller = new AbortController();
      await client.getAllEmployees(controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees`,
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });

    it('should handle empty employee list', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      const result = await client.getAllEmployees();

      expect(result).toEqual([]);
    });
  });

  describe('getEmployeeById', () => {
    it('should fetch employee by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockEmployee));

      const result = await client.getEmployeeById(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/1`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.name).toBe('John Doe');
      expect(result.id).toBe(1);
    });

    it('should throw error for invalid ID (0)', async () => {
      await expect(client.getEmployeeById(0)).rejects.toThrow(/invalid.*employee.*id/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(client.getEmployeeById(-5)).rejects.toThrow(/invalid.*employee.*id/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error for null ID', async () => {
      await expect(client.getEmployeeById(null as any)).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('addEmployee', () => {
    const validParams: EmployeeUpdateParams = {
      name: 'Jane Smith',
      nip: '987654321098765432',
      gol: 'IV/a',
      pangkat: 'Pembina',
      position: 'Kepala Bidang',
      subPosition: 'Sekretariat',
      organizationalLevel: 'Eselon III',
    };

    it('should add employee successfully', async () => {
      const mockResponse = { id: 2 };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.addEmployee(validParams);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
      expect(result).toBe(2);
    });

    it('should validate required name field', async () => {
      const invalidParams = { ...validParams, name: '' };

      await expect(client.addEmployee(invalidParams)).rejects.toThrow(/name.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate required NIP field', async () => {
      const invalidParams = { ...validParams, nip: '' };

      await expect(client.addEmployee(invalidParams)).rejects.toThrow(/nip.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate required position field', async () => {
      const invalidParams = { ...validParams, position: '' };

      await expect(client.addEmployee(invalidParams)).rejects.toThrow(/position.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should trim whitespace from name', async () => {
      const paramsWithWhitespace = { ...validParams, name: '  Jane Smith  ' };
      const mockResponse = { id: 2 };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.addEmployee(paramsWithWhitespace);

      expect(result).toBe(2);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.name).toBe('Jane Smith');
    });

    it('should map employee to API format correctly', async () => {
      const mockResponse = { id: 2 };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await client.addEmployee(validParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toHaveProperty('sub_position', validParams.subPosition);
      expect(callBody).toHaveProperty('organizational_level', validParams.organizationalLevel);
    });
  });

  describe('updateEmployee', () => {
    const validParams: EmployeeUpdateParams = {
      name: 'Jane Smith Updated',
      nip: '987654321098765432',
      gol: 'IV/a',
      pangkat: 'Pembina',
      position: 'Kepala Bidang',
      subPosition: 'Sekretariat',
      organizationalLevel: 'Eselon III',
    };

    it('should update employee successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.updateEmployee(1, validParams);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/1`,
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(String),
        })
      );
    });

    it('should validate employee ID', async () => {
      await expect(client.updateEmployee(0, validParams)).rejects.toThrow(/invalid.*employee.*id/i);
      await expect(client.updateEmployee(-1, validParams)).rejects.toThrow(/invalid.*employee.*id/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(client.updateEmployee(1, { ...validParams, name: '' })).rejects.toThrow(/name.*required/i);
      await expect(client.updateEmployee(1, { ...validParams, nip: '' })).rejects.toThrow(/nip.*required/i);
      await expect(client.updateEmployee(1, { ...validParams, position: '' })).rejects.toThrow(/position.*required/i);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.deleteEmployee(1);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/1`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should validate employee ID', async () => {
      await expect(client.deleteEmployee(0)).rejects.toThrow(/invalid.*employee.*id/i);
      await expect(client.deleteEmployee(-1)).rejects.toThrow(/invalid.*employee.*id/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteEmployees', () => {
    it('should bulk delete employees successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.bulkDeleteEmployees([1, 2, 3]);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/bulk/delete`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: [1, 2, 3] }),
        })
      );
    });

    it('should validate IDs array is not empty', async () => {
      await expect(client.bulkDeleteEmployees([])).rejects.toThrow(/non-empty array/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate all IDs are positive numbers', async () => {
      await expect(client.bulkDeleteEmployees([1, 0, 3])).rejects.toThrow(/invalid.*employee.*ids/i);
      await expect(client.bulkDeleteEmployees([1, -2, 3])).rejects.toThrow(/invalid.*employee.*ids/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate IDs is an array', async () => {
      await expect(client.bulkDeleteEmployees(null as any)).rejects.toThrow();
      await expect(client.bulkDeleteEmployees('not-array' as any)).rejects.toThrow();
    });
  });

  describe('importEmployeesFromCSV', () => {
    const mockEmployees: Employee[] = [
      {
        name: 'John Doe',
        nip: '123456789012345678',
        gol: 'III/d',
        pangkat: 'Penata Tingkat I',
        position: 'Kepala Sub Bagian',
        subPosition: 'Staff Perencanaan',
        organizationalLevel: 'Staff',
        performance: [],
      },
    ];

    it('should import employees successfully', async () => {
      const mockResponse = { inserted: 1, updated: 0, total: 1 };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.importEmployeesFromCSV(mockEmployees);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/import`,
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should validate employees is an array', async () => {
      await expect(client.importEmployeesFromCSV(null as any)).rejects.toThrow(/must be an array/i);
      await expect(client.importEmployeesFromCSV('not-array' as any)).rejects.toThrow(/must be an array/i);
    });

    it('should validate employees array is not empty', async () => {
      await expect(client.importEmployeesFromCSV([])).rejects.toThrow(/empty/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeesCount', () => {
    it('should get employees count successfully', async () => {
      const mockResponse = { count: 42 };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.getEmployeesCount();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees-count`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toBe(42);
    });
  });

  describe('getEmployeeOrgLevelMapping', () => {
    it('should get org level mapping successfully', async () => {
      const mockMapping = { 'John Doe': 'Staff', 'Jane Smith': 'Eselon III' };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockMapping));

      const result = await client.getEmployeeOrgLevelMapping();

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/org-level-mapping`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockMapping);
    });

    it('should support abort signal', async () => {
      const mockMapping = {};
      mockFetch.mockResolvedValueOnce(createMockResponse(mockMapping));

      const controller = new AbortController();
      await client.getEmployeeOrgLevelMapping(controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });

  describe('getEmployeeSuggestions', () => {
    it('should get employee suggestions successfully', async () => {
      const mockSuggestions = [
        { name: 'John Doe', nip: '123456789012345678' },
        { name: 'John Smith', nip: '987654321098765432' },
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuggestions));

      const result = await client.getEmployeeSuggestions('John');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/suggestions?name=John`,
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockSuggestions);
    });

    it('should encode special characters in name', async () => {
      const mockSuggestions: any[] = [];
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuggestions));

      await client.getEmployeeSuggestions('John Doe & Associates');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('John Doe & Associates')),
        expect.any(Object)
      );
    });

    it('should validate name is not empty', async () => {
      await expect(client.getEmployeeSuggestions('')).rejects.toThrow(/name.*required/i);
      await expect(client.getEmployeeSuggestions('   ')).rejects.toThrow(/name.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('resolveEmployees', () => {
    const mockMappings = {
      'John Doe (CSV)': 'John Doe (DB)',
      'Jane Smith (CSV)': 'Jane Smith (DB)',
    };

    it('should resolve employees successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.resolveEmployees(mockMappings, 'session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/resolve`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mappings: mockMappings, sessionId: 'session-123' }),
        })
      );
    });

    it('should validate mappings is not empty', async () => {
      await expect(client.resolveEmployees({}, 'session-123')).rejects.toThrow(/mappings.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate session ID is provided', async () => {
      await expect(client.resolveEmployees(mockMappings, '')).rejects.toThrow(/session.*id.*required/i);
      await expect(client.resolveEmployees(mockMappings, '   ')).rejects.toThrow(/session.*id.*required/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('updateEmployeeSummary', () => {
    it('should update employee summary successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.updateEmployeeSummary('session-123', 'John Doe', 'Excellent performance');

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/employees/John%20Doe/summary`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ sessionId: 'session-123', summary: 'Excellent performance' }),
        })
      );
    });

    it('should encode employee name in URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.updateEmployeeSummary('session-123', 'John Doe & Associates', 'Summary');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('John Doe & Associates')),
        expect.any(Object)
      );
    });

    it('should validate session ID', async () => {
      await expect(
        client.updateEmployeeSummary('', 'John Doe', 'Summary')
      ).rejects.toThrow(/session.*id.*required/i);
    });

    it('should validate employee name', async () => {
      await expect(
        client.updateEmployeeSummary('session-123', '', 'Summary')
      ).rejects.toThrow(/employee.*name.*required/i);
    });

    it('should validate summary', async () => {
      await expect(
        client.updateEmployeeSummary('session-123', 'John Doe', '')
      ).rejects.toThrow(/summary.*required/i);
    });
  });
});
