import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUser,
  login,
  digest,
  AppError,
  requireRole,
  authorizeClass,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { loginSchema } from "@/modules/learning/validation";
import {
  learnerContent,
  saveAttempt,
  startFinal,
  studentState,
} from "@/modules/learning/service";
import { publicContent, catalog } from "@/modules/content/catalog";
import { getHint } from "@/modules/ai/service";
import {
  classReport,
  saveReview,
  teacherClasses,
} from "@/modules/reporting/service";
import { createClass, createUser, adminState } from "@/modules/admin/service";
import { skills } from "@/modules/content/skills";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function route(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/", "");
  const post = req.method === "POST";
  try {
    let body: any;
    if (post) {
      const origin = req.headers.get("origin");
      const originHost = origin ? new URL(origin).host : null;
      const configuredOrigins = [
        process.env.APP_ORIGIN,
        process.env.DEPLOY_PRIME_URL,
        process.env.URL,
      ].filter(Boolean);
      if (
        !origin ||
        (originHost !== req.headers.get("host") &&
          !configuredOrigins.includes(origin))
      )
        throw new AppError(403, "ต้นทางคำขอไม่ตรงกัน");
      const text = await req.text();
      if (text.length > 30000) throw new AppError(413, "ข้อมูลยาวเกินไป");
      body = JSON.parse(text);
    }
    if (path === "health" && !post) {
      await query("SELECT 1");
      return json({
        ok: true,
        database:
          process.env.LOCAL_DATABASE_PATH && !process.env.NETLIFY
            ? "local-development"
            : "postgresql",
      });
    }
    if (path === "login" && post) {
      const d = loginSchema.parse(body);
      const { token } = await login(d.login, d.password, d.code);
      const r = json({ ok: true });
      r.cookies.set("ct_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7200,
      });
      return r;
    }
    const token = req.cookies.get("ct_session")?.value;
    const user = await currentUser(token);
    if (path === "logout" && post) {
      await query("DELETE FROM sessions WHERE token_hash=$1", [digest(token!)]);
      const r = json({ ok: true });
      r.cookies.delete("ct_session");
      return r;
    }
    if (path === "me" && !post)
      return json({
        user,
        local: !!process.env.LOCAL_DATABASE_PATH && !process.env.NETLIFY,
      });
    if (path === "content" && !post)
      return json(
        publicContent(
          user.role === "student" ? await learnerContent(user) : catalog,
        ),
      );
    if (path === "state" && !post) {
      requireRole(user, "student");
      return json(await studentState(user));
    }
    if (path === "attempts" && post) return json(await saveAttempt(user, body));
    if (path === "final/start" && post) return json(await startFinal(user));
    if (path === "hints" && post) return json(await getHint(user, body));
    if (path === "avatar" && post) {
      requireRole(user, "student");
      const { avatar } = z
        .object({ avatar: z.enum(["fox", "rabbit", "bear"]) })
        .parse(body);
      await query("UPDATE users SET avatar=$1 WHERE id=$2", [avatar, user.id]);
      return json({ avatar });
    }
    if (path === "teacher/classes" && !post) {
      requireRole(user, "teacher", "admin");
      return json(await teacherClasses(user));
    }
    if ((path === "teacher/report" || path === "teacher/export") && !post) {
      requireRole(user, "teacher", "admin");
      const id = z.uuid().parse(req.nextUrl.searchParams.get("classId"));
      const report = await classReport(user, id);
      if (path === "teacher/export")
        return new NextResponse(
          JSON.stringify(
            {
              schemaVersion: 1,
              exportedAt: new Date().toISOString(),
              ...report,
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition":
                'attachment; filename="ct-research-records.json"',
              "Cache-Control": "no-store",
            },
          },
        );
      return json(report);
    }
    if (path === "teacher/review" && post) {
      requireRole(user, "teacher", "admin");
      return json(await saveReview(user, body));
    }
    if (path === "teacher/assignment" && post) {
      const d = z
        .object({
          classId: z.uuid(),
          skill: z.enum(skills),
          enabled: z.boolean(),
        })
        .parse(body);
      await authorizeClass(user, d.classId);
      await query(
        "UPDATE assignments SET enabled=$1 WHERE class_id=$2 AND skill=$3",
        [d.enabled, d.classId, d.skill],
      );
      return json({ ok: true });
    }
    if (path === "teacher/rewards" && post) {
      const d = z
        .object({ classId: z.uuid(), enabled: z.boolean() })
        .parse(body);
      await authorizeClass(user, d.classId);
      await query("UPDATE classrooms SET rewards_enabled=$1 WHERE id=$2", [
        d.enabled,
        d.classId,
      ]);
      return json({ ok: true });
    }
    if (path === "admin" && !post) return json(await adminState(user));
    if (path === "admin/classes" && post)
      return json(await createClass(user, body));
    if (path === "admin/users" && post)
      return json(await createUser(user, body));
    throw new AppError(404, "ไม่พบรายการ");
  } catch (e) {
    if (e instanceof AppError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return json({ error: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง" }, 400);
    if ((e as any).code === "23505")
      return json({ error: "รหัสนี้ถูกใช้แล้ว" }, 409);
    if ((e as Error).message === "INVALID_ANSWERS")
      return json({ error: "กรุณาตอบให้ครบทุกข้อ" }, 400);
    console.error(
      "Request failed",
      path,
      (e as Error).name,
      (e as any).code ?? "",
    );
    return json(
      { error: "เชื่อมต่อข้อมูลไม่ได้ กรุณาลองใหม่หรือติดต่อครู" },
      503,
    );
  }
}
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const GET = route;
export const POST = route;
