import express from 'express';
import cors from 'cors';
import SQLiteService from './database.js';
import {
  responseFormatter,
  legacyResponseWrapper,
  standardErrorHandler,
  notFoundHandler
} from './responseFormatter.js';
import {
  validateJsonMiddleware,
  validatePerformanceMiddleware,
  addValidationHeadersMiddleware,
  createErrorReportingEndpoint,
  createDataRecoveryEndpoint
} from '../middleware/dataValidationMiddleware.js';

const app = express();
const port = process.env.PORT || 3002;

// Initialize database with optional custom path
const dbPath = process.env.DB_PATH || null;
const db = new SQLiteService(dbPath);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Add response formatting middleware
app.use(legacyResponseWrapper); // Must be first for backward compatibility
app.use(responseFormatter);

// Add data validation middleware
app.use(addValidationHeadersMiddleware());
app.use(validateJsonMiddleware({ autoFix: true, logErrors: true }));

// Routes with standardized responses

// Health check
app.get('/api/health', (req, res) => {
  res.apiSuccess(
    { status: 'OK', database: db.isReady() },
    'Performance Analyzer API is running',
    { uptime: process.uptime() }
  );
});

// NEW UNIFIED TIMESTAMP-BASED ENDPOINTS

// Upload employee data with timestamp
app.post('/api/employee-data', 
  validatePerformanceMiddleware({ autoFix: true, minDataQualityScore: 70 }),
  (req, res) => {
    try {
      const { employees, sessionName } = req.body;
      
      if (!employees || !Array.isArray(employees)) {
        return res.apiValidationError(
          'Invalid request data',
          [{ field: 'employees', message: 'Must be an array of employee objects' }]
        );
      }
      
      // Use validated employee data if available
      const employeeData = req.validatedEmployeeData ? req.validatedEmployeeData.employees : employees;
      
      const sessionId = db.saveEmployeeData(employeeData, sessionName);
      
      // Include validation information in response
      const responseMetadata = { 
        employeeCount: employeeData.length, 
        sessionName 
      };
      
      if (req.validatedEmployeeData) {
        responseMetadata.dataQualityScore = req.validatedEmployeeData.dataQualityScore;
        responseMetadata.validationApplied = true;
      }
      
      res.apiSuccess(
        { sessionId },
        'Employee data saved successfully',
        responseMetadata
      );
    } catch (error) {
      console.error('Error saving employee data:', error);
      res.apiServerError(
        'Failed to save employee data',
        process.env.NODE_ENV === 'development' ? error.message : null
      );
    }
  }
);

// Get all upload sessions
app.get('/api/upload-sessions', (req, res) => {
  try {
    const sessions = db.getAllUploadSessions();
    res.apiSuccess(
      sessions,
      'Upload sessions retrieved successfully',
      { count: sessions.length }
    );
  } catch (error) {
    console.error('Error getting upload sessions:', error);
    res.apiServerError(
      'Failed to retrieve upload sessions',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employee data by session ID
app.get('/api/employee-data/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.apiValidationError(
        'Invalid request parameters',
        [{ field: 'sessionId', message: 'Session ID is required' }]
      );
    }
    
    const employees = db.getEmployeeDataBySession(sessionId);
    
    if (!employees || employees.length === 0) {
      return res.apiNotFound('Employee data for the specified session');
    }
    
    res.apiSuccess(
      { employees, sessionId },
      'Employee data retrieved successfully',
      { employeeCount: employees.length }
    );
  } catch (error) {
    console.error('Error getting employee data by session:', error);
    res.apiServerError(
      'Failed to retrieve employee data',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employee data by time range
app.get('/api/employee-data/range', (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.apiValidationError(
        'Invalid query parameters',
        [
          { field: 'startTime', message: 'Start time is required' },
          { field: 'endTime', message: 'End time is required' }
        ]
      );
    }
    
    const employees = db.getEmployeeDataByTimeRange(startTime, endTime);
    res.apiSuccess(
      employees,
      'Employee data retrieved successfully',
      { 
        employeeCount: employees.length,
        timeRange: { startTime, endTime }
      }
    );
  } catch (error) {
    console.error('Error getting employee data by time range:', error);
    res.apiServerError(
      'Failed to retrieve employee data',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get latest employee data
app.get('/api/employee-data/latest', (req, res) => {
  try {
    const employees = db.getLatestEmployeeData();
    res.apiSuccess(
      employees,
      'Latest employee data retrieved successfully',
      { employeeCount: employees.length }
    );
  } catch (error) {
    console.error('Error getting latest employee data:', error);
    res.apiServerError(
      'Failed to retrieve latest employee data',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Delete upload session
app.delete('/api/upload-sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.apiValidationError(
        'Invalid request parameters',
        [{ field: 'sessionId', message: 'Session ID is required' }]
      );
    }
    
    db.deleteUploadSession(sessionId);
    res.apiSuccess(
      null,
      'Upload session deleted successfully',
      { deletedSessionId: sessionId }
    );
  } catch (error) {
    console.error('Error deleting upload session:', error);
    res.apiServerError(
      'Failed to delete upload session',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// EMPLOYEE DATABASE ROUTES

// Get all employees
app.get('/api/employees', (req, res) => {
  try {
    const employees = db.getAllEmployees();
    res.apiSuccess(
      employees,
      'Employees retrieved successfully',
      { count: employees.length }
    );
  } catch (error) {
    console.error('Error getting employees:', error);
    res.apiServerError(
      'Failed to retrieve employees',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employee suggestions by fuzzy match
app.get('/api/employees/suggestions', (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.apiValidationError(
        'Invalid query parameters',
        [{ field: 'name', message: 'Name query parameter is required and must be a string' }]
      );
    }
    
    const suggestions = db.getEmployeeSuggestions(name, 5);
    res.apiSuccess(
      suggestions,
      'Employee suggestions retrieved successfully',
      { query: name, count: suggestions.length }
    );
  } catch (error) {
    console.error('Error getting employee suggestions:', error);
    res.apiServerError(
      'Failed to retrieve employee suggestions',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employee organizational level mapping
app.get('/api/employees/org-level-mapping', (req, res) => {
  try {
    const mapping = db.getEmployeeOrgLevelMapping();
    res.apiSuccess(
      mapping,
      'Organizational level mapping retrieved successfully',
      { mappingCount: Object.keys(mapping).length }
    );
  } catch (error) {
    console.error('Error getting organizational level mapping:', error);
    res.apiServerError(
      'Failed to retrieve organizational level mapping',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employee by ID
app.get('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.apiValidationError(
        'Invalid request parameters',
        [{ field: 'id', message: 'Employee ID is required' }]
      );
    }
    
    const employee = db.getEmployeeById(id);
    
    if (!employee) {
      return res.apiNotFound('Employee');
    }
    
    res.apiSuccess(
      employee,
      'Employee retrieved successfully',
      { employeeId: id }
    );
  } catch (error) {
    console.error('Error getting employee:', error);
    res.apiServerError(
      'Failed to retrieve employee',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Add single employee
app.post('/api/employees', (req, res) => {
  try {
    const { name, nip, gol, pangkat, position, subPosition, organizationalLevel } = req.body;
    
    // Validation
    const validationErrors = [];
    if (!name?.trim()) {
      validationErrors.push({ field: 'name', message: 'Name is required' });
    }
    if (!gol?.trim()) {
      validationErrors.push({ field: 'gol', message: 'Golongan is required' });
    }
    
    if (validationErrors.length > 0) {
      return res.apiValidationError('Validation failed', validationErrors);
    }
    
    // Set default values for optional fields
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
    
    res.apiSuccess(
      { id: employeeId, ...employeeData },
      'Employee added successfully',
      { employeeId }
    );
  } catch (error) {
    console.error('Error adding employee:', error);
    res.apiServerError(
      'Failed to add employee',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Import employees from CSV
app.post('/api/employees/import-csv', (req, res) => {
  try {
    const { employees } = req.body;
    
    if (!employees || !Array.isArray(employees)) {
      return res.apiValidationError(
        'Invalid request data',
        [{ field: 'employees', message: 'Must be an array of employee objects' }]
      );
    }
    
    const count = db.importEmployeesFromCSV(employees);
    res.apiSuccess(
      { importedCount: count },
      `${count} employees imported successfully`,
      { totalEmployees: employees.length, successfulImports: count }
    );
  } catch (error) {
    console.error('Error importing employees:', error);
    res.apiServerError(
      'Failed to import employees',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Update employee
app.put('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, nip, gol, pangkat, position, subPosition, organizationalLevel } = req.body;
    
    // Validation
    const validationErrors = [];
    if (!id) {
      validationErrors.push({ field: 'id', message: 'Employee ID is required' });
    }
    if (!name?.trim()) {
      validationErrors.push({ field: 'name', message: 'Name is required' });
    }
    if (!gol?.trim()) {
      validationErrors.push({ field: 'gol', message: 'Golongan is required' });
    }
    
    if (validationErrors.length > 0) {
      return res.apiValidationError('Validation failed', validationErrors);
    }
    
    // Set default values for optional fields
    const employeeData = {
      name: name.trim(),
      nip: nip?.trim() || '-',
      gol: gol.trim(),
      pangkat: pangkat?.trim() || '-',
      position: position?.trim() || '-',
      subPosition: subPosition?.trim() || '-',
      organizationalLevel: organizationalLevel?.trim() || 'Staff/Other'
    };
    
    db.updateEmployee(
      id,
      employeeData.name,
      employeeData.nip,
      employeeData.gol,
      employeeData.pangkat,
      employeeData.position,
      employeeData.subPosition,
      employeeData.organizationalLevel
    );
    
    res.apiSuccess(
      { id, ...employeeData },
      'Employee updated successfully',
      { employeeId: id }
    );
  } catch (error) {
    console.error('Error updating employee:', error);
    res.apiServerError(
      'Failed to update employee',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.apiValidationError(
        'Invalid request parameters',
        [{ field: 'id', message: 'Employee ID is required' }]
      );
    }
    
    db.deleteEmployee(id);
    res.apiSuccess(
      null,
      'Employee deleted successfully',
      { deletedEmployeeId: id }
    );
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.apiServerError(
      'Failed to delete employee',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Get employees count
app.get('/api/employees-count', (req, res) => {
  try {
    const count = db.getEmployeesCount();
    res.apiSuccess(
      { count },
      'Employee count retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting employees count:', error);
    res.apiServerError(
      'Failed to retrieve employee count',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// MANUAL LEADERSHIP SCORES ROUTES

// Get manual leadership scores for current dataset
app.get('/api/current-dataset/leadership-scores', (req, res) => {
  try {
    const currentDatasetId = db.getCurrentDatasetId();
    
    if (!currentDatasetId) {
      return res.apiNotFound('Current dataset');
    }
    
    const scores = db.getAllManualLeadershipScores(currentDatasetId);
    res.apiSuccess(
      scores,
      'Leadership scores retrieved successfully',
      { datasetId: currentDatasetId, scoreCount: Object.keys(scores).length }
    );
  } catch (error) {
    console.error('Error getting leadership scores:', error);
    res.apiServerError(
      'Failed to retrieve leadership scores',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Set manual leadership score for an employee in current dataset
app.put('/api/current-dataset/leadership-scores/:employeeName', (req, res) => {
  try {
    const { employeeName } = req.params;
    const { score } = req.body;
    
    // Validation
    const validationErrors = [];
    if (!employeeName) {
      validationErrors.push({ field: 'employeeName', message: 'Employee name is required' });
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      validationErrors.push({ field: 'score', message: 'Score must be a number between 0 and 100' });
    }
    
    if (validationErrors.length > 0) {
      return res.apiValidationError('Validation failed', validationErrors);
    }
    
    const currentDatasetId = db.getCurrentDatasetId();
    if (!currentDatasetId) {
      return res.apiNotFound('Current dataset');
    }
    
    db.setManualLeadershipScore(currentDatasetId, employeeName, score);
    res.apiSuccess(
      { employeeName, score },
      'Leadership score updated successfully',
      { datasetId: currentDatasetId }
    );
  } catch (error) {
    console.error('Error updating leadership score:', error);
    res.apiServerError(
      'Failed to update leadership score',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Bulk update manual leadership scores for current dataset
app.put('/api/current-dataset/leadership-scores', (req, res) => {
  try {
    const { scores } = req.body;
    
    if (!scores || typeof scores !== 'object') {
      return res.apiValidationError(
        'Invalid request data',
        [{ field: 'scores', message: 'Scores must be an object with employee names as keys and scores as values' }]
      );
    }
    
    // Validate all scores
    const validationErrors = [];
    for (const [name, score] of Object.entries(scores)) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        validationErrors.push({ field: `scores.${name}`, message: `Score for ${name} must be a number between 0 and 100` });
      }
    }
    
    if (validationErrors.length > 0) {
      return res.apiValidationError('Validation failed', validationErrors);
    }
    
    const currentDatasetId = db.getCurrentDatasetId();
    if (!currentDatasetId) {
      return res.apiNotFound('Current dataset');
    }
    
    db.bulkUpdateManualLeadershipScores(currentDatasetId, scores);
    res.apiSuccess(
      { updatedScores: scores },
      'Leadership scores updated successfully',
      { 
        datasetId: currentDatasetId,
        updatedCount: Object.keys(scores).length
      }
    );
  } catch (error) {
    console.error('Error updating leadership scores:', error);
    res.apiServerError(
      'Failed to update leadership scores',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
});

// Data validation and recovery endpoints
app.post('/api/data/validate', createErrorReportingEndpoint());
app.post('/api/data/recover', createDataRecoveryEndpoint());

// Apply standardized error handling
app.use(standardErrorHandler);
app.use(notFoundHandler);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Performance Analyzer API server running on http://localhost:${port}`);
  console.log('API Response Format: Standardized with backward compatibility');
  console.log('- Legacy clients: Use existing response format');
  console.log('- New clients: Add header "Accept-API-Version: 2.0" or query param "?apiVersion=2.0"');
  
  // Send ready message to parent process (for Electron) with enhanced data
  if (process.send) {
    try {
      process.send({
        type: 'server-ready',
        port: port,
        timestamp: new Date().toISOString(),
        pid: process.pid
      });
    } catch (error) {
      console.error('Failed to send IPC message:', error.message);
    }
  }
  
  // Also send to stdout as JSON for spawn processes without IPC
  const readyMessage = {
    type: 'server-ready',
    port: port,
    timestamp: new Date().toISOString(),
    pid: process.pid
  };
  console.log(JSON.stringify(readyMessage));
  
  console.log('\nAvailable endpoints:');
  console.log('  GET /api/health - Health check');
  console.log('');
  console.log('  UNIFIED TIMESTAMP-BASED ENDPOINTS:');
  console.log('  POST /api/employee-data - Upload employee data with timestamp');
  console.log('  GET /api/upload-sessions - Get all upload sessions');
  console.log('  GET /api/employee-data/session/:sessionId - Get employee data by session');
  console.log('  GET /api/employee-data/range?startTime&endTime - Get employee data by time range');
  console.log('  GET /api/employee-data/latest - Get latest employee data');
  console.log('  DELETE /api/upload-sessions/:sessionId - Delete upload session');
  console.log('');
  console.log('  EMPLOYEE MANAGEMENT ENDPOINTS:');
  console.log('  GET /api/employees - Get all employees');
  console.log('  GET /api/employees/:id - Get employee by ID');
  console.log('  POST /api/employees - Add single employee');
  console.log('  POST /api/employees/import-csv - Import employees from CSV');
  console.log('  PUT /api/employees/:id - Update employee');
  console.log('  DELETE /api/employees/:id - Delete employee');
  console.log('  GET /api/employees-count - Get employees count');
  console.log('  GET /api/employees/suggestions - Get employee suggestions');
  console.log('  GET /api/employees/org-level-mapping - Get organizational level mapping');
  console.log('');
  console.log('  LEADERSHIP SCORES ENDPOINTS:');
  console.log('  GET /api/current-dataset/leadership-scores - Get leadership scores');
  console.log('  PUT /api/current-dataset/leadership-scores/:employeeName - Update single leadership score');
  console.log('  PUT /api/current-dataset/leadership-scores - Bulk update leadership scores');
});

export default app;