import { writeFile } from "node:fs/promises";
import { catalog } from "../src/modules/content/catalog";
async function main() {
  const json = JSON.stringify(catalog).replaceAll("'", "''");
  await writeFile(
    "netlify/database/migrations/002_content_2026_10_1.sql",
    `-- Immutable assessment catalog ${catalog.version}; create a new migration for a new version.\nINSERT INTO content_versions(id,catalog) VALUES ('${catalog.version}', '${json}'::jsonb) ON CONFLICT(id) DO NOTHING;\n`,
  );
}
main();
