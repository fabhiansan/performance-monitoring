import { z } from 'zod';

/**
 * Standard API Response Schema
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.string().datetime()
  });

/**
 * Error Response Schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime()
});

/**
 * Health Check Response Schema
 */
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  database: z.boolean(),
  uptime: z.number().optional(),
  timestamp: z.string().datetime()
});

/**
 * Pagination Schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional()
});

/**
 * Paginated Response Schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    }),
    metadata: z.record(z.string(), z.unknown()).optional()
  });

/**
 * Generic ID Parameter Schema
 */
export const IdParamSchema = z.object({
  id: z.string().min(1)
});

/**
 * Generic Name Parameter Schema
 */
export const NameParamSchema = z.object({
  name: z.string().min(1)
});

/**
 * Time Range Query Schema
 */
export const TimeRangeSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
});

/**
 * Exported Types
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: Record<string, unknown>;
};
export type IdParam = z.infer<typeof IdParamSchema>;
export type NameParam = z.infer<typeof NameParamSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
