/**
 * Database Migration Script: Convert Sessions to Periods
 *
 * This script migrates from the session-based system to a simpler period-based system.
 * It preserves all existing data by:
 * 1. Converting session_id references in performance_scores to period strings
 * 2. Backing up data before making changes
 * 3. Dropping the upload_sessions and current_session tables
 *
 * Run this script ONCE before deploying the new schema.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'server', 'performance_analyzer.db');
const BACKUP_PATH = `${DB_PATH}.backup-${Date.now()}`;

interface UploadSession {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
}

// Unused interface - kept for reference
// interface PerformanceScore {
//   id: number;
//   employee_id: number;
//   competency_id: number;
//   score: number;
//   session_id: string;
// }

console.log('========================================');
console.log('DATABASE MIGRATION: Sessions → Periods');
console.log('========================================\n');

try {
  // Step 1: Backup database
  console.log('Step 1: Creating backup...');
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`✓ Backup created at: ${BACKUP_PATH}\n`);

  // Step 2: Open database
  console.log('Step 2: Opening database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log('✓ Database opened\n');

  // Step 3: Check if migration is needed
  console.log('Step 3: Checking if migration is needed...');
  const tableInfo = db.pragma('table_info(performance_scores)') as Array<{name: string}>;
  const hasSessionId = tableInfo.some((col) => col.name === 'session_id');
  const hasPeriod = tableInfo.some((col) => col.name === 'period');

  if (!hasSessionId && hasPeriod) {
    console.log('✓ Migration already completed. Nothing to do.\n');
    db.close();
    process.exit(0);
  }

  if (!hasSessionId) {
    console.error('✗ Database schema does not match expected structure.');
    console.error('  Missing session_id column in performance_scores table.');
    db.close();
    process.exit(1);
  }

  // Step 4: Get all sessions
  console.log('Step 4: Reading existing sessions...');
  const sessions = db.prepare('SELECT * FROM upload_sessions').all() as UploadSession[];
  console.log(`✓ Found ${sessions.length} sessions\n`);

  // Step 5: Create session_id to period mapping
  console.log('Step 5: Creating session → period mapping...');
  const sessionToPeriod = new Map<string, string>();

  sessions.forEach(session => {
    // Use session_name as period (it's already in MM/YYYY format)
    let period = session.session_name;

    // If session_name doesn't match MM/YYYY format, extract from timestamp
    if (!/^\d{2}\/\d{4}$/.test(period)) {
      const date = new Date(session.upload_timestamp);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      period = `${month}/${year}`;
    }

    sessionToPeriod.set(session.session_id, period);
    console.log(`  ${session.session_id} → "${period}"`);
  });
  console.log('✓ Mapping created\n');

  // Step 6: Start transaction
  console.log('Step 6: Starting transaction...');
  db.exec('BEGIN TRANSACTION');

  // Step 7: Add period column to performance_scores
  console.log('Step 7: Adding period column to performance_scores...');
  db.exec('ALTER TABLE performance_scores ADD COLUMN period TEXT');
  console.log('✓ Column added\n');

  // Step 8: Populate period column
  console.log('Step 8: Populating period values...');
  const updateStmt = db.prepare('UPDATE performance_scores SET period = ? WHERE session_id = ?');
  let updatedCount = 0;

  sessionToPeriod.forEach((period, sessionId) => {
    const result = updateStmt.run(period, sessionId);
    updatedCount += result.changes;
  });
  console.log(`✓ Updated ${updatedCount} performance score records\n`);

  // Step 9: Handle orphaned records (performance_scores without valid session_id)
  console.log('Step 9: Checking for orphaned records...');
  const orphanedScores = db.prepare(`
    SELECT COUNT(*) as count FROM performance_scores
    WHERE period IS NULL OR period = ''
  `).get() as { count: number };

  if (orphanedScores.count > 0) {
    console.log(`  Found ${orphanedScores.count} orphaned records.`);
    console.log('  Assigning them to "Unknown" period...');
    db.exec(`UPDATE performance_scores SET period = 'Unknown' WHERE period IS NULL OR period = ''`);
    console.log('✓ Orphaned records handled\n');
  } else {
    console.log('✓ No orphaned records found\n');
  }

  // Step 10: Make period column NOT NULL
  console.log('Step 10: Enforcing NOT NULL constraint on period...');
  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  db.exec(`
    CREATE TABLE performance_scores_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      competency_id INTEGER NOT NULL,
      score REAL NOT NULL,
      period TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employee_database(id) ON DELETE CASCADE,
      FOREIGN KEY (competency_id) REFERENCES competencies(id)
    )
  `);

  db.exec(`
    INSERT INTO performance_scores_new (id, employee_id, competency_id, score, period, created_at)
    SELECT id, employee_id, competency_id, score, period, created_at
    FROM performance_scores
  `);

  db.exec('DROP TABLE performance_scores');
  db.exec('ALTER TABLE performance_scores_new RENAME TO performance_scores');

  // Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_performance_scores_employee_id ON performance_scores(employee_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_performance_scores_competency_id ON performance_scores(competency_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_performance_scores_period ON performance_scores(period)');

  console.log('✓ Constraint enforced\n');

  // Step 11: Drop upload_sessions table
  console.log('Step 11: Dropping upload_sessions table...');
  db.exec('DROP TABLE IF EXISTS upload_sessions');
  console.log('✓ Table dropped\n');

  // Step 12: Drop current_session table
  console.log('Step 12: Dropping current_session table...');
  db.exec('DROP TABLE IF EXISTS current_session');
  console.log('✓ Table dropped\n');

  // Step 13: Commit transaction
  console.log('Step 13: Committing changes...');
  db.exec('COMMIT');
  console.log('✓ Transaction committed\n');

  // Step 14: Verify migration
  console.log('Step 14: Verifying migration...');
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM performance_scores').get() as { count: number };
  const periodCount = db.prepare('SELECT COUNT(DISTINCT period) as count FROM performance_scores').get() as { count: number };
  console.log(`✓ Performance scores: ${finalCount.count} records`);
  console.log(`✓ Unique periods: ${periodCount.count}`);
  console.log('✓ Migration verified\n');

  // Close database
  db.close();

  console.log('========================================');
  console.log('MIGRATION COMPLETED SUCCESSFULLY ✓');
  console.log('========================================');
  console.log(`Backup saved at: ${BACKUP_PATH}`);
  console.log('You can now deploy the new application code.');

} catch (error) {
  console.error('\n========================================');
  console.error('MIGRATION FAILED ✗');
  console.error('========================================');
  console.error(error);
  console.error(`\nDatabase has been backed up to: ${BACKUP_PATH}`);
  console.error('To restore: cp "${BACKUP_PATH}" "${DB_PATH}"');
  process.exit(1);
}
