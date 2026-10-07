/*
 * Applies pending migrations with drizzle-orm's own migrator, which reads the
 * same files and history table as `drizzle-kit migrate`. The Docker image runs
 * a bundled copy of this on start (see the Dockerfile); in development use
 * `npm run db:migrate`.
 */
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  // Resolves to packages/db/drizzle from both src/ and the bundle in dist/.
  await migrate(drizzle(sql), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  console.info("Migrations applied.");
} finally {
  await sql.end({ timeout: 5 });
}
