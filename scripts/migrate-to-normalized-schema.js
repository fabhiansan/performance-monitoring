#!/usr/bin/env node

/**
 * Database Schema Migration Script
 * Migrates from denormalized JSON performance data to normalized employee_performance table
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class SchemaMigration {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Create the new normalized schema tables
   */
  createNormalizedTables() {
    console.log('📋 Creating normalized schema tables...');
    
    this.db.exec(`
      -- Enhanced employees table
      CREATE TABLE IF NOT EXISTS employees_new (
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
        FOREIGN KEY (employee_id) REFERENCES employees_new(id) ON DELETE CASCADE,
        FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id) ON DELETE CASCADE,
        UNIQUE(employee_id, competency_id, session_id)
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_employees_name ON employees_new(name);
      CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees_new(nip);
      CREATE INDEX IF NOT EXISTS idx_employees_org_level ON employees_new(organizational_level);
      CREATE INDEX IF NOT EXISTS idx_competencies_category ON competencies(category);
      CREATE INDEX IF NOT EXISTS idx_competencies_applicable_to ON competencies(applicable_to);
      CREATE INDEX IF NOT EXISTS idx_performance_employee ON employee_performance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_performance_competency ON employee_performance(competency_id);
      CREATE INDEX IF NOT EXISTS idx_performance_session ON employee_performance(session_id);
      CREATE INDEX IF NOT EXISTS idx_performance_score ON employee_performance(score);
      CREATE INDEX IF NOT EXISTS idx_performance_composite ON employee_performance(employee_id, session_id);
    `);

    console.log('✅ Normalized schema tables created successfully');
  }

  /**
   * Populate competencies table with known competency names
   */
  populateCompetencies() {
    console.log('📝 Populating competencies table...');
    
    const competencies = [
      { name: 'orientasi pelayanan', category: 'perilaku_kinerja', weight: 1.0, applicable_to: 'all' },
      { name: 'akuntabilitas', category: 'perilaku_kinerja', weight: 1.0, applicable_to: 'all' },
      { name: 'kompetensi profesional', category: 'perilaku_kinerja', weight: 1.0, applicable_to: 'all' },
      { name: 'anti korupsi', category: 'perilaku_kinerja', weight: 1.0, applicable_to: 'all' },
      { name: 'nasionalisme', category: 'perilaku_kinerja', weight: 1.0, applicable_to: 'all' },
      { name: 'efektivitas personal', category: 'kualitas_kerja', weight: 1.0, applicable_to: 'all' },
      { name: 'kerjasama', category: 'kualitas_kerja', weight: 1.0, applicable_to: 'all' },
      { name: 'komunikasi', category: 'kualitas_kerja', weight: 1.0, applicable_to: 'all' },
      { name: 'penilaian pimpinan', category: 'penilaian_pimpinan', weight: 1.0, applicable_to: 'eselon' },
      { name: 'pemahaman tentang permasalahan sosial', category: 'kualitas_kerja', weight: 1.0, applicable_to: 'all' }
    ];

    const insertCompetency = this.db.prepare(`
      INSERT OR IGNORE INTO competencies (name, category, weight, applicable_to)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const comp of competencies) {
        insertCompetency.run(comp.name, comp.category, comp.weight, comp.applicable_to);
      }
    });

    transaction();
    console.log(`✅ Inserted ${competencies.length} competencies`);
  }

  /**
   * Migrate employee data from old schema to new normalized schema
   */
  migrateEmployeeData() {
    console.log('👥 Migrating employee data...');
    
    // Get unique employees from existing data
    const existingEmployees = this.db.prepare(`
      SELECT DISTINCT name, nip, gol, pangkat, position, sub_position, organizational_level
      FROM employee_data
      WHERE name IS NOT NULL AND name != ''
    `).all();

    const insertEmployee = this.db.prepare(`
      INSERT OR IGNORE INTO employees_new (name, nip, gol, pangkat, position, sub_position, organizational_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const emp of existingEmployees) {
        insertEmployee.run(
          emp.name,
          emp.nip,
          emp.gol,
          emp.pangkat,
          emp.position,
          emp.sub_position,
          emp.organizational_level
        );
      }
    });

    transaction();
    console.log(`✅ Migrated ${existingEmployees.length} unique employees`);
  }

  /**
   * Migrate performance data from JSON format to normalized table
   */
  migratePerformanceData() {
    console.log('📊 Migrating performance data...');
    
    // Get all employee data with performance JSON
    const employeeData = this.db.prepare(`
      SELECT id, session_id, name, performance_data
      FROM employee_data
      WHERE performance_data IS NOT NULL AND performance_data != ''
    `).all();

    // Get competency ID mapping
    const competencies = this.db.prepare('SELECT id, name FROM competencies').all();
    const competencyMap = new Map(competencies.map(c => [c.name.toLowerCase(), c.id]));

    // Get employee ID mapping
    const employees = this.db.prepare('SELECT id, name FROM employees_new').all();
    const employeeMap = new Map(employees.map(e => [e.name, e.id]));

    const insertPerformance = this.db.prepare(`
      INSERT OR IGNORE INTO employee_performance (employee_id, competency_id, session_id, score, raw_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    let totalRecords = 0;
    let errorCount = 0;

    const transaction = this.db.transaction(() => {
      for (const empData of employeeData) {
        try {
          const employeeId = employeeMap.get(empData.name);
          if (!employeeId) {
            console.warn(`⚠️ Employee not found: ${empData.name}`);
            errorCount++;
            continue;
          }

          // Parse performance JSON
          const performanceArray = JSON.parse(empData.performance_data || '[]');
          
          for (const perf of performanceArray) {
            if (!perf.name || perf.score === undefined) continue;
            
            // Find competency ID (case-insensitive matching)
            let competencyId = competencyMap.get(perf.name.toLowerCase());
            
            // If exact match not found, try partial matching
            if (!competencyId) {
              for (const [compName, compId] of competencyMap) {
                if (compName.includes(perf.name.toLowerCase()) || 
                    perf.name.toLowerCase().includes(compName)) {
                  competencyId = compId;
                  break;
                }
              }
            }

            if (competencyId) {
              insertPerformance.run(
                employeeId,
                competencyId,
                empData.session_id,
                perf.score,
                perf.score // raw_score same as score for now
              );
              totalRecords++;
            } else {
              console.warn(`⚠️ Competency not found: ${perf.name}`);
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Error processing employee ${empData.name}:`, error.message);
          errorCount++;
        }
      }
    });

    transaction();
    console.log(`✅ Migrated ${totalRecords} performance records`);
    if (errorCount > 0) {
      console.log(`⚠️ ${errorCount} records had errors during migration`);
    }
  }

  /**
   * Validate the migration by comparing record counts
   */
  validateMigration() {
    console.log('🔍 Validating migration...');
    
    const oldEmployeeCount = this.db.prepare('SELECT COUNT(DISTINCT name) as count FROM employee_data').get().count;
    const newEmployeeCount = this.db.prepare('SELECT COUNT(*) as count FROM employees_new').get().count;
    
    const oldDataCount = this.db.prepare('SELECT COUNT(*) as count FROM employee_data WHERE performance_data IS NOT NULL').get().count;
    const newPerformanceCount = this.db.prepare('SELECT COUNT(DISTINCT employee_id, session_id) as count FROM employee_performance').get().count;
    
    console.log(`📊 Migration Summary:`);
    console.log(`   Employees: ${oldEmployeeCount} → ${newEmployeeCount}`);
    console.log(`   Performance Records: ${oldDataCount} → ${newPerformanceCount}`);
    
    // Sample query to verify data integrity
    const sampleData = this.db.prepare(`
      SELECT e.name, c.name as competency, ep.score
      FROM employees_new e
      JOIN employee_performance ep ON e.id = ep.employee_id
      JOIN competencies c ON ep.competency_id = c.id
      LIMIT 5
    `).all();
    
    console.log('📋 Sample migrated data:');
    sampleData.forEach(row => {
      console.log(`   ${row.name}: ${row.competency} = ${row.score}`);
    });
  }

  /**
   * Create backup of original tables before migration
   */
  createBackup() {
    console.log('💾 Creating backup of original tables...');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employee_data_backup AS SELECT * FROM employee_data;
      CREATE TABLE IF NOT EXISTS employees_backup AS SELECT * FROM employees;
    `);
    
    console.log('✅ Backup created successfully');
  }

  /**
   * Run the complete migration process
   */
  async runMigration() {
    try {
      console.log('🚀 Starting database schema migration...');
      console.log('=' .repeat(50));
      
      this.createBackup();
      this.createNormalizedTables();
      this.populateCompetencies();
      this.migrateEmployeeData();
      this.migratePerformanceData();
      this.validateMigration();
      
      console.log('=' .repeat(50));
      console.log('✅ Migration completed successfully!');
      console.log('📝 Next steps:');
      console.log('   1. Update application code to use new schema');
      console.log('   2. Test thoroughly with new queries');
      console.log('   3. Drop old tables after verification');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.argv[2] || './test.db';
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }
  
  const migration = new SchemaMigration(dbPath);
  
  try {
    await migration.runMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    migration.close();
  }
}

export default SchemaMigration;