import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query, transaction } from "../../lib/db";
import { requireRole, passwordHash, type User, AppError } from "../../lib/auth";
import { skills } from "../content/skills";
import { VERSION } from "../content/catalog";
export const classSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().regex(/^[A-Z0-9]{4,16}$/),
});
export async function createClass(user: User, raw: unknown) {
  requireRole(user, "admin");
  const data = classSchema.parse(raw);
  return transaction(user.id, async (db) => {
    const id = randomUUID();
    await db.query("INSERT INTO classrooms(id,name,code) VALUES($1,$2,$3)", [
      id,
      data.name,
      data.code,
    ]);
    for (const skill of skills)
      await db.query("INSERT INTO assignments(class_id,skill) VALUES($1,$2)", [
        id,
        skill,
      ]);
    return { id };
  });
}
const userSchema = z.object({
  login: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,40}$/)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
  alias: z.string().trim().min(2).max(60),
  role: z.enum(["student", "teacher"]),
  classId: z.uuid(),
  avatar: z.enum(["fox", "rabbit", "bear"]).default("fox"),
});
export async function createUser(user: User, raw: unknown) {
  requireRole(user, "admin");
  const d = userSchema.parse(raw);
  return transaction(user.id, async (db) => {
    if (
      !(await db.query("SELECT 1 FROM classrooms WHERE id=$1", [d.classId]))
        .rows.length
    )
      throw new AppError(404, "ไม่พบห้องเรียน");
    const id = randomUUID();
    await db.query(
      "INSERT INTO users(id,login,password_hash,role,class_id,alias,avatar) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id,
        d.login,
        passwordHash(d.password),
        d.role,
        d.role === "student" ? d.classId : null,
        d.alias,
        d.avatar,
      ],
    );
    if (d.role === "student")
      await db.query("INSERT INTO enrollments(user_id,version) VALUES($1,$2)", [
        id,
        VERSION,
      ]);
    else
      await db.query(
        "INSERT INTO teacher_classes(user_id,class_id) VALUES($1,$2)",
        [id, d.classId],
      );
    return { id };
  });
}
export async function adminState(user: User) {
  requireRole(user, "admin");
  return {
    classes: await query("SELECT * FROM classrooms ORDER BY name"),
    users: await query(
      "SELECT id,login,alias,role,class_id FROM users ORDER BY alias",
    ),
    versions: await query("SELECT id,created_at FROM content_versions"),
    aiConfigured: !!process.env.AI_API_KEY && !!process.env.AI_MODEL,
  };
}
