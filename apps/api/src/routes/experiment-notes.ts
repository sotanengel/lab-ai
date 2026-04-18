import { zValidator } from "@hono/zod-validator";
import { schema } from "@lab-ai/db";
import {
  CreateExperimentNoteRequestSchema,
  UpdateExperimentNoteRequestSchema,
} from "@lab-ai/shared";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";

export const experimentNotesRouter = new Hono<AppEnv>()
  .get("/", (c) => {
    const db = c.get("db");
    const experimentId = c.req.query("experimentId");
    const rows = db
      .select()
      .from(schema.experimentNotes)
      .where(experimentId ? eq(schema.experimentNotes.experimentId, experimentId) : undefined)
      .orderBy(desc(schema.experimentNotes.createdAt))
      .all();
    return c.json({ items: rows });
  })
  .post("/", zValidator("json", CreateExperimentNoteRequestSchema), (c) => {
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
    db.insert(schema.experimentNotes)
      .values({
        id,
        experimentId: body.experimentId,
        title: body.title,
        body: body.body,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const created = db
      .select()
      .from(schema.experimentNotes)
      .where(eq(schema.experimentNotes.id, id))
      .get();
    return c.json(created, 201);
  })
  .patch("/:id", zValidator("json", UpdateExperimentNoteRequestSchema), (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const existing = db
      .select()
      .from(schema.experimentNotes)
      .where(eq(schema.experimentNotes.id, id))
      .get();
    if (!existing) throw new NotFoundError("Note");

    const body = c.req.valid("json");
    const patch: Partial<typeof schema.experimentNotes.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.title !== undefined) patch.title = body.title;
    if (body.body !== undefined) patch.body = body.body;
    db.update(schema.experimentNotes).set(patch).where(eq(schema.experimentNotes.id, id)).run();

    const updated = db
      .select()
      .from(schema.experimentNotes)
      .where(eq(schema.experimentNotes.id, id))
      .get();
    return c.json(updated);
  })
  .delete("/:id", (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const result = db.delete(schema.experimentNotes).where(eq(schema.experimentNotes.id, id)).run();
    if (result.changes === 0) throw new NotFoundError("Note");
    return c.body(null, 204);
  });
