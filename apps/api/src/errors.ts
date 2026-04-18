import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodError } from "zod";
import { logger } from "./logger.js";

export class NotFoundError extends HTTPException {
  constructor(resource: string) {
    super(404, { message: `${resource} not found` });
  }
}

export function zodErrorToResponse(err: ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Request failed validation",
      details: err.flatten(),
    },
  };
}

export function handleError(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: err.status === 404 ? "NOT_FOUND" : "HTTP_ERROR",
          message: err.message,
        },
      },
      err.status,
    );
  }
  logger.error({ err }, "Unhandled error");
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
}
