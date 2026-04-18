import { zValidator } from "@hono/zod-validator";
import { schema } from "@lab-ai/db";
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";
import { logger } from "../logger.js";
import { getExperimentDetail, getExperimentRows } from "../repositories/experiment-repository.js";
import {
  type ChatMessage,
  buildAdviceContextBlocks,
  isAiConfigured,
  streamAdvice,
} from "../services/advice-service.js";
import { computeColumnStats } from "../services/stats-service.js";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const AdviceChatRequestSchema = z.object({
  experimentId: z.string().min(1),
  contextDocumentIds: z.array(z.string().min(1)).default([]),
  messages: z.array(ChatMessageSchema).min(1),
  persist: z.boolean().default(true),
});

export const adviceRouter = new Hono<AppEnv>()
  .get("/status", (c) => {
    return c.json({ configured: isAiConfigured() });
  })
  .get("/history", (c) => {
    const db = c.get("db");
    const experimentId = c.req.query("experimentId");
    if (!experimentId) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "experimentId is required" } },
        400,
      );
    }
    const rows = db
      .select()
      .from(schema.adviceChatMessages)
      .where(eq(schema.adviceChatMessages.experimentId, experimentId))
      .orderBy(asc(schema.adviceChatMessages.createdAt))
      .all();
    return c.json({ items: rows });
  })
  .delete("/history", (c) => {
    const db = c.get("db");
    const experimentId = c.req.query("experimentId");
    if (!experimentId) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "experimentId is required" } },
        400,
      );
    }
    db.delete(schema.adviceChatMessages)
      .where(eq(schema.adviceChatMessages.experimentId, experimentId))
      .run();
    return c.body(null, 204);
  })
  .post("/chat", zValidator("json", AdviceChatRequestSchema), async (c) => {
    if (!isAiConfigured()) {
      return c.json(
        { error: { code: "AI_NOT_CONFIGURED", message: "ANTHROPIC_API_KEY is not set" } },
        503,
      );
    }
    const db = c.get("db");
    const { experimentId, contextDocumentIds, messages, persist } = c.req.valid("json");

    const experiment = getExperimentDetail(db, experimentId);
    if (!experiment) throw new NotFoundError("Experiment");

    const rows = getExperimentRows(db, experimentId, { limit: 5_000, offset: 0 });
    const stats = computeColumnStats(experiment.columns, rows);

    const docs =
      contextDocumentIds.length > 0
        ? db
            .select()
            .from(schema.contextDocuments)
            .where(inArray(schema.contextDocuments.id, contextDocumentIds))
            .all()
        : [];

    const context = buildAdviceContextBlocks({
      experiment,
      stats,
      sampleRows: rows.slice(0, 50),
      contextDocuments: docs.map((d) => ({
        ...d,
        kind: d.kind as "pdf" | "text" | "url",
      })),
    });

    const chatMessages: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const lastUser = [...chatMessages].reverse().find((m) => m.role === "user");
    const now = new Date().toISOString();

    if (persist && lastUser) {
      db.insert(schema.adviceChatMessages)
        .values({
          id: nanoid(),
          experimentId,
          role: "user",
          content: lastUser.content,
          createdAt: now,
        })
        .run();
    }

    return streamSSE(c, async (sse) => {
      try {
        const result = await streamAdvice({
          context,
          messages: chatMessages,
          onDelta: async (delta) => {
            await sse.writeSSE({ event: "delta", data: JSON.stringify({ text: delta }) });
          },
        });
        if (persist) {
          db.insert(schema.adviceChatMessages)
            .values({
              id: nanoid(),
              experimentId,
              role: "assistant",
              content: result.text,
              createdAt: new Date().toISOString(),
            })
            .run();
        }
        await sse.writeSSE({
          event: "done",
          data: JSON.stringify({
            text: result.text,
            usage: {
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
            },
          }),
        });
      } catch (err) {
        logger.error({ err }, "Advice stream failed");
        const message = err instanceof Error ? err.message : "stream failed";
        await sse.writeSSE({ event: "error", data: JSON.stringify({ message }) });
      }
    });
  });
