import { randomUUID } from "node:crypto";
import { query } from "../src/lib/db";
import { passwordHash } from "../src/lib/auth";
import { catalog, VERSION } from "../src/modules/content/catalog";
import { skills } from "../src/modules/content/skills";
import { validateCatalog } from "../src/modules/content/validation";
export async function seedContent() {
  validateCatalog(catalog);
  const [old] = await query(
    "SELECT catalog FROM content_versions WHERE id=$1",
    [VERSION],
  );
  if (
    old &&
    JSON.stringify(old.catalog) !==
      JSON.stringify(JSON.parse(JSON.stringify(catalog)))
  ) {
    // JSONB property order is not stable; compare canonical data.
    const stable = (o: any): string =>
      JSON.stringify(o, (_, v) =>
        v && typeof v === "object" && !Array.isArray(v)
          ? Object.fromEntries(
              Object.keys(v)
                .sort()
                .map((k) => [k, v[k]]),
            )
          : v,
      );
    if (stable(old.catalog) !== stable(catalog))
      throw new Error("Content changed: bump VERSION before seeding");
  }
  await query(
    "INSERT INTO content_versions(id,catalog) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [VERSION, JSON.stringify(catalog)],
  );
}
export async function seed() {
  await seedContent();
  const local = !!process.env.LOCAL_DATABASE_PATH && !process.env.NETLIFY;
  if (!local) {
    if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_PASSWORD)
      throw new Error(
        "Set ADMIN_LOGIN and ADMIN_PASSWORD to provision an administrator",
      );
    if (process.env.ADMIN_PASSWORD.length < 12)
      throw new Error("Administrator password needs at least 12 characters");
    await query(
      "INSERT INTO users(id,login,password_hash,role,alias) VALUES($1,$2,$3,$4,$5) ON CONFLICT(login) DO NOTHING",
      [
        randomUUID(),
        process.env.ADMIN_LOGIN,
        passwordHash(process.env.ADMIN_PASSWORD),
        "admin",
        "ผู้ดูแลระบบ",
      ],
    );
    return;
  }
  const classId = "10000000-0000-4000-8000-000000000001";
  await query(
    "INSERT INTO classrooms(id,name,code) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [classId, "ห้องทดลอง ป.5", "LAB2569"],
  );
  for (const skill of skills)
    await query(
      "INSERT INTO assignments(class_id,skill) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [classId, skill],
    );
  for (const [login, role, alias] of [
    ["student01", "student", "นักสำรวจ 01"],
    ["teacher01", "teacher", "ครูผู้ดูแล"],
    ["admin01", "admin", "ผู้ดูแลระบบ"],
  ]) {
    const id = randomUUID();
    await query(
      "INSERT INTO users(id,login,password_hash,role,class_id,alias) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [
        id,
        login,
        passwordHash("Explore2026!"),
        role,
        role === "student" ? classId : null,
        alias,
      ],
    );
    const [u] = await query("SELECT id FROM users WHERE login=$1", [login]);
    if (role === "teacher")
      await query(
        "INSERT INTO teacher_classes VALUES($1,$2) ON CONFLICT DO NOTHING",
        [u.id, classId],
      );
    if (role === "student")
      await query(
        "INSERT INTO enrollments VALUES($1,$2) ON CONFLICT DO NOTHING",
        [u.id, VERSION],
      );
  }
  console.log(
    "Local demonstration accounts created; see README. Never seeded on Netlify.",
  );
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/seed.ts"))
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
