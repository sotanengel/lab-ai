import { zValidator } from "@hono/zod-validator";
import { schema } from "@lab-ai/db";
import { CreateAdviceNoteRequestSchema } from "@lab-ai/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";

export const adviceNotesRouter = new Hono<AppEnv>()
  .get("/", (c) => {
    const db = c.get("db");
    const experimentId = c.req.query("experimentId");
    const rows = db
      .select()
      .from(schema.adviceNotes)
      .where(experimentId ? eq(schema.adviceNotes.experimentId, experimentId) : undefined)
      .orderBy(desc(schema.adviceNotes.createdAt))
      .all();
    return c.json({ items: rows });
  })
  .post("/", zValidator("json", CreateAdviceNoteRequestSchema), (c) => {
    const db = c.get("db");
    const body = c.req.valid("json");
    const experiment = db
      .select()
      .from(schema.experiments)
      .where(eq(schema.experiments.id, body.experimentId))
      .get();
    if (!experiment) throw new NotFoundError("Experiment");

    const id = nanoid();
    const now = new Date().toISOString();
    db.insert(schema.adviceNotes)
      .values({
        id,
        experimentId: body.experimentId,
        title: body.title,
        body: body.body,
        createdAt: now,
      })
      .run();
    const created = db
      .select()
      .from(schema.adviceNotes)
      .where(eq(schema.adviceNotes.id, id))
      .get();
    return c.json(created, 201);
  });
