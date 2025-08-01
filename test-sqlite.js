import Database from 'better-sqlite3';
import { join } from 'path';

try {
  console.log('Attempting to create a test database...');
  const dbPath = join(process.cwd(), 'test.db');
  const db = new Database(dbPath);
  console.log('Test database created successfully at:', dbPath);
  db.close();
  console.log('Database connection closed.');
} catch (error) {
  console.error('Failed to create test database:', error);
  process.exit(1);
}
