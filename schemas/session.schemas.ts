import { z } from 'zod';
import { EmployeeSchema } from './employee.schemas';

/**
 * Upload Session Schema
 */
export const UploadSessionSchema = z.object({
  session_id: z.string().uuid(),
  session_name: z.string().min(1).max(255),
  upload_timestamp: z.string().datetime(),
  employee_count: z.number().int().nonnegative(),
  competency_count: z.number().int().nonnegative(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  notes: z.string().max(1000).optional().nullable()
});

/**
 * Create Upload Session Schema
 */
export const CreateUploadSessionSchema = z.object({
  employees: z.array(EmployeeSchema),
  sessionName: z.string().min(1).max(255).optional()
});

/**
 * Session Employee Data Schema
 */
export const SessionEmployeeDataSchema = z.object({
  employees: z.array(EmployeeSchema),
  sessionId: z.string().uuid(),
  metadata: z.object({
    totalEmployees: z.number().int().nonnegative(),
    employeesWithPerformanceData: z.number().int().nonnegative(),
    employeesWithoutPerformanceData: z.number().int().nonnegative()
  })
});

/**
 * Current Dataset Schema
 */
export const CurrentDatasetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  created_at: z.string().datetime(),
  employee_count: z.number().int().nonnegative(),
  is_active: z.boolean().default(true)
});

/**
 * Dataset Management Schemas
 */
export const DatasetListSchema = z.array(CurrentDatasetSchema);

export const SaveDatasetSchema = z.object({
  name: z.string().min(1).max(255),
  employees: z.array(EmployeeSchema)
});

/**
 * Leadership Score Schemas
 */
export const LeadershipScoreSchema = z.object({
  employee_name: z.string().min(1),
  score: z.number().min(0).max(100),
  dataset_id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

export const SetLeadershipScoreSchema = z.object({
  score: z.number().min(0).max(100)
});

/**
 * Exported Types
 */
export type UploadSession = z.infer<typeof UploadSessionSchema>;
export type CreateUploadSession = z.infer<typeof CreateUploadSessionSchema>;
export type SessionEmployeeData = z.infer<typeof SessionEmployeeDataSchema>;
export type CurrentDataset = z.infer<typeof CurrentDatasetSchema>;
export type DatasetList = z.infer<typeof DatasetListSchema>;
export type SaveDataset = z.infer<typeof SaveDatasetSchema>;
export type LeadershipScore = z.infer<typeof LeadershipScoreSchema>;
export type SetLeadershipScore = z.infer<typeof SetLeadershipScoreSchema>;