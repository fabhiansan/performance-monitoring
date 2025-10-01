/**
 * Kysely Database Service Tests
 * 
 * Unit tests for the type-safe database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { KyselyDatabaseService } from '../server/kyselyDatabase';
import * as fs from 'fs';
import * as path from 'path';
import type { Employee } from '../types';

// Constants for repeated strings
const STAFF_OTHER = 'Staff/Other';
const TEST_SESSION = 'Test Session';
const LEADERSHIP_EMPLOYEE = 'Leadership Focus Employee';
const TEST_EMPLOYEE_NAME = 'Test Employee';

describe('KyselyDatabaseService', () => {
  let db: KyselyDatabaseService;
  const testDbPath = path.join(__dirname, 'test-kysely.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

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

  beforeEach(async () => {
    // Clear all data before each test
    const sessions = await db.getAllUploadSessions();
    for (const session of sessions) {
      await db.deleteUploadSession(session.session_id);
    }
    await db.clearCurrentDataset();
  });

  describe('Database Initialization', () => {
    it('should be ready after initialization', () => {
      expect(db.isReady()).toBe(true);
    });

    it('should have no errors after initialization', () => {
      const { error, initialized } = db.getErrorDetails();
      expect(error).toBeNull();
      expect(initialized).toBe(true);
    });
  });

  describe('Employee Operations', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session for employee operations
      const testEmployees: Employee[] = [
        {
          id: 1,
          name: TEST_EMPLOYEE_NAME,
          nip: '12345678901234567',
          gol: 'IV/c',
          pangkat: 'Pembina',
          position: 'Manager',
          sub_position: 'Senior Manager',
          organizational_level: STAFF_OTHER,
          performance: []
        }
      ];
      sessionId = await db.saveEmployeeData(testEmployees, TEST_SESSION);
    });

    it('should add a new employee', async () => {
      const employeeData = {
        name: 'John Doe',
        nip: '98765432109876543',
        gol: 'III/d',
        pangkat: 'Penata',
        position: 'Analyst',
        sub_position: 'Senior Analyst',
        organizational_level: STAFF_OTHER
      };

      const employeeId = await db.addEmployee(employeeData, sessionId);
      expect(employeeId).toBeTypeOf('number');
      expect(employeeId).toBeGreaterThan(0);
    });

    it('should get all employees', async () => {
      const employees = await db.getAllEmployees();
      expect(Array.isArray(employees)).toBe(true);
      expect(employees.length).toBeGreaterThan(0);
      
      const employee = employees[0];
      expect(employee).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        organizational_level: expect.any(String)
      });
    });

    it('should get employee by ID', async () => {
      const allEmployees = await db.getAllEmployees();
      const firstEmployee = allEmployees[0];
      
      const employee = await db.getEmployeeById(firstEmployee.id!);
      expect(employee).toMatchObject({
        id: firstEmployee.id,
        name: firstEmployee.name,
        gol: firstEmployee.gol
      });
    });

    it('should return null for non-existent employee ID', async () => {
      const employee = await db.getEmployeeById(999999);
      expect(employee).toBeNull();
    });

    it('should get employee suggestions', async () => {
      const suggestions = await db.getEmployeeSuggestions('Test', 5);
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String)
        });
      }
    });

    it('should get organizational level mapping', async () => {
      const mapping = await db.getEmployeeOrgLevelMapping();
      expect(typeof mapping).toBe('object');
      
      // Should have at least the test employee's org level
      expect(mapping[TEST_EMPLOYEE_NAME]).toBe(STAFF_OTHER);
    });
  });

  describe('Session Operations', () => {
    it('should save employee data and create session', async () => {
      const employees: Employee[] = [
        {
          id: 1,
          name: 'Session Test Employee',
          nip: '11111111111111111',
          gol: 'II/a',
          pangkat: 'Pengatur',
          position: 'Staff',
          sub_position: 'Junior Staff',
          organizational_level: STAFF_OTHER,
          performance: [
            { name: 'Communication', score: 85 },
            { name: 'Teamwork', score: 90 }
          ]
        }
      ];

      const sessionId = await db.saveEmployeeData(employees, TEST_SESSION);
      expect(sessionId).toBeTypeOf('string');
      expect(sessionId).toMatch(/^session_/);
    });

    it('should get all upload sessions', async () => {
      // Create a test session first
      const employees: Employee[] = [
        {
          id: 1,
          name: 'Test',
          gol: 'I/a',
          organizational_level: STAFF_OTHER,
          performance: []
        }
      ];
      await db.saveEmployeeData(employees, TEST_SESSION);

      const sessions = await db.getAllUploadSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
      
      const session = sessions[0];
      expect(session).toMatchObject({
        session_id: expect.any(String),
        session_name: expect.any(String),
        upload_timestamp: expect.any(String),
        employee_count: expect.any(Number),
        competency_count: expect.any(Number),
        status: expect.any(String)
      });
    });

    it('should get employee data by session ID', async () => {
      const employees: Employee[] = [
        {
          id: 1,
          name: 'Session Employee',
          nip: '33333333333333333',
          gol: 'IV/b',
          organizational_level: STAFF_OTHER,
          performance: [
            { name: 'Leadership', score: 88 }
          ]
        }
      ];

      const sessionId = await db.saveEmployeeData(employees, 'Data Retrieval Test');
      const retrievedEmployees = await db.getEmployeeDataBySession(sessionId);
      
      expect(Array.isArray(retrievedEmployees)).toBe(true);
      expect(retrievedEmployees.length).toBe(1);
      
      const employee = retrievedEmployees[0];
      expect(employee.name).toBe('Session Employee');
      expect(employee.gol).toBe('IV/b');
      expect(employee.performance).toHaveLength(1);
    });

    it('should delete upload session', async () => {
      const employees: Employee[] = [
        { id: 1, name: 'Delete Test', gol: 'I/a', organizational_level: STAFF_OTHER, performance: [] }
      ];

      const sessionId = await db.saveEmployeeData(employees, 'Delete Test Session');
      
      // Verify session exists
      let sessions = await db.getAllUploadSessions();
      expect(sessions.some(s => s.session_id === sessionId)).toBe(true);
      
      // Delete session
      await db.deleteUploadSession(sessionId);
      
      // Verify session is deleted
      sessions = await db.getAllUploadSessions();
      expect(sessions.some(s => s.session_id === sessionId)).toBe(false);
    });
  });

  describe('Dataset Operations', () => {
    it('should save current dataset', async () => {
      const employees: Employee[] = [
        {
          id: 1,
          name: 'Dataset Employee',
          nip: '44444444444444444',
          gol: 'III/c',
          organizational_level: STAFF_OTHER,
          performance: []
        }
      ];

      const datasetId = await db.saveCurrentDataset(employees, 'Test Dataset');
      expect(datasetId).toBeTypeOf('string');
      expect(datasetId).toMatch(/^dataset_/);
    });

    it('should get current dataset', async () => {
      const employees: Employee[] = [
        {
          id: 1,
          name: 'Current Dataset Employee',
          gol: 'II/d',
          organizational_level: STAFF_OTHER,
          performance: [
            { name: 'Problem Solving', score: 92 }
          ]
        }
      ];

      await db.saveCurrentDataset(employees, 'Current Test Dataset');
      const retrievedDataset = await db.getCurrentDataset();
      
      expect(Array.isArray(retrievedDataset)).toBe(true);
      expect(retrievedDataset).toHaveLength(1);
      expect(retrievedDataset![0].name).toBe('Current Dataset Employee');
    });

    it('should return null when no current dataset exists', async () => {
      const dataset = await db.getCurrentDataset();
      expect(dataset).toBeNull();
    });

    it('should get current dataset ID', async () => {
      const employees: Employee[] = [
        { id: 1, name: 'ID Test', gol: 'I/b', organizational_level: STAFF_OTHER, performance: [] }
      ];

      const savedId = await db.saveCurrentDataset(employees);
      const retrievedId = await db.getCurrentDatasetId();
      
      expect(retrievedId).toBe(savedId);
    });

    it('should clear current dataset', async () => {
      const employees: Employee[] = [
        { id: 1, name: 'Clear Test', gol: 'I/c', organizational_level: STAFF_OTHER, performance: [] }
      ];

      await db.saveCurrentDataset(employees);
      
      // Verify dataset exists
      let dataset = await db.getCurrentDataset();
      expect(dataset).not.toBeNull();
      
      // Clear dataset
      await db.clearCurrentDataset();
      
      // Verify dataset is cleared
      dataset = await db.getCurrentDataset();
      expect(dataset).toBeNull();
    });
  });

  describe('Leadership Score Operations', () => {
    let datasetId: string;

    beforeEach(async () => {
      const employees: Employee[] = [
        { 
          id: 1, 
          name: LEADERSHIP_EMPLOYEE, 
          gol: 'IV/d', 
          organizational_level: STAFF_OTHER, 
          performance: [] 
        }
      ];
      datasetId = await db.saveCurrentDataset(employees, 'Leadership Test Dataset');
    });

    it('should set manual leadership score', async () => {
      await expect(
        db.setManualLeadershipScore(datasetId, LEADERSHIP_EMPLOYEE, 95)
      ).resolves.not.toThrow();
    });

    it('should get all manual leadership scores for dataset', async () => {
      await db.setManualLeadershipScore(datasetId, LEADERSHIP_EMPLOYEE, 88);
      
      const scores = await db.getAllManualLeadershipScores(datasetId);
      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(1);
      
      const score = scores[0];
      expect(score).toMatchObject({
        employee_name: LEADERSHIP_EMPLOYEE,
        score: 88,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('should update existing leadership score', async () => {
      // Set initial score
      await db.setManualLeadershipScore(datasetId, LEADERSHIP_EMPLOYEE, 80);
      
      // Update score
      await db.setManualLeadershipScore(datasetId, LEADERSHIP_EMPLOYEE, 90);
      
      const scores = await db.getAllManualLeadershipScores(datasetId);
      expect(scores.length).toBe(1);
      expect(scores[0].score).toBe(90);
    });

    it('should return empty array for dataset with no leadership scores', async () => {
      const scores = await db.getAllManualLeadershipScores('nonexistent-dataset');
      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should handle missing required fields gracefully', async () => {
      const incompleteEmployee = {
        name: 'Incomplete Employee',
        // Missing required fields
        nip: null,
        gol: null,
        pangkat: null,
        position: null,
        sub_position: null,
        organizational_level: null
      };

      const sessionId = 'test-session';
      await expect(
        db.addEmployee(incompleteEmployee, sessionId)
      ).resolves.toBeTypeOf('number');
    });

    it('should handle empty employee data arrays', async () => {
      const sessionId = await db.saveEmployeeData([], 'Empty Session');
      expect(sessionId).toBeTypeOf('string');
      
      const employees = await db.getEmployeeDataBySession(sessionId);
      expect(employees).toHaveLength(0);
    });

    it('should maintain referential integrity when deleting sessions', async () => {
      const employees: Employee[] = [
        { 
          id: 1, 
          name: 'Integrity Test', 
          gol: 'I/d', 
          organizational_level: STAFF_OTHER,
          performance: [{ name: 'Test Competency', score: 75 }]
        }
      ];

      const sessionId = await db.saveEmployeeData(employees, 'Integrity Test Session');
      
      // Verify data exists
      const sessionEmployees = await db.getEmployeeDataBySession(sessionId);
      expect(sessionEmployees.length).toBe(1);
      
      // Delete session (should cascade delete related data)
      await db.deleteUploadSession(sessionId);
      
      // Verify all related data is deleted
      const deletedSessionEmployees = await db.getEmployeeDataBySession(sessionId);
      expect(deletedSessionEmployees.length).toBe(0);
    });
  });
});
