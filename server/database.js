import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteService {
  constructor(customDbPath = null) {
    this.db = null;
    this.customDbPath = customDbPath;
    this.init();
  }

  init() {
    try {
      // Create database file in custom path or server directory
      const dbPath = this.customDbPath || join(__dirname, 'performance_analyzer.db');
      this.db = new Database(dbPath);
      console.log('Database initialized at:', dbPath);
      
      // Create tables
      this.createTables();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  createTables() {
    // Create unified employee_data table with timestamps
    const createEmployeeDataTable = `
      CREATE TABLE IF NOT EXISTS employee_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        upload_session TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        job_title TEXT,
        competency_name TEXT NOT NULL,
        competency_score REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create upload_sessions table for metadata
    const createUploadSessionsTable = `
      CREATE TABLE IF NOT EXISTS upload_sessions (
        session_id TEXT PRIMARY KEY,
        session_name TEXT,
        upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        employee_count INTEGER DEFAULT 0,
        competency_count INTEGER DEFAULT 0
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
        organizational_level TEXT DEFAULT 'Staff/Other',
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

    // Execute new table creation
    this.db.exec(createEmployeeDataTable);
    this.db.exec(createUploadSessionsTable);
    
    this.db.exec(createCurrentDatasetTable);
    this.db.exec(createEmployeeDatabaseTable);
    this.db.exec(createManualLeadershipScoresTable);

    // Create indexes for better performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_session ON employee_data(upload_session)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_timestamp ON employee_data(upload_timestamp)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_name ON employee_data(employee_name)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_upload_sessions_timestamp ON upload_sessions(upload_timestamp)');
    
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_employee_database_nip ON employee_database(nip)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_manual_leadership_scores ON manual_leadership_scores(dataset_id, employee_name)');
  }


  // Employee Database Methods

  // Add single employee
  addEmployee(name, nip, gol, pangkat, position, subPosition, organizationalLevel = 'Staff/Other') {
    const insertEmployee = this.db.prepare(`
      INSERT INTO employee_database (name, nip, gol, pangkat, position, sub_position, organizational_level) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertEmployee.run(name, nip, gol, pangkat, position, subPosition, organizationalLevel);
    return result.lastInsertRowid;
  }

  // Import employees from CSV data
  importEmployeesFromCSV(employeesData) {
    const transaction = this.db.transaction(() => {
      const insertEmployee = this.db.prepare(`
        INSERT INTO employee_database (name, nip, gol, pangkat, position, sub_position, organizational_level) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const updateEmployee = this.db.prepare(`
        UPDATE employee_database 
        SET name = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, organizational_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE nip = ?
      `);
      const updateEmployeeByName = this.db.prepare(`
        UPDATE employee_database 
        SET nip = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, organizational_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `);
      const findEmployeeByNip = this.db.prepare('SELECT id FROM employee_database WHERE nip = ?');
      const findEmployeeByName = this.db.prepare('SELECT id FROM employee_database WHERE name = ?');

      for (const emp of employeesData) {
        let organizationalLevel = 'Staff/Other';
        if (emp.gol) {
          const romanNumeral = emp.gol.split('/')[0];
          if (romanNumeral === 'IV') {
            organizationalLevel = 'Eselon IV';
          } else if (romanNumeral === 'III') {
            organizationalLevel = 'Eselon III';
          }
        }

        let existingEmployee = null;
        if (emp.nip && emp.nip !== '-') {
          existingEmployee = findEmployeeByNip.get(emp.nip);
        }
        
        if (existingEmployee) {
          updateEmployee.run(
            emp.name, 
            emp.gol, 
            emp.pangkat || '-', 
            emp.position || '-', 
            emp.subPosition || '-', 
            organizationalLevel,
            emp.nip
          );
        } else {
          // If NIP is not available or not found, try to find by name
          existingEmployee = findEmployeeByName.get(emp.name);
          if (existingEmployee) {
            updateEmployeeByName.run(
              emp.nip || '-', 
              emp.gol, 
              emp.pangkat || '-', 
              emp.position || '-', 
              emp.subPosition || '-', 
              organizationalLevel,
              emp.name
            );
          } else {
            insertEmployee.run(
              emp.name, 
              emp.nip || '-', 
              emp.gol, 
              emp.pangkat || '-', 
              emp.position || '-', 
              emp.subPosition || '-', 
              organizationalLevel
            );
          }
        }
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
  updateEmployee(id, name, nip, gol, pangkat, position, subPosition, organizationalLevel = 'Staff/Other') {
    const updateEmployee = this.db.prepare(`
      UPDATE employee_database 
      SET name = ?, nip = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, organizational_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateEmployee.run(name, nip, gol, pangkat, position, subPosition, organizationalLevel, id);
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

  // Get employee suggestions by fuzzy match
  getEmployeeSuggestions(searchName, limit = 5) {
    const all = this.getAllEmployees();
    const normalize = (name) => name.toLowerCase().replace(/[.,\-_]/g, '').replace(/\s+/g, ' ').trim();
    const target = normalize(searchName);

    const distance = (a, b) => {
      const m = [];
      for (let i = 0; i <= b.length; i++) m[i] = [i];
      for (let j = 0; j <= a.length; j++) m[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) m[i][j] = m[i - 1][j - 1];
          else m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
        }
      }
      return m[b.length][a.length];
    };

    const scored = all.map(emp => {
      const norm = normalize(emp.name);
      const dist = distance(target, norm);
      const maxLen = Math.max(target.length, norm.length);
      const similarity = (maxLen - dist) / maxLen;
      return { ...emp, similarity };
    }).filter(e => e.similarity >= 0.4) // lower threshold to broaden suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(e => ({ name: e.name, organizational_level: e.organizational_level, similarity: Number(e.similarity.toFixed(3)) }));
    return scored;
  }

  // Get employee organizational level mapping
  getEmployeeOrgLevelMapping() {
    const query = this.db.prepare('SELECT name, organizational_level FROM employee_database');
    const results = query.all();
    
    // Convert to object for easier access
    const mapping = {};
    results.forEach(row => {
      mapping[row.name] = row.organizational_level;
    });
    
    return mapping;
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


  // New unified data methods
  
  // Save employee data with timestamp
  saveEmployeeData(employees, sessionName = null) {
    const sessionId = Date.now().toString();
    const timestamp = new Date().toISOString();
    const finalSessionName = sessionName || `Upload ${new Date().toLocaleString()}`;
    
    const transaction = this.db.transaction(() => {
      // Insert upload session
      const insertSession = this.db.prepare(`
        INSERT INTO upload_sessions (session_id, session_name, upload_timestamp) 
        VALUES (?, ?, ?)
      `);
      insertSession.run(sessionId, finalSessionName, timestamp);
      
      // Insert employee data
      const insertData = this.db.prepare(`
        INSERT INTO employee_data 
        (upload_session, upload_timestamp, employee_name, job_title, competency_name, competency_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const employee of employees) {
        for (const performance of employee.performance) {
          insertData.run(
            sessionId,
            timestamp,
            employee.name,
            employee.job,
            performance.name,
            performance.score
          );
        }
      }
      
      // Update session metadata
      const updateSession = this.db.prepare(`
        UPDATE upload_sessions 
        SET employee_count = ?, competency_count = ?
        WHERE session_id = ?
      `);
      
      const employeeCount = employees.length;
      const competencyCount = employees.reduce((sum, emp) => sum + emp.performance.length, 0);
      updateSession.run(employeeCount, competencyCount, sessionId);
    });
    
    transaction();
    return sessionId;
  }
  
  // Get all upload sessions
  getAllUploadSessions() {
    const query = `
      SELECT * FROM upload_sessions 
      ORDER BY upload_timestamp DESC
    `;
    return this.db.prepare(query).all();
  }
  
  // Get employee data by timestamp range
  getEmployeeDataByTimeRange(startTime = null, endTime = null) {
    let query = `
      SELECT ed.*, us.session_name
      FROM employee_data ed
      JOIN upload_sessions us ON ed.upload_session = us.session_id
    `;
    const params = [];
    
    if (startTime && endTime) {
      query += ' WHERE ed.upload_timestamp BETWEEN ? AND ?';
      params.push(startTime, endTime);
    } else if (startTime) {
      query += ' WHERE ed.upload_timestamp >= ?';
      params.push(startTime);
    } else if (endTime) {
      query += ' WHERE ed.upload_timestamp <= ?';
      params.push(endTime);
    }
    
    query += ' ORDER BY ed.upload_timestamp DESC, ed.employee_name, ed.competency_name';
    
    const rows = this.db.prepare(query).all(...params);
    
    // Group by employee
    const employeesMap = new Map();
    
    rows.forEach(row => {
      const key = `${row.employee_name}_${row.upload_session}`;
      if (!employeesMap.has(key)) {
        employeesMap.set(key, {
          name: row.employee_name,
          job: row.job_title,
          uploadSession: row.upload_session,
          uploadTimestamp: row.upload_timestamp,
          sessionName: row.session_name,
          performance: []
        });
      }
      
      employeesMap.get(key).performance.push({
        name: row.competency_name,
        score: row.competency_score
      });
    });
    
    return Array.from(employeesMap.values());
  }
  
  // Get latest employee data (current active dataset equivalent)
  getLatestEmployeeData() {
    // Get the most recent upload session
    const latestSession = this.db.prepare(`
      SELECT session_id FROM upload_sessions 
      ORDER BY upload_timestamp DESC LIMIT 1
    `).get();
    
    if (!latestSession) {
      return [];
    }
    
    return this.getEmployeeDataBySession(latestSession.session_id);
  }
  
  // Get employee data by session
  getEmployeeDataBySession(sessionId) {
    const query = `
      SELECT ed.*, us.session_name
      FROM employee_data ed
      JOIN upload_sessions us ON ed.upload_session = us.session_id
      WHERE ed.upload_session = ?
      ORDER BY ed.employee_name, ed.competency_name
    `;
    
    const rows = this.db.prepare(query).all(sessionId);
    
    // Group by employee
    const employeesMap = new Map();
    
    rows.forEach(row => {
      if (!employeesMap.has(row.employee_name)) {
        employeesMap.set(row.employee_name, {
          name: row.employee_name,
          job: row.job_title,
          uploadSession: row.upload_session,
          uploadTimestamp: row.upload_timestamp,
          sessionName: row.session_name,
          performance: []
        });
      }
      
      employeesMap.get(row.employee_name).performance.push({
        name: row.competency_name,
        score: row.competency_score
      });
    });
    
    return Array.from(employeesMap.values());
  }
  
  // Delete session and all its data
  deleteUploadSession(sessionId) {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM employee_data WHERE upload_session = ?').run(sessionId);
      this.db.prepare('DELETE FROM upload_sessions WHERE session_id = ?').run(sessionId);
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