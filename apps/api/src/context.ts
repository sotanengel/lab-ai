import { resolve } from "node:path";
import { type Database, createDb } from "@lab-ai/db";

export interface AppEnv {
  Variables: {
    db: Database;
    requestId: string;
  };
}

let cachedDb: Database | null = null;

function resolveDefaultDbUrl(): string {
  // Resolve relative to project root (two levels up from apps/api/src)
  const dbPath = resolve(import.meta.dirname, "..", "..", "..", "packages", "db", "dev.db");
  return `file:${dbPath}`;
}

export function getDb(): Database {
  if (cachedDb) return cachedDb;
  const databaseUrl = process.env.DATABASE_URL ?? resolveDefaultDbUrl();
  cachedDb = createDb(databaseUrl);
  return cachedDb;
}
