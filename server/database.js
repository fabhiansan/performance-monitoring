import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Enhanced import with error handling for better-sqlite3
let Database;
let nativeModuleError = null;

try {
  // Attempt to import better-sqlite3
  const betterSqlite3 = await import('better-sqlite3');
  Database = betterSqlite3.default;
  
  // Test basic functionality
  if (typeof Database !== 'function') {
    throw new Error('better-sqlite3 import failed: Database is not a constructor function');
  }
  
  console.log('✅ better-sqlite3 loaded successfully');
} catch (error) {
  nativeModuleError = error;
  console.error('❌ Failed to load better-sqlite3:', error.message);
  
  // Determine the likely cause of the error
  let errorType = 'unknown';
  let suggestions = [];
  
  if (error.message.includes('MODULE_NOT_FOUND') || error.message.includes('Cannot find module')) {
    errorType = 'missing-module';
    suggestions.push('Run "npm install" to install missing dependencies');
    suggestions.push('Verify better-sqlite3 is listed in package.json dependencies');
  } else if (error.message.includes('node-gyp') || error.message.includes('binding') || error.message.includes('rebuild')) {
    errorType = 'compilation-error';
    suggestions.push('Run "npm run rebuild:native" to rebuild native modules');
    suggestions.push('Ensure you have build tools installed (Visual Studio Build Tools on Windows)');
    suggestions.push('Try running "npm rebuild better-sqlite3"');
  } else if (error.message.includes('electron') || error.message.includes('version')) {
    errorType = 'version-mismatch';
    suggestions.push('Run "npm run rebuild:electron" to rebuild for Electron');
    suggestions.push('Verify Electron and Node.js versions are compatible');
  } else if (error.message.includes('permission') || error.message.includes('access')) {
    errorType = 'permission-error';
    suggestions.push('Check file permissions in node_modules directory');
    suggestions.push('Run with elevated privileges if necessary');
  }
  
  nativeModuleError.type = errorType;
  nativeModuleError.suggestions = suggestions;
  
  console.error(`Error type: ${errorType}`);
  console.error('Suggested fixes:');
  suggestions.forEach(s => console.error(`  • ${s}`));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SQLiteService {
  constructor(customDbPath = null) {
    this.db = null;
    this.customDbPath = customDbPath;
    this.isInitialized = false;
    this.initError = null;
    this.init();
  }

  init() {
    try {
      // Check if better-sqlite3 is available
      if (nativeModuleError) {
        this.initError = nativeModuleError;
        console.error('Cannot initialize database: better-sqlite3 module failed to load');
        console.error('Error details:', nativeModuleError.message);
        console.error('Error type:', nativeModuleError.type);
        console.error('Suggestions:', nativeModuleError.suggestions);
        
        // Don't throw immediately, allow server to start and show error to user
        return;
      }
      
      if (!Database) {
        this.initError = new Error('Database constructor not available');
        console.error('Cannot initialize database: Database constructor is null');
        return;
      }
      
      // Create database file in custom path or server directory
      const dbPath = this.customDbPath || join(__dirname, 'performance_analyzer.db');
      
      console.log('Attempting to create database at:', dbPath);
      console.log('Database path exists:', existsSync(dirname(dbPath)));
      
      // Test database creation with error handling
      try {
        this.db = new Database(dbPath);
        console.log('✅ Database connection established at:', dbPath);
      } catch (dbError) {
        console.error('❌ Database creation failed:', dbError.message);
        
        // Analyze database creation error
        if (dbError.message.includes('SQLITE_CANTOPEN')) {
          this.initError = new Error(`Cannot open database file. Check write permissions to: ${dirname(dbPath)}`);
        } else if (dbError.message.includes('better-sqlite3')) {
          this.initError = new Error(`Native module error during database creation: ${dbError.message}`);
        } else {
          this.initError = dbError;
        }
        
        console.error('Database initialization failed with error:', this.initError.message);
        return;
      }
      
      // Create tables
      this.createTables();
      
      // Attempt migration from backup database if it exists
      const backupPath = dbPath + '.backup';
      this.migrateFromOldSchema(backupPath);
      
      this.isInitialized = true;
      console.log('✅ SQLite database initialized successfully');
    } catch (error) {
      this.initError = error;
      console.error('❌ Failed to initialize database:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Provide specific error guidance
      if (error.message.includes('better-sqlite3')) {
        console.error('\n🔧 This appears to be a native module compilation issue.');
        console.error('Try running: npm run rebuild:native');
      }
      
      // Don't throw error to allow server to start and show user-friendly error
    }
  }

  // Check if database is ready for operations
  isReady() {
    return this.isInitialized && this.db && !this.initError;
  }

  // Get initialization error details
  getInitError() {
    return this.initError;
  }

  // Wrapper method to check database availability before operations
  requireDatabase() {
    if (!this.isReady()) {
      const errorMsg = this.initError 
        ? `Database not available: ${this.initError.message}`
        : 'Database not initialized';
      throw new Error(errorMsg);
    }
    return this.db;
  }

  createTables() {
    try {
      // During initialization, use this.db directly instead of requireDatabase()
      const db = this.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      // Create unified employee_data table with timestamps
      const createEmployeeDataTable = `
        CREATE TABLE IF NOT EXISTS employee_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          upload_session TEXT NOT NULL,
          employee_name TEXT NOT NULL,
          job_title TEXT,
          organizational_level TEXT DEFAULT 'Staff/Other',
          competency_name TEXT NOT NULL,
          competency_score REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Add organizational_level column if it doesn't exist (for existing databases)
      try {
        db.exec('ALTER TABLE employee_data ADD COLUMN organizational_level TEXT DEFAULT "Staff/Other"');
      } catch (e) {
        // Column already exists or other error - ignore
      }

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
        FOREIGN KEY (dataset_id) REFERENCES upload_sessions (session_id) ON DELETE SET NULL
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
        FOREIGN KEY (dataset_id) REFERENCES upload_sessions (session_id) ON DELETE CASCADE,
        UNIQUE(dataset_id, employee_name)
      )
    `;

    // Handle existing databases with wrong foreign key references
    try {
      // Drop existing tables with wrong foreign keys if they exist
      this.db.exec('DROP TABLE IF EXISTS manual_leadership_scores');
      this.db.exec('DROP TABLE IF EXISTS current_dataset');
    } catch (e) {
      // Tables might not exist - ignore
    }

      // Execute table creation in dependency order
      db.exec(createEmployeeDataTable);
      db.exec(createUploadSessionsTable);
      db.exec(createEmployeeDatabaseTable);
      
      // Tables with foreign keys must be created after their referenced tables
      db.exec(createCurrentDatasetTable);
      db.exec(createManualLeadershipScoresTable);

      // Create indexes for better performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_session ON employee_data(upload_session)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_timestamp ON employee_data(upload_timestamp)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_employee_data_name ON employee_data(employee_name)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_upload_sessions_timestamp ON upload_sessions(upload_timestamp)');
      
      db.exec('CREATE INDEX IF NOT EXISTS idx_employee_database_nip ON employee_database(nip)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_manual_leadership_scores ON manual_leadership_scores(dataset_id, employee_name)');
      
      console.log('✅ Database tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create database tables:', error.message);
      throw error;
    }
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

  // Current Dataset Methods

  // Get current active dataset ID
  getCurrentDatasetId() {
    // First try to get from current_dataset table
    const currentDataset = this.db.prepare(`
      SELECT dataset_id FROM current_dataset WHERE key = 'active'
    `).get();
    
    if (currentDataset && currentDataset.dataset_id) {
      return currentDataset.dataset_id;
    }
    
    // Fall back to latest upload session if no current dataset set
    const latestSession = this.db.prepare(`
      SELECT session_id FROM upload_sessions 
      ORDER BY upload_timestamp DESC LIMIT 1
    `).get();
    
    return latestSession ? latestSession.session_id : null;
  }

  // Set current active dataset ID
  setCurrentDatasetId(datasetId) {
    const upsertCurrentDataset = this.db.prepare(`
      INSERT OR REPLACE INTO current_dataset (key, dataset_id, updated_at) 
      VALUES ('active', ?, CURRENT_TIMESTAMP)
    `);
    upsertCurrentDataset.run(datasetId);
  }

  // Clear current dataset
  clearCurrentDataset() {
    const clearDataset = this.db.prepare(`
      DELETE FROM current_dataset WHERE key = 'active'
    `);
    clearDataset.run();
  }

  // Migration helper for databases with wrong foreign key references
  migrateFromOldSchema(backupDbPath) {
    if (!backupDbPath || !existsSync(backupDbPath)) {
      console.log('No backup database found for migration');
      return;
    }

    try {
          console.log('Starting migration from old database schema...');
          // The following functions are not defined in the current file and will need to be added.
          // migrateUploadSessions();
          // migrateEmployeeData();
          // migrateEmployees();
          this.migrateUploadSessions(backupDbPath);
          this.migrateEmployeeData(backupDbPath);
          this.migrateEmployees(backupDbPath);
          console.log('✅ Migration from old schema completed successfully');
        } catch (error) {
          console.error('Migration failed:', error);
        }
  }


  migrateUploadSessions(backupDbPath) {
    const backupDb = new Database(backupDbPath, { readonly: true });
    const sessions = backupDb.prepare('SELECT * FROM upload_sessions').all();

    const insertSession = this.db.prepare(`
      INSERT OR IGNORE INTO upload_sessions (session_id, session_name, upload_timestamp, employee_count, competency_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const session of sessions) {
        insertSession.run(session.session_id, session.session_name, session.upload_timestamp, session.employee_count, session.competency_count);
      }
    })();

    console.log(`Migrated ${sessions.length} upload sessions.`);
    backupDb.close();
  }

  migrateEmployeeData(backupDbPath) {
    const backupDb = new Database(backupDbPath, { readonly: true });
    const data = backupDb.prepare('SELECT * FROM employee_data').all();

    const insertData = this.db.prepare(`
      INSERT OR IGNORE INTO employee_data (id, upload_timestamp, upload_session, employee_name, job_title, organizational_level, competency_name, competency_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const row of data) {
        insertData.run(row.id, row.upload_timestamp, row.upload_session, row.employee_name, row.job_title, row.organizational_level, row.competency_name, row.competency_score, row.created_at);
      }
    })();

    console.log(`Migrated ${data.length} employee data records.`);
    backupDb.close();
  }

  migrateEmployees(backupDbPath) {
    const backupDb = new Database(backupDbPath, { readonly: true });
    const employees = backupDb.prepare('SELECT * FROM employee_database').all();

    const insertEmployee = this.db.prepare(`
      INSERT OR IGNORE INTO employee_database (id, name, nip, gol, pangkat, position, sub_position, organizational_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const emp of employees) {
        insertEmployee.run(emp.id, emp.name, emp.nip, emp.gol, emp.pangkat, emp.position, emp.sub_position, emp.organizational_level, emp.created_at, emp.updated_at);
      }
    })();

    console.log(`Migrated ${employees.length} employees from master data.`);
    backupDb.close();
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
        (upload_session, upload_timestamp, employee_name, job_title, organizational_level, competency_name, competency_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const employee of employees) {
        for (const performance of employee.performance) {
          insertData.run(
            sessionId,
            timestamp,
            employee.name,
            employee.job,
            employee.organizational_level || 'Staff/Other',
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
    
    // Set this session as the current dataset
    this.setCurrentDatasetId(sessionId);
    
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
      SELECT ed.*, us.session_name, edb.organizational_level
      FROM employee_data ed
      JOIN upload_sessions us ON ed.upload_session = us.session_id
      LEFT JOIN employee_database edb ON ed.employee_name = edb.name
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
          organizational_level: row.organizational_level || 'Staff/Other', // Use organizational level from employee_database
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
          organizational_level: row.organizational_level || 'Staff/Other', // Use stored organizational level from employee_data
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
    try {
      if (this.db) {
        this.db.close();
        console.log('✅ Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database:', error.message);
    }
  }
  
  // Method to get detailed error information for troubleshooting
  getDiagnosticInfo() {
    return {
      isReady: this.isReady(),
      isInitialized: this.isInitialized,
      hasDatabase: !!this.db,
      hasError: !!this.initError,
      errorDetails: this.initError ? {
        message: this.initError.message,
        type: this.initError.type || 'unknown',
        suggestions: this.initError.suggestions || [],
        stack: this.initError.stack
      } : null,
      nativeModuleAvailable: !nativeModuleError,
      nativeModuleError: nativeModuleError ? {
        message: nativeModuleError.message,
        type: nativeModuleError.type,
        suggestions: nativeModuleError.suggestions
      } : null
    };
  }
}

// Export both the class and error information for health checks
export default SQLiteService;
export { nativeModuleError };