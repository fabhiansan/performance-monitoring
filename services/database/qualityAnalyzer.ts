/**
 * Data Quality Analyzer
 * 
 * Analyzes data quality and provides recommendations
 */

import { Employee } from '../../types';
import { DataIntegrityResult } from '../dataIntegrityService';
import { ValidationResult } from '../validationService';

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  overall: number;
}

export interface QualityReport {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: QualityMetrics;
  issues: {
    critical: string[];
    warnings: string[];
    suggestions: string[];
  };
  recommendations: Array<{
    type: 'immediate' | 'improvement' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
  }>;
}

export class DataQualityAnalyzer {
  
  /**
   * Analyze overall data quality
   */
  analyzeDataQuality(
    data: Employee[],
    integrityResult?: DataIntegrityResult,
    validationResult?: ValidationResult
  ): QualityReport {
    const metrics = this.calculateQualityMetrics(data, integrityResult, validationResult);
    const overallScore = this.calculateOverallScore(metrics, integrityResult, validationResult);
    const level = this.determineQualityLevel(overallScore);
    const issues = this.identifyIssues(data, integrityResult, validationResult);
    const recommendations = this.generateRecommendations(metrics, issues, level);

    return {
      score: overallScore,
      level,
      metrics,
      issues,
      recommendations
    };
  }

  /**
   * Calculate individual quality metrics
   */
  private calculateQualityMetrics(
    data: Employee[],
    integrityResult?: DataIntegrityResult,
    validationResult?: ValidationResult
  ): QualityMetrics {
    const completeness = this.calculateCompleteness(data);
    const accuracy = this.calculateAccuracy(data, validationResult);
    const consistency = this.calculateConsistency(data);
    const validity = this.calculateValidity(data, integrityResult);
    const overall = (completeness + accuracy + consistency + validity) / 4;

    return { completeness, accuracy, consistency, validity, overall };
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(data: Employee[]): number {
    if (data.length === 0) return 0;

    let totalFields = 0;
    let completedFields = 0;

    data.forEach(employee => {
      const fields = [
        employee.name,
        employee.nip,
        employee.gol,
        employee.pangkat,
        employee.position,
        employee.sub_position,
        employee.organizational_level
      ];

      totalFields += fields.length;
      completedFields += fields.filter(field => field && field.trim() !== '').length;

      // Performance data completeness
      totalFields += 1; // performance array
      if (employee.performance && employee.performance.length > 0) {
        completedFields += 1;
      }
    });

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }

  /**
   * Calculate data accuracy score
   */
  private calculateAccuracy(data: Employee[], validationResult?: ValidationResult): number {
    let score = 100;

    // Deduct points for validation errors
    if (validationResult) {
      const errorPenalty = Math.min(validationResult.errors.length * 5, 50);
      const warningPenalty = Math.min(validationResult.warnings.length * 2, 30);
      score -= errorPenalty + warningPenalty;
    }

    // Check for obvious data quality issues
    const issues = this.findAccuracyIssues(data);
    score -= Math.min(issues.length * 3, 20);

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate data consistency score
   */
  private calculateConsistency(data: Employee[]): number {
    if (data.length === 0) return 100;

    let inconsistencies = 0;
    
    // Check organizational level consistency
    const orgLevels = new Set(data.map(emp => emp.organizational_level));
    if (orgLevels.size > 6) { // More than expected org levels
      inconsistencies += Math.min(orgLevels.size - 6, 5);
    }

    // Check naming patterns
    const namingInconsistencies = this.checkNamingConsistency(data);
    inconsistencies += namingInconsistencies;

    // Check performance data structure consistency
    const performanceInconsistencies = this.checkPerformanceConsistency(data);
    inconsistencies += performanceInconsistencies;

    const score = Math.max(0, 100 - (inconsistencies * 5));
    return Math.round(score);
  }

  /**
   * Calculate data validity score
   */
  private calculateValidity(data: Employee[], integrityResult?: DataIntegrityResult): number {
    let score = integrityResult?.summary?.integrityScore || 100;

    // Check for invalid data patterns
    const invalidPatterns = this.findInvalidPatterns(data);
    score -= Math.min(invalidPatterns.length * 10, 40);

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(
    metrics: QualityMetrics,
    integrityResult?: DataIntegrityResult,
    validationResult?: ValidationResult
  ): number {
    let score = metrics.overall;

    // Apply additional penalties for critical issues
    if (integrityResult && !integrityResult.isValid) {
      score *= 0.8; // 20% penalty for integrity issues
    }

    if (validationResult && validationResult.errors.length > 0) {
      score *= 0.9; // 10% penalty for validation errors
    }

    return Math.round(score);
  }

  /**
   * Determine quality level based on score
   */
  private determineQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Identify specific data issues
   */
  private identifyIssues(
    data: Employee[],
    integrityResult?: DataIntegrityResult,
    validationResult?: ValidationResult
  ): QualityReport['issues'] {
    const critical: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Critical issues
    if (data.length === 0) {
      critical.push('No employee data found');
    }

    if (integrityResult && !integrityResult.isValid) {
      critical.push('Data integrity validation failed');
    }

    // Validation errors as critical
    if (validationResult?.errors) {
      critical.push(...validationResult.errors.map(err => `Validation error: ${err}`));
    }

    // Warnings
    if (validationResult?.warnings) {
      warnings.push(...validationResult.warnings.map(warn => `Validation warning: ${warn}`));
    }

    const missingData = this.findMissingDataIssues(data);
    warnings.push(...missingData);

    // Suggestions
    if (data.length > 0) {
      const inconsistencies = this.findConsistencyIssues(data);
      suggestions.push(...inconsistencies);
    }

    return { critical, warnings, suggestions };
  }

  /**
   * Generate quality improvement recommendations
   */
  private generateRecommendations(
    metrics: QualityMetrics,
    issues: QualityReport['issues'],
    level: QualityReport['level']
  ): QualityReport['recommendations'] {
    const recommendations: QualityReport['recommendations'] = [];

    // Critical recommendations
    if (issues.critical.length > 0) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        description: 'Address critical data integrity issues before proceeding',
        impact: 'Essential for data reliability and system stability'
      });
    }

    // Completeness recommendations
    if (metrics.completeness < 80) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        description: 'Improve data completeness by filling missing required fields',
        impact: 'Better reporting accuracy and analysis capabilities'
      });
    }

    // Accuracy recommendations
    if (metrics.accuracy < 70) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        description: 'Review and correct data accuracy issues',
        impact: 'Improved decision-making based on reliable data'
      });
    }

    // Consistency recommendations
    if (metrics.consistency < 70) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        description: 'Standardize data formats and naming conventions',
        impact: 'Better data integration and automated processing'
      });
    }

    // Maintenance recommendations
    if (level === 'good' || level === 'excellent') {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        description: 'Implement regular data quality monitoring',
        impact: 'Maintain current quality levels and prevent degradation'
      });
    }

    return recommendations;
  }

  // Helper methods for specific quality checks

  private findAccuracyIssues(data: Employee[]): string[] {
    const issues: string[] = [];

    data.forEach((employee, index) => {
      // Check for obviously invalid names
      if (employee.name && (employee.name.length < 2 || /\d{5,}/.test(employee.name))) {
        issues.push(`Employee ${index + 1}: Suspicious name pattern`);
      }

      // Check for invalid scores
      if (employee.performance) {
        employee.performance.forEach(perf => {
          if (perf.score < 0 || perf.score > 100) {
            issues.push(`Employee ${index + 1}: Invalid performance score: ${perf.score}`);
          }
        });
      }
    });

    return issues;
  }

  private checkNamingConsistency(data: Employee[]): number {
    const namingPatterns = new Set();
    
    data.forEach(employee => {
      if (employee.name) {
        // Check naming pattern (number of words, capitalization, etc.)
        const pattern = this.analyzeNamingPattern(employee.name);
        namingPatterns.add(pattern);
      }
    });

    // More than 3 different naming patterns might indicate inconsistency
    return Math.max(0, namingPatterns.size - 3);
  }

  private checkPerformanceConsistency(data: Employee[]): number {
    const competencySets = data
      .filter(emp => emp.performance && emp.performance.length > 0)
      .map(emp => new Set(emp.performance.map(perf => perf.name)).size);

    if (competencySets.length === 0) return 0;

    const avgCompetencies = competencySets.reduce((sum, count) => sum + count, 0) / competencySets.length;
    const variance = competencySets.reduce((sum, count) => sum + Math.pow(count - avgCompetencies, 2), 0) / competencySets.length;

    // High variance in competency counts indicates inconsistency
    return variance > 10 ? Math.floor(variance / 5) : 0;
  }

  private findInvalidPatterns(data: Employee[]): string[] {
    const patterns: string[] = [];

    data.forEach((employee, index) => {
      // Check for placeholder values
      if (this.isPlaceholderValue(employee.name)) {
        patterns.push(`Employee ${index + 1}: Placeholder name detected`);
      }

      // Check for duplicate employees (same name)
      const duplicates = data.filter(emp => emp.name === employee.name);
      if (duplicates.length > 1) {
        patterns.push(`Duplicate employee name: ${employee.name}`);
      }
    });

    return [...new Set(patterns)]; // Remove duplicates
  }

  private findMissingDataIssues(data: Employee[]): string[] {
    const issues: string[] = [];
    
    const missingNames = data.filter(emp => !emp.name || emp.name.trim() === '').length;
    if (missingNames > 0) {
      issues.push(`${missingNames} employees missing names`);
    }

    const missingPerformance = data.filter(emp => !emp.performance || emp.performance.length === 0).length;
    if (missingPerformance > 0) {
      issues.push(`${missingPerformance} employees missing performance data`);
    }

    return issues;
  }

  private findConsistencyIssues(data: Employee[]): string[] {
    const issues: string[] = [];

    // Check for mixed data formats
    const nipFormats = new Set(data.map(emp => this.analyzeNipFormat(emp.nip ?? '')));
    if (nipFormats.size > 2) {
      issues.push('Consider standardizing NIP formats across all employees');
    }

    // Check for organizational level distribution
    const orgLevelCounts = new Map<string, number>();
    data.forEach(emp => {
      const level = emp.organizational_level || 'Unknown';
      orgLevelCounts.set(level, (orgLevelCounts.get(level) || 0) + 1);
    });

    const levels = Array.from(orgLevelCounts.keys());
    if (levels.includes('Unknown') && orgLevelCounts.get('Unknown')! > data.length * 0.3) {
      issues.push('Consider assigning organizational levels to employees with unknown levels');
    }

    return issues;
  }

  private analyzeNamingPattern(name: string): string {
    const wordCount = name.split(/\s+/).length;
    const hasNumbers = /\d/.test(name);
    const isAllCaps = name === name.toUpperCase();
    
    return `${wordCount}-words-${hasNumbers ? 'with-numbers' : 'no-numbers'}-${isAllCaps ? 'caps' : 'mixed'}`;
  }

  private analyzeNipFormat(nip: string): string {
    if (!nip || nip.trim() === '') return 'empty';
    
    const hasSpaces = /\s/.test(nip);
    const hasDashes = /-/.test(nip);
    const length = nip.replace(/\s|-/g, '').length;
    
    return `${length}-digits-${hasSpaces ? 'spaces' : 'no-spaces'}-${hasDashes ? 'dashes' : 'no-dashes'}`;
  }

  private isPlaceholderValue(value: string): boolean {
    const placeholders = [
      'test', 'example', 'placeholder', 'dummy', 'sample',
      'unknown', 'n/a', 'tbd', 'todo', 'temp'
    ];
    
    const normalized = value.toLowerCase().trim();
    return placeholders.some(placeholder => normalized.includes(placeholder));
  }
}
