import { z } from "zod";
import { ColumnDefinitionSchema } from "./column.js";
import { IsoDateTimeSchema } from "./common.js";

export const SourceFormatSchema = z.enum(["csv", "tsv", "json", "txt"]);
export type SourceFormat = z.infer<typeof SourceFormatSchema>;

const Sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .nullable();

export const SourceInfoSchema = z.object({
  filename: z.string().max(255).nullable().optional(),
  hash: Sha256HexSchema.optional(),
  size: z.number().int().min(0).nullable().optional(),
});
export type SourceInfo = z.infer<typeof SourceInfoSchema>;

export const ExperimentMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  sourceFormat: SourceFormatSchema,
  sourceFilename: z.string().nullable().optional(),
  sourceHash: Sha256HexSchema.optional(),
  sourceSize: z.number().int().min(0).nullable().optional(),
  rowCount: z.number().int().min(0),
  archived: z.boolean().default(false),
  registeredAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ExperimentMeta = z.infer<typeof ExperimentMetaSchema>;

export const ExperimentDetailSchema = ExperimentMetaSchema.extend({
  columns: z.array(ColumnDefinitionSchema),
});
export type ExperimentDetail = z.infer<typeof ExperimentDetailSchema>;

export const CreateExperimentRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  sourceFormat: SourceFormatSchema,
  source: SourceInfoSchema.optional(),
  columns: z
    .array(
      ColumnDefinitionSchema.omit({ id: true }).extend({
        id: z.string().min(1).optional(),
      }),
    )
    .min(1),
  rows: z.array(z.record(z.string(), z.unknown())).default([]),
});
export type CreateExperimentRequest = z.infer<typeof CreateExperimentRequestSchema>;

export const UpdateExperimentRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  archived: z.boolean().optional(),
});
export type UpdateExperimentRequest = z.infer<typeof UpdateExperimentRequestSchema>;

export const ExperimentRowSchema = z.record(z.string(), z.unknown());
export type ExperimentRow = z.infer<typeof ExperimentRowSchema>;

export const ExperimentRowRecordSchema = z.object({
  id: z.string(),
  rowIndex: z.number().int(),
  data: ExperimentRowSchema,
});
export type ExperimentRowRecord = z.infer<typeof ExperimentRowRecordSchema>;

export const ExperimentStatsSchema = z.object({
  column: z.string(),
  count: z.number().int().min(0),
  nullCount: z.number().int().min(0),
  min: z.number().nullable(),
  max: z.number().nullable(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
  stddev: z.number().nullable(),
});
export type ExperimentStats = z.infer<typeof ExperimentStatsSchema>;

export const IntegrityCheckRequestSchema = z.object({
  sourceFormat: SourceFormatSchema,
  text: z
    .string()
    .min(1)
    .max(50 * 1024 * 1024),
  filename: z.string().max(255).optional(),
});
export type IntegrityCheckRequest = z.infer<typeof IntegrityCheckRequestSchema>;

export const ColumnStatsDeltaSchema = z.object({
  column: z.string(),
  expected: ExperimentStatsSchema.nullable(),
  actual: ExperimentStatsSchema.nullable(),
  matches: z.boolean(),
  notes: z.array(z.string()).default([]),
});
export type ColumnStatsDelta = z.infer<typeof ColumnStatsDeltaSchema>;

export const IntegrityCheckResponseSchema = z.object({
  experimentId: z.string(),
  hashMatches: z.boolean(),
  registeredHash: z.string().nullable(),
  uploadedHash: z.string(),
  rowCountMatches: z.boolean(),
  registeredRowCount: z.number().int(),
  uploadedRowCount: z.number().int(),
  columnSetMatches: z.boolean(),
  missingColumns: z.array(z.string()),
  extraColumns: z.array(z.string()),
  stats: z.array(ColumnStatsDeltaSchema),
  overallMatches: z.boolean(),
});
export type IntegrityCheckResponse = z.infer<typeof IntegrityCheckResponseSchema>;

export const ImportSuggestionRequestSchema = z.object({
  filename: z.string().max(255).optional(),
  sample: z.string().min(1).max(32_000),
});
export type ImportSuggestionRequest = z.infer<typeof ImportSuggestionRequestSchema>;

export const ImportSuggestionResponseSchema = z.object({
  sourceFormat: SourceFormatSchema,
  hasHeader: z.boolean(),
  delimiter: z.string().max(3).nullable(),
  columns: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["number", "integer", "datetime", "category", "string", "boolean"]),
      unit: z.string().nullable().optional(),
      description: z.string().max(200).nullable().optional(),
    }),
  ),
  proposedName: z.string().nullable(),
  notes: z.string().nullable().optional(),
});
export type ImportSuggestionResponse = z.infer<typeof ImportSuggestionResponseSchema>;
