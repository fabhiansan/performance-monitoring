import { z } from 'zod';

/**
 * Core Employee Schema with enhanced validation
 */
export const EmployeeSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string()
    .min(2, 'Nama harus minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s.,'-]+$/, 'Nama hanya boleh mengandung huruf, spasi, dan tanda baca umum'),
  nip: z.string()
    .regex(/^\d{8}\s?\d{6}\s?\d{1}\s?\d{3}$/,
      'Format NIP tidak valid (contoh: 19660419 198910 1 001)')
    .optional(),
  gol: z.string()
    .regex(/^[I-V]+\/[a-e]$/i, 'Format golongan tidak valid (contoh: IV/c, III/b)')
    .optional(),
  pangkat: z.string()
    .min(2, 'Pangkat harus antara 2-50 karakter')
    .max(50, 'Pangkat harus antara 2-50 karakter')
    .optional(),
  position: z.string()
    .min(2, 'Jabatan harus antara 2-100 karakter')
    .max(100, 'Jabatan harus antara 2-100 karakter')
    .optional(),
  sub_position: z.string()
    .min(2, 'Sub-jabatan harus antara 2-100 karakter')
    .max(100, 'Sub-jabatan harus antara 2-100 karakter')
    .optional(),
  organizational_level: z.string().min(1, 'Tingkat organisasi wajib diisi').optional(),
  performance: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    competency: z.string().optional()
  })).default([]),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
});

/**
 * Employee Create Schema (without ID)
 */
export const CreateEmployeeSchema = EmployeeSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

/**
 * Employee Update Schema (partial fields)
 */
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

/**
 * Employee Suggestions Schema
 */
export const EmployeeSuggestionsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(5)
});

/**
 * Employee Organizational Level Mapping Schema
 */
export const OrgLevelMappingSchema = z.record(
  z.string(),
  z.number().int().nonnegative()
);

/**
 * Form-specific schemas for React Hook Form
 */
export const EmployeeFormSchema = z.object({
  name: z.string()
    .min(2, 'Nama harus minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s.,'-]+$/, 'Nama hanya boleh mengandung huruf, spasi, dan tanda baca umum'),
  nip: z.string()
    .optional()
    .transform(val => val?.trim() || ''),
  gol: z.string()
    .min(1, 'Golongan wajib diisi')
    .regex(/^[I-V]+\/[a-e]$/i, 'Format golongan tidak valid (contoh: IV/c, III/b)'),
  pangkat: z.string()
    .optional()
    .transform(val => val?.trim() || ''),
  position: z.string()
    .optional()
    .transform(val => val?.trim() || ''),
  subPosition: z.string()
    .optional()
    .transform(val => val?.trim() || ''),
  organizationalLevel: z.string()
    .min(1, 'Tingkat organisasi wajib dipilih')
});

/**
 * Employee search and filter schema
 */
export const EmployeeSearchSchema = z.object({
  query: z.string()
    .min(1, 'Query pencarian harus minimal 1 karakter')
    .max(100, 'Query pencarian maksimal 100 karakter'),
  organizationalLevel: z.string().optional(),
  sortBy: z.enum(['name', 'gol', 'position', 'organizational_level']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number()
    .min(1, 'Limit minimal 1')
    .max(100, 'Limit maksimal 100')
    .default(20),
  offset: z.number()
    .min(0, 'Offset minimal 0')
    .default(0)
});

/**
 * Performance score schema for employee
 */
export const PerformanceScoreSchema = z.object({
  competencyId: z.string().min(1, 'ID kompetensi wajib diisi'),
  competencyName: z.string().min(1, 'Nama kompetensi wajib diisi'),
  score: z.number()
    .min(0, 'Skor minimal 0')
    .max(100, 'Skor maksimal 100'),
  notes: z.string().optional()
});

export const EmployeePerformanceFormSchema = z.object({
  employeeId: z.number().positive('ID pegawai harus berupa angka positif'),
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  scores: z.array(PerformanceScoreSchema)
    .min(1, 'Minimal satu skor kompetensi harus diisi'),
  overallNotes: z.string().optional(),
  assessmentDate: z.date().default(() => new Date())
});

/**
 * Employee summary update schema
 */
export const EmployeeSummaryFormSchema = z.object({
  employeeName: z.string().min(1, 'Nama pegawai wajib diisi'),
  sessionId: z.string().min(1, 'Session ID wajib diisi'),
  summary: z.string()
    .min(10, 'Ringkasan minimal 10 karakter')
    .max(1000, 'Ringkasan maksimal 1000 karakter')
});

/**
 * Organizational level options for forms
 */
export const ORGANIZATIONAL_LEVEL_OPTIONS = [
  { value: 'Staff/Other', label: 'Staff/Other' },
  { value: 'Eselon II', label: 'Eselon II' },
  { value: 'Eselon III', label: 'Eselon III' },
  { value: 'Eselon IV', label: 'Eselon IV' },
  { value: 'Staff ASN Sekretariat', label: 'Staff ASN Sekretariat' },
  { value: 'Staff Non ASN Sekretariat', label: 'Staff Non ASN Sekretariat' },
  { value: 'Staff ASN Bidang Hukum', label: 'Staff ASN Bidang Hukum' },
  { value: 'Staff ASN Bidang Pemberdayaan Sosial', label: 'Staff ASN Bidang Pemberdayaan Sosial' },
  { value: 'Staff Non ASN Bidang Pemberdayaan Sosial', label: 'Staff Non ASN Bidang Pemberdayaan Sosial' },
  { value: 'Staff ASN Bidang Rehabilitasi Sosial', label: 'Staff ASN Bidang Rehabilitasi Sosial' },
  { value: 'Staff Non ASN Bidang Rehabilitasi Sosial', label: 'Staff Non ASN Bidang Rehabilitasi Sosial' },
  { value: 'Staff ASN Bidang Perlindungan dan Jaminan Sosial', label: 'Staff ASN Bidang Perlindungan dan Jaminan Sosial' },
  { value: 'Staff Non ASN Bidang Perlindungan dan Jaminan Sosial', label: 'Staff Non ASN Bidang Perlindungan dan Jaminan Sosial' },
  { value: 'Staff ASN Bidang Penanganan Bencana', label: 'Staff ASN Bidang Penanganan Bencana' },
  { value: 'Staff Non ASN Bidang Penanganan Bencana', label: 'Staff Non ASN Bidang Penanganan Bencana' },
];

/**
 * Exported Types
 */
export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>;
export type EmployeeSuggestions = z.infer<typeof EmployeeSuggestionsSchema>;
export type OrgLevelMapping = z.infer<typeof OrgLevelMappingSchema>;

// Form types
export type EmployeeFormData = z.infer<typeof EmployeeFormSchema>;
export type EmployeeSearchData = z.infer<typeof EmployeeSearchSchema>;
export type EmployeePerformanceFormData = z.infer<typeof EmployeePerformanceFormSchema>;
export type EmployeeSummaryFormData = z.infer<typeof EmployeeSummaryFormSchema>;
export type PerformanceScoreData = z.infer<typeof PerformanceScoreSchema>;
