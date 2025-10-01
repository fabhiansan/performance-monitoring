/**
 * Kysely Database Schema Definitions
 * 
 * Type-safe database schema definitions for SQLite database using Kysely
 */

import type { ColumnType } from 'kysely';

/**
 * Database Schema Interface
 */
export interface DatabaseSchema {
  employees: EmployeesTable;
  competencies: CompetenciesTable;
  performance_scores: PerformanceScoresTable;
  upload_sessions: UploadSessionsTable;
  datasets: DatasetsTable;
  current_dataset: CurrentDatasetTable;
  manual_leadership_scores: ManualLeadershipScoresTable;
}

/**
 * Employees Table Schema - Master employee records without session dependency
 */
export interface EmployeesTable {
  id: ColumnType<number, never, never>; // Generated
  name: string;
  nip: string | null;
  gol: string | null;
  pangkat: string | null;
  position: string | null;
  sub_position: string | null;
  organizational_level: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

/**
 * Competencies Table Schema
 */
export interface CompetenciesTable {
  id: ColumnType<number, never, never>; // Generated
  name: string;
  category: string | null;
  weight: number | null;
  applicable_to: string;
  session_id: string;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * Performance Scores Table Schema
 */
export interface PerformanceScoresTable {
  id: ColumnType<number, never, never>; // Generated
  employee_id: number;
  competency_id: number;
  score: number;
  session_id: string;
  created_at: ColumnType<string, string | undefined, never>;
}

/**
 * Upload Sessions Table Schema
 */
export interface UploadSessionsTable {
  session_id: string; // Primary key
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count: number;
  status: string;
  notes: string | null;
}

/**
 * Datasets Table Schema
 */
export interface DatasetsTable {
  id: string; // UUID primary key
  name: string;
  data: string; // JSON stringified data
  created_at: ColumnType<string, string | undefined, never>;
  employee_count: number;
}

/**
 * Current Dataset Table Schema
 */
export interface CurrentDatasetTable {
  id: string; // UUID primary key
  name: string;
  data: string; // JSON stringified data
  created_at: ColumnType<string, string | undefined, never>;
  employee_count: number;
}

/**
 * Manual Leadership Scores Table Schema
 */
export interface ManualLeadershipScoresTable {
  id: ColumnType<number, never, never>; // Generated
  dataset_id: string;
  employee_name: string;
  score: number;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

/**
 * Database Row Types (for database operations)
 */
export type EmployeeRow = {
  id: number;
  name: string;
  nip: string | null;
  gol: string | null;
  pangkat: string | null;
  position: string | null;
  sub_position: string | null;
  organizational_level: string | null;
  created_at: string;
  updated_at: string;
};
export type NewEmployeeRow = Omit<EmployeesTable, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};
export type EmployeeUpdate = Partial<Omit<EmployeesTable, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type CompetencyRow = CompetenciesTable;
export type NewCompetencyRow = Omit<CompetenciesTable, 'id' | 'created_at'> & {
  created_at?: string;
};

export type PerformanceScoreRow = PerformanceScoresTable;
export type NewPerformanceScoreRow = Omit<PerformanceScoresTable, 'id' | 'created_at'> & {
  created_at?: string;
};

export type UploadSessionRow = UploadSessionsTable;
export type NewUploadSessionRow = UploadSessionsTable;

export type DatasetRow = DatasetsTable;
export type NewDatasetRow = Omit<DatasetsTable, 'created_at'> & {
  created_at?: string;
};

export type CurrentDatasetRow = CurrentDatasetTable;
export type NewCurrentDatasetRow = Omit<CurrentDatasetTable, 'created_at'> & {
  created_at?: string;
};

export type ManualLeadershipScoreRow = ManualLeadershipScoresTable;
export type NewManualLeadershipScoreRow = Omit<ManualLeadershipScoresTable, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};
export type ManualLeadershipScoreUpdate = Partial<Omit<ManualLeadershipScoresTable, 'id' | 'created_at'>> & {
  updated_at?: string;
};

/**
 * Query Result Types (for type-safe query results)
 */
export interface EmployeeWithPerformance extends EmployeeRow {
  performance: Array<{
    name: string;
    score: number;
  }>;
}

export interface CompetencyWithScores extends CompetencyRow {
  scores: PerformanceScoreRow[];
  average_score?: number;
}

export interface SessionSummary {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count: number;
  status: string;
}

/**
 * Database Helper Types
 */
export type TableNames = keyof DatabaseSchema;
export type SelectableFor<T extends TableNames> = DatabaseSchema[T];
export type InsertableFor<T extends TableNames> = 
  T extends 'employees' ? NewEmployeeRow :
  T extends 'competencies' ? NewCompetencyRow :
  T extends 'performance_scores' ? NewPerformanceScoreRow :
  T extends 'upload_sessions' ? NewUploadSessionRow :
  T extends 'datasets' ? NewDatasetRow :
  T extends 'current_dataset' ? NewCurrentDatasetRow :
  T extends 'manual_leadership_scores' ? NewManualLeadershipScoreRow :
  never;

export type UpdatableFor<T extends TableNames> = 
  T extends 'employees' ? EmployeeUpdate :
  T extends 'manual_leadership_scores' ? ManualLeadershipScoreUpdate :
  Partial<SelectableFor<T>>;

/**
 * SQL Migration Helpers
 */
export const CREATE_TABLES_SQL = {
  employees: `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nip TEXT,
      gol TEXT,
      pangkat TEXT,
      position TEXT,
      sub_position TEXT,
      organizational_level TEXT,
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id)
    )
  `,
  competencies: `
    CREATE TABLE IF NOT EXISTS competencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      weight REAL DEFAULT 1.0,
      applicable_to TEXT DEFAULT 'all',
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id)
    )
  `,
  performance_scores: `
    CREATE TABLE IF NOT EXISTS performance_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      competency_id INTEGER NOT NULL,
      score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (competency_id) REFERENCES competencies(id),
      FOREIGN KEY (session_id) REFERENCES upload_sessions(session_id)
    )
  `,
  upload_sessions: `
    CREATE TABLE IF NOT EXISTS upload_sessions (
      session_id TEXT PRIMARY KEY,
      session_name TEXT NOT NULL,
      upload_timestamp TEXT NOT NULL,
      employee_count INTEGER NOT NULL DEFAULT 0,
      competency_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT
    )
  `,
  datasets: `
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      employee_count INTEGER NOT NULL DEFAULT 0
    )
  `,
  current_dataset: `
    CREATE TABLE IF NOT EXISTS current_dataset (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      employee_count INTEGER NOT NULL DEFAULT 0
    )
  `,
  manual_leadership_scores: `
    CREATE TABLE IF NOT EXISTS manual_leadership_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(dataset_id, employee_name)
    )
  `
} as const;

/**
 * Index Creation SQL
 */
export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name)',
  'CREATE INDEX IF NOT EXISTS idx_employees_organizational_level ON employees(organizational_level)',
  'CREATE INDEX IF NOT EXISTS idx_competencies_session_id ON competencies(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_competencies_name ON competencies(name)',
  'CREATE INDEX IF NOT EXISTS idx_performance_scores_employee_id ON performance_scores(employee_id)',
  'CREATE INDEX IF NOT EXISTS idx_performance_scores_competency_id ON performance_scores(competency_id)',
  'CREATE INDEX IF NOT EXISTS idx_performance_scores_session_id ON performance_scores(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_upload_sessions_timestamp ON upload_sessions(upload_timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_manual_leadership_scores_dataset_id ON manual_leadership_scores(dataset_id)',
  'CREATE INDEX IF NOT EXISTS idx_manual_leadership_scores_employee_name ON manual_leadership_scores(employee_name)'
] as const;