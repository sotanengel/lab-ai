import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

export const ExperimentNoteSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ExperimentNote = z.infer<typeof ExperimentNoteSchema>;

export const CreateExperimentNoteRequestSchema = z.object({
  experimentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});
export type CreateExperimentNoteRequest = z.infer<typeof CreateExperimentNoteRequestSchema>;

export const UpdateExperimentNoteRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
});
export type UpdateExperimentNoteRequest = z.infer<typeof UpdateExperimentNoteRequestSchema>;
