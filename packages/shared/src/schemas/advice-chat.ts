import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

export const AdviceChatMessageSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type AdviceChatMessage = z.infer<typeof AdviceChatMessageSchema>;
