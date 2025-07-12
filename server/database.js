import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteService {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Create database file in server directory
      const dbPath = join(__dirname, 'performance_analyzer.db');
      this.db = new Database(dbPath);
      
      // Create tables
      this.createTables();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  createTables() {
    // Create datasets table
    const createDatasetsTable = `
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create employees table
    const createEmployeesTable = `
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT,
        name TEXT NOT NULL,
        job TEXT,
        summary TEXT,
        FOREIGN KEY (dataset_id) REFERENCES datasets (id) ON DELETE CASCADE
      )
    `;

    // Create performance_scores table
    const createPerformanceTable = `
      CREATE TABLE IF NOT EXISTS performance_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        competency_name TEXT NOT NULL,
        score REAL NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
      )
    `;

    // Create current_dataset table for active dataset
    const createCurrentDatasetTable = `
      CREATE TABLE IF NOT EXISTS current_dataset (
        key TEXT PRIMARY KEY DEFAULT 'active',
        dataset_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets (id) ON DELETE SET NULL
      )
    `;

    // Create user_profile table (for single login user - admin/analyst)
    const createUserProfileTable = `
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nip TEXT NOT NULL,
        gol TEXT NOT NULL,
        pangkat TEXT NOT NULL,
        position TEXT NOT NULL,
        sub_position TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `;

    // Create employee_database table (for all employees data)
    const createEmployeeDatabaseTable = `
      CREATE TABLE IF NOT EXISTS employee_database (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nip TEXT NOT NULL,
        gol TEXT NOT NULL,
        pangkat TEXT NOT NULL,
        position TEXT NOT NULL,
        sub_position TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create manual_leadership_scores table (for Penilaian Pimpinan)
    const createManualLeadershipScoresTable = `
      CREATE TABLE IF NOT EXISTS manual_leadership_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT,
        employee_name TEXT NOT NULL,
        leadership_score REAL DEFAULT 80.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets (id) ON DELETE CASCADE,
        UNIQUE(dataset_id, employee_name)
      )
    `;

    this.db.exec(createDatasetsTable);
    this.db.exec(createEmployeesTable);
    this.db.exec(createPerformanceTable);
    this.db.exec(createCurrentDatasetTable);
    this.db.exec(createUserProfileTable);
    this.db.exec(createEmployeeDatabaseTable);
    this.db.exec(createManualLeadershipScoresTable);

    // Create indexes for better performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employees_dataset ON employees(dataset_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_performance_employee ON performance_scores(employee_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employee_database_nip ON employee_database(nip)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_manual_leadership_scores ON manual_leadership_scores(dataset_id, employee_name)');
  }

  // Save a new dataset
  saveDataset(name, employees) {
    const datasetId = Date.now().toString();
    
    const transaction = this.db.transaction(() => {
      // Insert dataset
      const insertDataset = this.db.prepare(`
        INSERT INTO datasets (id, name) VALUES (?, ?)
      `);
      insertDataset.run(datasetId, name);

      // Insert employees and their performance data
      const insertEmployee = this.db.prepare(`
        INSERT INTO employees (dataset_id, name, job, summary) VALUES (?, ?, ?, ?)
      `);
      const insertPerformance = this.db.prepare(`
        INSERT INTO performance_scores (employee_id, competency_name, score) VALUES (?, ?, ?)
      `);

      for (const employee of employees) {
        const result = insertEmployee.run(datasetId, employee.name, employee.job, employee.summary || null);
        const employeeId = result.lastInsertRowid;

        for (const performance of employee.performance) {
          insertPerformance.run(employeeId, performance.name, performance.score);
        }
      }
    });

    transaction();
    return datasetId;
  }

  // Get all datasets
  getAllDatasets() {
    const query = `
      SELECT d.*, COUNT(e.id) as employee_count
      FROM datasets d
      LEFT JOIN employees e ON d.id = e.dataset_id
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `;
    return this.db.prepare(query).all();
  }

  // Get a specific dataset with all employee data
  getDataset(datasetId) {
    const datasetQuery = this.db.prepare('SELECT * FROM datasets WHERE id = ?');
    const dataset = datasetQuery.get(datasetId);

    if (!dataset) return null;

    const employeesQuery = `
      SELECT e.*, ps.competency_name, ps.score
      FROM employees e
      LEFT JOIN performance_scores ps ON e.id = ps.employee_id
      WHERE e.dataset_id = ?
      ORDER BY e.name, ps.competency_name
    `;

    const rows = this.db.prepare(employeesQuery).all(datasetId);
    
    // Group performance data by employee
    const employeesMap = new Map();
    
    rows.forEach(row => {
      if (!employeesMap.has(row.id)) {
        employeesMap.set(row.id, {
          name: row.name,
          job: row.job,
          summary: row.summary,
          performance: []
        });
      }
      
      if (row.competency_name) {
        employeesMap.get(row.id).performance.push({
          name: row.competency_name,
          score: row.score
        });
      }
    });

    return {
      ...dataset,
      employees: Array.from(employeesMap.values())
    };
  }

  // Delete a dataset
  deleteDataset(datasetId) {
    const transaction = this.db.transaction(() => {
      // Delete performance scores
      this.db.prepare('DELETE FROM performance_scores WHERE employee_id IN (SELECT id FROM employees WHERE dataset_id = ?)').run(datasetId);
      // Delete employees
      this.db.prepare('DELETE FROM employees WHERE dataset_id = ?').run(datasetId);
      // Delete dataset
      this.db.prepare('DELETE FROM datasets WHERE id = ?').run(datasetId);
      // Clear current dataset if it matches
      this.db.prepare('UPDATE current_dataset SET dataset_id = NULL WHERE dataset_id = ?').run(datasetId);
    });

    transaction();
  }

  // Save current active dataset
  saveCurrentDataset(employees) {
    const datasetId = this.saveDataset(`Auto-save ${new Date().toLocaleString()}`, employees);
    
    // Update current dataset pointer
    const upsertCurrent = this.db.prepare(`
      INSERT OR REPLACE INTO current_dataset (key, dataset_id, updated_at) 
      VALUES ('active', ?, CURRENT_TIMESTAMP)
    `);
    upsertCurrent.run(datasetId);
    
    return datasetId;
  }

  // Get current active dataset
  getCurrentDataset() {
    const currentQuery = this.db.prepare('SELECT dataset_id FROM current_dataset WHERE key = ?');
    const current = currentQuery.get('active');
    
    if (!current || !current.dataset_id) {
      return { employees: [] };
    }
    
    return this.getDataset(current.dataset_id);
  }

  // Clear current dataset
  clearCurrentDataset() {
    this.db.prepare('UPDATE current_dataset SET dataset_id = NULL WHERE key = ?').run('active');
  }

  // Update employee summary
  updateEmployeeSummary(datasetId, employeeName, summary) {
    const updateSummary = this.db.prepare(`
      UPDATE employees 
      SET summary = ? 
      WHERE dataset_id = ? AND name = ?
    `);
    updateSummary.run(summary, datasetId, employeeName);
  }

  // Get current dataset ID
  getCurrentDatasetId() {
    const currentQuery = this.db.prepare('SELECT dataset_id FROM current_dataset WHERE key = ?');
    const current = currentQuery.get('active');
    return current?.dataset_id || null;
  }

  // User Profile Methods
  
  // Save user profile
  saveUserProfile(name, nip, gol, pangkat, position, subPosition) {
    // First, set all existing profiles to inactive
    this.db.prepare('UPDATE user_profile SET is_active = 0').run();
    
    // Insert new active profile
    const insertProfile = this.db.prepare(`
      INSERT INTO user_profile (name, nip, gol, pangkat, position, sub_position, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const result = insertProfile.run(name, nip, gol, pangkat, position, subPosition);
    return result.lastInsertRowid;
  }

  // Get active user profile
  getActiveUserProfile() {
    const query = this.db.prepare('SELECT * FROM user_profile WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
    return query.get();
  }

  // Check if user profile exists
  hasActiveUserProfile() {
    const profile = this.getActiveUserProfile();
    return !!profile;
  }

  // Employee Database Methods

  // Add single employee
  addEmployee(name, nip, gol, pangkat, position, subPosition) {
    const insertEmployee = this.db.prepare(`
      INSERT INTO employee_database (name, nip, gol, pangkat, position, sub_position) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insertEmployee.run(name, nip, gol, pangkat, position, subPosition);
    return result.lastInsertRowid;
  }

  // Import employees from CSV data
  importEmployeesFromCSV(employeesData) {
    const transaction = this.db.transaction(() => {
      // Clear existing data
      this.db.prepare('DELETE FROM employee_database').run();
      
      // Insert new data
      const insertEmployee = this.db.prepare(`
        INSERT INTO employee_database (name, nip, gol, pangkat, position, sub_position) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const emp of employeesData) {
        insertEmployee.run(emp.name, emp.nip, emp.gol, emp.pangkat, emp.position, emp.subPosition);
      }
    });
    
    transaction();
    return employeesData.length;
  }

  // Get all employees
  getAllEmployees() {
    const query = this.db.prepare('SELECT * FROM employee_database ORDER BY name');
    return query.all();
  }

  // Get employee by ID
  getEmployeeById(id) {
    const query = this.db.prepare('SELECT * FROM employee_database WHERE id = ?');
    return query.get(id);
  }

  // Update employee
  updateEmployee(id, name, nip, gol, pangkat, position, subPosition) {
    const updateEmployee = this.db.prepare(`
      UPDATE employee_database 
      SET name = ?, nip = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateEmployee.run(name, nip, gol, pangkat, position, subPosition, id);
  }

  // Delete employee
  deleteEmployee(id) {
    const deleteEmployee = this.db.prepare('DELETE FROM employee_database WHERE id = ?');
    deleteEmployee.run(id);
  }

  // Get employees count
  getEmployeesCount() {
    const query = this.db.prepare('SELECT COUNT(*) as count FROM employee_database');
    return query.get().count;
  }

  // Manual Leadership Scores Methods

  // Set manual leadership score for an employee
  setManualLeadershipScore(datasetId, employeeName, score) {
    const upsertScore = this.db.prepare(`
      INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, leadership_score, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    upsertScore.run(datasetId, employeeName, score);
  }

  // Get manual leadership score for an employee
  getManualLeadershipScore(datasetId, employeeName) {
    const query = this.db.prepare(`
      SELECT leadership_score FROM manual_leadership_scores 
      WHERE dataset_id = ? AND employee_name = ?
    `);
    const result = query.get(datasetId, employeeName);
    return result ? result.leadership_score : 80.0; // Default to 80
  }

  // Get all manual leadership scores for a dataset
  getAllManualLeadershipScores(datasetId) {
    const query = this.db.prepare(`
      SELECT employee_name, leadership_score FROM manual_leadership_scores 
      WHERE dataset_id = ?
    `);
    const results = query.all(datasetId);
    
    // Convert to object for easier access
    const scores = {};
    results.forEach(row => {
      scores[row.employee_name] = row.leadership_score;
    });
    
    return scores;
  }

  // Bulk update manual leadership scores
  bulkUpdateManualLeadershipScores(datasetId, scoresObject) {
    const transaction = this.db.transaction(() => {
      const upsertScore = this.db.prepare(`
        INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, leadership_score, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      for (const [employeeName, score] of Object.entries(scoresObject)) {
        upsertScore.run(datasetId, employeeName, score);
      }
    });
    
    transaction();
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default SQLiteService;