import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class SQLiteService {
  constructor(dbPath = null) {
    this.db = null;
    this.isInitialized = false;
    this.errorDetails = null;
    
    // Use environment variable first, then constructor parameter, finally default path
    this.dbPath = process.env.DATABASE_PATH || 
                  dbPath || 
                  path.join(process.cwd(), 'server', 'performance_analyzer.db');
    
    console.log(`📊 Database path resolved to: ${this.dbPath}`);
    
    // Note: initialize() will be called explicitly by the server
  }

  async validateAndPrepareDirectory(dbDir) {
    try {
      // Check if path is a symbolic link
      let realPath;
      try {
        realPath = fs.realpathSync(dbDir);
        if (realPath !== dbDir) {
          console.log(`🔗 Directory is a symbolic link: ${dbDir} -> ${realPath}`);
          // Continue with real path for validation
          dbDir = realPath;
        }
      } catch (symlinkError) {
        // Path doesn't exist yet, which is fine
      }

      // Check if directory exists
      if (!fs.existsSync(dbDir)) {
        console.log(`📂 Creating database directory: ${dbDir}`);
        
        // Check parent directory permissions before creation
        const parentDir = path.dirname(dbDir);
        if (fs.existsSync(parentDir)) {
          try {
            fs.accessSync(parentDir, fs.constants.W_OK);
            console.log(`✅ Parent directory is writable: ${parentDir}`);
          } catch (parentAccessError) {
            console.error(`❌ Parent directory is not writable: ${parentAccessError.message}`);
            throw new Error(`Parent directory not writable: ${parentAccessError.message}`);
          }
        }
        
        try {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`✅ Database directory created successfully`);
        } catch (dirError) {
          console.error(`❌ Failed to create database directory: ${dirError.message}`);
          throw new Error(`Cannot create database directory: ${dirError.message}`);
        }
      }

      // Enhanced directory validation
      const stats = fs.statSync(dbDir);
      
      // Check if it's actually a directory
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dbDir}`);
      }

      // Check for network drives (basic detection)
      if (process.platform === 'win32' && dbDir.startsWith('\\\\')) {
        console.log(`⚠️ Network drive detected: ${dbDir}`);
        console.log(`⚠️ Network drives may have reliability issues`);
      }

      // Test actual file operations instead of just checking access flags
      const testFilePath = path.join(dbDir, '.db-test-' + Date.now());
      try {
        // Test file creation
        fs.writeFileSync(testFilePath, 'test');
        console.log(`✅ File creation test successful`);
        
        // Test file reading
        const content = fs.readFileSync(testFilePath, 'utf8');
        if (content !== 'test') {
          throw new Error('File read test failed - content mismatch');
        }
        console.log(`✅ File read test successful`);
        
        // Test file deletion
        fs.unlinkSync(testFilePath);
        console.log(`✅ File deletion test successful`);
        
      } catch (testError) {
        // Clean up test file if it exists
        try {
          if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up test file: ${cleanupError.message}`);
        }
        
        console.error(`❌ Directory operation test failed: ${testError.message}`);
        throw new Error(`Directory not suitable for database operations: ${testError.message}`);
      }

      // Final access check as backup
      try {
        fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`✅ Directory access validation successful`);
      } catch (accessError) {
        console.error(`❌ Directory access validation failed: ${accessError.message}`);
        throw new Error(`Directory access validation failed: ${accessError.message}`);
      }

      console.log(`✅ Enhanced directory validation completed for: ${dbDir}`);
      
    } catch (error) {
      console.error(`❌ Directory validation failed: ${error.message}`);
      throw error;
    }
  }

  categorizeError(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('node_module_version') || 
        errorMessage.includes('was compiled against')) {
      return {
        type: 'version-mismatch',
        description: 'Native module compiled for different Node.js version',
        solution: 'Run npm run rebuild:native'
      };
    }
    
    if (errorMessage.includes('cannot find module') || 
        errorMessage.includes('module not found')) {
      return {
        type: 'missing-module',
        description: 'better-sqlite3 module not found or not installed',
        solution: 'Run npm install better-sqlite3'
      };
    }
    
    if (errorMessage.includes('gyp') || 
        errorMessage.includes('binding') || 
        errorMessage.includes('rebuild')) {
      return {
        type: 'compilation-error',
        description: 'Native module compilation failed',
        solution: 'Install build tools and run npm run rebuild:electron'
      };
    }
    
    if (errorMessage.includes('permission') || 
        errorMessage.includes('eacces') ||
        errorMessage.includes('eperm')) {
      return {
        type: 'permission-error',
        description: 'File permission issues with database location',
        solution: 'Check database directory permissions or run with appropriate privileges'
      };
    }
    
    if (errorMessage.includes('enoent') || 
        errorMessage.includes('no such file') ||
        errorMessage.includes('cannot open database')) {
      return {
        type: 'path-error',
        description: 'Database path not accessible or directory does not exist',
        solution: 'Verify database directory exists and is writable'
      };
    }
    
    if (errorMessage.includes('enospc') || 
        errorMessage.includes('no space left')) {
      return {
        type: 'disk-space-error',
        description: 'Insufficient disk space for database file',
        solution: 'Free up disk space and try again'
      };
    }
    
    if (errorMessage.includes('readonly') || 
        errorMessage.includes('read-only')) {
      return {
        type: 'readonly-error',
        description: 'Database directory is read-only in packaged environment',
        solution: 'Database should be moved to user data directory'
      };
    }
    
    return {
      type: 'unknown-error',
      description: 'Unknown database initialization error',
      solution: 'Check logs and run npm run check:native for diagnostics'
    };
  }

  async initialize() {
    try {
      // Validate and prepare database path
      console.log(`🔍 Initializing database at: ${this.dbPath}`);
      
      const dbDir = path.dirname(this.dbPath);
      console.log(`📁 Database directory: ${dbDir}`);
      
      // Enhanced directory validation
      await this.validateAndPrepareDirectory(dbDir);

      // Attempt to initialize better-sqlite3
      console.log(`📊 Creating SQLite database connection...`);
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        fileMustExist: false // Allow creation of new database files
      });
      
      // Test the connection
      console.log(`🔗 Testing database connection...`);
      this.db.exec('SELECT 1');
      console.log(`✅ Database connection test successful`);
      
      // Initialize database schema
      console.log(`🏗️ Initializing database schema...`);
      this.initializeSchema();
      console.log(`✅ Database schema initialized successfully`);
      
      this.isInitialized = true;
      console.log('✅ Database initialization completed successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      
      this.errorDetails = this.categorizeError(error);
      
      // Log detailed error information including path context
      console.error('Error details:', {
        type: this.errorDetails.type,
        description: this.errorDetails.description,
        solution: this.errorDetails.solution,
        databasePath: this.dbPath,
        originalError: error.message,
        environmentPath: process.env.DATABASE_PATH || 'not set'
      });
      
      // Send structured error to stderr for Electron to capture
      if (process.stderr) {
        process.stderr.write(JSON.stringify({
          type: 'database-error',
          details: {
            ...this.errorDetails,
            databasePath: this.dbPath,
            environmentPath: process.env.DATABASE_PATH || 'not set'
          },
          timestamp: new Date().toISOString()
        }) + '\n');
      }
      
      throw error; // Re-throw to prevent server startup
    }
  }

  initializeSchema() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS upload_sessions (
        session_id TEXT PRIMARY KEY,
        session_name TEXT,
        upload_timestamp TEXT,
        employee_count INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS employee_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        name TEXT,
        nip TEXT,
        gol TEXT,
        pangkat TEXT,
        position TEXT,
        sub_position TEXT,
        organizational_level TEXT,
        upload_timestamp TEXT,
        FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id)
      );
      
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        nip TEXT,
        gol TEXT,
        pangkat TEXT,
        position TEXT,
        sub_position TEXT,
        organizational_level TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS manual_leadership_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT,
        employee_name TEXT,
        score REAL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Upload session methods
  saveEmployeeData(employees, sessionName = null) {
    const sessionId = Date.now().toString();
    const uploadTime = new Date().toISOString();
    const finalSessionName = sessionName || `Upload ${new Date().toLocaleString()}`;
    
    const insertSession = this.db.prepare(`
      INSERT INTO upload_sessions (session_id, session_name, upload_timestamp, employee_count)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertEmployee = this.db.prepare(`
      INSERT INTO employee_data (session_id, name, nip, gol, pangkat, position, sub_position, organizational_level, upload_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction(() => {
      insertSession.run(sessionId, finalSessionName, uploadTime, employees.length);
      
      for (const employee of employees) {
        insertEmployee.run(
          sessionId,
          employee.name || '',
          employee.nip || '',
          employee.gol || '',
          employee.pangkat || '',
          employee.position || '',
          employee.subPosition || '',
          employee.organizationalLevel || '',
          uploadTime
        );
      }
    });
    
    transaction();
    return sessionId;
  }

  getAllUploadSessions() {
    console.log('getAllUploadSessions called');
    console.log('Database ready:', this.isReady());
    console.log('Database object:', !!this.db);
    
    try {
      const stmt = this.db.prepare(`
        SELECT session_id, session_name, upload_timestamp, employee_count
        FROM upload_sessions
        ORDER BY upload_timestamp DESC
      `);
      const result = stmt.all();
      console.log('Query result:', result);
      return result;
    } catch (error) {
      console.error('Error in getAllUploadSessions:', error);
      throw error;
    }
  }

  getEmployeeDataBySession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM employee_data
      WHERE session_id = ?
      ORDER BY name
    `);
    return stmt.all(sessionId);
  }

  getEmployeeDataByTimeRange(startTime, endTime) {
    const stmt = this.db.prepare(`
      SELECT * FROM employee_data
      WHERE upload_timestamp BETWEEN ? AND ?
      ORDER BY upload_timestamp DESC, name
    `);
    return stmt.all(startTime, endTime);
  }

  getLatestEmployeeData() {
    const latestSession = this.db.prepare(`
      SELECT session_id as id FROM upload_sessions
      ORDER BY upload_timestamp DESC
      LIMIT 1
    `).get();
    
    if (!latestSession) return [];
    
    return this.getEmployeeDataBySession(latestSession.id);
  }

  deleteUploadSession(sessionId) {
    const deleteEmployees = this.db.prepare('DELETE FROM employee_data WHERE session_id = ?');
    const deleteSession = this.db.prepare('DELETE FROM upload_sessions WHERE session_id = ?');
    
    const transaction = this.db.transaction(() => {
      deleteEmployees.run(sessionId);
      deleteSession.run(sessionId);
    });
    
    transaction();
  }

  // Employee management methods
  getAllEmployees() {
    const stmt = this.db.prepare('SELECT * FROM employees ORDER BY name');
    return stmt.all();
  }

  getEmployeeById(id) {
    const stmt = this.db.prepare('SELECT * FROM employees WHERE id = ?');
    return stmt.get(id);
  }

  getEmployeeSuggestions(name, limit = 5) {
    const stmt = this.db.prepare(`
      SELECT * FROM employees
      WHERE name LIKE ?
      ORDER BY name
      LIMIT ?
    `);
    return stmt.all(`%${name}%`, limit);
  }

  addEmployee(name, nip, gol, pangkat, position, subPosition, organizationalLevel) {
    const stmt = this.db.prepare(`
      INSERT INTO employees (name, nip, gol, pangkat, position, sub_position, organizational_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, nip, gol, pangkat, position, subPosition, organizationalLevel);
    return result.lastInsertRowid;
  }

  updateEmployee(id, name, nip, gol, pangkat, position, subPosition, organizationalLevel) {
    const stmt = this.db.prepare(`
      UPDATE employees
      SET name = ?, nip = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, organizational_level = ?
      WHERE id = ?
    `);
    stmt.run(name, nip, gol, pangkat, position, subPosition, organizationalLevel, id);
  }

  deleteEmployee(id) {
    const stmt = this.db.prepare('DELETE FROM employees WHERE id = ?');
    stmt.run(id);
  }

  getEmployeesCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM employees');
    return stmt.get().count;
  }

  importEmployeesFromCSV(employees) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO employees (name, nip, gol, pangkat, position, sub_position, organizational_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction(() => {
      for (const employee of employees) {
        stmt.run(
          employee.name || '',
          employee.nip || '',
          employee.gol || '',
          employee.pangkat || '',
          employee.position || '',
          employee.subPosition || '',
          employee.organizationalLevel || ''
        );
      }
    });
    
    transaction();
    return employees.length;
  }

  getEmployeeOrgLevelMapping() {
    const stmt = this.db.prepare(`
      SELECT organizational_level, COUNT(*) as count
      FROM employees
      GROUP BY organizational_level
      ORDER BY count DESC
    `);
    return stmt.all();
  }

  // Leadership scores methods
  getCurrentDatasetId() {
    const stmt = this.db.prepare(`
      SELECT session_id as id FROM upload_sessions
      ORDER BY upload_timestamp DESC
      LIMIT 1
    `);
    const result = stmt.get();
    return result ? result.id : null;
  }

  getAllManualLeadershipScores(datasetId) {
    const stmt = this.db.prepare(`
      SELECT employee_name, score, updated_at
      FROM manual_leadership_scores
      WHERE dataset_id = ?
      ORDER BY employee_name
    `);
    return stmt.all(datasetId);
  }

  setManualLeadershipScore(datasetId, employeeName, score) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, score, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(datasetId, employeeName, score, new Date().toISOString());
  }

  bulkUpdateManualLeadershipScores(datasetId, scores) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, score, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction(() => {
      const timestamp = new Date().toISOString();
      for (const [employeeName, score] of Object.entries(scores)) {
        stmt.run(datasetId, employeeName, score, timestamp);
      }
    });
    
    transaction();
  }

  getErrorDetails() {
    return this.errorDetails;
  }

  isReady() {
    return this.isInitialized && this.db !== null;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.isInitialized = false;
    }
  }
}

// Export for both CommonJS and ES modules
export default SQLiteService;
