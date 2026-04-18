import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { logger } from "./logger.js";

const port = Number(process.env.API_PORT ?? 8787);
const hostname = process.env.API_HOST ?? "0.0.0.0";

const app = createApp();

serve({ fetch: app.fetch, port, hostname }, (info) => {
  logger.info({ port: info.port, hostname }, "API listening");
});
