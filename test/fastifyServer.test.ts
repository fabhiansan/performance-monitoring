/**
 * Fastify Server Tests
 * 
 * Comprehensive tests for the modern Fastify server implementation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyServer } from '../server/fastifyServer';
import type { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

// Constants for repeated strings
const STAFF_OTHER_LEVEL = 'Staff/Other';
const API_CURRENT_DATASET = '/api/current-dataset';
const API_EMPLOYEE_DATA = '/api/employee-data';
const API_LEADERSHIP_SCORES = '/api/current-dataset/leadership-scores';
const TEST_EMPLOYEE_NAME = 'John Doe';

describe('FastifyServer', () => {
  let server: FastifyServer;
  let fastify: FastifyInstance;
  const testDbPath = path.join(__dirname, 'test-fastify.db');

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    server = new FastifyServer({
      port: 0, // Use random available port for testing
      host: '127.0.0.1',
      dbPath: testDbPath,
      enableSwagger: false, // Disable swagger for tests
      enableCors: true,
      logLevel: 'error', // Reduce noise in tests
      disableListen: true
    });

    await server.start();
    fastify = server.getInstance();
  });

  afterAll(async () => {
    await server.stop();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  const injectJson = async ({
    method,
    url,
    payload
  }: {
    method: string;
    url: string;
    payload?: unknown;
  }) => {
    const response = await fastify.inject({
      method,
      url,
      payload
    });

    const contentType = response.headers['content-type'] ?? '';
    const body = contentType.includes('application/json') ? response.json() : response.body;

    return {
      status: response.statusCode,
      body,
      headers: response.headers
    };
  };

  describe('Health Check Endpoints', () => {
    it('should return health status at /health', async () => {
      const response = await injectJson({ method: 'GET', url: '/health' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: true,
        timestamp: expect.any(String)
      });
    });

    it('should return API health status at /api/health', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/health' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        database: true,
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Employee Endpoints', () => {
    it('should get all employees (initially empty)', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: [],
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid employee ID', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees/invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid employee ID',
        timestamp: expect.any(String)
      });
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees/999' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Employee not found',
        timestamp: expect.any(String)
      });
    });

    it('should validate employee suggestions query parameter', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees/suggestions' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('name'),
        timestamp: expect.any(String)
      });
    });

    it('should get employee suggestions with valid query', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees/suggestions?name=john' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get organizational level mapping', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employees/org-level-mapping' });

      expect(response.status).toBe(200);
      expect(typeof response.body).toBe('object');
    });
  });

  describe('Session Endpoints', () => {
    let sessionId: string;

    it('should upload employee data', async () => {
      const employeeData = {
        employees: [
          {
            name: 'John Doe',
            nip: '12345678901234567',
            gol: 'IV/c',
            pangkat: 'Pembina',
            position: 'Manager',
            sub_position: 'Senior Manager',
            organizational_level: STAFF_OTHER_LEVEL,
            performance: [
              { name: 'Leadership', score: 85 },
              { name: 'Communication', score: 90 }
            ]
          }
        ],
        sessionName: 'Test Session'
      };

      const response = await injectJson({
        method: 'POST',
        url: API_EMPLOYEE_DATA,
        payload: employeeData
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          sessionId: expect.any(String)
        },
        message: 'Employee data saved successfully',
        timestamp: expect.any(String)
      });

      sessionId = response.body.data.sessionId;
    });

    it('should get all upload sessions', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/upload-sessions' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get employee data by session ID', async () => {
      const response = await injectJson({
        method: 'GET',
        url: `/api/employee-data/session/${sessionId}`
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          employees: expect.any(Array),
          sessionId: sessionId,
          metadata: {
            totalEmployees: expect.any(Number),
            employeesWithPerformanceData: expect.any(Number),
            employeesWithoutPerformanceData: expect.any(Number)
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should validate required fields for employee data upload', async () => {
      const invalidData = {
        employees: []
      };

      const response = await injectJson({
        method: 'POST',
        url: API_EMPLOYEE_DATA,
        payload: invalidData
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should handle missing session ID for employee data retrieval', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/employee-data/session/' });
      expect(response.status).toBe(404);
    });

    it('should delete upload session', async () => {
      const response = await injectJson({
        method: 'DELETE',
        url: `/api/upload-sessions/${sessionId}`
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Upload session deleted successfully'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Dataset Endpoints', () => {
    beforeEach(async () => {
      // Clear any existing dataset before each test
      await injectJson({ method: 'DELETE', url: API_CURRENT_DATASET });
    });

    it('should return 404 when no current dataset exists', async () => {
      const response = await injectJson({ method: 'GET', url: API_CURRENT_DATASET });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'No current dataset found',
        timestamp: expect.any(String)
      });
    });

    it('should save current dataset', async () => {
      const datasetData = {
        employees: [
          {
            name: 'Jane Smith',
            nip: '98765432109876543',
            gol: 'III/d',
            pangkat: 'Penata',
            position: 'Analyst',
            sub_position: 'Senior Analyst',
            organizational_level: STAFF_OTHER_LEVEL,
            performance: [
              { name: 'Analysis', score: 88 }
            ]
          }
        ],
        name: 'Test Dataset'
      };

      const response = await injectJson({
        method: 'POST',
        url: API_CURRENT_DATASET,
        payload: datasetData
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          datasetId: expect.any(String)
        },
        message: 'Current dataset saved successfully',
        timestamp: expect.any(String)
      });
    });

    it('should get current dataset after saving', async () => {
      // First save a dataset
      const datasetData = {
        employees: [
          {
            name: 'Test Employee',
            nip: '11111111111111111',
            gol: 'II/a',
            pangkat: 'Pengatur',
            position: 'Staff',
            sub_position: 'Junior Staff',
            organizational_level: STAFF_OTHER_LEVEL,
            performance: []
          }
        ]
      };

      await injectJson({ method: 'POST', url: API_CURRENT_DATASET, payload: datasetData });

      // Then retrieve it
      const response = await injectJson({ method: 'GET', url: API_CURRENT_DATASET });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String)
      });

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        name: 'Test Employee',
        gol: 'II/a'
      });
    });

    it('should clear current dataset', async () => {
      // First save a dataset
      const datasetData = {
        employees: [{ name: 'Test', gol: 'I/a', organizational_level: STAFF_OTHER_LEVEL, performance: [] }]
      };
      await injectJson({ method: 'POST', url: API_CURRENT_DATASET, payload: datasetData });

      // Then clear it
      const response = await injectJson({ method: 'DELETE', url: API_CURRENT_DATASET });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Current dataset cleared successfully'
        },
        timestamp: expect.any(String)
      });

      // Verify it's cleared
      const verifyResponse = await injectJson({ method: 'GET', url: API_CURRENT_DATASET });
      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('Leadership Score Endpoints', () => {
    beforeEach(async () => {
      // Set up a current dataset for leadership score tests
      const datasetData = {
        employees: [
          {
            name: TEST_EMPLOYEE_NAME,
            nip: '22222222222222222',
            gol: 'IV/a',
            pangkat: 'Pembina',
            position: 'Manager',
            sub_position: 'Team Manager',
            organizational_level: STAFF_OTHER_LEVEL,
            performance: []
          }
        ]
      };
      await injectJson({ method: 'POST', url: API_CURRENT_DATASET, payload: datasetData });
    });

    it('should set leadership score for employee', async () => {
      const scoreData = { score: 95 };

      const response = await injectJson({
        method: 'PUT',
        url: '/api/current-dataset/leadership-scores/Leadership Test Employee',
        payload: scoreData
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Leadership score updated successfully'
        },
        timestamp: expect.any(String)
      });
    });

    it('should validate leadership score range', async () => {
      const invalidScoreData = { score: 150 }; // Invalid score > 100

      const response = await injectJson({
        method: 'PUT',
        url: '/api/current-dataset/leadership-scores/Leadership Test Employee',
        payload: invalidScoreData
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should get leadership scores for current dataset', async () => {
      // First set a score
      await injectJson({
        method: 'PUT',
        url: '/api/current-dataset/leadership-scores/Leadership Test Employee',
        payload: { score: 88 }
      });

      // Then retrieve scores
      const response = await injectJson({ method: 'GET', url: API_LEADERSHIP_SCORES });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toMatchObject({
          employee_name: expect.any(String),
          score: expect.any(Number),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });
      }
    });

    it('should return 404 for leadership scores when no current dataset', async () => {
      // Clear current dataset first
      await injectJson({ method: 'DELETE', url: API_CURRENT_DATASET });

      const response = await injectJson({ method: 'GET', url: API_LEADERSHIP_SCORES });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'No current dataset found',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await injectJson({ method: 'GET', url: '/api/nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Not Found',
        message: expect.stringContaining('Route GET /api/nonexistent not found'),
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: API_EMPLOYEE_DATA,
        payload: 'invalid json',
        headers: { 'content-type': 'application/json' }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('CORS Support', () => {
    it('should include CORS headers', async () => {
      const response = await fastify.inject({
        method: 'OPTIONS',
        url: '/api/health',
        headers: {
          origin: 'http://localhost',
          'access-control-request-method': 'GET'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});
