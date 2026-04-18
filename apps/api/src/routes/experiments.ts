import { zValidator } from "@hono/zod-validator";
import {
  CreateExperimentRequestSchema,
  ImportSuggestionRequestSchema,
  IntegrityCheckRequestSchema,
  PaginationQuerySchema,
  UpdateExperimentRequestSchema,
} from "@lab-ai/shared";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../context.js";
import { NotFoundError } from "../errors.js";
import { logger } from "../logger.js";
import {
  archiveExperiment,
  countExperiments,
  createExperiment,
  getExperimentDetail,
  getExperimentRows,
  listExperiments,
  updateExperiment,
} from "../repositories/experiment-repository.js";
import { exportAsCsv, exportAsJson } from "../services/export-service.js";
import { sha256Hex } from "../services/hash-service.js";
import {
  isImportSuggestConfigured,
  suggestImportConfig,
} from "../services/import-suggest-service.js";
import { compareIntegrity } from "../services/integrity-service.js";
import { parseInputText } from "../services/parse-service.js";
import { computeColumnStats } from "../services/stats-service.js";

const ListQuerySchema = PaginationQuerySchema.extend({
  includeArchived: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
});

const PreviewRequestSchema = z.object({
  sourceFormat: z.enum(["csv", "tsv", "json", "txt"]),
  text: z.string().min(1),
  maxRows: z.number().int().min(1).max(500).default(50),
});

export const experimentsRouter = new Hono<AppEnv>()
  .get("/", zValidator("query", ListQuerySchema), (c) => {
    const { limit, offset, includeArchived } = c.req.valid("query");
    const db = c.get("db");
    const items = listExperiments(db, { limit, offset, includeArchived });
    const total = countExperiments(db, includeArchived);
    return c.json({ items, total, limit, offset });
  })
  .post("/preview", zValidator("json", PreviewRequestSchema), (c) => {
    const { sourceFormat, text, maxRows } = c.req.valid("json");
    const parsed = parseInputText(text, sourceFormat);
    return c.json({
      columns: parsed.columns,
      rows: parsed.rows.slice(0, maxRows),
      totalRows: parsed.rows.length,
    });
  })
  .get("/suggest-import/status", (c) => c.json({ configured: isImportSuggestConfigured() }))
  .post("/suggest-import", zValidator("json", ImportSuggestionRequestSchema), async (c) => {
    if (!isImportSuggestConfigured()) {
      return c.json(
        { error: { code: "AI_NOT_CONFIGURED", message: "ANTHROPIC_API_KEY is not set" } },
        503,
      );
    }
    try {
      const body = c.req.valid("json");
      const suggestion = await suggestImportConfig(body);
      return c.json(suggestion);
    } catch (err) {
      logger.error({ err }, "import suggestion failed");
      const message = err instanceof Error ? err.message : "Suggestion failed";
      return c.json({ error: { code: "AI_SUGGEST_FAILED", message } }, 502);
    }
  })
  .post("/", zValidator("json", CreateExperimentRequestSchema), (c) => {
    const db = c.get("db");
    const body = c.req.valid("json");
    const detail = createExperiment(db, body);
    return c.json(detail, 201);
  })
  .get("/:id", (c) => {
    const db = c.get("db");
    const detail = getExperimentDetail(db, c.req.param("id"));
    if (!detail) throw new NotFoundError("Experiment");
    return c.json(detail);
  })
  .patch("/:id", zValidator("json", UpdateExperimentRequestSchema), (c) => {
    const db = c.get("db");
    const detail = updateExperiment(db, c.req.param("id"), c.req.valid("json"));
    if (!detail) throw new NotFoundError("Experiment");
    return c.json(detail);
  })
  .delete("/:id", (c) => {
    const db = c.get("db");
    const archived = archiveExperiment(db, c.req.param("id"));
    if (!archived) throw new NotFoundError("Experiment");
    return c.body(null, 204);
  })
  .get("/:id/rows", zValidator("query", PaginationQuerySchema), (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    if (!getExperimentDetail(db, id)) throw new NotFoundError("Experiment");
    const { limit, offset } = c.req.valid("query");
    const rows = getExperimentRows(db, id, { limit, offset });
    return c.json({ items: rows, limit, offset });
  })
  .get("/:id/stats", (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const detail = getExperimentDetail(db, id);
    if (!detail) throw new NotFoundError("Experiment");
    const rows = getExperimentRows(db, id, { limit: 10_000, offset: 0 });
    const stats = computeColumnStats(detail.columns, rows);
    return c.json({ stats });
  })
  .get(
    "/:id/export",
    zValidator("query", z.object({ format: z.enum(["csv", "json"]).default("csv") })),
    (c) => {
      const db = c.get("db");
      const id = c.req.param("id");
      const detail = getExperimentDetail(db, id);
      if (!detail) throw new NotFoundError("Experiment");
      const rows = getExperimentRows(db, id, { limit: 1_000_000, offset: 0 });
      const { format } = c.req.valid("query");
      const safeName = detail.name.replace(/[^A-Za-z0-9_.-]+/g, "_");
      if (format === "json") {
        c.header("content-type", "application/json; charset=utf-8");
        c.header("content-disposition", `attachment; filename="${safeName}.json"`);
        return c.body(exportAsJson(detail, rows));
      }
      c.header("content-type", "text/csv; charset=utf-8");
      c.header("content-disposition", `attachment; filename="${safeName}.csv"`);
      return c.body(exportAsCsv(detail.columns, rows));
    },
  )
  .post("/:id/verify", zValidator("json", IntegrityCheckRequestSchema), (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const detail = getExperimentDetail(db, id);
    if (!detail) throw new NotFoundError("Experiment");

    const { text, sourceFormat } = c.req.valid("json");
    const parsed = parseInputText(text, sourceFormat);
    const uploadedHash = sha256Hex(text);

    const registeredRows = getExperimentRows(db, id, { limit: 1_000_000, offset: 0 });
    const registeredStats = computeColumnStats(detail.columns, registeredRows);

    const result = compareIntegrity({
      detail,
      registeredStats,
      registeredHash: detail.sourceHash ?? null,
      uploadedHash,
      uploadedColumns: parsed.columns,
      uploadedRows: parsed.rows,
    });
    return c.json(result);
  });
