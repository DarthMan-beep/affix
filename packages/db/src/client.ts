import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env at the repo root (see README).",
  );
}

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { affixSql?: postgres.Sql };
const sql = globalForDb.affixSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.affixSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;

/** Close the pool (for scripts such as the seed). */
export const closeDb = () => sql.end({ timeout: 5 });
