import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
export type Row = Record<string, any>;
export interface DB {
  query<T extends Row = Row>(
    sql: string,
    params?: any[],
  ): Promise<{ rows: T[] }>;
}
type Globals = typeof globalThis & {
  ctPool?: Pool;
  ctLocal?: PGlite;
  ctInit?: Promise<void>;
};
const g = globalThis as Globals;
let override: DB | undefined;
export function useTestDatabase(db: DB | undefined) {
  override = db;
}
export async function database(): Promise<DB> {
  if (override) return override;
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
  if (url) {
    g.ctPool ??= new Pool({
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 8000,
    });
    return g.ctPool;
  }
  if (process.env.LOCAL_DATABASE_PATH && !process.env.NETLIFY) {
    if (!g.ctLocal) {
      const { PGlite } = await import("@electric-sql/pglite");
      g.ctLocal = new PGlite(process.env.LOCAL_DATABASE_PATH);
    }
    return g.ctLocal;
  }
  throw new Error("DATABASE_NOT_CONFIGURED");
}
export async function query<T extends Row = Row>(
  sql: string,
  params: any[] = [],
) {
  return (await (await database()).query<T>(sql, params)).rows;
}
// Serializes changes per learner even across serverless instances.
export async function transaction<T>(
  userId: string,
  fn: (db: DB) => Promise<T>,
): Promise<T> {
  const db = await database();
  if ("connect" in db) {
    const c = await (db as Pool).connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  return (db as PGlite).transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
    return fn(tx);
  });
}
