import { z } from "zod";

export const ColumnTypeSchema = z.enum(["number", "integer", "datetime", "category", "string", "boolean"]);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const ColumnDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ColumnTypeSchema,
  unit: z.string().nullable().optional(),
  position: z.number().int().min(0),
});
export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;
