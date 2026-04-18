import type { MiddlewareHandler } from "hono";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory token-bucket style limiter. Enough for a
 * single-process local deployment; swap for Redis if the platform
 * ever goes multi-instance.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn?: (ip: string) => string;
}): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "local";
    const key = options.keyFn ? options.keyFn(ip) : ip;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    } else if (bucket.count >= options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header("retry-after", String(retryAfter));
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests; retry after ${retryAfter}s`,
          },
        },
        429,
      );
    } else {
      bucket.count += 1;
    }

    // Garbage-collect stale buckets once in a while so memory stays bounded.
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }

    await next();
  };
}
