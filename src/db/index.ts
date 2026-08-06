import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Vercel free hosting has no DB — downloads use /tmp JSON, not Postgres.
// Keep drizzle compatible but don't crash if DATABASE_URL missing.
let pool: Pool | null = null;
let db: any = null;

if (databaseUrl) {
  const globalForDb = globalThis as typeof globalThis & {
    __arenaNextJsPostgresqlPool?: Pool;
  };
  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  db = drizzle(pool);
} else {
  // dummy that throws only if actually used
  const handler = {
    get() {
      throw new Error("DATABASE_URL not configured — use /tmp job store instead");
    },
  };
  db = new Proxy({}, handler);
  pool = null as unknown as Pool;
}

export { pool, db };
