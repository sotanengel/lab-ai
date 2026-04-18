import { zValidator } from "@hono/zod-validator";
import { schema } from "@lab-ai/db";
import { CreateContextDocumentRequestSchema, PaginationQuerySchema } from "@lab-ai/shared";
import { desc, eq, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";
import { logger } from "../logger.js";
import { extractPdfText, fetchUrlContent } from "../services/content-extraction-service.js";

const ListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional(),
});

const FromUrlRequestSchema = z.object({
  url: z.string().url(),
  title: z.string().max(200).optional(),
});

const MAX_PDF_BYTES = 25 * 1024 * 1024;

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
  .post("/from-pdf", async (c) => {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "PDF file is required" } }, 400);
    }
    if (file.size > MAX_PDF_BYTES) {
      return c.json(
        { error: { code: "FILE_TOO_LARGE", message: `max ${MAX_PDF_BYTES} bytes` } },
        413,
      );
    }
    const titleRaw = typeof form.title === "string" ? form.title.trim() : "";
    const title = titleRaw || file.name.replace(/\.pdf$/i, "") || "Untitled PDF";
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { text, pageCount } = await extractPdfText(buf);
      const db = c.get("db");
      const id = nanoid();
      const now = new Date().toISOString();
      db.insert(schema.contextDocuments)
        .values({
          id,
          title,
          kind: "pdf",
          sourceUrl: null,
          content: text.length > 0 ? text : `(no extractable text, ${pageCount} pages)`,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const created = db
        .select()
        .from(schema.contextDocuments)
        .where(eq(schema.contextDocuments.id, id))
        .get();
      return c.json({ ...created, pageCount }, 201);
    } catch (err) {
      logger.error({ err }, "pdf extraction failed");
      const message = err instanceof Error ? err.message : "PDF parse failed";
      return c.json({ error: { code: "PDF_PARSE_FAILED", message } }, 422);
    }
  })
  .post("/from-url", zValidator("json", FromUrlRequestSchema), async (c) => {
    const { url, title: providedTitle } = c.req.valid("json");
    try {
      const fetched = await fetchUrlContent(url);
      const title = (providedTitle?.trim() || fetched.title || url).slice(0, 200);
      const db = c.get("db");
      const id = nanoid();
      const now = new Date().toISOString();
      const kind = fetched.contentType.includes("application/pdf") ? "pdf" : "url";
      db.insert(schema.contextDocuments)
        .values({
          id,
          title,
          kind,
          sourceUrl: url,
          content: fetched.text,
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
    } catch (err) {
      logger.error({ err, url }, "url fetch failed");
      const message = err instanceof Error ? err.message : "URL fetch failed";
      return c.json({ error: { code: "URL_FETCH_FAILED", message } }, 502);
    }
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
