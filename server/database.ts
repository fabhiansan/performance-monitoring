import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { logger } from "../services/logger";
import type { CompetencyScore, Employee } from "../types";

// Constants for repeated string literals
const SESSION_FILTER_CLAUSE = "AND ep.session_id = ?";

type Nullable<T> = T | null;

interface EmployeeRow {
  id: number;
  name: string;
  nip: Nullable<string>;
  gol: Nullable<string>;
  pangkat: Nullable<string>;
  position: Nullable<string>;
  sub_position: Nullable<string>;
  organizational_level: Nullable<string>;
  created_at: Nullable<string>;
  updated_at: Nullable<string>;
}

interface CompetencyRow {
  id: number;
  name: string;
  category: Nullable<string>;
  weight: Nullable<number>;
  applicable_to: string;
  created_at: Nullable<string>;
}

interface UploadSessionRow {
  session_id: string;
  session_name: string;
  upload_timestamp: string;
  employee_count: number;
  competency_count: number;
  status: string;
  notes: Nullable<string>;
}

interface CountRow {
  count: number;
}

interface SessionIdRow {
  session_id: string;
}

interface DatasetIdRow {
  id: string;
}

type EmployeePerformanceScore = CompetencyScore & { category?: string | null };

type LegacyPerformanceEntry = { competency: string; score: number };
type StandardPerformanceEntry = { name: string; score: number };
type PerformanceEntry = LegacyPerformanceEntry | StandardPerformanceEntry;

interface EmployeePerformanceInput {
  name: string;
  nip?: string;
  gol?: string;
  pangkat?: string;
  position?: string;
  sub_position?: string;
  organizational_level?: string;
  performance?: PerformanceEntry[];
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isCountRow = (value: unknown): value is CountRow => {
  return isRecord(value) && typeof value.count === "number";
};

const isSessionIdRow = (value: unknown): value is SessionIdRow => {
  return isRecord(value) && typeof value.session_id === "string";
};

const isDatasetIdRow = (value: unknown): value is DatasetIdRow => {
  return isRecord(value) && typeof value.id === "string";
};

const normalizeString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parsePerformanceJson = (value: unknown): EmployeePerformanceScore[] => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(`[${value}]`);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecord).map((item) => ({
      name: normalizeString(item.name),
      score:
        typeof item.score === "number" ? item.score : Number(item.score) || 0,
      competency:
        "category" in item
          ? (normalizeOptionalString(item.category) ?? undefined)
          : undefined,
    }));
  } catch (error) {
    logger.warn("Failed to parse performance JSON", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

const mapEmployeeRowToEmployee = (
  row: EmployeeRow,
  performance: EmployeePerformanceScore[] = [],
): Employee => ({
  id: row.id,
  name: row.name,
  nip: normalizeString(row.nip) || undefined,
  gol: normalizeString(row.gol) || undefined,
  pangkat: normalizeString(row.pangkat) || undefined,
  position: normalizeString(row.position) || undefined,
  sub_position: normalizeString(row.sub_position) || undefined,
  organizational_level: normalizeString(row.organizational_level) || undefined,
  performance,
  created_at: row.created_at ?? undefined,
  updated_at: row.updated_at ?? undefined,
});

const mapRecordToEmployeeRow = (row: Record<string, unknown>): EmployeeRow => ({
  id: normalizeNumber(row.id),
  name: normalizeString(row.name),
  nip: toNullableString(row.nip),
  gol: toNullableString(row.gol),
  pangkat: toNullableString(row.pangkat),
  position: toNullableString(row.position),
  sub_position: toNullableString(row.sub_position),
  organizational_level: toNullableString(row.organizational_level),
  created_at: toNullableString(row.created_at),
  updated_at: toNullableString(row.updated_at),
});

const mapRecordToCompetencyRow = (
  row: Record<string, unknown>,
): CompetencyRow => ({
  id: normalizeNumber(row.id),
  name: normalizeString(row.name),
  category: toNullableString(row.category),
  weight:
    row.weight === null || row.weight === undefined
      ? null
      : normalizeNumber(row.weight),
  applicable_to: normalizeString(row.applicable_to, "all"),
  created_at: toNullableString(row.created_at),
});

const resolvePerformanceName = (entry: PerformanceEntry): string | null => {
  if ("name" in entry && typeof entry.name === "string") {
    return entry.name;
  }
  if ("competency" in entry && typeof entry.competency === "string") {
    return entry.competency;
  }
  return null;
};

/**
 * Enhanced SQLite Service with Normalized Schema
 * Demonstrates improved performance and reduced data redundancy
 */
class SQLiteService {
  private db: Database.Database | null = null;
  private isInitialized: boolean = false;
  private errorDetails:
    | Error
    | { type: string; description: string; solution: string }
    | null = null;
  private dbPath: string;

  private getDb(): Database.Database {
    if (!this.db) {
      throw new Error("Database connection not established");
    }

    return this.db;
  }

  constructor(dbPath: string | null = null) {
    this.db = null;
    this.isInitialized = false;
    this.errorDetails = null;

    // Use environment variable first, then constructor parameter, finally default path
    this.dbPath =
      process.env.DATABASE_PATH ||
      dbPath ||
      path.join(process.cwd(), "server", "performance_analyzer.db");

    logger.database("Database path resolved", { dbPath: this.dbPath });
  }

  private resolveSymbolicLink(dbDir: string): string {
    try {
      const realPath = fs.realpathSync(dbDir);
      if (realPath !== dbDir) {
        logger.debug("Directory is a symbolic link", {
          originalPath: dbDir,
          realPath,
        });
        return realPath;
      }
    } catch {
      // Path doesn't exist yet, which is fine
    }
    return dbDir;
  }

  private validateParentDirectory(dbDir: string): void {
    const parentDir = path.dirname(dbDir);
    if (fs.existsSync(parentDir)) {
      try {
        fs.accessSync(parentDir, fs.constants.W_OK);
        logger.debug("Parent directory is writable", { parentDir });
      } catch (parentAccessError) {
        const errorMsg =
          parentAccessError instanceof Error
            ? parentAccessError.message
            : String(parentAccessError);
        logger.error("Parent directory is not writable", { error: errorMsg });
        throw new Error(`Parent directory not writable: ${errorMsg}`);
      }
    }
  }

  private createDirectoryIfNeeded(dbDir: string): void {
    if (!fs.existsSync(dbDir)) {
      logger.database("Creating database directory", { dbDir });
      this.validateParentDirectory(dbDir);

      try {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.database("Database directory created successfully");
      } catch (dirError) {
        const errorMsg =
          dirError instanceof Error ? dirError.message : String(dirError);
        logger.error("Failed to create database directory", {
          error: errorMsg,
        });
        throw new Error(`Cannot create database directory: ${errorMsg}`);
      }
    }
  }

  private testFileOperations(dbDir: string): void {
    const testFilePath = path.join(dbDir, ".db-test-" + Date.now());
    try {
      fs.writeFileSync(testFilePath, "test");
      logger.debug("File creation test successful");

      const content = fs.readFileSync(testFilePath, "utf8");
      if (content !== "test") {
        throw new Error("File read test failed - content mismatch");
      }
      logger.debug("File read test successful");

      fs.unlinkSync(testFilePath);
      logger.debug("File deletion test successful");
    } catch (testError) {
      this.cleanupTestFile(testFilePath);
      const errorMsg =
        testError instanceof Error ? testError.message : String(testError);
      logger.error("Directory operation test failed", { error: errorMsg });
      throw new Error(
        `Directory not suitable for database operations: ${errorMsg}`,
      );
    }
  }

  private cleanupTestFile(testFilePath: string): void {
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (cleanupError) {
      logger.warn("Failed to clean up test file", {
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }
  }

  private validateDirectoryAccess(dbDir: string): void {
    try {
      fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
      logger.debug("Directory access validation successful");
    } catch (accessError) {
      const errorMsg =
        accessError instanceof Error
          ? accessError.message
          : String(accessError);
      logger.error("Directory access validation failed", { error: errorMsg });
      throw new Error(`Directory access validation failed: ${errorMsg}`);
    }
  }

  async validateAndPrepareDirectory(dbDir: string): Promise<void> {
    try {
      const resolvedDir = this.resolveSymbolicLink(dbDir);
      this.createDirectoryIfNeeded(resolvedDir);

      const stats = fs.statSync(resolvedDir);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${resolvedDir}`);
      }

      this.testFileOperations(resolvedDir);
      this.validateDirectoryAccess(resolvedDir);

      logger.debug("Enhanced directory validation completed", {
        dbDir: resolvedDir,
      });
    } catch (error) {
      logger.error("Directory validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  categorizeError(error: Error): {
    type: string;
    description: string;
    solution: string;
  } {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes("node_module_version") ||
      errorMessage.includes("was compiled against")
    ) {
      return {
        type: "version-mismatch",
        description: "Native module compiled for different Node.js version",
        solution: "Run npm run rebuild:native",
      };
    }

    if (
      errorMessage.includes("cannot find module") ||
      errorMessage.includes("module not found")
    ) {
      return {
        type: "missing-module",
        description: "better-sqlite3 module not found or not installed",
        solution: "Run npm install better-sqlite3",
      };
    }

    if (
      errorMessage.includes("gyp") ||
      errorMessage.includes("binding") ||
      errorMessage.includes("rebuild")
    ) {
      return {
        type: "compilation-error",
        description: "Native module compilation failed",
        solution: "Install build tools and run npm run rebuild:electron",
      };
    }

    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("eacces") ||
      errorMessage.includes("eperm")
    ) {
      return {
        type: "permission-error",
        description: "File permission issues with database location",
        solution:
          "Check database directory permissions or run with appropriate privileges",
      };
    }

    if (
      errorMessage.includes("enoent") ||
      errorMessage.includes("no such file") ||
      errorMessage.includes("cannot open database")
    ) {
      return {
        type: "path-error",
        description: "Database path not accessible or directory does not exist",
        solution: "Verify database directory exists and is writable",
      };
    }

    if (
      errorMessage.includes("enospc") ||
      errorMessage.includes("no space left")
    ) {
      return {
        type: "disk-space-error",
        description: "Insufficient disk space for database file",
        solution: "Free up disk space and try again",
      };
    }

    if (
      errorMessage.includes("readonly") ||
      errorMessage.includes("read-only")
    ) {
      return {
        type: "readonly-error",
        description: "Database directory is read-only in packaged environment",
        solution: "Database should be moved to user data directory",
      };
    }

    return {
      type: "unknown-error",
      description: "Unknown database initialization error",
      solution: "Check logs and run npm run check:native for diagnostics",
    };
  }

  async initialize() {
    try {
      await this.performInitialization();
      return { success: true };
    } catch (error) {
      this.handleInitializationError(error);
      throw error; // Re-throw to prevent server startup
    }
  }

  private async performInitialization(): Promise<void> {
    // Validate and prepare database path
    logger.info("Initializing database", { dbPath: this.dbPath });

    const dbDir = path.dirname(this.dbPath);
    logger.debug("Database directory resolved", { dbDir });

    // Enhanced directory validation
    await this.validateAndPrepareDirectory(dbDir);

    // Create database connection
    this.createDatabaseConnection();

    // Test and initialize
    this.testDatabaseConnection();
    this.initializeDatabaseSchema();

    this.isInitialized = true;
    logger.info("Database initialization completed successfully");
  }

  private createDatabaseConnection(): void {
    logger.debug("Creating SQLite database connection");
    this.db = new Database(this.dbPath, {
      verbose:
        process.env.NODE_ENV === "development"
          ? (message?: unknown) => logger.debug(String(message))
          : undefined,
      fileMustExist: false, // Allow creation of new database files
    });
  }

  private testDatabaseConnection(): void {
    logger.debug("Testing database connection");
    this.getDb().exec("SELECT 1");
    logger.debug("Database connection test successful");
  }

  private initializeDatabaseSchema(): void {
    logger.debug("Initializing database schema");
    this.initializeNormalizedSchema();
    logger.debug("Database schema initialized successfully");
  }

  private handleInitializationError(error: unknown): void {
    const ERROR_NOT_SET = "not set";
    logger.error("Database initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    this.errorDetails =
      error instanceof Error
        ? this.categorizeError(error)
        : new Error(String(error));

    const errorDetails = this.buildErrorDetails(error, ERROR_NOT_SET);
    logger.error("Database initialization error details", errorDetails);

    this.writeErrorToStderr(ERROR_NOT_SET);
  }

  private buildErrorDetails(
    error: unknown,
    errorNotSet: string,
  ): Record<string, unknown> {
    return {
      type:
        this.errorDetails instanceof Error
          ? "unknown-error"
          : this.errorDetails?.type || "unknown",
      description:
        this.errorDetails instanceof Error
          ? this.errorDetails.message
          : this.errorDetails?.description || "Unknown error",
      solution:
        this.errorDetails instanceof Error
          ? "Check server logs for details"
          : this.errorDetails?.solution || "Check server logs",
      databasePath: this.dbPath,
      originalError: error instanceof Error ? error.message : String(error),
      environmentPath: process.env.DATABASE_PATH || errorNotSet,
    };
  }

  private writeErrorToStderr(errorNotSet: string): void {
    if (process.stderr) {
      process.stderr.write(
        JSON.stringify({
          type: "database-error",
          details: {
            ...this.errorDetails,
            databasePath: this.dbPath,
            environmentPath: process.env.DATABASE_PATH || errorNotSet,
          },
          timestamp: new Date().toISOString(),
        }) + "\n",
      );
    }
  }

  initializeNormalizedSchema(): void {
    const db = this.getDb();

    db.exec(`
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

      -- Manual leadership scores table (compatibility)
      CREATE TABLE IF NOT EXISTS manual_leadership_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT,
        employee_name TEXT,
        score REAL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  getAllEmployeesWithPerformance(sessionId: string | null = null) {
    const db = this.getDb();
    const sessionFilter = sessionId ? SESSION_FILTER_CLAUSE : "";
    const params = sessionId ? [sessionId] : [];

    const stmt = db.prepare(`
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

    return results.filter(isRecord).map((row) => {
      const performanceJson =
        "performance_json" in row ? row.performance_json : undefined;
      const performance = parsePerformanceJson(performanceJson);
      const employeeRow = mapRecordToEmployeeRow(row);
      return mapEmployeeRowToEmployee(employeeRow, performance);
    });
  }

  /**
   * Get employee by ID with performance data
   */
  getEmployeeWithPerformance(
    employeeId: number,
    sessionId: string | null = null,
  ) {
    const db = this.getDb();
    const sessionFilter = sessionId ? SESSION_FILTER_CLAUSE : "";
    const params = sessionId ? [employeeId, sessionId] : [employeeId];

    const stmt = db.prepare(`
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

    const results = stmt.all(...params).filter(isRecord);
    if (results.length === 0) {
      return null;
    }

    const baseRow = mapRecordToEmployeeRow(results[0]);
    const performance: EmployeePerformanceScore[] = results
      .filter(
        (
          row,
        ): row is Record<string, unknown> & {
          competency_name: unknown;
          score: unknown;
          category?: unknown;
        } => {
          return (
            "competency_name" in row &&
            typeof row.competency_name === "string" &&
            "score" in row
          );
        },
      )
      .map((row) => ({
        name: String(row.competency_name),
        score: normalizeNumber(row.score),
        category: normalizeOptionalString(row.category) ?? null,
      }));

    return mapEmployeeRowToEmployee(baseRow, performance);
  }

  /**
   * Add or update employee
   */
  upsertEmployee(employeeData: {
    name: string;
    nip?: string;
    gol?: string;
    pangkat?: string;
    position?: string;
    sub_position?: string;
    organizational_level?: string;
  }) {
    const db = this.getDb();
    const stmt = db.prepare(`
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
      employeeData.organizational_level,
    );

    return Number(result.lastInsertRowid);
  }

  // ==================== COMPETENCY MANAGEMENT ====================

  /**
   * Get all competencies
   */
  getAllCompetencies(): CompetencyRow[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM competencies
      ORDER BY category, name
    `);
    return stmt.all().filter(isRecord).map(mapRecordToCompetencyRow);
  }

  /**
   * Add competency if not exists
   */
  upsertCompetency(
    name: string,
    category: string | null = null,
    weight: number = 1.0,
    applicableTo: string = "all",
  ) {
    const stmt = this.getDb().prepare(`
      INSERT INTO competencies (name, category, weight, applicable_to)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        category = excluded.category,
        weight = excluded.weight,
        applicable_to = excluded.applicable_to
    `);

    const result = stmt.run(name, category, weight, applicableTo);
    return Number(result.lastInsertRowid);
  }

  /**
   * Get competency by name (case-insensitive)
   */
  getCompetencyByName(name: string): CompetencyRow | undefined {
    const stmt = this.getDb().prepare(`
      SELECT * FROM competencies
      WHERE LOWER(name) = LOWER(?)
    `);
    const row = stmt.get(name);
    return isRecord(row) ? mapRecordToCompetencyRow(row) : undefined;
  }

  // ==================== PERFORMANCE DATA MANAGEMENT ====================

  /**
   * Save employee performance data (normalized)
   */
  saveEmployeePerformanceData(
    employees: EmployeePerformanceInput[],
    sessionName: string | null = null,
  ) {
    const sessionId = Date.now().toString();
    const uploadTime = new Date().toISOString();
    const finalSessionName =
      sessionName || `Upload ${new Date().toLocaleString()}`;

    const insertSession = this.getDb().prepare(`
      INSERT INTO upload_sessions (session_id, session_name, upload_timestamp, employee_count)
      VALUES (?, ?, ?, ?)
    `);

    const insertPerformance = this.getDb().prepare(`
      INSERT OR REPLACE INTO employee_performance (employee_id, competency_id, session_id, score, raw_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.getDb().transaction(() => {
      // Create session
      insertSession.run(
        sessionId,
        finalSessionName,
        uploadTime,
        employees.length,
      );

      for (const employee of employees) {
        // Ensure employee exists
        const employeeId = this.upsertEmployee(employee);

        // Save performance data
        if (Array.isArray(employee.performance)) {
          for (const perf of employee.performance) {
            // Ensure competency exists
            const competencyName = resolvePerformanceName(perf);
            if (!competencyName) {
              logger.warn(
                "Skipped performance entry with missing competency name",
                { employee: employee.name, entry: perf },
              );
              continue;
            }

            const competency = this.getCompetencyByName(competencyName) ?? {
              id: this.upsertCompetency(competencyName),
              name: competencyName,
              category: null,
              weight: null,
              applicable_to: "all",
              created_at: null,
            };

            insertPerformance.run(
              employeeId,
              competency.id,
              sessionId,
              perf.score,
              perf.score, // raw_score same as score for now
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
  getCompetencyAverages(sessionId: string | null = null) {
    const sessionFilter = sessionId ? "WHERE ep.session_id = ?" : "";
    const params = sessionId ? [sessionId] : [];

    const stmt = this.getDb().prepare(`
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
  getEmployeesByCompetencyScore(
    competencyName: string,
    minScore: number,
    maxScore: number,
    sessionId: string | null = null,
  ) {
    const sessionFilter = sessionId ? SESSION_FILTER_CLAUSE : "";
    const params = sessionId
      ? [competencyName, minScore, maxScore, sessionId]
      : [competencyName, minScore, maxScore];

    const stmt = this.getDb().prepare(`
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
  getEmployeePerformanceTrends(employeeId: number) {
    const stmt = this.getDb().prepare(`
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

    return stmt
      .all(employeeId)
      .filter(isRecord)
      .map((row) => ({
        session_name: normalizeString(row.session_name),
        upload_timestamp: normalizeString(row.upload_timestamp),
        competency_name: normalizeString(row.competency_name),
        score: normalizeNumber(row.score),
      }));
  }

  /**
   * Get organizational level performance summary
   */
  getOrgLevelPerformanceSummary(sessionId: string | null = null) {
    const sessionFilter = sessionId ? "WHERE ep.session_id = ?" : "";
    const params = sessionId ? [sessionId] : [];

    const stmt = this.getDb().prepare(`
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

    return stmt
      .all(...params)
      .filter(isRecord)
      .map((row) => ({
        organizational_level: normalizeString(row.organizational_level),
        employee_count: normalizeNumber(row.employee_count),
        avg_score: normalizeNumber(row.avg_score),
        min_score: normalizeNumber(row.min_score),
        max_score: normalizeNumber(row.max_score),
      }));
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Get all upload sessions
   */
  getAllUploadSessions(): Array<
    UploadSessionRow & {
      actual_employee_count: number;
      actual_competency_count: number;
    }
  > {
    const stmt = this.getDb().prepare(`
      SELECT
        us.*,
        COUNT(DISTINCT ep.employee_id) as actual_employee_count,
        COUNT(DISTINCT ep.competency_id) as actual_competency_count
      FROM upload_sessions us
      LEFT JOIN employee_performance ep ON us.session_id = ep.session_id
      GROUP BY us.session_id
      ORDER BY us.upload_timestamp DESC
    `);

    return stmt
      .all()
      .filter(isRecord)
      .map((row) => ({
        session_id: normalizeString(row.session_id),
        session_name: normalizeString(row.session_name),
        upload_timestamp: normalizeString(row.upload_timestamp),
        employee_count: normalizeNumber(row.employee_count),
        competency_count: normalizeNumber(row.competency_count),
        status: normalizeString(row.status),
        notes: toNullableString(row.notes),
        actual_employee_count: normalizeNumber(row.actual_employee_count),
        actual_competency_count: normalizeNumber(row.actual_competency_count),
      }));
  }

  /**
   * Delete session and associated performance data
   */
  deleteUploadSession(sessionId: string): void {
    const transaction = this.getDb().transaction(() => {
      // Delete performance data first (due to foreign key constraints)
      this.getDb()
        .prepare("DELETE FROM employee_performance WHERE session_id = ?")
        .run(sessionId);
      // Delete session
      this.getDb()
        .prepare("DELETE FROM upload_sessions WHERE session_id = ?")
        .run(sessionId);
    });

    transaction();
  }

  // ==================== COMPATIBILITY METHODS ====================

  /**
   * Save employee data (compatibility method for old API)
   */
  saveEmployeeData(
    employees: EmployeePerformanceInput[],
    sessionName: string | null = null,
  ) {
    return this.saveEmployeePerformanceData(employees, sessionName);
  }

  /**
   * Get employee data by session (compatibility method)
   */
  getEmployeeDataBySession(sessionId: string) {
    return this.getAllEmployeesWithPerformance(sessionId);
  }

  /**
   * Get employee data by time range (compatibility method)
   */
  getEmployeeDataByTimeRange(startTime: string, endTime: string) {
    const stmt = this.getDb().prepare(`
      SELECT
        e.*,
        us.upload_timestamp,
        us.session_name
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      JOIN upload_sessions us ON ep.session_id = us.session_id
      WHERE us.upload_timestamp BETWEEN ? AND ?
      GROUP BY e.id
      ORDER BY us.upload_timestamp DESC, e.name
    `);
    return stmt.all(startTime, endTime);
  }

  /**
   * Get latest employee data (compatibility method)
   */
  getLatestEmployeeData() {
    const latestSession = this.getDb()
      .prepare(
        `
      SELECT session_id FROM upload_sessions
      ORDER BY upload_timestamp DESC
      LIMIT 1
    `,
      )
      .get();

    if (!latestSession) return [];

    if (isSessionIdRow(latestSession)) {
      return this.getAllEmployeesWithPerformance(latestSession.session_id);
    }

    return [];
  }

  /**
   * Get all employees (compatibility method)
   */
  getAllEmployees(): Employee[] {
    const stmt = this.getDb().prepare("SELECT * FROM employees ORDER BY name");
    return stmt
      .all()
      .filter(isRecord)
      .map((row) => mapEmployeeRowToEmployee(mapRecordToEmployeeRow(row)));
  }

  /**
   * Get employee by ID (compatibility method)
   */
  getEmployeeById(id: number): Employee | null {
    const stmt = this.getDb().prepare("SELECT * FROM employees WHERE id = ?");
    const row = stmt.get(id);
    return isRecord(row)
      ? mapEmployeeRowToEmployee(mapRecordToEmployeeRow(row))
      : null;
  }

  /**
   * Get employee suggestions (compatibility method)
   */
  getEmployeeSuggestions(name: string, limit: number = 5) {
    const stmt = this.getDb().prepare(`
      SELECT name, organizational_level
      FROM employees
      WHERE name LIKE ?
      ORDER BY name
      LIMIT ?
    `);
    return stmt
      .all(`%${name}%`, limit)
      .filter(isRecord)
      .map((row) => ({
        name: normalizeString(row.name),
        organizational_level: normalizeString(row.organizational_level),
        similarity: 1,
      }));
  }

  /**
   * Add employee using parameter object pattern
   */
  addEmployee(params: {
    name: string;
    nip?: string;
    gol?: string;
    pangkat?: string;
    position?: string;
    subPosition?: string;
    organizationalLevel?: string;
  }) {
    return this.upsertEmployee({
      name: params.name,
      nip: params.nip || undefined,
      gol: params.gol || undefined,
      pangkat: params.pangkat || undefined,
      position: params.position || undefined,
      sub_position: params.subPosition || undefined,
      organizational_level: params.organizationalLevel || undefined,
    });
  }

  /**
   * Update employee using parameter object pattern
   */
  updateEmployee(
    id: number,
    params: {
      name: string;
      nip?: string;
      gol?: string;
      pangkat?: string;
      position?: string;
      subPosition?: string;
      organizationalLevel?: string;
    },
  ) {
    const stmt = this.getDb().prepare(`
      UPDATE employees
      SET name = ?, nip = ?, gol = ?, pangkat = ?, position = ?, sub_position = ?, organizational_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      params.name,
      params.nip,
      params.gol,
      params.pangkat,
      params.position,
      params.subPosition,
      params.organizationalLevel,
      id,
    );
  }

  /**
   * Delete employee (compatibility method)
   */
  deleteEmployee(id: number) {
    const stmt = this.getDb().prepare("DELETE FROM employees WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Get employees count (compatibility method)
   */
  getEmployeesCount(): number {
    const stmt = this.getDb().prepare(
      "SELECT COUNT(*) as count FROM employees",
    );
    const row = stmt.get();
    return isCountRow(row) ? row.count : 0;
  }

  /**
   * Import employees from CSV (compatibility method)
   */
  importEmployeesFromCSV(
    employees: Array<{
      name: string;
      nip?: string;
      gol?: string;
      pangkat?: string;
      position?: string;
      sub_position?: string;
      organizational_level?: string;
      performance?: Array<{ competency: string; score: number }>;
    }>,
  ) {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO employees (name, nip, gol, pangkat, position, sub_position, organizational_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.getDb().transaction(() => {
      for (const employee of employees) {
        stmt.run(
          employee.name || "",
          employee.nip || "",
          employee.gol || "",
          employee.pangkat || "",
          employee.position || "",
          employee.sub_position || "",
          employee.organizational_level || "",
        );
      }
    });

    transaction();
    return employees.length;
  }

  /**
   * Get employee org level mapping (compatibility method)
   */
  getEmployeeOrgLevelMapping() {
    const stmt = this.getDb().prepare(`
      SELECT organizational_level, COUNT(*) as count
      FROM employees
      GROUP BY organizational_level
      ORDER BY count DESC
    `);
    return stmt.all();
  }

  /**
   * Get current dataset ID (compatibility method)
   */
  getCurrentDatasetId() {
    const stmt = this.getDb().prepare(`
      SELECT session_id as id FROM upload_sessions
      ORDER BY upload_timestamp DESC
      LIMIT 1
    `);
    const result = stmt.get();
    return isDatasetIdRow(result) ? result.id : null;
  }

  /**
   * Get all manual leadership scores (compatibility method)
   */
  getAllManualLeadershipScores(datasetId: string) {
    const stmt = this.getDb().prepare(`
      SELECT employee_name, score, updated_at
      FROM manual_leadership_scores
      WHERE dataset_id = ?
      ORDER BY employee_name
    `);
    return stmt.all(datasetId);
  }

  /**
   * Set manual leadership score (compatibility method)
   */
  setManualLeadershipScore(
    datasetId: string,
    employeeName: string,
    score: number,
  ) {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, score, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(datasetId, employeeName, score, new Date().toISOString());
  }

  /**
   * Bulk update manual leadership scores (compatibility method)
   */
  bulkUpdateManualLeadershipScores(
    datasetId: string,
    scores: Record<string, number>,
  ) {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO manual_leadership_scores (dataset_id, employee_name, score, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = this.getDb().transaction(() => {
      const timestamp = new Date().toISOString();
      for (const [employeeName, score] of Object.entries(scores)) {
        stmt.run(datasetId, employeeName, score, timestamp);
      }
    });

    transaction();
  }

  /**
   * Get error details (compatibility method)
   */
  getErrorDetails() {
    return this.errorDetails;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    const employeeCount = this.extractCount(
      this.getDb().prepare("SELECT COUNT(*) as count FROM employees").get(),
    );
    const competencyCount = this.extractCount(
      this.getDb().prepare("SELECT COUNT(*) as count FROM competencies").get(),
    );
    const performanceCount = this.extractCount(
      this.getDb()
        .prepare("SELECT COUNT(*) as count FROM employee_performance")
        .get(),
    );
    const sessionCount = this.extractCount(
      this.getDb()
        .prepare("SELECT COUNT(*) as count FROM upload_sessions")
        .get(),
    );

    return {
      employees: employeeCount,
      competencies: competencyCount,
      performanceRecords: performanceCount,
      sessions: sessionCount,
    };
  }

  /**
   * Optimize database (analyze and vacuum)
   */
  optimizeDatabase() {
    this.getDb().exec("ANALYZE");
    this.getDb().exec("VACUUM");
    logger.info("Database optimized");
  }

  isReady(): boolean {
    return this.isInitialized && !!this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  private extractCount(row: unknown): number {
    return isCountRow(row) ? row.count : 0;
  }
}

export default SQLiteService;
