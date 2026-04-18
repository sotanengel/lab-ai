import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./context.js";
import { getDb } from "./context.js";
import { handleError } from "./errors.js";
import { adviceNotesRouter } from "./routes/advice-notes.js";
import { contextDocumentsRouter } from "./routes/context-documents.js";
import { experimentsRouter } from "./routes/experiments.js";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    }),
  );

  app.use("*", async (c, next) => {
    c.set("db", getDb());
    await next();
  });

  app.get("/health", (c) => c.json({ status: "ok", service: "lab-ai-api" }));

  app.route("/api/experiments", experimentsRouter);
  app.route("/api/context-documents", contextDocumentsRouter);
  app.route("/api/advice-notes", adviceNotesRouter);

  app.onError(handleError);
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

  return app;
}
