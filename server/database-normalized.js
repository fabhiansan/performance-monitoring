import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Enhanced SQLite Service with Normalized Schema
 * Demonstrates improved performance and reduced data redundancy
 */
class NormalizedSQLiteService {
  constructor(dbPath = null) {
    this.db = null;
    this.dbPath = dbPath;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!this.dbPath) {
        // Use default path if none provided
        this.dbPath = path.join(process.cwd(), 'performance.db');
      }

      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      
      this.initializeNormalizedSchema();
      this.isInitialized = true;
      
      console.log('✅ Normalized database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  initializeNormalizedSchema() {
    this.db.exec(`
      -- Enhanced employees table
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        nip TEXT UNIQUE,
        gol TEXT,
        pangkat TEXT,
        position TEXT,
        sub_position TEXT,
        organizational_level TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Competencies reference table
      CREATE TABLE IF NOT EXISTS competencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        weight REAL DEFAULT 1.0,
        applicable_to TEXT DEFAULT 'all',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Normalized performance data table
      CREATE TABLE IF NOT EXISTS employee_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        competency_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        score REAL NOT NULL,
        raw_score REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id) ON DELETE CASCADE,
        UNIQUE(employee_id, competency_id, session_id)
      );

      -- Enhanced upload sessions
      CREATE TABLE IF NOT EXISTS upload_sessions (
        session_id TEXT PRIMARY KEY,
        session_name TEXT NOT NULL,
        upload_timestamp TEXT NOT NULL,
        employee_count INTEGER DEFAULT 0,
        competency_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        notes TEXT
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
      CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees(nip);
      CREATE INDEX IF NOT EXISTS idx_employees_org_level ON employees(organizational_level);
      CREATE INDEX IF NOT EXISTS idx_competencies_category ON competencies(category);
      CREATE INDEX IF NOT EXISTS idx_competencies_applicable_to ON competencies(applicable_to);
      CREATE INDEX IF NOT EXISTS idx_performance_employee ON employee_performance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_performance_competency ON employee_performance(competency_id);
      CREATE INDEX IF NOT EXISTS idx_performance_session ON employee_performance(session_id);
      CREATE INDEX IF NOT EXISTS idx_performance_score ON employee_performance(score);
      CREATE INDEX IF NOT EXISTS idx_performance_composite ON employee_performance(employee_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON upload_sessions(upload_timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON upload_sessions(status);
    `);
  }

  // ==================== EMPLOYEE MANAGEMENT ====================

  /**
   * Get all employees with their latest performance data
   */
  getAllEmployeesWithPerformance(sessionId = null) {
    const sessionFilter = sessionId ? 'AND ep.session_id = ?' : '';
    const params = sessionId ? [sessionId] : [];
    
    const stmt = this.db.prepare(`
      SELECT 
        e.id,
        e.name,
        e.nip,
        e.gol,
        e.pangkat,
        e.position,
        e.sub_position,
        e.organizational_level,
        e.created_at,
        e.updated_at,
        GROUP_CONCAT(
          json_object(
            'name', c.name,
            'score', ep.score,
            'category', c.category
          )
        ) as performance_json
      FROM employees e
      LEFT JOIN employee_performance ep ON e.id = ep.employee_id ${sessionFilter}
      LEFT JOIN competencies c ON ep.competency_id = c.id
      GROUP BY e.id, e.name
      ORDER BY e.name
    `);
    
    const results = stmt.all(...params);
    
    return results.map(row => ({
      ...row,
      performance: row.performance_json 
        ? JSON.parse(`[${row.performance_json}]`)
        : []
    }));
  }

  /**
   * Get employee by ID with performance data
   */
  getEmployeeWithPerformance(employeeId, sessionId = null) {
    const sessionFilter = sessionId ? 'AND ep.session_id = ?' : '';
    const params = sessionId ? [employeeId, sessionId] : [employeeId];
    
    const stmt = this.db.prepare(`
      SELECT 
        e.*,
        c.name as competency_name,
        c.category,
        ep.score,
        ep.raw_score
      FROM employees e
      LEFT JOIN employee_performance ep ON e.id = ep.employee_id ${sessionFilter}
      LEFT JOIN competencies c ON ep.competency_id = c.id
      WHERE e.id = ?
      ORDER BY c.category, c.name
    `);
    
    const results = stmt.all(...params);
    if (results.length === 0) return null;
    
    const employee = {
      id: results[0].id,
      name: results[0].name,
      nip: results[0].nip,
      gol: results[0].gol,
      pangkat: results[0].pangkat,
      position: results[0].position,
      sub_position: results[0].sub_position,
      organizational_level: results[0].organizational_level,
      created_at: results[0].created_at,
      updated_at: results[0].updated_at,
      performance: results
        .filter(r => r.competency_name)
        .map(r => ({
          name: r.competency_name,
          score: r.score,
          category: r.category
        }))
    };
    
    return employee;
  }

  /**
   * Add or update employee
   */
  upsertEmployee(employeeData) {
    const stmt = this.db.prepare(`
      INSERT INTO employees (name, nip, gol, pangkat, position, sub_position, organizational_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        nip = excluded.nip,
        gol = excluded.gol,
        pangkat = excluded.pangkat,
        position = excluded.position,
        sub_position = excluded.sub_position,
        organizational_level = excluded.organizational_level,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    const result = stmt.run(
      employeeData.name,
      employeeData.nip,
      employeeData.gol,
      employeeData.pangkat,
      employeeData.position,
      employeeData.sub_position,
      employeeData.organizational_level
    );
    
    return result.lastInsertRowid;
  }

  // ==================== COMPETENCY MANAGEMENT ====================

  /**
   * Get all competencies
   */
  getAllCompetencies() {
    const stmt = this.db.prepare(`
      SELECT * FROM competencies
      ORDER BY category, name
    `);
    return stmt.all();
  }

  /**
   * Add competency if not exists
   */
  upsertCompetency(name, category = null, weight = 1.0, applicableTo = 'all') {
    const stmt = this.db.prepare(`
      INSERT INTO competencies (name, category, weight, applicable_to)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        category = excluded.category,
        weight = excluded.weight,
        applicable_to = excluded.applicable_to
    `);
    
    const result = stmt.run(name, category, weight, applicableTo);
    return result.lastInsertRowid;
  }

  /**
   * Get competency by name (case-insensitive)
   */
  getCompetencyByName(name) {
    const stmt = this.db.prepare(`
      SELECT * FROM competencies
      WHERE LOWER(name) = LOWER(?)
    `);
    return stmt.get(name);
  }

  // ==================== PERFORMANCE DATA MANAGEMENT ====================

  /**
   * Save employee performance data (normalized)
   */
  saveEmployeePerformanceData(employees, sessionName = null) {
    const sessionId = Date.now().toString();
    const uploadTime = new Date().toISOString();
    const finalSessionName = sessionName || `Upload ${new Date().toLocaleString()}`;
    
    const insertSession = this.db.prepare(`
      INSERT INTO upload_sessions (session_id, session_name, upload_timestamp, employee_count)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertPerformance = this.db.prepare(`
      INSERT OR REPLACE INTO employee_performance (employee_id, competency_id, session_id, score, raw_score)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction(() => {
      // Create session
      insertSession.run(sessionId, finalSessionName, uploadTime, employees.length);
      
      for (const employee of employees) {
        // Ensure employee exists
        const employeeId = this.upsertEmployee(employee);
        
        // Save performance data
        if (employee.performance && Array.isArray(employee.performance)) {
          for (const perf of employee.performance) {
            // Ensure competency exists
            let competency = this.getCompetencyByName(perf.name);
            if (!competency) {
              const competencyId = this.upsertCompetency(perf.name);
              competency = { id: competencyId };
            }
            
            insertPerformance.run(
              employeeId,
              competency.id,
              sessionId,
              perf.score,
              perf.score // raw_score same as score for now
            );
          }
        }
      }
    });
    
    transaction();
    return sessionId;
  }

  // ==================== ANALYTICS QUERIES ====================

  /**
   * Get competency averages across all employees
   */
  getCompetencyAverages(sessionId = null) {
    const sessionFilter = sessionId ? 'WHERE ep.session_id = ?' : '';
    const params = sessionId ? [sessionId] : [];
    
    const stmt = this.db.prepare(`
      SELECT 
        c.name,
        c.category,
        AVG(ep.score) as avg_score,
        MIN(ep.score) as min_score,
        MAX(ep.score) as max_score,
        COUNT(*) as employee_count
      FROM competencies c
      JOIN employee_performance ep ON c.id = ep.competency_id
      ${sessionFilter}
      GROUP BY c.id, c.name, c.category
      ORDER BY c.category, avg_score DESC
    `);
    
    return stmt.all(...params);
  }

  /**
   * Get employees by competency score range
   */
  getEmployeesByCompetencyScore(competencyName, minScore, maxScore, sessionId = null) {
    const sessionFilter = sessionId ? 'AND ep.session_id = ?' : '';
    const params = sessionId 
      ? [competencyName, minScore, maxScore, sessionId]
      : [competencyName, minScore, maxScore];
    
    const stmt = this.db.prepare(`
      SELECT 
        e.name,
        e.organizational_level,
        ep.score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      JOIN competencies c ON ep.competency_id = c.id
      WHERE c.name = ? AND ep.score BETWEEN ? AND ? ${sessionFilter}
      ORDER BY ep.score DESC
    `);
    
    return stmt.all(...params);
  }

  /**
   * Get performance trends for an employee across sessions
   */
  getEmployeePerformanceTrends(employeeId) {
    const stmt = this.db.prepare(`
      SELECT 
        us.session_name,
        us.upload_timestamp,
        c.name as competency_name,
        ep.score
      FROM employee_performance ep
      JOIN upload_sessions us ON ep.session_id = us.session_id
      JOIN competencies c ON ep.competency_id = c.id
      WHERE ep.employee_id = ?
      ORDER BY us.upload_timestamp, c.name
    `);
    
    return stmt.all(employeeId);
  }

  /**
   * Get organizational level performance summary
   */
  getOrgLevelPerformanceSummary(sessionId = null) {
    const sessionFilter = sessionId ? 'WHERE ep.session_id = ?' : '';
    const params = sessionId ? [sessionId] : [];
    
    const stmt = this.db.prepare(`
      SELECT 
        e.organizational_level,
        COUNT(DISTINCT e.id) as employee_count,
        AVG(ep.score) as avg_score,
        MIN(ep.score) as min_score,
        MAX(ep.score) as max_score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      ${sessionFilter}
      GROUP BY e.organizational_level
      ORDER BY avg_score DESC
    `);
    
    return stmt.all(...params);
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Get all upload sessions
   */
  getAllUploadSessions() {
    const stmt = this.db.prepare(`
      SELECT 
        us.*,
        COUNT(DISTINCT ep.employee_id) as actual_employee_count,
        COUNT(DISTINCT ep.competency_id) as actual_competency_count
      FROM upload_sessions us
      LEFT JOIN employee_performance ep ON us.session_id = ep.session_id
      GROUP BY us.session_id
      ORDER BY us.upload_timestamp DESC
    `);
    
    return stmt.all();
  }

  /**
   * Delete session and associated performance data
   */
  deleteUploadSession(sessionId) {
    const transaction = this.db.transaction(() => {
      // Delete performance data first (due to foreign key constraints)
      this.db.prepare('DELETE FROM employee_performance WHERE session_id = ?').run(sessionId);
      // Delete session
      this.db.prepare('DELETE FROM upload_sessions WHERE session_id = ?').run(sessionId);
    });
    
    transaction();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    const employeeCount = this.db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
    const competencyCount = this.db.prepare('SELECT COUNT(*) as count FROM competencies').get().count;
    const performanceCount = this.db.prepare('SELECT COUNT(*) as count FROM employee_performance').get().count;
    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM upload_sessions').get().count;
    
    return {
      employees: employeeCount,
      competencies: competencyCount,
      performanceRecords: performanceCount,
      sessions: sessionCount
    };
  }

  /**
   * Optimize database (analyze and vacuum)
   */
  optimizeDatabase() {
    this.db.exec('ANALYZE');
    this.db.exec('VACUUM');
    console.log('✅ Database optimized');
  }

  isReady() {
    return this.isInitialized && this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export default NormalizedSQLiteService;