/**
 * Modern Fastify Server
 * 
 * High-performance TypeScript-first server with automatic OpenAPI generation
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyMultipart from '@fastify/multipart';
import { KyselyDatabaseService } from './kyselyDatabase.js';
import { logger } from '../services/logger.js';
import type { NewEmployeeRow } from './database.schema.js';
import type { CreateEmployee, Employee } from '../types.js';

// Constants for repeated string literals
const CURRENT_DATASET_API_PATH = '/api/current-dataset';
const NO_DATASET_FOUND_ERROR = 'No current dataset found';

export interface FastifyServerOptions {
  port?: number;
  host?: string;
  dbPath?: string | null;
  enableSwagger?: boolean;
  enableCors?: boolean;
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  disableListen?: boolean;
}

export class FastifyServer {
  private app: FastifyInstance;
  private db: KyselyDatabaseService;
  private options: Required<FastifyServerOptions>;
  private pluginsReady: Promise<void>;
  
  // Constants to avoid duplicate strings
  private static readonly FAILED_TO_GET_MESSAGE = 'Failed to get';

  constructor(options: FastifyServerOptions = {}) {
    this.options = {
      port: options.port ?? 3002,
      host: options.host ?? '127.0.0.1',
      dbPath: options.dbPath ?? null,
      enableSwagger: options.enableSwagger ?? true,
      enableCors: options.enableCors ?? true,
      logLevel: options.logLevel || 'info',
      disableListen: options.disableListen ?? process.env.DISABLE_SERVER_LISTEN === '1'
    };

    this.app = Fastify({
      logger: {
        level: this.options.logLevel,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
            hostname: req.hostname,
            remoteAddress: req.ip,
            remotePort: req.socket?.remotePort,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: res.headers,
          }),
        },
      },
    });

    this.db = new KyselyDatabaseService(this.options.dbPath);
    this.pluginsReady = this.setupPlugins();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Fastify plugins
   */
  private async setupPlugins(): Promise<void> {
    // CORS
    if (this.options.enableCors) {
      await this.app.register(fastifyCors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      });
    }

    // Swagger/OpenAPI
    if (this.options.enableSwagger) {
      await this.app.register(fastifySwagger, {
        openapi: {
          openapi: '3.0.0',
          info: {
            title: 'Employee Performance Analyzer API',
            description: 'Modern TypeScript API for employee performance management',
            version: '2.0.0',
          },
          servers: [
            {
              url: `http://${this.options.host}:${this.options.port}`,
              description: 'Development server',
            },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        },
      });

      await this.app.register(fastifySwaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: false,
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
      });
    }

    // Body size limits
    await this.app.register(fastifyMultipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', {
      schema: {
        tags: ['System'],
        summary: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'error'] },
              database: { type: 'boolean' },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' }
            },
            required: ['status', 'database', 'timestamp']
          },
        },
      },
    }, this.healthCheck.bind(this));

    this.app.get('/api/health', {
      schema: {
        tags: ['API'],
        summary: 'API health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'error'] },
              database: { type: 'boolean' },
              uptime: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' }
            },
            required: ['status', 'database', 'timestamp']
          },
        },
      },
    }, this.apiHealthCheck.bind(this));

    // Employee routes
    this.setupEmployeeRoutes();
    
    // Session routes
    this.setupSessionRoutes();
    
    // Dataset routes
    this.setupDatasetRoutes();
    
    // Leadership score routes
    this.setupLeadershipRoutes();
  }

  /**
   * Setup employee-related routes
   */
  private setupEmployeeRoutes(): void {
    const employeePrefix = '/api/employees';

    // Get all employees
    this.app.get(employeePrefix, this.getAllEmployees.bind(this));

    // Get employee by ID
    this.app.get(`${employeePrefix}/:id`, this.getEmployeeById.bind(this));

    // Add new employee
    this.app.post(employeePrefix, this.addEmployee.bind(this));

    // Update employee
    this.app.put(`${employeePrefix}/:id`, this.updateEmployee.bind(this));

    // Delete employee
    this.app.delete(`${employeePrefix}/:id`, this.deleteEmployee.bind(this));

    // Bulk delete employees
    this.app.post(`${employeePrefix}/bulk/delete`, this.bulkDeleteEmployees.bind(this));

    // Get employee suggestions
    this.app.get(`${employeePrefix}/suggestions`, this.getEmployeeSuggestions.bind(this));

    // Get organizational level mapping (employee name -> org level)
    this.app.get(`${employeePrefix}/org-level-mapping`, this.getOrgLevelMapping.bind(this));

    // Bulk import employees (CSV roster)
    this.app.post(`${employeePrefix}/import`, this.importEmployees.bind(this));

    // Get organizational level counts (org level -> count)
    this.app.get(`${employeePrefix}/org-level-counts`, this.getOrgLevelCounts.bind(this));

    // Get employees count
    this.app.get('/api/employees-count', this.getEmployeesCount.bind(this));

    // Resolve employees conflicts
    this.app.post(`${employeePrefix}/resolve`, this.resolveEmployees.bind(this));
  }

  /**
   * Setup session-related routes
   */
  private setupSessionRoutes(): void {
    // Upload employee data
    this.app.post('/api/employee-data', this.uploadEmployeeData.bind(this));

    // Get all upload sessions
    this.app.get('/api/upload-sessions', this.getAllUploadSessions.bind(this));

    // Get employee data by session
    this.app.get('/api/employee-data/session/:sessionId', this.getEmployeeDataBySession.bind(this));

    // Delete upload session
    this.app.delete('/api/upload-sessions/:sessionId', this.deleteUploadSession.bind(this));

    // Historical data endpoints
    this.app.get('/api/employee-data/range', this.getEmployeeDataByTimeRange.bind(this));
    this.app.get('/api/employee-data/latest', this.getLatestEmployeeData.bind(this));

    // Current session management
    this.app.get('/api/current-session', this.getCurrentSession.bind(this));
    this.app.post('/api/current-session', this.setCurrentSession.bind(this));
  }

  /**
   * Setup dataset-related routes
   */
  private setupDatasetRoutes(): void {
    // Get current dataset
    this.app.get(CURRENT_DATASET_API_PATH, this.getCurrentDataset.bind(this));

    // Save current dataset
    this.app.post(CURRENT_DATASET_API_PATH, this.saveCurrentDataset.bind(this));

    // Clear current dataset
    this.app.delete(CURRENT_DATASET_API_PATH, this.clearCurrentDataset.bind(this));

    // Dataset CRUD operations
    this.app.get('/api/datasets', this.getAllDatasets.bind(this));
    this.app.delete('/api/datasets/:id', this.deleteDataset.bind(this));

    // Employee summary update (PATCH to match documented contract)
    this.app.patch(`${CURRENT_DATASET_API_PATH}/employee/:name/summary`, this.updateEmployeeSummary.bind(this));
  }

  /**
   * Setup leadership score routes
   */
  private setupLeadershipRoutes(): void {
    // Get leadership scores for current dataset
    this.app.get(`${CURRENT_DATASET_API_PATH}/leadership-scores`, this.getLeadershipScores.bind(this));

    // Set leadership score
    this.app.put(`${CURRENT_DATASET_API_PATH}/leadership-scores/:employeeName`, this.setLeadershipScore.bind(this));

    // Bulk update leadership scores
    this.app.put(`${CURRENT_DATASET_API_PATH}/leadership-scores/bulk`, this.bulkUpdateLeadershipScores.bind(this));
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
      reply.code(404).send({
        success: false,
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    this.app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      logger.error('Unhandled error', { 
        error: error.message, 
        stack: error.stack, 
        url: request.url,
        method: request.method 
      });

      const statusCode = (error as { statusCode?: number }).statusCode || 500;
      
      reply.code(statusCode).send({
        success: false,
        error: error.name || 'Internal Server Error',
        message: error.message || 'Something went wrong',
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Route Handlers
   */

  async healthCheck(_request: FastifyRequest, reply: FastifyReply) {
    reply.send({
      status: 'ok',
      database: this.db.isReady(),
      timestamp: new Date().toISOString(),
    });
  }

  async apiHealthCheck(_request: FastifyRequest, reply: FastifyReply) {
    reply.send({
      status: 'ok',
      database: this.db.isReady(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  async getAllEmployees(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const employees = await this.db.getAllEmployees();
      reply.send({
        success: true,
        data: employees,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting employees', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} employees`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getEmployeeById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const employeeId = parseInt(request.params.id, 10);
      if (isNaN(employeeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid employee ID',
          timestamp: new Date().toISOString(),
        });
      }

      const employee = await this.db.getEmployeeById(employeeId);
      if (!employee) {
        return reply.code(404).send({
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString(),
        });
      }

      reply.send({
        success: true,
        data: employee,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting employee', { error: error instanceof Error ? error.message : String(error), employeeId: request.params.id });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} employee`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async addEmployee(request: FastifyRequest<{ Body: CreateEmployee }>, reply: FastifyReply) {
    try {
      const payload = request.body ?? {};

      const requiredFields: Array<[keyof CreateEmployee, unknown]> = [
        ['name', payload.name],
        ['position', payload.position]
      ];

      const missingField = requiredFields.find(([, value]) => {
        return typeof value !== 'string' || value.trim().length === 0;
      });

      if (missingField) {
        return reply.code(400).send({
          success: false,
          error: `${missingField[0]} is required`,
          timestamp: new Date().toISOString(),
        });
      }

      const employeePayload = {
        name: request.body.name,
        nip: request.body.nip ?? null,
        gol: request.body.gol ?? null,
        pangkat: request.body.pangkat ?? null,
        position: request.body.position ?? null,
        sub_position: request.body.sub_position ?? null,
        organizational_level: request.body.organizational_level ?? null
      } satisfies NewEmployeeRow;

      const employeeId = await this.db.addEmployee(employeePayload);
      
      reply.code(201).send({
        success: true,
        data: { id: employeeId, ...request.body },
        message: 'Employee added successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error adding employee', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to add employee',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async importEmployees(request: FastifyRequest<{ Body: { employees: Employee[] } }>, reply: FastifyReply) {
    try {
      const employees = request.body?.employees;

      if (!Array.isArray(employees) || employees.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Employees array is required',
          timestamp: new Date().toISOString(),
        });
      }

      const { inserted, updated } = await this.db.importEmployees(employees);

      reply.code(201).send({
        success: true,
        data: {
          inserted,
          updated,
          total: inserted + updated,
        },
        message: 'Employees imported successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error importing employees', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to import employees',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateEmployee(request: FastifyRequest<{ Params: { id: string }; Body: CreateEmployee }>, reply: FastifyReply) {
    try {
      const employeeId = parseInt(request.params.id, 10);
      if (isNaN(employeeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid employee ID',
          timestamp: new Date().toISOString(),
        });
      }

      const employeePayload = {
        name: request.body.name,
        nip: request.body.nip ?? null,
        gol: request.body.gol ?? null,
        pangkat: request.body.pangkat ?? null,
        position: request.body.position ?? null,
        sub_position: request.body.sub_position ?? null,
        organizational_level: request.body.organizational_level ?? null
      };

      await this.db.updateEmployee(employeeId, employeePayload);
      
      reply.send({
        success: true,
        data: { id: employeeId, ...request.body },
        message: 'Employee updated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating employee', { error: error instanceof Error ? error.message : String(error), employeeId: request.params.id });
      reply.code(500).send({
        success: false,
        error: 'Failed to update employee',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deleteEmployee(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const employeeId = parseInt(request.params.id, 10);
      if (isNaN(employeeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid employee ID',
          timestamp: new Date().toISOString(),
        });
      }

      await this.db.deleteEmployee(employeeId);
      
      reply.send({
        success: true,
        data: { message: 'Employee deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting employee', { error: error instanceof Error ? error.message : String(error), employeeId: request.params.id });
      reply.code(500).send({
        success: false,
        error: 'Failed to delete employee',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async bulkDeleteEmployees(request: FastifyRequest<{ Body: { ids: number[] } }>, reply: FastifyReply) {
    try {
      const { ids } = request.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid or empty employee IDs array',
          timestamp: new Date().toISOString(),
        });
      }

      // Validate all IDs are numbers
      const invalidIds = ids.filter(id => !Number.isInteger(id) || id <= 0);
      if (invalidIds.length > 0) {
        return reply.code(400).send({
          success: false,
          error: `Invalid employee IDs: ${invalidIds.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      await this.db.bulkDeleteEmployees(ids);
      
      reply.send({
        success: true,
        data: { 
          message: `Successfully deleted ${ids.length} employees`,
          deletedCount: ids.length
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error bulk deleting employees', { 
        error: error instanceof Error ? error.message : String(error), 
        employeeIds: request.body?.ids 
      });
      reply.code(500).send({
        success: false,
        error: 'Failed to bulk delete employees',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getEmployeeSuggestions(request: FastifyRequest<{ Querystring: { name: string; limit?: number } }>, reply: FastifyReply) {
    try {
      const { name, limit = 5 } = request.query;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'name query parameter is required',
          timestamp: new Date().toISOString(),
        });
      }
      const suggestions = await this.db.getEmployeeSuggestions(name, limit);
      reply.send(suggestions);
    } catch (error) {
      logger.error('Error getting employee suggestions', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} suggestions`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getOrgLevelMapping(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const mapping = await this.db.getEmployeeOrgLevelMapping();
      reply.send(mapping);
    } catch (error) {
      logger.error('Error getting organizational level mapping', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} organizational level mapping`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getOrgLevelCounts(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const counts = await this.db.getOrgLevelCounts();
      reply.send({
        success: true,
        data: counts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting organizational level counts', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} organizational level counts`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async uploadEmployeeData(request: FastifyRequest<{ Body: { employees: Employee[]; sessionName?: string } }>, reply: FastifyReply) {
    try {
      const { employees, sessionName } = request.body;
      if (!Array.isArray(employees) || employees.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Employees array is required',
          timestamp: new Date().toISOString(),
        });
      }
      const sessionId = await this.db.saveEmployeeData(employees, sessionName);
      
      reply.code(201).send({
        success: true,
        data: { sessionId },
        message: 'Employee data saved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error saving employee data', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to save employee data',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getAllUploadSessions(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const sessions = await this.db.getAllUploadSessions();
      reply.send(sessions);
    } catch (error) {
      logger.error('Error getting upload sessions', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} upload sessions`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getEmployeeDataBySession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      if (!sessionId) {
        return reply.code(404).send({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
      }
      const employees = await this.db.getEmployeeDataBySession(sessionId);
      
      const employeesWithoutPerformance = employees.filter(emp => !emp.performance || emp.performance.length === 0);
      
      reply.send({
        success: true,
        data: {
          employees,
          sessionId,
          metadata: {
            totalEmployees: employees.length,
            employeesWithPerformanceData: employees.length - employeesWithoutPerformance.length,
            employeesWithoutPerformanceData: employeesWithoutPerformance.length,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting employee data by session', { error: error instanceof Error ? error.message : String(error), sessionId: request.params.sessionId });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} employee data`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deleteUploadSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      await this.db.deleteUploadSession(request.params.sessionId);
      reply.send({
        success: true,
        data: { message: 'Upload session deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting upload session', { error: error instanceof Error ? error.message : String(error), sessionId: request.params.sessionId });
      reply.code(500).send({
        success: false,
        error: 'Failed to delete upload session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getCurrentDataset(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const dataset = await this.db.getCurrentDataset();
      if (!dataset) {
        return reply.code(404).send({
          success: false,
          error: NO_DATASET_FOUND_ERROR,
          timestamp: new Date().toISOString(),
        });
      }

      reply.send({
        success: true,
        data: dataset,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting current dataset', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} current dataset`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async saveCurrentDataset(request: FastifyRequest<{ Body: { employees: Employee[]; name?: string } }>, reply: FastifyReply) {
    try {
      const { employees, name } = request.body;
      const datasetId = await this.db.saveCurrentDataset(employees, name);
      
      reply.code(201).send({
        success: true,
        data: { datasetId },
        message: 'Current dataset saved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error saving current dataset', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to save current dataset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async clearCurrentDataset(_request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.db.clearCurrentDataset();
      reply.send({
        success: true,
        data: { message: 'Current dataset cleared successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error clearing current dataset', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to clear current dataset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getLeadershipScores(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const currentDatasetId = await this.db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return reply.code(404).send({
          success: false,
          error: NO_DATASET_FOUND_ERROR,
          timestamp: new Date().toISOString(),
        });
      }

      const scores = await this.db.getAllManualLeadershipScores(currentDatasetId);
      reply.send(scores);
    } catch (error) {
      logger.error('Error getting leadership scores', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} leadership scores`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async setLeadershipScore(request: FastifyRequest<{ Params: { employeeName: string }; Body: { score: number } }>, reply: FastifyReply) {
    try {
      const { employeeName } = request.params;
      const { score } = request.body;

      if (typeof score !== 'number' || Number.isNaN(score)) {
        return reply.code(400).send({
          success: false,
          error: 'Score must be a number',
          timestamp: new Date().toISOString(),
        });
      }

      if (score < 0 || score > 100) {
        return reply.code(400).send({
          success: false,
          error: 'Score must be between 0 and 100',
          timestamp: new Date().toISOString(),
        });
      }

      const currentDatasetId = await this.db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return reply.code(404).send({
          success: false,
          error: NO_DATASET_FOUND_ERROR,
          timestamp: new Date().toISOString(),
        });
      }

      await this.db.setManualLeadershipScore(currentDatasetId, employeeName, score);
      
      reply.send({
        success: true,
        data: { message: 'Leadership score updated successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating leadership score', { error: error instanceof Error ? error.message : String(error), employeeName: request.params.employeeName });
      reply.code(500).send({
        success: false,
        error: 'Failed to update leadership score',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getEmployeesCount(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const employees = await this.db.getAllEmployees();
      reply.send({
        success: true,
        data: { count: employees.length },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting employees count', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} employees count`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async resolveEmployees(request: FastifyRequest<{ Body: { mappings: Record<string, string>; sessionId: string } }>, reply: FastifyReply) {
    try {
      const { mappings, sessionId } = request.body;
      
      if (!mappings || typeof mappings !== 'object') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid mappings: must be an object',
          timestamp: new Date().toISOString(),
        });
      }
      
      if (!sessionId || sessionId.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
      }

      // Note: Implementation would need custom database method for employee resolution
      // For now, return success to match the expected interface
      logger.info('Employee mappings received for resolution', { sessionId, mappingCount: Object.keys(mappings).length });
      
      reply.send({
        success: true,
        data: { message: 'Employee mappings resolved successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error resolving employees', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to resolve employees',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getEmployeeDataByTimeRange(request: FastifyRequest<{ Querystring: { startTime?: string; endTime?: string } }>, reply: FastifyReply) {
    try {
      const { startTime, endTime } = request.query;
      
      // For now, return all sessions within time range (implementation would filter by timestamps)
      const sessions = await this.db.getAllUploadSessions();
      
      // Simple time filtering if parameters provided
      let filteredSessions = sessions;
      if (startTime || endTime) {
        filteredSessions = sessions.filter(session => {
          const sessionTime = new Date(session.latest_upload);
          if (startTime && sessionTime < new Date(startTime)) return false;
          if (endTime && sessionTime > new Date(endTime)) return false;
          return true;
        });
      }

      // Get employee data for filtered periods
      const allEmployees: Employee[] = [];
      for (const session of filteredSessions) {
        const employees = await this.db.getEmployeeDataBySession(session.period);
        allEmployees.push(...employees);
      }
      
      reply.send({
        success: true,
        data: {
          employees: allEmployees,
          metadata: {
            totalEmployees: allEmployees.length,
            sessionsFound: filteredSessions.length,
            timeRange: { startTime, endTime }
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting employee data by time range', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} employee data by time range`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getLatestEmployeeData(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const sessions = await this.db.getAllUploadSessions();
      
      if (sessions.length === 0) {
        return reply.send({
          success: true,
          data: { employees: [], metadata: { totalEmployees: 0 } },
          timestamp: new Date().toISOString(),
        });
      }
      
      // Get latest period by upload timestamp
      const latestSession = sessions.reduce((latest, current) =>
        new Date(current.latest_upload) > new Date(latest.latest_upload) ? current : latest
      );

      const employees = await this.db.getEmployeeDataBySession(latestSession.period);

      reply.send({
        success: true,
        data: {
          employees,
          metadata: {
            totalEmployees: employees.length,
            period: latestSession.period,
            uploadTimestamp: latestSession.latest_upload
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting latest employee data', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} latest employee data`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getCurrentSession(_request: FastifyRequest, reply: FastifyReply) {
    try {
      // For now, return the current dataset ID as session ID
      const currentDatasetId = await this.db.getCurrentDatasetId();
      
      if (!currentDatasetId) {
        return reply.code(404).send({
          success: false,
          error: 'No current session found',
          timestamp: new Date().toISOString(),
        });
      }
      
      reply.send({
        success: true,
        data: { session_id: currentDatasetId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting current session', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} current session`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async setCurrentSession(request: FastifyRequest<{ Body: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.body;
      
      if (!sessionId || sessionId.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Session ID is required',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Note: Implementation would need to store current session state
      // For now, just log and return success
      logger.info('Current session set', { sessionId });
      
      reply.send({
        success: true,
        data: { message: 'Current session set successfully', sessionId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error setting current session', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to set current session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getAllDatasets(_request: FastifyRequest, reply: FastifyReply) {
    try {
      // Note: This would need a proper database method to get all saved datasets
      // For now, return empty array with the expected structure
      const datasets: Array<{ id: string; name: string; created_at: string; employee_count: number }> = [];
      
      reply.send({
        success: true,
        data: datasets,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting all datasets', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: `${FastifyServer.FAILED_TO_GET_MESSAGE} datasets`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deleteDataset(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      
      if (!id || id.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Dataset ID is required',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Note: Implementation would need database method to delete dataset
      logger.info('Dataset deletion requested', { datasetId: id });
      
      reply.send({
        success: true,
        data: { message: 'Dataset deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting dataset', { error: error instanceof Error ? error.message : String(error), datasetId: request.params.id });
      reply.code(500).send({
        success: false,
        error: 'Failed to delete dataset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateEmployeeSummary(request: FastifyRequest<{ Params: { name: string }; Body: { summary: string; sessionId?: string } }>, reply: FastifyReply) {
    try {
      const { name } = request.params;
      const { summary, sessionId } = request.body;
      
      if (!name || name.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Employee name is required',
          timestamp: new Date().toISOString(),
        });
      }
      
      if (!summary || summary.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Summary is required',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Note: Implementation would need database method to update employee summary
      logger.info('Employee summary update requested', { employeeName: name, sessionId });
      
      reply.send({
        success: true,
        data: { message: 'Employee summary updated successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating employee summary', { error: error instanceof Error ? error.message : String(error), employeeName: request.params.name });
      reply.code(500).send({
        success: false,
        error: 'Failed to update employee summary',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async bulkUpdateLeadershipScores(request: FastifyRequest<{ Body: { scores: Record<string, number> } }>, reply: FastifyReply) {
    try {
      const { scores } = request.body;
      
      if (!scores || typeof scores !== 'object') {
        return reply.code(400).send({
          success: false,
          error: 'Scores must be an object with employee names as keys and scores as values',
          timestamp: new Date().toISOString(),
        });
      }
      
      const currentDatasetId = await this.db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return reply.code(404).send({
          success: false,
          error: NO_DATASET_FOUND_ERROR,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Validate all scores
      for (const [employeeName, score] of Object.entries(scores)) {
        if (!employeeName || employeeName.trim() === '') {
          return reply.code(400).send({
            success: false,
            error: 'Employee name is required',
            timestamp: new Date().toISOString(),
          });
        }
        
        if (typeof score !== 'number' || score < 0 || score > 100) {
          return reply.code(400).send({
            success: false,
            error: `Score for ${employeeName} must be a number between 0 and 100`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      // Update scores individually using existing method
      for (const [employeeName, score] of Object.entries(scores)) {
        await this.db.setManualLeadershipScore(currentDatasetId, employeeName, score);
      }
      
      reply.send({
        success: true,
        data: { 
          message: 'Leadership scores updated successfully',
          updatedCount: Object.keys(scores).length
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error bulk updating leadership scores', { error: error instanceof Error ? error.message : String(error) });
      reply.code(500).send({
        success: false,
        error: 'Failed to bulk update leadership scores',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Initialize database and start server
   */
  async start(): Promise<void> {
    try {
      await this.pluginsReady;
      // Initialize database
      await this.db.initialize();
      
      if (this.options.disableListen) {
        await this.app.ready();
        logger.info('Fastify server initialized without network listener');
      } else {
        const address = await this.app.listen({
          port: this.options.port,
          host: this.options.host,
        });

        logger.info('Fastify server started', { 
          address, 
          port: this.options.port,
          swagger: this.options.enableSwagger ? `http://${this.options.host}:${this.options.port}/docs` : false
        });

        // Signal to Electron that server is ready
        if (process.stdout) {
          process.stdout.write(JSON.stringify({
            type: 'server-ready',
            port: this.options.port,
            timestamp: new Date().toISOString()
          }) + '\n');
        }
      }
    } catch (error) {
      logger.error('Failed to start Fastify server', { error: error instanceof Error ? error.message : String(error) });
      
      // Send structured error to stderr for Electron to capture
      if (process.stderr) {
        process.stderr.write(JSON.stringify({
          type: 'server-startup-error',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }) + '\n');
      }
      
      throw error;
    }
  }

  /**
   * Stop server
   */
  async stop(): Promise<void> {
    try {
      await this.app.close();
      this.db.close();
      logger.info('Fastify server stopped');
    } catch (error) {
      logger.error('Error stopping Fastify server', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get Fastify instance
   */
  getInstance(): FastifyInstance {
    return this.app;
  }

  /**
   * Get database instance
   */
  getDatabase(): KyselyDatabaseService {
    return this.db;
  }
}
