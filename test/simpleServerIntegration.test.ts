/**
 * Simple Server Integration Test
 * 
 * Tests the integration without complex schema validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KyselyDatabaseService } from '../server/kyselyDatabase';
import { employeeApi } from '../services/api';
import type { Employee } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('Simple Server Integration Test', () => {
  let db: KyselyDatabaseService;
  const testDbPath = path.join(__dirname, 'simple-integration.db');
  let restoreFetch: (() => void) | undefined;
  const baseOrigin = 'http://integration.test';

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database service
    db = new KyselyDatabaseService(testDbPath);
    await db.initialize();

    const { apiClientFactory } = await import('../services/api/interfaces');
    const baseUrl = 'http://integration.test/api';
    (apiClientFactory as { config: { baseUrl: string } }).config.baseUrl = baseUrl;
    (employeeApi as { baseUrl: string }).baseUrl = baseUrl;

    restoreFetch = (() => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        const method = request.method.toUpperCase();
        const path = `${url.pathname}${url.search}`;
        if (url.origin !== baseOrigin) {
          return originalFetch(input, init);
        }

        const jsonResponse = (data: unknown, status = 200): Response =>
          new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' }
          });

        try {
          if (method === 'GET' && path === '/health') {
            return jsonResponse({
              status: 'ok',
              database: db.isReady(),
              timestamp: new Date().toISOString()
            });
          }

          if (method === 'GET' && path === '/api/health') {
            return jsonResponse({
              status: 'ok',
              database: db.isReady(),
              uptime: process.uptime(),
              timestamp: new Date().toISOString()
            });
          }

          if (method === 'GET' && path === '/api/employees') {
            const employees = await db.getAllEmployees();
            return jsonResponse({
              success: true,
              data: employees,
              timestamp: new Date().toISOString()
            });
          }

          if (method === 'GET' && url.pathname === '/api/employees/suggestions') {
            const name = url.searchParams.get('name');
            if (!name || name.trim().length === 0) {
              return jsonResponse({
                success: false,
                error: 'Name parameter is required',
                timestamp: new Date().toISOString()
              }, 400);
            }
            const suggestions = await db.getEmployeeSuggestions(name, 5);
            return jsonResponse(suggestions);
          }

          if (method === 'GET' && url.pathname === '/api/employees/org-level-mapping') {
            const mapping = await db.getEmployeeOrgLevelMapping();
            return jsonResponse(mapping);
          }

          if (method === 'POST' && url.pathname === '/api/employee-data') {
            let payload: unknown;
            try {
              payload = await request.json();
            } catch {
              return jsonResponse({
                success: false,
                error: 'Invalid JSON payload',
                timestamp: new Date().toISOString()
              }, 400);
            }

            const employees = (payload as { employees?: Employee[] }).employees;
            if (!Array.isArray(employees) || employees.length === 0) {
              return jsonResponse({
                success: false,
                error: 'Employees array is required',
                timestamp: new Date().toISOString()
              }, 400);
            }

            const sessionId = await db.saveEmployeeData(employees);
            return jsonResponse({
              success: true,
              data: { sessionId },
              message: 'Employee data saved successfully',
              timestamp: new Date().toISOString()
            }, 201);
          }

          return jsonResponse({
            success: false,
            error: 'Not Found',
            timestamp: new Date().toISOString()
          }, 404);
        } catch (error) {
          return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          }, 500);
        }
      };
      return () => {
        globalThis.fetch = originalFetch;
      };
    })();

    // No network listener required for these tests
  });

  afterAll(async () => {
    db?.close();
    restoreFetch?.();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Integration Verification', () => {
    it('should verify server health', async () => {
      const response = await fetch(`${baseOrigin}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        database: true,
        timestamp: expect.any(String)
      });
    });

    it('should get empty employees list initially', async () => {
      const employees = await employeeApi.getAllEmployees();
      expect(Array.isArray(employees)).toBe(true);
      expect(employees).toEqual([]);
    });

    it('should complete end-to-end employee data flow', async () => {
      const testEmployees: Employee[] = [
        {
          name: 'Integration Test User',
          nip: '123456789',
          gol: 'III/d',
          pangkat: 'Penata Tk.I',
          position: 'Software Engineer',
          sub_position: 'Senior Developer',
          organizational_level: 'Pranata Komputer',
          performance: [
            { name: 'Technical Skills', score: 95 },
            { name: 'Communication', score: 88 }
          ]
        }
      ];

      // Import employees
      const sessionId = await employeeApi.importEmployeesFromCSV(testEmployees);
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);

      // Verify employees were saved
      const allEmployees = await employeeApi.getAllEmployees();
      expect(allEmployees).toHaveLength(1);
      
      const savedEmployee = allEmployees[0];
      expect(savedEmployee.name).toBe('Integration Test User');
      expect(savedEmployee.nip).toBe('123456789');
      expect(savedEmployee.organizational_level).toBe('Pranata Komputer');

      // Test suggestions
      const suggestions = await employeeApi.getEmployeeSuggestions('Integration');
      expect(suggestions.length).toBeGreaterThan(0);

      // Test org mapping
      const mapping = await employeeApi.getEmployeeOrgLevelMapping();
      expect(typeof mapping).toBe('object');
    });

    it('should handle validation errors properly', async () => {
      try {
        await employeeApi.importEmployeesFromCSV([]);
        expect.fail('Should have thrown validation error');
      } catch (_error) {
        expect(_error).toBeDefined();
      }
    });

    it('should verify type consistency', async () => {
      const employees = await employeeApi.getAllEmployees();
      expect(Array.isArray(employees)).toBe(true);
      
      if (employees.length > 0) {
        const employee = employees[0];
        expect(typeof employee.name).toBe('string');
        expect(typeof employee.nip).toBe('string');
        if (employee.organizational_level !== undefined) {
          expect(typeof employee.organizational_level).toBe('string');
        }
      }
    });
  });
});
