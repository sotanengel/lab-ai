import { type Database, createDb } from "@lab-ai/db";

export interface AppEnv {
  Variables: {
    db: Database;
    requestId: string;
  };
}

let cachedDb: Database | null = null;

export function getDb(): Database {
  if (cachedDb) return cachedDb;
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  cachedDb = createDb(databaseUrl);
  return cachedDb;
}
