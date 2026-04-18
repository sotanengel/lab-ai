import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

export const ContextDocumentKindSchema = z.enum(["pdf", "text", "url"]);
export type ContextDocumentKind = z.infer<typeof ContextDocumentKindSchema>;

export const ContextDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  kind: ContextDocumentKindSchema,
  sourceUrl: z.string().url().nullable().optional(),
  content: z.string(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ContextDocument = z.infer<typeof ContextDocumentSchema>;

export const CreateContextDocumentRequestSchema = z.object({
  title: z.string().min(1).max(200),
  kind: ContextDocumentKindSchema,
  sourceUrl: z.string().url().nullable().optional(),
  content: z.string().min(1),
});
export type CreateContextDocumentRequest = z.infer<typeof CreateContextDocumentRequestSchema>;
