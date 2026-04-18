import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./context.js";
import { getDb } from "./context.js";
import { handleError } from "./errors.js";
import { logger } from "./logger.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { adviceNotesRouter } from "./routes/advice-notes.js";
import { adviceRouter } from "./routes/advice.js";
import { contextDocumentsRouter } from "./routes/context-documents.js";
import { experimentNotesRouter } from "./routes/experiment-notes.js";
import { experimentsRouter } from "./routes/experiments.js";
import { isAiConfigured } from "./services/advice-service.js";

const startedAt = Date.now();

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", requestIdMiddleware());
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
      exposeHeaders: ["x-request-id", "retry-after"],
      credentials: false,
    }),
  );

  app.use("*", async (c, next) => {
    c.set("db", getDb());
    await next();
  });

  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const elapsed = Date.now() - start;
    logger.info(
      {
        requestId: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        elapsedMs: elapsed,
      },
      "request",
    );
  });

  app.get("/health", (c) => {
    const uptimeMs = Date.now() - startedAt;
    let dbOk = false;
    try {
      c.get("db").get(sql`select 1`);
      dbOk = true;
    } catch (err) {
      logger.warn({ err }, "health db probe failed");
    }
    const aiConfigured = isAiConfigured();
    const status = dbOk ? "ok" : "degraded";
    return c.json(
      {
        status,
        service: "lab-ai-api",
        uptimeMs,
        components: {
          db: { ok: dbOk },
          ai: { configured: aiConfigured },
        },
      },
      dbOk ? 200 : 503,
    );
  });

  // AI endpoints carry real cost; throttle aggressively.
  app.use("/api/advice/chat", rateLimit({ windowMs: 60_000, max: 20 }));
  app.use("/api/experiments/suggest-import", rateLimit({ windowMs: 60_000, max: 10 }));

  app.route("/api/experiments", experimentsRouter);
  app.route("/api/experiment-notes", experimentNotesRouter);
  app.route("/api/context-documents", contextDocumentsRouter);
  app.route("/api/advice-notes", adviceNotesRouter);
  app.route("/api/advice", adviceRouter);

  app.onError(handleError);
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

  return app;
}
