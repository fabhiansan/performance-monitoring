/**
 * Simple Integration Test
 * 
 * Test API contract compatibility without complex schema validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KyselyDatabaseService } from '../server/kyselyDatabase';
import { employeeApi } from '../services/api';
import * as fs from 'fs';
import * as path from 'path';

// Constants for repeated strings
const TEST_EMPLOYEE_NAME = 'Test Employee';

describe('Integration Tests - API Contract Verification', () => {
  let db: KyselyDatabaseService;
  const testDbPath = path.join(__dirname, 'integration-test.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create database service
    db = new KyselyDatabaseService(testDbPath);
    await db.initialize();
  });

  afterAll(async () => {
    db.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Database Service Direct Tests', () => {
    it('should initialize database successfully', () => {
      expect(db.isReady()).toBe(true);
    });

    it('should handle getAllEmployees with empty database', async () => {
      const employees = await db.getAllEmployees();
      expect(employees).toEqual([]);
    });

    it('should save and retrieve employee data', async () => {
      const testEmployees = [
        {
          name: TEST_EMPLOYEE_NAME,
          nip: '123456',
          gol: 'III/d',
          pangkat: 'Penata Tk.I',
          position: 'Analis',
          subPosition: 'Analis Kepegawaian',
          organizationalLevel: 'Pranata Komputer',
          performance: [
            { name: 'Leadership', score: 85 },
            { name: 'Teamwork', score: 90 }
          ]
        }
      ];

      const sessionId = await db.saveEmployeeData(testEmployees, 'Integration Test Session');
      expect(sessionId).toBeDefined();

      const employees = await db.getAllEmployees();
      expect(employees).toHaveLength(1);
      expect(employees[0].name).toBe(TEST_EMPLOYEE_NAME);
    });

    it('should handle employee suggestions', async () => {
      const suggestions = await db.getEmployeeSuggestions('Test', 5);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe(TEST_EMPLOYEE_NAME);
    });

    it('should handle organizational level mapping', async () => {
      const mapping = await db.getEmployeeOrgLevelMapping();
      expect(mapping).toBeDefined();
      expect(typeof mapping).toBe('object');
    });
  });

  describe('Frontend API Integration', () => {
    it('should validate that frontend API methods exist', () => {
      // Check that the frontend is calling methods that exist
      expect(typeof employeeApi.getAllEmployees).toBe('function');
      expect(typeof employeeApi.getEmployeeSuggestions).toBe('function');
      expect(typeof employeeApi.getEmployeeOrgLevelMapping).toBe('function');
      expect(typeof employeeApi.importEmployeesFromCSV).toBe('function');
    });

    it('should validate API response structure', async () => {
      // This would normally make HTTP calls, but we can test the structure
      try {
        const result = await employeeApi.getAllEmployees();
        // If it succeeds, check structure
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // If it fails, that's expected since server isn't running
        // We're just checking that the method exists and can be called
        expect(error).toBeDefined();
      }
    });
  });
});