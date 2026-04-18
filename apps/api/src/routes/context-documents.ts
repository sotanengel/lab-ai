import { zValidator } from "@hono/zod-validator";
import { schema } from "@lab-ai/db";
import { CreateContextDocumentRequestSchema, PaginationQuerySchema } from "@lab-ai/shared";
import { desc, eq, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";

const ListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional(),
});

export const contextDocumentsRouter = new Hono<AppEnv>()
  .get("/", zValidator("query", ListQuerySchema), (c) => {
    const db = c.get("db");
    const { limit, offset, q } = c.req.valid("query");
    const pattern = q ? `%${q.toLowerCase()}%` : null;
    const items = db
      .select()
      .from(schema.contextDocuments)
      .where(
        pattern
          ? or(
              like(schema.contextDocuments.title, pattern),
              like(schema.contextDocuments.content, pattern),
            )
          : undefined,
      )
      .orderBy(desc(schema.contextDocuments.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    return c.json({ items, limit, offset });
  })
  .post("/", zValidator("json", CreateContextDocumentRequestSchema), (c) => {
    const db = c.get("db");
    const body = c.req.valid("json");
    const id = nanoid();
    const now = new Date().toISOString();
    db.insert(schema.contextDocuments)
      .values({
        id,
        title: body.title,
        kind: body.kind,
        sourceUrl: body.sourceUrl ?? null,
        content: body.content,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const created = db
      .select()
      .from(schema.contextDocuments)
      .where(eq(schema.contextDocuments.id, id))
      .get();
    return c.json(created, 201);
  })
  .get("/:id", (c) => {
    const db = c.get("db");
    const row = db
      .select()
      .from(schema.contextDocuments)
      .where(eq(schema.contextDocuments.id, c.req.param("id")))
      .get();
    if (!row) throw new NotFoundError("Context document");
    return c.json(row);
  })
  .delete("/:id", (c) => {
    const db = c.get("db");
    const result = db
      .delete(schema.contextDocuments)
      .where(eq(schema.contextDocuments.id, c.req.param("id")))
      .run();
    if (result.changes === 0) throw new NotFoundError("Context document");
    return c.body(null, 204);
  });
