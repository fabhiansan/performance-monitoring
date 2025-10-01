/**
 * Unified Express Server Factory
 * 
 * Creates a standardized Express application with configurable features:
 * - Database integration
 * - Response formatting
 * - Error handling
 * - Validation middleware
 * - Logging
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import SQLiteService from './database';
import { logger } from '../services/logger';
import { authMiddleware, requireAuth, getCorsOptions } from '../middleware/authMiddleware';
import type { Employee } from '../types';

// Define types for optional middleware
type MiddlewareFunction = (_req: Request, _res: Response, _next: NextFunction) => void;
type ErrorMiddlewareFunction = (_err: Error, _req: Request, _res: Response, _next: NextFunction) => void;

type EmployeeWithPerformance = Employee;

interface OptionalFormatters {
  responseFormatter?: MiddlewareFunction;
  legacyResponseWrapper?: MiddlewareFunction;
  standardErrorHandler?: ErrorMiddlewareFunction;
  notFoundHandler?: MiddlewareFunction;
}

interface OptionalValidation {
  validateJsonMiddleware?: (_options: Record<string, unknown>) => MiddlewareFunction;
  addValidationHeadersMiddleware?: () => MiddlewareFunction;
}

/**
 * Load optional formatters
 */
async function loadFormatters(): Promise<OptionalFormatters> {
  try {
    const formatters = await import('./responseFormatter');
    return {
      responseFormatter: formatters.responseFormatter,
      legacyResponseWrapper: formatters.legacyResponseWrapper,
      standardErrorHandler: formatters.standardErrorHandler,
      notFoundHandler: formatters.notFoundHandler
    };
  } catch {
    return {};
  }
}

/**
 * Load optional validation middleware
 */
async function loadValidation(): Promise<OptionalValidation> {
  try {
    const validation = await import('../middleware/dataValidationMiddleware');
    return {
      validateJsonMiddleware: validation.validateJsonMiddleware,
      addValidationHeadersMiddleware: validation.addValidationHeadersMiddleware
    };
  } catch {
    return {};
  }
}

export interface ServerOptions {
  useStandardizedResponses?: boolean;
  useValidationMiddleware?: boolean;
  enableDetailedLogging?: boolean;
  useAuthentication?: boolean;
  cors?: {
    enabled: boolean;
    options?: cors.CorsOptions;
  };
  jsonLimit?: string;
  dbPath?: string | null;
}

export interface ServerComponents {
  app: Application;
  db: SQLiteService;
  startServer: (_port: number) => Promise<unknown>;
  stopServer: () => void;
}

/**
 * Creates a configured Express application
 */
export async function createServerApp(options: ServerOptions = {}): Promise<ServerComponents> {
  const {
    useStandardizedResponses = false,
    useValidationMiddleware = false,
    enableDetailedLogging = false,
    useAuthentication = true,
    cors: corsConfig = { enabled: true },
    jsonLimit = '50mb',
    dbPath = null
  } = options;

  const app = express();

  // Load optional modules
  const formatters = await loadFormatters();
  const validation = await loadValidation();

  // Initialize database
  const db = new SQLiteService(dbPath || process.env.DB_PATH || null);
  await db.initialize();

  // Basic middleware
  if (corsConfig.enabled) {
    const corsOptions = corsConfig.options || getCorsOptions();
    app.use(cors(corsOptions));
    if (enableDetailedLogging) {
      logger.info('CORS enabled with options', { corsOptions });
    }
  }
  app.use(express.json({ limit: jsonLimit }));

  // Authentication middleware (applied to all routes)
  if (useAuthentication) {
    app.use(authMiddleware);
    if (enableDetailedLogging) {
      logger.info('Authentication middleware enabled');
    }
  }

  // Optional: Add response formatting middleware (standardized mode)
  if (useStandardizedResponses && formatters.responseFormatter && formatters.legacyResponseWrapper) {
    app.use(formatters.legacyResponseWrapper); // Must be first for backward compatibility
    app.use(formatters.responseFormatter);
  }

  // Optional: Add validation middleware
  if (useValidationMiddleware && validation.validateJsonMiddleware && validation.addValidationHeadersMiddleware) {
    app.use(validation.addValidationHeadersMiddleware());
    app.use(validation.validateJsonMiddleware({ autoFix: true, logErrors: enableDetailedLogging }));
  }

  // Register all routes
  registerRoutes(app, db, useStandardizedResponses, enableDetailedLogging, formatters, useAuthentication);

  // Error handling
  if (useStandardizedResponses && formatters.standardErrorHandler && formatters.notFoundHandler) {
    app.use(formatters.standardErrorHandler);
    app.use(formatters.notFoundHandler);
  } else {
    // Basic error handling
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      if (enableDetailedLogging) {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.url });
      }
      res.status(500).json({ error: 'Something went wrong!' });
    });

    app.use((req: Request, res: Response) => {
      void req;
      res.status(404).json({ error: 'API endpoint not found' });
    });
  }

  let server: ReturnType<Application['listen']> | null = null;

  const startServer = async (port: number) => {
    return new Promise((resolve, reject) => {
      server = app.listen(port, () => {
        logger.info('Performance Analyzer API server started', { port, url: `http://localhost:${port}` });
        
        // Signal to Electron that server is ready
        if (process.stdout) {
          process.stdout.write(JSON.stringify({
            type: 'server-ready',
            port: port,
            timestamp: new Date().toISOString()
          }) + '\n');
        }
        
        resolve(server);
      });

      server?.on('error', reject);
    });
  };

  const stopServer = () => {
    if (server) {
      server.close();
      server = null;
    }
    db.close();
  };

  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    logger.info('Shutting down gracefully');
    stopServer();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    stopServer();
    process.exit(0);
  });

  return {
    app,
    db,
    startServer,
    stopServer
  };
}

/**
 * Register all API routes
 */
function registerRoutes(app: Application, db: SQLiteService, useStandardizedResponses: boolean, enableDetailedLogging: boolean, _formatters: OptionalFormatters, useAuthentication = true) {
  // Health check endpoints
  app.get('/health', (_req, res) => {
    if (useStandardizedResponses && res.apiSuccess) {
      res.apiSuccess(
        { status: 'ok', database: db.isReady() },
        'Health check passed',
        { timestamp: new Date().toISOString() }
      );
    } else {
      res.json({
        status: 'ok',
        database: db.isReady(),
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    if (useStandardizedResponses && res.apiSuccess) {
      res.apiSuccess(
        { status: 'OK', database: db.isReady() },
        'Performance Analyzer API is running',
        { uptime: process.uptime() }
      );
    } else {
      res.json({ status: 'OK', message: 'Performance Analyzer API is running' });
    }
  });

  // Upload employee data with timestamp (requires authentication)
  app.post('/api/employee-data', useAuthentication ? requireAuth : (_req, _res, next) => next(), (req, res) => {
    try {
      const { employees, sessionName } = req.body;
      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ error: 'Invalid employees data' });
      }
      
      const sessionId = db.saveEmployeeData(employees, sessionName);
      
      if (useStandardizedResponses && res.apiSuccess) {
        res.apiSuccess(
          { sessionId },
          'Employee data saved successfully',
          { employeeCount: employees.length, sessionName }
        );
      } else {
        res.json({ sessionId, message: 'Employee data saved successfully' });
      }
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error saving employee data', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ error: 'Failed to save employee data' });
    }
  });

  // Get all upload sessions
  app.get('/api/upload-sessions', (_req, res) => {
    try {
      if (!db.isReady()) {
        logger.error('Database not ready when trying to get upload sessions');
        console.error('Database initialization status:', db.getErrorDetails());
        return res.status(500).json({
          error: 'Database not ready',
          details: 'The database is still initializing. Please try again in a moment.'
        });
      }
      
      const sessions = db.getAllUploadSessions();
      
      if (useStandardizedResponses && res.apiSuccess) {
        res.apiSuccess(sessions, 'Upload sessions retrieved successfully');
      } else {
        res.json(sessions);
      }
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting upload sessions', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ 
        error: 'Failed to get upload sessions',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get employee data by session ID
  app.get('/api/employee-data/session/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ 
          error: 'Session ID is required',
          details: 'Please provide a valid session ID'
        });
      }
      
      const employees: Employee[] = db.getEmployeeDataBySession(sessionId);
      
      // Validate that performance data was properly loaded
      const employeesWithoutPerformance = employees.filter((emp: EmployeeWithPerformance) => !emp.performance || emp.performance.length === 0);
      if (employeesWithoutPerformance.length > 0 && enableDetailedLogging) {
        logger.warn('Employees loaded without performance data', { count: employeesWithoutPerformance.length, sessionId });
      }
      
      if (enableDetailedLogging) {
        logger.api('Loaded employees from session', { totalEmployees: employees.length, sessionId, employeesWithPerformance: employees.length - employeesWithoutPerformance.length });
      }
      
      const responseData = { 
        employees, 
        sessionId: sessionId,
        metadata: {
          totalEmployees: employees.length,
          employeesWithPerformanceData: employees.length - employeesWithoutPerformance.length,
          employeesWithoutPerformanceData: employeesWithoutPerformance.length
        }
      };

      if (useStandardizedResponses && res.apiSuccess) {
        res.apiSuccess(responseData, 'Employee data retrieved successfully');
      } else {
        res.json(responseData);
      }
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting employee data by session', { 
          error: error instanceof Error ? error.message : String(error), 
          sessionId: req.params.sessionId 
        });
      }
      res.status(500).json({ 
        error: 'Failed to get employee data',
        details: error instanceof Error ? error.message : String(error),
        sessionId: req.params.sessionId
      });
    }
  });

  // Add all other routes from the original server.ts
  registerEmployeeRoutes(app, db, enableDetailedLogging, useAuthentication);
  registerDataRoutes(app, db, useStandardizedResponses, enableDetailedLogging, useAuthentication);
  registerLeadershipScoreRoutes(app, db, useStandardizedResponses, enableDetailedLogging, useAuthentication);
}

function registerEmployeeRoutes(app: Application, db: SQLiteService, enableDetailedLogging: boolean, useAuthentication = true) {
  // Get all employees
  app.get('/api/employees', (_req, res) => {
    try {
      const employees = db.getAllEmployees();
      res.json(employees);
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting employees', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ error: 'Failed to get employees' });
    }
  });

  // Get employee suggestions
  app.get('/api/employees/suggestions', (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Query param "name" is required' });
      }
      const suggestions = db.getEmployeeSuggestions(name, 5);
      res.json(suggestions);
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting employee suggestions', { error: error instanceof Error ? error.message : String(error), name: req.query.name });
      }
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  });

  // Get employee org level mapping
  app.get('/api/employees/org-level-mapping', (_req, res) => {
    try {
      const mapping = db.getEmployeeOrgLevelMapping();
      res.json(mapping);
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting organizational level mapping', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ error: 'Failed to get organizational level mapping' });
    }
  });

  // Get employee by ID
  app.get('/api/employees/:id', (req, res) => {
    try {
      const employeeId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(employeeId)) {
        return res.status(400).json({ error: 'Employee ID must be a number' });
      }

      const employee = db.getEmployeeById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting employee', { error: error instanceof Error ? error.message : String(error), employeeId: req.params.id });
      }
      res.status(500).json({ error: 'Failed to get employee' });
    }
  });

  // Add employee
  app.post('/api/employees', useAuthentication ? requireAuth : (_req, _res, next) => next(), (req, res) => {
    try {
      const { name, nip, gol, pangkat, position, subPosition, organizationalLevel } = req.body;
      
      if (!name?.trim() || !gol?.trim()) {
        return res.status(400).json({ error: 'Name and Golongan are required' });
      }
      
      const employeeData = {
        name: name.trim(),
        nip: nip?.trim() || '-',
        gol: gol.trim(),
        pangkat: pangkat?.trim() || '-',
        position: position?.trim() || '-',
        subPosition: subPosition?.trim() || '-',
        organizationalLevel: organizationalLevel?.trim() || 'Staff/Other'
      };
      
      const employeeId = db.addEmployee(
        employeeData.name, 
        employeeData.nip, 
        employeeData.gol, 
        employeeData.pangkat, 
        employeeData.position, 
        employeeData.subPosition,
        employeeData.organizationalLevel
      );
      res.json({ id: employeeId, message: 'Employee added successfully' });
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error adding employee', { error: error instanceof Error ? error.message : String(error), employeeName: req.body.name });
      }
      res.status(500).json({ error: 'Failed to add employee' });
    }
  });

  // Additional employee routes would go here...
}

function registerDataRoutes(app: Application, db: SQLiteService, useStandardizedResponses: boolean, enableDetailedLogging: boolean, useAuthentication = true) {
  // Get employee data by time range
  app.get('/api/employee-data/range', (req, res) => {
    try {
      if (typeof req.query.startTime !== 'string' || typeof req.query.endTime !== 'string') {
        return res.status(400).json({ error: 'Query params "startTime" and "endTime" are required' });
      }

      const startTime = req.query.startTime;
      const endTime = req.query.endTime;

      const employees = db.getEmployeeDataByTimeRange(startTime, endTime);
      const metadata = {
        totalEmployees: employees.length,
        timeRange: { startTime, endTime }
      };

      if (useStandardizedResponses && res.apiSuccess) {
        res.apiSuccess({ employees, metadata }, 'Employee data retrieved successfully', metadata);
      } else {
        res.json({ employees, metadata });
      }
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting employee data by time range', { error: error instanceof Error ? error.message : String(error), startTime: req.query.startTime, endTime: req.query.endTime });
      }
      res.status(500).json({ 
        error: 'Failed to get employee data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get latest employee data
  app.get('/api/employee-data/latest', (_req, res) => {
    try {
      const employees = db.getLatestEmployeeData();
      const metadata = {
        totalEmployees: employees.length,
        isLatest: true
      };

      if (useStandardizedResponses && res.apiSuccess) {
        res.apiSuccess({ employees, metadata }, 'Latest employee data retrieved', metadata);
      } else {
        res.json({ employees, metadata });
      }
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting latest employee data', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ 
        error: 'Failed to get latest employee data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete upload session (requires authentication)
  app.delete('/api/upload-sessions/:sessionId', useAuthentication ? requireAuth : (_req, _res, next) => next(), (req, res) => {
    try {
      db.deleteUploadSession(req.params.sessionId);
      res.json({ message: 'Upload session deleted successfully' });
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error deleting upload session', { error: error instanceof Error ? error.message : String(error), sessionId: req.params.sessionId });
      }
      res.status(500).json({ error: 'Failed to delete upload session' });
    }
  });
}

function registerLeadershipScoreRoutes(app: Application, db: SQLiteService, _useStandardizedResponses: boolean, enableDetailedLogging: boolean, useAuthentication = true) {
  const requireLeadershipAuth = useAuthentication ? requireAuth : (_req: Request, _res: Response, next: NextFunction) => next();
  // Get manual leadership scores for current dataset
  app.get('/api/current-dataset/leadership-scores', requireLeadershipAuth, (_req, res) => {
    try {
      const currentDatasetId = db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return res.status(404).json({ error: 'No current dataset found' });
      }
      
      const scores = db.getAllManualLeadershipScores(currentDatasetId);
      res.json(scores);
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error getting leadership scores', { error: error instanceof Error ? error.message : String(error) });
      }
      res.status(500).json({ error: 'Failed to get leadership scores' });
    }
  });

  // Set manual leadership score
  app.put('/api/current-dataset/leadership-scores/:employeeName', requireLeadershipAuth, (req, res) => {
    try {
      const { employeeName } = req.params;
      const { score } = req.body;
      
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Score must be a number between 0 and 100' });
      }
      
      const currentDatasetId = db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return res.status(404).json({ error: 'No current dataset found' });
      }
      
      db.setManualLeadershipScore(currentDatasetId, employeeName, score);
      res.json({ message: 'Leadership score updated successfully' });
    } catch (error) {
      if (enableDetailedLogging) {
        logger.error('Error updating leadership score', { error: error instanceof Error ? error.message : String(error), employeeName: req.params.employeeName });
      }
      res.status(500).json({ error: 'Failed to update leadership score' });
    }
  });
}

export default createServerApp;
