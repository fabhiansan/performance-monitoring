#!/usr/bin/env node

/**
 * Database Migration: Convert session-based employees to master employees
 * 
 * This script migrates the current structure where employees are tied to sessions
 * to a master employees table with session-based performance data only.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../server/performance_analyzer.db');

console.log('🔄 Starting employee table migration...');
console.log(`📁 Database path: ${DB_PATH}`);

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

// Backup database first
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
console.log(`💾 Creating backup at: ${backupPath}`);
fs.copyFileSync(DB_PATH, backupPath);

const db = new Database(DB_PATH);

try {
  console.log('\n📊 Analyzing current data...');
  
  // Get current employee count
  const currentEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get();
  console.log(`📋 Current employees: ${currentEmployees.count}`);
  
  // Check for duplicates by name
  const duplicateNames = db.prepare(`
    SELECT name, COUNT(*) as count 
    FROM employees 
    GROUP BY LOWER(TRIM(name)) 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `).all();
  
  if (duplicateNames.length > 0) {
    console.log(`⚠️  Found ${duplicateNames.length} duplicate employee names:`);
    duplicateNames.slice(0, 5).forEach(dup => {
      console.log(`   - "${dup.name}": ${dup.count} records`);
    });
    if (duplicateNames.length > 5) {
      console.log(`   ... and ${duplicateNames.length - 5} more`);
    }
  }
  
  console.log('\n🔧 Starting migration...');
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  // Step 1: Create new master employees table
  console.log('1️⃣ Creating master employees table...');
  db.exec(`
    CREATE TABLE employees_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nip TEXT,
      gol TEXT,
      pangkat TEXT,
      position TEXT,
      sub_position TEXT,
      organizational_level TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, nip) -- Prevent duplicates by name and NIP combination
    )
  `);
  
  // Step 2: Insert deduplicated employees
  console.log('2️⃣ Deduplicating and inserting employees...');
  
  // Insert unique employees based on name and NIP
  // For duplicates, take the most recent one (highest ID)
  const insertEmployees = db.prepare(`
    INSERT INTO employees_master (name, nip, gol, pangkat, position, sub_position, organizational_level, created_at, updated_at)
    SELECT DISTINCT
      name,
      nip,
      gol,
      pangkat,
      position,
      sub_position,
      organizational_level,
      created_at,
      updated_at
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(name)), COALESCE(nip, '') 
          ORDER BY id DESC
        ) as rn
      FROM employees
    ) ranked
    WHERE rn = 1
  `);
  
  const insertResult = insertEmployees.run();
  console.log(`✅ Inserted ${insertResult.changes} unique employees`);
  
  // Step 3: Create mapping table for old ID to new ID
  console.log('3️⃣ Creating ID mapping...');
  db.exec(`
    CREATE TEMPORARY TABLE id_mapping AS
    SELECT 
      e_old.id as old_id,
      e_master.id as new_id,
      e_old.session_id
    FROM employees e_old
    JOIN employees_master e_master ON (
      LOWER(TRIM(e_old.name)) = LOWER(TRIM(e_master.name))
      AND COALESCE(e_old.nip, '') = COALESCE(e_master.nip, '')
    )
  `);
  
  const mappingCount = db.prepare('SELECT COUNT(*) as count FROM id_mapping').get();
  console.log(`📋 Created ${mappingCount.count} ID mappings`);
  
  // Step 4: Update performance_scores to use new employee IDs
  console.log('4️⃣ Updating performance scores...');
  const updatePerformanceScores = db.prepare(`
    UPDATE performance_scores 
    SET employee_id = (
      SELECT new_id 
      FROM id_mapping 
      WHERE id_mapping.old_id = performance_scores.employee_id
    )
    WHERE employee_id IN (SELECT old_id FROM id_mapping)
  `);
  
  const performanceUpdateResult = updatePerformanceScores.run();
  console.log(`✅ Updated ${performanceUpdateResult.changes} performance score records`);
  
  // Step 5: Backup old employees table and replace with master
  console.log('5️⃣ Replacing employees table...');
  db.exec('ALTER TABLE employees RENAME TO employees_old');
  db.exec('ALTER TABLE employees_master RENAME TO employees');
  
  // Step 6: Verify data integrity
  console.log('6️⃣ Verifying data integrity...');
  const newEmployeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get();
  const orphanedScores = db.prepare(`
    SELECT COUNT(*) as count 
    FROM performance_scores ps 
    LEFT JOIN employees e ON ps.employee_id = e.id 
    WHERE e.id IS NULL
  `).get();
  
  console.log(`📊 New employee count: ${newEmployeeCount.count}`);
  console.log(`⚠️  Orphaned performance scores: ${orphanedScores.count}`);
  
  if (orphanedScores.count > 0) {
    console.log('❌ Found orphaned performance scores! Rolling back...');
    db.exec('ROLLBACK');
    process.exit(1);
  }
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('\n✅ Migration completed successfully!');
  console.log(`📋 Employees: ${currentEmployees.count} → ${newEmployeeCount.count}`);
  console.log(`💾 Backup saved at: ${backupPath}`);
  
  // Clean up old table (optional)
  const cleanup = process.argv.includes('--cleanup');
  if (cleanup) {
    console.log('🧹 Cleaning up old employees table...');
    db.exec('DROP TABLE employees_old');
    console.log('✅ Cleanup complete');
  } else {
    console.log('💡 Run with --cleanup to remove the old employees_old table');
  }
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('🔄 Rolling back changes...');
  
  try {
    db.exec('ROLLBACK');
    console.log('✅ Rollback completed');
  } catch (rollbackError) {
    console.error('❌ Rollback failed:', rollbackError.message);
    console.log(`💾 Restore from backup: ${backupPath}`);
  }
  
  process.exit(1);
} finally {
  db.close();
}