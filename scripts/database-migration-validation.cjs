#!/usr/bin/env node
/**
 * Database Migration and Validation Script
 * 
 * This script validates the existing database structure and ensures
 * data integrity after migration to the new TypeScript backend.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseMigrationValidator {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'server', 'performance_analyzer.db');
    this.db = null;
  }

  async initialize() {
    console.log('🔍 Initializing database migration validator...');
    
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database not found at: ${this.dbPath}`);
    }

    this.db = new Database(this.dbPath, { readonly: false });
    console.log(`✅ Connected to database: ${this.dbPath}`);
  }

  validateTableStructure() {
    console.log('\n📊 Validating table structure...');
    
    const expectedTables = [
      'datasets',
      'current_dataset', 
      'employees',
      'upload_sessions',
      'competencies',
      'performance_scores',
      'manual_leadership_scores'
    ];

    const existingTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(row => row.name);

    console.log(`Found tables: ${existingTables.join(', ')}`);

    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    const extraTables = existingTables.filter(table => !expectedTables.includes(table));

    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
    }
    
    if (extraTables.length > 0) {
      console.log(`ℹ️  Extra tables: ${extraTables.join(', ')}`);
    }

    return {
      existing: existingTables,
      missing: missingTables,
      extra: extraTables
    };
  }

  validateDataIntegrity() {
    console.log('\n🔍 Validating data integrity...');
    
    const results = {};

    // Check datasets table
    try {
      const datasetCount = this.db.prepare('SELECT COUNT(*) as count FROM datasets').get();
      results.datasets = datasetCount.count;
      console.log(`✅ Datasets: ${datasetCount.count} records`);
    } catch (error) {
      console.log(`❌ Datasets validation failed: ${error.message}`);
      results.datasets = 0;
    }

    // Check current_dataset table
    try {
      const currentCount = this.db.prepare('SELECT COUNT(*) as count FROM current_dataset').get();
      results.current_dataset = currentCount.count;
      console.log(`✅ Current dataset: ${currentCount.count} records`);
    } catch (error) {
      console.log(`❌ Current dataset validation failed: ${error.message}`);
      results.current_dataset = 0;
    }

    // Check for normalized data structure
    try {
      const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM upload_sessions').get();
      results.upload_sessions = sessionCount.count;
      console.log(`✅ Upload sessions: ${sessionCount.count} records`);
      
      const employeeCount = this.db.prepare('SELECT COUNT(*) as count FROM employees').get();
      results.employees = employeeCount.count;
      console.log(`✅ Employees: ${employeeCount.count} records`);
      
      const competencyCount = this.db.prepare('SELECT COUNT(*) as count FROM competencies').get();
      results.competencies = competencyCount.count;
      console.log(`✅ Competencies: ${competencyCount.count} records`);
      
      const scoreCount = this.db.prepare('SELECT COUNT(*) as count FROM performance_scores').get();
      results.performance_scores = scoreCount.count;
      console.log(`✅ Performance scores: ${scoreCount.count} records`);
    } catch (error) {
      console.log(`⚠️  Normalized structure validation: ${error.message}`);
      results.normalized_structure = false;
    }

    return results;
  }

  validateIndexes() {
    console.log('\n📈 Validating database indexes...');
    
    const indexes = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(row => row.name);

    console.log(`Found indexes: ${indexes.join(', ')}`);
    
    const expectedIndexes = [
      'idx_employees_session_id',
      'idx_employees_name',
      'idx_competencies_session_id',
      'idx_performance_scores_employee_id',
      'idx_performance_scores_competency_id'
    ];

    const missingIndexes = expectedIndexes.filter(idx => !indexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log(`⚠️  Missing recommended indexes: ${missingIndexes.join(', ')}`);
    } else {
      console.log('✅ All recommended indexes present');
    }

    return {
      existing: indexes,
      missing: missingIndexes
    };
  }

  validateDataConsistency() {
    console.log('\n🔗 Validating data consistency...');
    
    try {
      // Check for orphaned records
      const orphanedEmployees = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM employees e 
        LEFT JOIN upload_sessions s ON e.session_id = s.session_id 
        WHERE s.session_id IS NULL
      `).get();

      if (orphanedEmployees.count > 0) {
        console.log(`⚠️  Found ${orphanedEmployees.count} orphaned employee records`);
      } else {
        console.log('✅ No orphaned employee records');
      }

      const orphanedScores = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM performance_scores ps 
        LEFT JOIN employees e ON ps.employee_id = e.id 
        WHERE e.id IS NULL
      `).get();

      if (orphanedScores.count > 0) {
        console.log(`⚠️  Found ${orphanedScores.count} orphaned performance score records`);
      } else {
        console.log('✅ No orphaned performance score records');
      }

      return {
        orphaned_employees: orphanedEmployees.count,
        orphaned_scores: orphanedScores.count
      };
    } catch (error) {
      console.log(`❌ Data consistency check failed: ${error.message}`);
      return { error: error.message };
    }
  }

  backupDatabase() {
    console.log('\n💾 Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.dbPath}.backup-${timestamp}`;
    
    try {
      fs.copyFileSync(this.dbPath, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.log(`❌ Backup failed: ${error.message}`);
      return null;
    }
  }

  generateReport(results) {
    console.log('\n📋 Migration Validation Report');
    console.log('===============================');
    
    const report = {
      timestamp: new Date().toISOString(),
      database_path: this.dbPath,
      validation_results: results,
      status: 'completed',
      recommendations: []
    };

    if (results.tables.missing.length > 0) {
      report.recommendations.push(`Create missing tables: ${results.tables.missing.join(', ')}`);
    }
    
    if (results.indexes.missing.length > 0) {
      report.recommendations.push(`Create missing indexes: ${results.indexes.missing.join(', ')}`);
    }
    
    if (results.consistency.orphaned_employees > 0 || results.consistency.orphaned_scores > 0) {
      report.recommendations.push('Clean up orphaned records');
    }

    const reportPath = path.join(__dirname, '..', 'docs', 'migration', 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  async run() {
    try {
      await this.initialize();
      
      const results = {};
      
      // Run all validations
      results.tables = this.validateTableStructure();
      results.data = this.validateDataIntegrity();
      results.indexes = this.validateIndexes();
      results.consistency = this.validateDataConsistency();
      
      // Create backup
      results.backup_path = this.backupDatabase();
      
      // Generate report
      const report = this.generateReport(results);
      
      console.log('\n🎉 Database migration validation completed successfully!');
      
      return report;
    } catch (error) {
      console.error(`❌ Migration validation failed: ${error.message}`);
      throw error;
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const dbPath = process.argv[2];
  const validator = new DatabaseMigrationValidator(dbPath);
  
  validator.run()
    .then(() => {
      console.log('\n✅ Migration validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DatabaseMigrationValidator;