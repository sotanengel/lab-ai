import { z } from "zod";
import { ColumnDefinitionSchema } from "./column.js";
import { IsoDateTimeSchema } from "./common.js";

export const SourceFormatSchema = z.enum(["csv", "tsv", "json", "txt"]);
export type SourceFormat = z.infer<typeof SourceFormatSchema>;

export const ExperimentMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  sourceFormat: SourceFormatSchema,
  rowCount: z.number().int().min(0),
  archived: z.boolean().default(false),
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
