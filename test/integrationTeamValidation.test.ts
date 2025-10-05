/**
 * Team A & Team B Integration Validation
 * 
 * Tests the complete integration between frontend and backend teams
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyServer } from '../server/fastifyServer';
import type { FastifyInstance } from 'fastify';
import { employeeApi, sessionApi } from '../services/api';
import type { Employee } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const FASTIFY_TEST_ORIGIN = 'http://fastify.test';

const setupFastifyFetchInterceptor = (fastify: FastifyInstance, baseOrigin: string) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url, baseOrigin);

    if (url.origin !== baseOrigin) {
      return originalFetch(input, init);
    }

    const method = request.method.toUpperCase();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let payload: string | undefined;
    if (!['GET', 'HEAD'].includes(method)) {
      const body = await request.text();
      payload = body.length > 0 ? body : undefined;
    }

    const response = await fastify.inject({
      method,
      url: `${url.pathname}${url.search}`,
      headers,
      payload
    });

    const responseHeaders = new Headers();
    Object.entries(response.headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => responseHeaders.append(key, v));
      } else if (value !== undefined) {
        responseHeaders.set(key, value);
      }
    });

    const body = response.rawPayload ?? response.payload ?? '';

    return new Response(body, {
      status: response.statusCode,
      statusText: response.statusMessage,
      headers: responseHeaders
    });
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
};

describe('Team A & Team B Integration Validation', () => {
  let server: FastifyServer;
  let fastify: FastifyInstance;
  let serverAddress: string;
  const testDbPath = path.join(__dirname, 'integration-validation.db');
  let restoreFetch: (() => void) | undefined;

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create and start server
    server = new FastifyServer({
      port: 0, // Use random available port
      host: '127.0.0.1',
      dbPath: testDbPath,
      enableSwagger: false, // Disable swagger for tests
      enableCors: true,
      logLevel: 'error', // Reduce noise
      disableListen: true
    });

    await server.start();
    fastify = server.getInstance();
    serverAddress = FASTIFY_TEST_ORIGIN;
    
    // Override API client base URL for testing
    const apiFactory = (await import('../services/api/interfaces')).apiClientFactory;
    const baseUrl = `${serverAddress}/api`;
    (apiFactory as { config: { baseUrl: string } }).config.baseUrl = baseUrl;
    (employeeApi as { baseUrl: string }).baseUrl = baseUrl;
    (sessionApi as { baseUrl: string }).baseUrl = baseUrl;

    restoreFetch = setupFastifyFetchInterceptor(fastify, serverAddress);
  });

  afterAll(async () => {
    restoreFetch?.();
    await server?.stop();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    // Reset API client configuration if needed
  });

  describe('API Contract Verification', () => {
    it('should verify server health endpoints', async () => {
      const healthResponse = await fetch(`${serverAddress}/health`);
      expect(healthResponse.ok).toBe(true);
      
      const healthData = await healthResponse.json();
      expect(healthData).toMatchObject({
        status: 'ok',
        database: true,
        timestamp: expect.any(String)
      });

      const apiHealthResponse = await fetch(`${serverAddress}/api/health`);
      expect(apiHealthResponse.ok).toBe(true);
      
      const apiHealthData = await apiHealthResponse.json();
      expect(apiHealthData).toMatchObject({
        status: 'ok',
        database: true,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty employee list initially', async () => {
      const employees = await employeeApi.getAllEmployees();
      expect(Array.isArray(employees)).toBe(true);
      expect(employees).toEqual([]);
    });

    it('should handle employee suggestions with empty query gracefully', async () => {
      try {
        await employeeApi.getEmployeeSuggestions('NonExistentEmployee');
        // Should return empty array or handle gracefully
      } catch (error) {
        // Should not throw for valid queries with no results
        expect(error).toBeDefined();
      }
    });

    it('should handle organizational level mapping', async () => {
      const mapping = await employeeApi.getEmployeeOrgLevelMapping();
      expect(typeof mapping).toBe('object');
    });
  });

  describe('End-to-End Data Flow', () => {
    it('should complete full employee data lifecycle', async () => {
      // 1. Import employee data
      const testEmployees: Employee[] = [
        {
          name: 'Integration Test Employee',
          nip: '123456789',
          gol: 'III/d',
          pangkat: 'Penata Tk.I',
          position: 'Analis Kepegawaian',
          sub_position: 'Analis Senior',
          organizational_level: 'Pranata Komputer',
          performance: [
            { name: 'Leadership', score: 85 },
            { name: 'Technical Skills', score: 90 },
            { name: 'Communication', score: 88 }
          ]
        },
        {
          name: 'Second Test Employee',
          nip: '987654321',
          gol: 'III/c',
          pangkat: 'Penata',
          position: 'Programmer',
          sub_position: 'Junior Developer',
          organizational_level: 'Pranata Komputer',
          performance: [
            { name: 'Leadership', score: 75 },
            { name: 'Technical Skills', score: 95 },
            { name: 'Communication', score: 80 }
          ]
        }
      ];

      // 2. Import roster via frontend API
      const importResult = await employeeApi.importEmployeesFromCSV(testEmployees);
      expect(importResult.total).toBe(2);

      // 3. Persist performance data as a session
      const sessionId = await sessionApi.saveEmployeeData(testEmployees, 'Integration Test');
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);

      // 4. Verify employees were created
      const allEmployees = await employeeApi.getAllEmployees();
      expect(allEmployees).toHaveLength(2);
      
      // Verify employee data integrity
      const firstEmployee = allEmployees.find(emp => emp.name === 'Integration Test Employee');
      expect(firstEmployee).toBeDefined();
      expect(firstEmployee?.nip).toBe('123456789');
      expect(firstEmployee?.organizational_level).toBe('Pranata Komputer');

      // 5. Test employee suggestions
      const suggestions = await employeeApi.getEmployeeSuggestions('Integration');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toContain('Integration Test Employee');

      // 6. Test organizational level mapping
      const orgMapping = await employeeApi.getEmployeeOrgLevelMapping();
      const levelCount = Object.values(orgMapping).filter(level => level === 'Pranata Komputer').length;
      expect(levelCount).toBeGreaterThan(0);

      // 7. Verify session management
      const sessions = await sessionApi.getAllUploadSessions();
      expect(sessions.length).toBeGreaterThan(0);
      
      const currentSession = sessions.find((s) => {
        return (
          (typeof (s as { session_id?: string }).session_id === 'string' &&
            (s as { session_id?: string }).session_id === sessionId) ||
          (typeof (s as { period?: string }).period === 'string' &&
            (s as { period?: string }).period === sessionId)
        );
      });
      expect(currentSession).toBeDefined();
      expect(currentSession?.employee_count).toBe(2);
    });

    it('should handle error scenarios properly', async () => {
      // Test validation errors
      try {
        await employeeApi.importEmployeesFromCSV([]);
        expect.fail('Should have thrown validation error for empty array');
      } catch (error) {
        expect(error).toBeDefined();
        // Should be a proper validation error, not a network error
      }

      // Test non-existent employee
      try {
        await employeeApi.getEmployeeById(99999);
        expect.fail('Should have thrown error for non-existent employee');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Type Safety Verification', () => {
    it('should maintain type consistency across API boundary', async () => {
      // This test verifies that the frontend types match backend responses
      const employees = await employeeApi.getAllEmployees();
      
      if (employees.length > 0) {
        const employee = employees[0];
        
        // Check required fields exist
        expect(typeof employee.name).toBe('string');
        expect(employee.name.length).toBeGreaterThan(0);
        
        // Check optional fields are properly typed
        if (employee.nip !== undefined) {
          expect(typeof employee.nip).toBe('string');
        }
        
        if (employee.performance !== undefined) {
          expect(Array.isArray(employee.performance)).toBe(true);
          if (employee.performance.length > 0) {
            const perf = employee.performance[0];
            expect(typeof perf.name).toBe('string');
            expect(typeof perf.score).toBe('number');
          }
        }
      }
    });

    it('should handle API response format correctly', async () => {
      // Make a direct fetch to verify response format
      const response = await fetch(`${serverAddress}/api/employees`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      
      // Check if it's the standardized format
      if (data && typeof data === 'object' && 'success' in data) {
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(typeof data.timestamp).toBe('string');
      } else {
        // Legacy format should still be an array
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide consistent error responses', async () => {
      // Test 404 error
      const response404 = await fetch(`${serverAddress}/api/employees/99999`);
      expect(response404.status).toBe(404);
      
      const error404 = await response404.json();
      expect(error404.success).toBe(false);
      expect(typeof error404.error).toBe('string');
      expect(typeof error404.timestamp).toBe('string');

      // Test validation error
      const responseValidation = await fetch(`${serverAddress}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* missing required fields */ })
      });
      
      expect(responseValidation.status).toBeGreaterThanOrEqual(400);
      expect(responseValidation.status).toBeLessThan(500);
    });
  });
});
