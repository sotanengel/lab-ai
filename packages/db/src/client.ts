import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>;

function resolveDbPath(url: string): string {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }
  return url;
}

export function createDb(databaseUrl: string) {
  const path = resolveDbPath(databaseUrl);
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new BetterSqlite3(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
