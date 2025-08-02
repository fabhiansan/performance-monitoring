import express from 'express';
import cors from 'cors';
import SQLiteService from './database.js';

const app = express();
const port = process.env.PORT || 3002;

try {
  // Initialize database with optional custom path
  const dbPath = process.env.DB_PATH || null;
  const db = new SQLiteService(dbPath);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint (must be early for Electron to detect server readiness)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      database: db.isReady(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Performance Analyzer API is running' });
  });

  // Routes (keeping all existing routes)
  // NEW UNIFIED TIMESTAMP-BASED ENDPOINTS

  // Upload employee data with timestamp
  app.post('/api/employee-data', (req, res) => {
    try {
      const { employees, sessionName } = req.body;
      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ error: 'Invalid employees data' });
      }
      
      const sessionId = db.saveEmployeeData(employees, sessionName);
      res.json({ sessionId, message: 'Employee data saved successfully' });
    } catch (error) {
      console.error('Error saving employee data:', error);
      res.status(500).json({ error: 'Failed to save employee data' });
    }
  });

  // Get all upload sessions (replaces datasets list)
  app.get('/api/upload-sessions', (req, res) => {
    try {
      const sessions = db.getAllUploadSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Error getting upload sessions:', error);
      res.status(500).json({ error: 'Failed to get upload sessions' });
    }
  });

  // Get employee data by session ID
  app.get('/api/employee-data/session/:sessionId', (req, res) => {
    try {
      const employees = db.getEmployeeDataBySession(req.params.sessionId);
      res.json({ employees, sessionId: req.params.sessionId });
    } catch (error) {
      console.error('Error getting employee data by session:', error);
      res.status(500).json({ error: 'Failed to get employee data' });
    }
  });

  // Get employee data by time range
  app.get('/api/employee-data/range', (req, res) => {
    try {
      const { startTime, endTime } = req.query;
      const employees = db.getEmployeeDataByTimeRange(startTime, endTime);
      res.json(employees);
    } catch (error) {
      console.error('Error getting employee data by time range:', error);
      res.status(500).json({ error: 'Failed to get employee data' });
    }
  });

  // Get latest employee data (current dataset equivalent)
  app.get('/api/employee-data/latest', (req, res) => {
    try {
      const employees = db.getLatestEmployeeData();
      res.json(employees);
    } catch (error) {
      console.error('Error getting latest employee data:', error);
      res.status(500).json({ error: 'Failed to get latest employee data' });
    }
  });

  // Delete upload session
  app.delete('/api/upload-sessions/:sessionId', (req, res) => {
    try {
      db.deleteUploadSession(req.params.sessionId);
      res.json({ message: 'Upload session deleted successfully' });
    } catch (error) {
      console.error('Error deleting upload session:', error);
      res.status(500).json({ error: 'Failed to delete upload session' });
    }
  });

  // Employee Database Routes

  // Get all employees
  app.get('/api/employees', (req, res) => {
    try {
      const employees = db.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error getting employees:', error);
      res.status(500).json({ error: 'Failed to get employees' });
    }
  });

  // Get employee suggestions by fuzzy match
  app.get('/api/employees/suggestions', (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Query param "name" is required' });
      }
      const suggestions = db.getEmployeeSuggestions(name, 5);
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting employee suggestions:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  });

  // Get employee organizational level mapping (MUST be declared before the dynamic :id route)
  app.get('/api/employees/org-level-mapping', (req, res) => {
    try {
      const mapping = db.getEmployeeOrgLevelMapping();
      res.json(mapping);
    } catch (error) {
      console.error('Error getting organizational level mapping:', error);
      res.status(500).json({ error: 'Failed to get organizational level mapping' });
    }
  });

  // Get employee by ID
  app.get('/api/employees/:id', (req, res) => {
    try {
      const employee = db.getEmployeeById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      console.error('Error getting employee:', error);
      res.status(500).json({ error: 'Failed to get employee' });
    }
  });

  // Add single employee
  app.post('/api/employees', (req, res) => {
    try {
      const { name, nip, gol, pangkat, position, subPosition, organizationalLevel } = req.body;
      
      // Only name and gol are required, others can be empty and will be set to default values
      if (!name?.trim() || !gol?.trim()) {
        return res.status(400).json({ error: 'Name and Golongan are required' });
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
      res.json({ id: employeeId, message: 'Employee added successfully' });
    } catch (error) {
      console.error('Error adding employee:', error);
      res.status(500).json({ error: 'Failed to add employee' });
    }
  });

  // Import employees from CSV
  app.post('/api/employees/import-csv', (req, res) => {
    try {
      const { employees } = req.body;
      
      if (!employees || !Array.isArray(employees)) {
        return res.status(400).json({ error: 'Invalid employees data' });
      }
      
      const count = db.importEmployeesFromCSV(employees);
      res.json({ count, message: `${count} employees imported successfully` });
    } catch (error) {
      console.error('Error importing employees:', error);
      res.status(500).json({ error: 'Failed to import employees' });
    }
  });

  // Update employee
  app.put('/api/employees/:id', (req, res) => {
    try {
      const { name, nip, gol, pangkat, position, subPosition, organizationalLevel } = req.body;
      
      // Only name and gol are required, others can be empty and will be set to default values
      if (!name?.trim() || !gol?.trim()) {
        return res.status(400).json({ error: 'Name and Golongan are required' });
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
        req.params.id, 
        employeeData.name, 
        employeeData.nip, 
        employeeData.gol, 
        employeeData.pangkat, 
        employeeData.position, 
        employeeData.subPosition,
        employeeData.organizationalLevel
      );
      res.json({ message: 'Employee updated successfully' });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', (req, res) => {
    try {
      db.deleteEmployee(req.params.id);
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // Get employees count
  app.get('/api/employees-count', (req, res) => {
    try {
      const count = db.getEmployeesCount();
      res.json({ count });
    } catch (error) {
      console.error('Error getting employees count:', error);
      res.status(500).json({ error: 'Failed to get employees count' });
    }
  });

  // Manual Leadership Scores Routes

  // Get manual leadership scores for current dataset
  app.get('/api/current-dataset/leadership-scores', (req, res) => {
    try {
      const currentDatasetId = db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return res.status(404).json({ error: 'No current dataset found' });
      }
      
      const scores = db.getAllManualLeadershipScores(currentDatasetId);
      res.json(scores);
    } catch (error) {
      console.error('Error getting leadership scores:', error);
      res.status(500).json({ error: 'Failed to get leadership scores' });
    }
  });

  // Set manual leadership score for an employee in current dataset
  app.put('/api/current-dataset/leadership-scores/:employeeName', (req, res) => {
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
      console.error('Error updating leadership score:', error);
      res.status(500).json({ error: 'Failed to update leadership score' });
    }
  });

  // Bulk update manual leadership scores for current dataset
  app.put('/api/current-dataset/leadership-scores', (req, res) => {
    try {
      const { scores } = req.body;
      
      if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ error: 'Scores must be an object with employee names as keys and scores as values' });
      }
      
      // Validate all scores
      for (const [name, score] of Object.entries(scores)) {
        if (typeof score !== 'number' || score < 0 || score > 100) {
          return res.status(400).json({ error: `Score for ${name} must be a number between 0 and 100` });
        }
      }
      
      const currentDatasetId = db.getCurrentDatasetId();
      if (!currentDatasetId) {
        return res.status(404).json({ error: 'No current dataset found' });
      }
      
      db.bulkUpdateManualLeadershipScores(currentDatasetId, scores);
      res.json({ message: 'Leadership scores updated successfully' });
    } catch (error) {
      console.error('Error updating leadership scores:', error);
      res.status(500).json({ error: 'Failed to update leadership scores' });
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // Handle 404
  app.use((req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    db.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    db.close();
    process.exit(0);
  });

  // Start server
  const server = app.listen(port, () => {
    console.log(`✅ Performance Analyzer API server running on http://localhost:${port}`);
    
    // Signal to Electron that server is ready
    if (process.stdout) {
      process.stdout.write(JSON.stringify({
        type: 'server-ready',
        port: port,
        timestamp: new Date().toISOString()
      }) + '\n');
    }
    
    console.log('Available endpoints:');
    console.log('  GET /health - Health check for Electron');
    console.log('  GET /api/health - API Health check');
    console.log('');
    console.log('  NEW UNIFIED TIMESTAMP-BASED ENDPOINTS:');
    console.log('  POST /api/employee-data - Upload employee data with timestamp');
    console.log('  GET /api/upload-sessions - Get all upload sessions');
    console.log('  GET /api/employee-data/session/:sessionId - Get employee data by session');
    console.log('  GET /api/employee-data/range?startTime&endTime - Get employee data by time range');
    console.log('  GET /api/employee-data/latest - Get latest employee data');
    console.log('  DELETE /api/upload-sessions/:sessionId - Delete upload session');
    console.log('');
    console.log('  OTHER ENDPOINTS:');
    console.log('  GET /api/employees - Get all employees');
    console.log('  GET /api/employees/:id - Get employee by ID');
    console.log('  POST /api/employees - Add single employee');
    console.log('  POST /api/employees/import-csv - Import employees from CSV');
    console.log('  PUT /api/employees/:id - Update employee');
    console.log('  DELETE /api/employees/:id - Delete employee');
    console.log('  GET /api/employees-count - Get employees count');
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  
  // Send structured error to stderr for Electron to capture
  if (process.stderr) {
    process.stderr.write(JSON.stringify({
      type: 'server-startup-error',
      message: error.message,
      timestamp: new Date().toISOString()
    }) + '\n');
  }
  
  process.exit(1);
}