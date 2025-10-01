import { z } from 'zod';
import { EmployeeSchema } from './employee.schemas';
import { CompetencyScoreSchema } from './competency.schemas';

/**
 * Performance Summary Schema
 */
export const PerformanceSummarySchema = z.object({
  employee_id: z.number().int().positive(),
  assessment_period: z.string().max(50),
  overall_score: z.number().min(0).max(100),
  competency_scores: z.array(CompetencyScoreSchema),
  strengths: z.array(z.string()).optional(),
  areas_for_improvement: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  ai_summary: z.string().max(2000).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

/**
 * Team Performance Schema
 */
export const TeamPerformanceSchema = z.object({
  team_name: z.string().min(1).max(255),
  organizational_level: z.string().max(100),
  member_count: z.number().int().positive(),
  average_score: z.number().min(0).max(100),
  score_distribution: z.record(z.string(), z.number().int().nonnegative()),
  top_performers: z.array(EmployeeSchema.pick({ id: true, name: true })),
  bottom_performers: z.array(EmployeeSchema.pick({ id: true, name: true })),
  competency_averages: z.record(z.string(), z.number().min(0).max(100))
});

/**
 * Performance Trends Schema
 */
export const PerformanceTrendsSchema = z.object({
  period: z.string(),
  trend_data: z.array(z.object({
    date: z.string().datetime(),
    average_score: z.number().min(0).max(100),
    total_assessments: z.number().int().nonnegative()
  })),
  growth_rate: z.number(),
  trend_direction: z.enum(['improving', 'declining', 'stable'])
});

/**
 * Performance Analytics Schema
 */
export const PerformanceAnalyticsSchema = z.object({
  overall_statistics: z.object({
    total_employees: z.number().int().nonnegative(),
    total_assessments: z.number().int().nonnegative(),
    average_score: z.number().min(0).max(100),
    score_variance: z.number().min(0),
    completion_rate: z.number().min(0).max(100)
  }),
  organizational_breakdown: z.array(TeamPerformanceSchema),
  competency_analysis: z.array(z.object({
    competency_name: z.string(),
    average_score: z.number().min(0).max(100),
    employee_count: z.number().int().nonnegative(),
    impact_score: z.number().min(0).max(100)
  })),
  trends: PerformanceTrendsSchema,
  recommendations: z.array(z.object({
    type: z.enum(['training', 'recognition', 'development', 'support']),
    priority: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    affected_employees: z.number().int().nonnegative()
  }))
});

/**
 * Performance Report Schema
 */
export const PerformanceReportSchema = z.object({
  report_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  report_type: z.enum(['individual', 'team', 'organizational', 'competency']),
  generated_at: z.string().datetime(),
  generated_by: z.string().max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  data: z.object({
    employees: z.array(EmployeeSchema).optional(),
    analytics: PerformanceAnalyticsSchema.optional(),
    summary: PerformanceSummarySchema.optional()
  }),
  export_format: z.enum(['json', 'pdf', 'excel', 'csv']).default('json'),
  status: z.enum(['generating', 'completed', 'failed']).default('generating')
});

/**
 * Performance Import Schema
 */
export const PerformanceImportSchema = z.object({
  import_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_type: z.enum(['csv', 'excel', 'json']),
  total_records: z.number().int().nonnegative(),
  processed_records: z.number().int().nonnegative(),
  failed_records: z.number().int().nonnegative(),
  errors: z.array(z.object({
    row: z.number().int().positive(),
    field: z.string(),
    message: z.string(),
    value: z.unknown()
  })),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional()
});

/**
 * Exported Types
 */
export type PerformanceSummary = z.infer<typeof PerformanceSummarySchema>;
export type TeamPerformance = z.infer<typeof TeamPerformanceSchema>;
export type PerformanceTrends = z.infer<typeof PerformanceTrendsSchema>;
export type PerformanceAnalytics = z.infer<typeof PerformanceAnalyticsSchema>;
export type PerformanceReport = z.infer<typeof PerformanceReportSchema>;
export type PerformanceImport = z.infer<typeof PerformanceImportSchema>;
