import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

export const AdviceNoteSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type AdviceNote = z.infer<typeof AdviceNoteSchema>;

export const CreateAdviceNoteRequestSchema = z.object({
  experimentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});
export type CreateAdviceNoteRequest = z.infer<typeof CreateAdviceNoteRequestSchema>;
