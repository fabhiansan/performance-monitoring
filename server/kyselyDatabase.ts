/**
 * Modern Kysely-based Database Service
 * 
 * Type-safe database operations using Kysely query builder
 */

import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../services/logger.js';
import {
  CREATE_INDEXES_SQL,
  CREATE_TABLES_SQL,
  type DatabaseSchema,
  type NewEmployeeRow,
  type EmployeeRow
} from './database.schema.js';
import type { Employee } from '../types.js';

export class KyselyDatabaseService {
  private db: Kysely<DatabaseSchema>;
  private sqlite: Database.Database;
  private dbPath: string;
  private isInitialized = false;
  private initError: string | null = null;

  constructor(dbPath?: string | null) {
    this.dbPath = this.resolveDatabasePath(dbPath);
    
    try {
      this.sqlite = new Database(this.dbPath);
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.pragma('foreign_keys = ON');
      
      this.db = new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({
          database: this.sqlite
        })
      });
      
      logger.info('Kysely database service created', { dbPath: this.dbPath });
    } catch (error) {
      const errorMessage = `Failed to create database: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage, { dbPath: this.dbPath });
      throw new Error(errorMessage);
    }
  }

  /**
   * Initialize database with tables and indexes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing Kysely database...');
      
      // Create tables
      for (const [tableName, sql] of Object.entries(CREATE_TABLES_SQL)) {
        this.sqlite.exec(sql);
        logger.debug(`Created table: ${tableName}`);
      }

      // Create indexes
      for (const indexSql of CREATE_INDEXES_SQL) {
        this.sqlite.exec(indexSql);
      }

      this.isInitialized = true;
      this.initError = null;
      logger.info('Kysely database initialized successfully');
      
    } catch (error) {
      const errorMessage = `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`;
      this.initError = errorMessage;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.isInitialized && !this.initError;
  }

  /**
   * Get error details
   */
  getErrorDetails(): { error: string | null; initialized: boolean } {
    return {
      error: this.initError,
      initialized: this.isInitialized
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    try {
      this.db.destroy();
      this.sqlite.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Employee Operations

  /**
   * Add new employee to master table
   */
  async addEmployee(employeeData: NewEmployeeRow): Promise<number> {
    const result = await this.db
      .insertInto('employee_database')
      .values({
        ...employeeData,
        created_at: new Date().toISOString(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return result.id;
  }

  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<Employee[]> {
    const employees = await this.db
      .selectFrom('employee_database')
      .selectAll()
      .orderBy('name')
      .execute();

    return employees.map(this.mapEmployeeRowToEmployee);
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: number): Promise<Employee | null> {
    const employee = await this.db
      .selectFrom('employee_database')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!employee) return null;
    return this.mapEmployeeRowToEmployee(employee);
  }

  /**
   * Update employee
   */
  async updateEmployee(id: number, employeeData: Omit<NewEmployeeRow, 'created_at'>): Promise<void> {
    await this.db
      .updateTable('employee_database')
      .set({
        name: employeeData.name,
        nip: employeeData.nip,
        gol: employeeData.gol,
        pangkat: employeeData.pangkat,
        position: employeeData.position,
        sub_position: employeeData.sub_position,
        organizational_level: employeeData.organizational_level,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', id)
      .execute();
  }

  /**
   * Delete employee
   */
  async deleteEmployee(id: number): Promise<void> {
    await this.db
      .deleteFrom('employee_database')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Bulk delete employees
   */
  async bulkDeleteEmployees(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await this.db
      .deleteFrom('employee_database')
      .where('id', 'in', ids)
      .execute();
  }

  /**
   * Get employee suggestions by name
   */
  async getEmployeeSuggestions(nameQuery: string, limit = 5): Promise<Array<{id: number; name: string; organizational_level: string | null}>> {
    return await this.db
      .selectFrom('employee_database')
      .select(['id', 'name', 'organizational_level'])
      .where('name', 'like', `%${nameQuery}%`)
      .orderBy('name')
      .limit(limit)
      .execute();
  }

  /**
   * Get organizational level mapping
   */
  async getEmployeeOrgLevelMapping(): Promise<Record<string, string>> {
    const result = await this.db
      .selectFrom('employee_database')
      .select(['name', 'organizational_level'])
      .where('organizational_level', 'is not', null)
      .execute();

    const mapping: Record<string, string> = {};
    for (const row of result) {
      if (row.name && row.organizational_level) {
        mapping[row.name] = row.organizational_level;
      }
    }
    return mapping;
  }

  async getOrgLevelCounts(): Promise<Record<string, number>> {
    const result = await this.db
      .selectFrom('employee_database')
      .select(['organizational_level'])
      .select((eb) => eb.fn.count('id').as('count'))
      .where('organizational_level', 'is not', null)
      .groupBy('organizational_level')
      .execute();

    const mapping: Record<string, number> = {};
    for (const row of result) {
      if (row.organizational_level) {
        mapping[row.organizational_level] = Number(row.count);
      }
    }
    return mapping;
  }

  // Session Operations

  /**
   * Save employee data with period
   */
  async saveEmployeeData(employees: Employee[], sessionName?: string): Promise<string> {
    const period = sessionName || new Date().toISOString();

    try {
      // Insert or get existing employees and their performance data
      for (const employee of employees) {
        // Try to find existing employee by name and NIP
        let employeeId: number;
        const existingEmployee = await this.db
          .selectFrom('employee_database')
          .select('id')
          .where('name', '=', employee.name)
          .where('nip', '=', employee.nip || null)
          .executeTakeFirst();

        if (existingEmployee) {
          employeeId = existingEmployee.id;
        } else {
          // Create new master employee
          employeeId = await this.addEmployee({
            name: employee.name,
            nip: employee.nip || null,
            gol: employee.gol || null,
            pangkat: employee.pangkat || null,
            position: employee.position || null,
            sub_position: employee.sub_position || null,
            organizational_level: employee.organizational_level || null
          });
        }

        // Insert performance scores
        if (employee.performance && employee.performance.length > 0) {
          for (const perf of employee.performance) {
            // Create competency first or use existing one
            const competencyId = await this.getOrCreateCompetency(perf.name, period);
            await this.addPerformanceScore(employeeId, competencyId, perf.score, period);
          }
        }
      }

      return period;
    } catch (error) {
      logger.error('Error saving employee data', { error: error instanceof Error ? error.message : String(error), period });
      throw error;
    }
  }

  /**
   * Get all periods
   */
  async getAllUploadSessions(): Promise<Array<{
    period: string;
    employee_count: number;
    competency_count: number;
    latest_upload: string;
  }>> {
    const periods = await this.db
      .selectFrom('performance_scores')
      .select('period')
      .distinct()
      .execute();

    const result = [];
    for (const { period } of periods) {
      const stats = await this.getPeriodStats(period);
      result.push({
        period,
        employee_count: stats.employee_count,
        competency_count: stats.competency_count,
        latest_upload: stats.latest_upload
      });
    }

    return result.sort((a, b) => b.latest_upload.localeCompare(a.latest_upload));
  }

  /**
   * Get statistics for a period
   */
  private async getPeriodStats(period: string): Promise<{
    employee_count: number;
    competency_count: number;
    latest_upload: string;
  }> {
    const employeeCount = await this.db
      .selectFrom('performance_scores')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('period', '=', period)
      .select('employee_id')
      .distinct()
      .execute();

    const competencyCount = await this.db
      .selectFrom('competencies')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('period', '=', period)
      .executeTakeFirst();

    const latestUpload = await this.db
      .selectFrom('performance_scores')
      .select('created_at')
      .where('period', '=', period)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    return {
      employee_count: employeeCount.length,
      competency_count: Number(competencyCount?.count || 0),
      latest_upload: latestUpload?.created_at || new Date().toISOString()
    };
  }

  /**
   * Get employee data by period
   */
  async getEmployeeDataBySession(period: string): Promise<Employee[]> {
    // First check if there are any performance scores for this period
    const hasPerformanceData = await this.db
      .selectFrom('performance_scores')
      .select(['employee_id'])
      .where('period', '=', period)
      .limit(1)
      .execute();

    if (hasPerformanceData.length === 0) {
      // No performance data for this period, return empty array
      return [];
    }

    // Get employees who have performance scores in this period
    const employeesWithScores = await this.db
      .selectFrom('performance_scores')
      .select(['employee_id'])
      .where('period', '=', period)
      .distinct()
      .execute();

    const employeeIds = employeesWithScores.map(score => score.employee_id);

    if (employeeIds.length === 0) {
      return [];
    }

    // Get full employee data
    const employees = await this.db
      .selectFrom('employee_database')
      .selectAll()
      .where('id', 'in', employeeIds)
      .orderBy('name')
      .execute();

    // Get performance data for each employee in this period
    const employeesWithPerformance: Employee[] = [];

    for (const emp of employees) {
      const performance = await this.db
        .selectFrom('performance_scores')
        .leftJoin('competencies', 'performance_scores.competency_id', 'competencies.id')
        .select(['competencies.name', 'performance_scores.score'])
        .where('performance_scores.employee_id', '=', emp.id)
        .where('performance_scores.period', '=', period)
        .execute();

      employeesWithPerformance.push({
        ...this.mapEmployeeRowToEmployee(emp),
        performance: performance.map(p => ({
          name: p.name || 'Unknown',
          score: p.score
        }))
      });
    }

    return employeesWithPerformance;
  }

  /**
   * Delete period data - only delete period-based data, keep master employees
   */
  async deleteUploadSession(period: string): Promise<void> {
    // Delete in correct order due to foreign key constraints
    // Note: We keep master employees, only delete period-based performance data
    await this.db.deleteFrom('performance_scores').where('period', '=', period).execute();
    await this.db.deleteFrom('competencies').where('period', '=', period).execute();
  }

  // Dataset Operations

  /**
   * Save current dataset
   */
  async saveCurrentDataset(employees: Employee[], name?: string): Promise<string> {
    const datasetId = this.generateDatasetId();
    const datasetName = name || `Dataset_${new Date().toISOString()}`;
    
    await this.db
      .insertInto('current_dataset')
      .values({
        id: datasetId,
        name: datasetName,
        data: JSON.stringify(employees),
        created_at: new Date().toISOString(),
        employee_count: employees.length
      })
      .onConflict((oc) => oc.column('id').doUpdateSet({
        name: datasetName,
        data: JSON.stringify(employees),
        employee_count: employees.length
      }))
      .execute();

    return datasetId;
  }

  /**
   * Get current dataset
   */
  async getCurrentDataset(): Promise<Employee[] | null> {
    const dataset = await this.db
      .selectFrom('current_dataset')
      .selectAll()
      .executeTakeFirst();

    if (!dataset) return null;

    try {
      return JSON.parse(dataset.data);
    } catch (error) {
      logger.error('Failed to parse current dataset data', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Get current dataset ID
   */
  async getCurrentDatasetId(): Promise<string | null> {
    const result = await this.db
      .selectFrom('current_dataset')
      .select('id')
      .executeTakeFirst();

    return result?.id || null;
  }

  /**
   * Clear current dataset
   */
  async clearCurrentDataset(): Promise<void> {
    await this.db.deleteFrom('current_dataset').execute();
  }

  // Leadership Score Operations

  /**
   * Set manual leadership score
   */
  async setManualLeadershipScore(datasetId: string, employeeName: string, score: number): Promise<void> {
    await this.db
      .insertInto('manual_leadership_scores')
      .values({
        dataset_id: datasetId,
        employee_name: employeeName,
        score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflict((oc) => oc.columns(['dataset_id', 'employee_name']).doUpdateSet({
        score,
        updated_at: new Date().toISOString()
      }))
      .execute();
  }

  /**
   * Get all manual leadership scores for dataset
   */
  async getAllManualLeadershipScores(datasetId: string): Promise<Array<{
    employee_name: string;
    score: number;
    created_at: string;
    updated_at: string;
  }>> {
    return await this.db
      .selectFrom('manual_leadership_scores')
      .select(['employee_name', 'score', 'created_at', 'updated_at'])
      .where('dataset_id', '=', datasetId)
      .orderBy('employee_name')
      .execute();
  }

  // Helper Methods

  /**
   * Get or create competency
   */
  private async getOrCreateCompetency(competencyName: string, period: string): Promise<number> {
    // Try to find existing competency
    const existing = await this.db
      .selectFrom('competencies')
      .select('id')
      .where('name', '=', competencyName)
      .where('period', '=', period)
      .executeTakeFirst();

    if (existing) {
      return existing.id;
    }

    // Create new competency
    const result = await this.db
      .insertInto('competencies')
      .values({
        name: competencyName,
        category: null,
        weight: 1.0,
        applicable_to: 'all',
        period: period,
        created_at: new Date().toISOString()
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return result.id;
  }

  /**
   * Add performance score
   */
  private async addPerformanceScore(employeeId: number, competencyId: number, score: number, period: string): Promise<number> {
    const result = await this.db
      .insertInto('performance_scores')
      .values({
        employee_id: employeeId,
        competency_id: competencyId,
        score,
        period: period,
        created_at: new Date().toISOString()
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return result.id;
  }

  /**
   * Map database row to Employee type
   */
  private mapEmployeeRowToEmployee(row: EmployeeRow): Employee {
    return {
      id: row.id,
      name: row.name,
      nip: row.nip || '',
      gol: row.gol || '',
      pangkat: row.pangkat || '',
      position: row.position || '',
      sub_position: row.sub_position || '',
      organizational_level: row.organizational_level || 'Staff/Other',
      performance: [] // Will be populated separately if needed
    };
  }

  /**
   * Resolve database path
   */
  private resolveDatabasePath(dbPath?: string | null): string {
    if (dbPath) {
      return path.resolve(dbPath);
    }

    // Default database location
    const defaultPath = path.join(process.cwd(), 'server', 'performance_analyzer.db');
    
    // Ensure directory exists
    const dbDir = path.dirname(defaultPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return defaultPath;
  }

  /**
   * Generate dataset ID
   */
  private generateDatasetId(): string {
    return `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Additional utility methods can be added here...
}
