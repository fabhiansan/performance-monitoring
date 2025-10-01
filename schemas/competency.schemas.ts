import { z } from 'zod';

/**
 * Competency Schema
 */
export const CompetencySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional().nullable(),
  weight: z.number().min(0).max(10).default(1),
  applicable_to: z.string().max(500).default('all'),
  description: z.string().max(1000).optional(),
  created_at: z.string().datetime().optional()
});

/**
 * Create Competency Schema
 */
export const CreateCompetencySchema = CompetencySchema.omit({
  id: true,
  created_at: true
});

/**
 * Update Competency Schema
 */
export const UpdateCompetencySchema = CreateCompetencySchema.partial();

/**
 * Competency Score Schema
 */
export const CompetencyScoreSchema = z.object({
  id: z.number().int().positive().optional(),
  employee_id: z.number().int().positive(),
  competency_id: z.number().int().positive(),
  score: z.number().min(0).max(100),
  assessment_period: z.string().max(50).optional(),
  assessor: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

/**
 * Create Competency Score Schema
 */
export const CreateCompetencyScoreSchema = CompetencyScoreSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

/**
 * Competency with Scores Schema (for reporting)
 */
export const CompetencyWithScoresSchema = CompetencySchema.extend({
  scores: z.array(CompetencyScoreSchema).optional(),
  average_score: z.number().min(0).max(100).optional(),
  total_assessments: z.number().int().nonnegative().optional()
});

/**
 * Competency Analysis Schema
 */
export const CompetencyAnalysisSchema = z.object({
  competency: CompetencySchema,
  statistics: z.object({
    total_employees: z.number().int().nonnegative(),
    average_score: z.number().min(0).max(100),
    min_score: z.number().min(0).max(100),
    max_score: z.number().min(0).max(100),
    score_distribution: z.record(z.string(), z.number().int().nonnegative())
  }),
  trends: z.object({
    improvement_rate: z.number(),
    performance_trend: z.enum(['improving', 'declining', 'stable'])
  }).optional()
});

/**
 * Exported Types
 */
export type Competency = z.infer<typeof CompetencySchema>;
export type CreateCompetency = z.infer<typeof CreateCompetencySchema>;
export type UpdateCompetency = z.infer<typeof UpdateCompetencySchema>;
export type CompetencyScore = z.infer<typeof CompetencyScoreSchema>;
export type CreateCompetencyScore = z.infer<typeof CreateCompetencyScoreSchema>;
export type CompetencyWithScores = z.infer<typeof CompetencyWithScoresSchema>;
export type CompetencyAnalysis = z.infer<typeof CompetencyAnalysisSchema>;