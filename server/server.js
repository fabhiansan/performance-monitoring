import express from 'express';
import cors from 'cors';
import SQLiteService from './database.js';

const app = express();
const port = 3001;

// Initialize database
const db = new SQLiteService();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes

// Get all datasets
app.get('/api/datasets', (req, res) => {
  try {
    const datasets = db.getAllDatasets();
    res.json(datasets);
  } catch (error) {
    console.error('Error getting datasets:', error);
    res.status(500).json({ error: 'Failed to get datasets' });
  }
});

// Get specific dataset
app.get('/api/datasets/:id', (req, res) => {
  try {
    const dataset = db.getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    res.json(dataset);
  } catch (error) {
    console.error('Error getting dataset:', error);
    res.status(500).json({ error: 'Failed to get dataset' });
  }
});

// Save new dataset
app.post('/api/datasets', (req, res) => {
  try {
    const { name, employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: 'Invalid employees data' });
    }
    
    const datasetId = db.saveDataset(name || `Dataset ${new Date().toLocaleString()}`, employees);
    res.json({ id: datasetId, message: 'Dataset saved successfully' });
  } catch (error) {
    console.error('Error saving dataset:', error);
    res.status(500).json({ error: 'Failed to save dataset' });
  }
});

// Delete dataset
app.delete('/api/datasets/:id', (req, res) => {
  try {
    db.deleteDataset(req.params.id);
    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

// Get current active dataset
app.get('/api/current-dataset', (req, res) => {
  try {
    const dataset = db.getCurrentDataset();
    res.json(dataset);
  } catch (error) {
    console.error('Error getting current dataset:', error);
    res.status(500).json({ error: 'Failed to get current dataset' });
  }
});

// Save current dataset
app.post('/api/current-dataset', (req, res) => {
  try {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: 'Invalid employees data' });
    }
    
    const datasetId = db.saveCurrentDataset(employees);
    res.json({ id: datasetId, message: 'Current dataset saved successfully' });
  } catch (error) {
    console.error('Error saving current dataset:', error);
    res.status(500).json({ error: 'Failed to save current dataset' });
  }
});

// Clear current dataset
app.delete('/api/current-dataset', (req, res) => {
  try {
    db.clearCurrentDataset();
    res.json({ message: 'Current dataset cleared successfully' });
  } catch (error) {
    console.error('Error clearing current dataset:', error);
    res.status(500).json({ error: 'Failed to clear current dataset' });
  }
});

// Update employee summary
app.patch('/api/current-dataset/employee/:name/summary', (req, res) => {
  try {
    const { name } = req.params;
    const { summary } = req.body;
    
    const currentDatasetId = db.getCurrentDatasetId();
    if (!currentDatasetId) {
      return res.status(404).json({ error: 'No current dataset found' });
    }
    
    db.updateEmployeeSummary(currentDatasetId, name, summary);
    res.json({ message: 'Employee summary updated successfully' });
  } catch (error) {
    console.error('Error updating employee summary:', error);
    res.status(500).json({ error: 'Failed to update employee summary' });
  }
});

// User Profile Routes

// Get active user profile
app.get('/api/user-profile', (req, res) => {
  try {
    const profile = db.getActiveUserProfile();
    res.json(profile || null);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Save user profile
app.post('/api/user-profile', (req, res) => {
  try {
    const { name, nip, gol, pangkat, position, subPosition } = req.body;
    
    if (!name || !nip || !gol || !pangkat || !position || !subPosition) {
      return res.status(400).json({ error: 'All fields are required: name, nip, gol, pangkat, position, subPosition' });
    }
    
    const profileId = db.saveUserProfile(name, nip, gol, pangkat, position, subPosition);
    res.json({ id: profileId, message: 'User profile saved successfully' });
  } catch (error) {
    console.error('Error saving user profile:', error);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

// Check if user profile exists
app.get('/api/user-profile/exists', (req, res) => {
  try {
    const exists = db.hasActiveUserProfile();
    res.json({ exists });
  } catch (error) {
    console.error('Error checking user profile:', error);
    res.status(500).json({ error: 'Failed to check user profile' });
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
    const { name, nip, gol, pangkat, position, subPosition } = req.body;
    
    if (!name || !nip || !gol || !pangkat || !position || !subPosition) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const employeeId = db.addEmployee(name, nip, gol, pangkat, position, subPosition);
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
    const { name, nip, gol, pangkat, position, subPosition } = req.body;
    
    if (!name || !nip || !gol || !pangkat || !position || !subPosition) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    db.updateEmployee(req.params.id, name, nip, gol, pangkat, position, subPosition);
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Performance Analyzer API is running' });
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

app.listen(port, () => {
  console.log(`Performance Analyzer API server running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET /api/health - Health check');
  console.log('  GET /api/datasets - Get all datasets');
  console.log('  GET /api/datasets/:id - Get specific dataset');
  console.log('  POST /api/datasets - Save new dataset');
  console.log('  DELETE /api/datasets/:id - Delete dataset');
  console.log('  GET /api/current-dataset - Get current active dataset');
  console.log('  POST /api/current-dataset - Save current dataset');
  console.log('  DELETE /api/current-dataset - Clear current dataset');
  console.log('  GET /api/user-profile - Get active user profile');
  console.log('  POST /api/user-profile - Save user profile');
  console.log('  GET /api/user-profile/exists - Check if user profile exists');
  console.log('  GET /api/employees - Get all employees');
  console.log('  GET /api/employees/:id - Get employee by ID');
  console.log('  POST /api/employees - Add single employee');
  console.log('  POST /api/employees/import-csv - Import employees from CSV');
  console.log('  PUT /api/employees/:id - Update employee');
  console.log('  DELETE /api/employees/:id - Delete employee');
  console.log('  GET /api/employees-count - Get employees count');
});

export default app;