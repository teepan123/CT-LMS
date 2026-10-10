import { readFile, readdir } from "node:fs/promises";
import { database } from "../src/lib/db";
export async function migrate() {
  const db = await database();
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())",
  );
  for (const name of (await readdir("netlify/database/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (await db.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name]))
        .rows.length
    )
      continue;
    const sql = await readFile(`netlify/database/migrations/${name}`, "utf8");
    if ("exec" in db) {
      await (db as any).transaction(async (tx: any) => {
        await tx.exec(sql);
        await tx.query("INSERT INTO schema_migrations(name) VALUES($1)", [
          name,
        ]);
      });
    } else {
      const c = await (db as any).connect();
      try {
        await c.query("BEGIN");
        await c.query(sql);
        await c.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    }
    console.log("Applied", name);
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/migrate.ts"))
  migrate()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
