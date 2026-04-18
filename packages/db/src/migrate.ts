import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client.js";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const db = createDb(databaseUrl);

migrate(db, { migrationsFolder: "./migrations" });

// biome-ignore lint/suspicious/noConsoleLog: one-shot CLI
console.log(`Migrations applied to ${databaseUrl}`);
process.exit(0);
