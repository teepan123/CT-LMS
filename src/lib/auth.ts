import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { query, transaction } from "./db";
export type User = {
  id: string;
  login: string;
  role: "student" | "teacher" | "admin";
  class_id: string | null;
  alias: string;
  avatar: "fox" | "rabbit" | "bear";
};
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const assert = (
  ok: unknown,
  status: number,
  message: string,
): asserts ok => {
  if (!ok) throw new AppError(status, message);
};
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function passwordMatches(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  const a = Buffer.from(hash, "hex"),
    b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function login(login: string, password: string, code: string) {
  const bucket = digest(login.toLowerCase());
  const [limit] = await query(
    `INSERT INTO login_limits(bucket,count,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN login_limits.expires_at<now() THEN 1 ELSE login_limits.count+1 END,expires_at=CASE WHEN login_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE login_limits.expires_at END RETURNING count`,
    [bucket],
  );
  if (limit.count > 10)
    throw new AppError(429, "ลองอีกครั้งใน 15 นาที หรือให้ครูช่วยตรวจรหัส");
  const [u] = await query<User & { password_hash: string; code: string }>(
    `SELECT u.*,c.code FROM users u LEFT JOIN classrooms c ON c.id=u.class_id WHERE lower(login)=lower($1)`,
    [login],
  );
  // A dummy scrypt also runs for unknown accounts.
  const encoded = u?.password_hash ?? "0".repeat(32) + ":" + "0".repeat(128);
  if (
    !passwordMatches(password, encoded) ||
    !u ||
    (u.role === "student" && u.code !== code.trim().toUpperCase())
  )
    throw new AppError(401, "รหัสห้อง รหัสผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
  const token = randomBytes(32).toString("hex");
  await transaction(u.id, async (db) => {
    await db.query("DELETE FROM sessions WHERE user_id=$1", [u.id]);
    await db.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '2 hours')`,
      [digest(token), u.id],
    );
    await db.query("DELETE FROM login_limits WHERE bucket=$1", [bucket]);
  });
  return { token };
}
export async function currentUser(token: string | undefined): Promise<User> {
  const [u] = await query<User>(
    `SELECT u.id,u.login,u.role,u.class_id,u.alias,u.avatar FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [digest(token ?? "")],
  );
  if (!u) throw new AppError(401, "กรุณาเข้าสู่ระบบอีกครั้ง");
  return u;
}
export function requireRole(user: User, ...roles: User["role"][]) {
  if (!roles.includes(user.role))
    throw new AppError(403, "ไม่มีสิทธิ์ใช้งานส่วนนี้");
}
export async function authorizeClass(user: User, classId: string) {
  requireRole(user, "teacher", "admin");
  if (user.role === "admin") return;
  const rows = await query(
    "SELECT 1 FROM teacher_classes WHERE user_id=$1 AND class_id=$2",
    [user.id, classId],
  );
  if (!rows.length) throw new AppError(403, "เข้าถึงได้เฉพาะห้องเรียนของตนเอง");
}
