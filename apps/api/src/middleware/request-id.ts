import type { MiddlewareHandler } from "hono";
import { nanoid } from "nanoid";

const HEADER = "x-request-id";

/**
 * Adds a stable request id on every request. If the client already supplied
 * one we trust it (for distributed tracing from a reverse proxy); otherwise
 * we generate a short nanoid. The id ends up in the response header and in
 * every log line emitted from the same request via `c.get("requestId")`.
 */
export function requestIdMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const incoming = c.req.header(HEADER);
    const id = incoming?.slice(0, 64) || nanoid(12);
    c.set("requestId", id);
    c.header(HEADER, id);
    await next();
  };
}
