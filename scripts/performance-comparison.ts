#!/usr/bin/env node

/**
 * Performance Comparison Script
 * Compares query performance between denormalized and normalized schemas
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';

// Constants for repeated strings
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';
const DENORMALIZED_QUERY_FAILED = '⚠️ Denormalized query failed';
const NORMALIZED_QUERY_FAILED = '⚠️ Normalized query failed';

interface BenchmarkResult {
  name: string;
  avgTimeMs: number;
  iterations: number;
}

class PerformanceComparison {
  private db: Database.Database;
  private results: BenchmarkResult[] = [];

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.results = [];
  }

  /**
   * Benchmark a query and return execution time
   */
  benchmark(name: string, query: string, params: unknown[] = []) {
    const stmt = this.db.prepare(query);
    
    // Warm up
    for (let i = 0; i < 3; i++) {
      stmt.all(...params);
    }
    
    // Actual benchmark
    const iterations = 100;
    const start = process.hrtime.bigint();
    
    for (let i = 0; i < iterations; i++) {
      stmt.all(...params);
    }
    
    const end = process.hrtime.bigint();
    const avgTimeMs = Number(end - start) / 1000000 / iterations;
    
    return {
      name,
      avgTimeMs: parseFloat(avgTimeMs.toFixed(3)),
      iterations
    };
  }

  /**
   * Test competency-based filtering queries
   */
  testCompetencyFiltering() {
    console.log('🔍 Testing competency-based filtering...');
    
    // Current denormalized approach (requires JSON parsing)
    const denormalizedQuery = `
      SELECT name, 
             JSON_EXTRACT(performance_data, '$[0].score') as score
      FROM employee_data 
      WHERE JSON_EXTRACT(performance_data, '$[0].name') = 'orientasi pelayanan'
        AND JSON_EXTRACT(performance_data, '$[0].score') > 80
    `;
    
    // Normalized approach (direct index lookup)
    const normalizedQuery = `
      SELECT e.name, ep.score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      JOIN competencies c ON ep.competency_id = c.id
      WHERE c.name = 'orientasi pelayanan' AND ep.score > 80
    `;
    
    try {
      const denormalizedResult = this.benchmark('Denormalized Competency Filter', denormalizedQuery);
      this.results.push(denormalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${DENORMALIZED_QUERY_FAILED} (table may not exist):`, errorMessage);
    }
    
    try {
      const normalizedResult = this.benchmark('Normalized Competency Filter', normalizedQuery);
      this.results.push(normalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${NORMALIZED_QUERY_FAILED} (table may not exist):`, errorMessage);
    }
  }

  /**
   * Test competency average calculations
   */
  testCompetencyAverages() {
    console.log('📊 Testing competency average calculations...');
    
    // Current approach (complex JSON aggregation)
    const denormalizedQuery = `
      WITH competency_scores AS (
        SELECT 
          name,
          json_each.value as perf_json
        FROM employee_data,
             json_each(employee_data.performance_data)
        WHERE performance_data IS NOT NULL
      ),
      parsed_scores AS (
        SELECT 
          name,
          JSON_EXTRACT(perf_json, '$.name') as competency_name,
          JSON_EXTRACT(perf_json, '$.score') as score
        FROM competency_scores
      )
      SELECT 
        competency_name,
        AVG(CAST(score AS REAL)) as avg_score,
        COUNT(*) as employee_count
      FROM parsed_scores
      WHERE competency_name IS NOT NULL
      GROUP BY competency_name
      ORDER BY avg_score DESC
    `;
    
    // Normalized approach (simple aggregation)
    const normalizedQuery = `
      SELECT 
        c.name as competency_name,
        AVG(ep.score) as avg_score,
        COUNT(*) as employee_count
      FROM competencies c
      JOIN employee_performance ep ON c.id = ep.competency_id
      GROUP BY c.id, c.name
      ORDER BY avg_score DESC
    `;
    
    try {
      const denormalizedResult = this.benchmark('Denormalized Competency Averages', denormalizedQuery);
      this.results.push(denormalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${DENORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
    
    try {
      const normalizedResult = this.benchmark('Normalized Competency Averages', normalizedQuery);
      this.results.push(normalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${NORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
  }

  /**
   * Test employee performance lookup
   */
  testEmployeePerformanceLookup() {
    console.log('👤 Testing employee performance lookup...');
    
    // Current approach (JSON parsing for each employee)
    const denormalizedQuery = `
      SELECT 
        name,
        performance_data
      FROM employee_data
      WHERE name LIKE '%John%'
    `;
    
    // Normalized approach (efficient joins)
    const normalizedQuery = `
      SELECT 
        e.name,
        c.name as competency_name,
        ep.score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      JOIN competencies c ON ep.competency_id = c.id
      WHERE e.name LIKE '%John%'
      ORDER BY e.name, c.name
    `;
    
    try {
      const denormalizedResult = this.benchmark('Denormalized Employee Lookup', denormalizedQuery);
      this.results.push(denormalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${DENORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
    
    try {
      const normalizedResult = this.benchmark('Normalized Employee Lookup', normalizedQuery);
      this.results.push(normalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${NORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
  }

  /**
   * Test organizational level performance summary
   */
  testOrgLevelSummary() {
    console.log('🏢 Testing organizational level performance summary...');
    
    // Current approach (complex JSON processing)
    const denormalizedQuery = `
      WITH employee_avg_scores AS (
        SELECT 
          name,
          organizational_level,
          (
            SELECT AVG(CAST(JSON_EXTRACT(value, '$.score') AS REAL))
            FROM json_each(performance_data)
            WHERE JSON_EXTRACT(value, '$.score') IS NOT NULL
          ) as avg_score
        FROM employee_data
        WHERE performance_data IS NOT NULL
      )
      SELECT 
        organizational_level,
        COUNT(*) as employee_count,
        AVG(avg_score) as org_avg_score,
        MIN(avg_score) as min_score,
        MAX(avg_score) as max_score
      FROM employee_avg_scores
      WHERE avg_score IS NOT NULL
      GROUP BY organizational_level
      ORDER BY org_avg_score DESC
    `;
    
    // Normalized approach (efficient aggregation)
    const normalizedQuery = `
      SELECT 
        e.organizational_level,
        COUNT(DISTINCT e.id) as employee_count,
        AVG(ep.score) as org_avg_score,
        MIN(ep.score) as min_score,
        MAX(ep.score) as max_score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      GROUP BY e.organizational_level
      ORDER BY org_avg_score DESC
    `;
    
    try {
      const denormalizedResult = this.benchmark('Denormalized Org Level Summary', denormalizedQuery);
      this.results.push(denormalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${DENORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
    
    try {
      const normalizedResult = this.benchmark('Normalized Org Level Summary', normalizedQuery);
      this.results.push(normalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${NORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
  }

  /**
   * Test top performers query
   */
  testTopPerformers() {
    console.log('🏆 Testing top performers query...');
    
    // Current approach (complex JSON processing)
    const denormalizedQuery = `
      WITH employee_scores AS (
        SELECT 
          name,
          organizational_level,
          (
            SELECT AVG(CAST(JSON_EXTRACT(value, '$.score') AS REAL))
            FROM json_each(performance_data)
            WHERE JSON_EXTRACT(value, '$.score') IS NOT NULL
          ) as avg_score
        FROM employee_data
        WHERE performance_data IS NOT NULL
      )
      SELECT name, organizational_level, avg_score
      FROM employee_scores
      WHERE avg_score IS NOT NULL
      ORDER BY avg_score DESC
      LIMIT 10
    `;
    
    // Normalized approach (efficient aggregation with limit)
    const normalizedQuery = `
      SELECT 
        e.name,
        e.organizational_level,
        AVG(ep.score) as avg_score
      FROM employees e
      JOIN employee_performance ep ON e.id = ep.employee_id
      GROUP BY e.id, e.name, e.organizational_level
      ORDER BY avg_score DESC
      LIMIT 10
    `;
    
    try {
      const denormalizedResult = this.benchmark('Denormalized Top Performers', denormalizedQuery);
      this.results.push(denormalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${DENORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
    
    try {
      const normalizedResult = this.benchmark('Normalized Top Performers', normalizedQuery);
      this.results.push(normalizedResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log(`${NORMALIZED_QUERY_FAILED}:`, errorMessage);
    }
  }

  /**
   * Analyze database size and structure
   */
  analyzeDatabaseSize() {
    console.log('💾 Analyzing database size and structure...');
    
    try {
      // Get table sizes
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      console.log('\n📋 Table Information:');
      for (const table of tables) {
        try {
          const tableName = (table as { name: string }).name;
          const count = (this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }).count;
          const size = this.db.prepare(`
            SELECT SUM(pgsize) as size 
            FROM dbstat 
            WHERE name = ?
          `).get(tableName);
          
          console.log(`   ${tableName}: ${count} rows, ${(size as { size?: number } | null)?.size || 'N/A'} bytes`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
          console.log(`   ${(table as { name: string }).name}: Error getting stats - ${errorMessage}`);
        }
      }
      
      // Get index information
      const indexes = this.db.prepare(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();
      
      console.log('\n🔍 Index Information:');
      for (const index of indexes) {
        console.log(`   ${(index as { name: string; tbl_name: string }).name} on ${(index as { name: string; tbl_name: string }).tbl_name}`);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      console.log('⚠️ Error analyzing database:', errorMessage);
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE COMPARISON REPORT');
    console.log('='.repeat(60));
    
    if (this.results.length === 0) {
      console.log('❌ No benchmark results available');
      return;
    }
    
    // Group results by query type
    const grouped: Record<string, BenchmarkResult[]> = {};
    for (const result of this.results) {
      const type = result.name.split(' ').slice(1).join(' ');
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(result);
    }
    
    for (const [queryType, results] of Object.entries(grouped)) {
      console.log(`\n🔍 ${queryType}:`);
      
      const denormalized = (results as BenchmarkResult[]).find(r => r.name.includes('Denormalized'));
      const normalized = (results as BenchmarkResult[]).find(r => r.name.includes('Normalized'));
      
      if (denormalized) {
        console.log(`   Denormalized: ${denormalized.avgTimeMs}ms`);
      }
      
      if (normalized) {
        console.log(`   Normalized:   ${normalized.avgTimeMs}ms`);
      }
      
      if (denormalized && normalized) {
        const improvement = ((denormalized.avgTimeMs - normalized.avgTimeMs) / denormalized.avgTimeMs * 100);
        const speedup = (denormalized.avgTimeMs / normalized.avgTimeMs);
        
        if (improvement > 0) {
          console.log(`   ✅ Improvement: ${improvement.toFixed(1)}% faster (${speedup.toFixed(1)}x speedup)`);
        } else {
          console.log(`   ⚠️ Regression: ${Math.abs(improvement).toFixed(1)}% slower`);
        }
      }
    }
    
    // Overall summary
    const denormalizedResults = this.results.filter(r => r.name.includes('Denormalized'));
    const normalizedResults = this.results.filter(r => r.name.includes('Normalized'));
    
    if (denormalizedResults.length > 0 && normalizedResults.length > 0) {
      const avgDenormalized = denormalizedResults.reduce((sum: number, r: BenchmarkResult) => sum + r.avgTimeMs, 0) / denormalizedResults.length;
      const avgNormalized = normalizedResults.reduce((sum: number, r: BenchmarkResult) => sum + r.avgTimeMs, 0) / normalizedResults.length;
      const overallImprovement = ((avgDenormalized - avgNormalized) / avgDenormalized * 100);
      
      console.log('\n📈 OVERALL PERFORMANCE:');
      console.log(`   Average Denormalized: ${avgDenormalized.toFixed(3)}ms`);
      console.log(`   Average Normalized:   ${avgNormalized.toFixed(3)}ms`);
      console.log(`   Overall Improvement:  ${overallImprovement.toFixed(1)}%`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Migrate to normalized schema for better query performance');
    console.log('   2. Implement proper indexing strategy');
    console.log('   3. Use foreign key constraints for data integrity');
    console.log('   4. Consider partitioning for very large datasets');
    console.log('   5. Regular ANALYZE and VACUUM for optimal performance');
  }

  /**
   * Run all performance tests
   */
  runAllTests() {
    console.log('🚀 Starting performance comparison tests...');
    console.log('='.repeat(50));
    
    this.analyzeDatabaseSize();
    this.testCompetencyFiltering();
    this.testCompetencyAverages();
    this.testEmployeePerformanceLookup();
    this.testOrgLevelSummary();
    this.testTopPerformers();
    
    this.generateReport();
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
    console.log('💡 Usage: node performance-comparison.js <database-path>');
    process.exit(1);
  }
  
  const comparison = new PerformanceComparison(dbPath);
  
  try {
    comparison.runAllTests();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Performance comparison failed:', errorMessage);
  } finally {
    comparison.close();
  }
}

export default PerformanceComparison;
