import { randomUUID } from "node:crypto";
import { canonical } from "../../lib/serialization";
import { query, transaction, type DB, type Row } from "../../lib/db";
import { AppError, requireRole, type User } from "../../lib/auth";
import { type Catalog } from "../content/catalog";
import { validateCatalog } from "../content/validation";
import { skills, type Skill } from "../content/skills";
import { scoreQuiz, scoreGame, componentProfile } from "../assessment/scoring";
import { attemptSchema, type AttemptInput } from "./validation";
export async function learnerContent(user: User, db?: DB): Promise<Catalog> {
  const sql =
    "SELECT c.catalog FROM enrollments e JOIN content_versions c ON c.id=e.version WHERE e.user_id=$1";
  const rows = db
    ? (await db.query(sql, [user.id])).rows
    : await query(sql, [user.id]);
  if (!rows.length)
    throw new AppError(409, "ครูยังไม่ได้กำหนดหลักสูตรให้บัญชีนี้");
  return validateCatalog(rows[0].catalog);
}
export function deriveState(
  attempts: Row[],
  reviews: Row[],
  enabled: string[] = [...skills],
  rewards = true,
) {
  const has = (kind: string, skill?: string) =>
    attempts.some((a) => a.kind === kind && (!skill || a.skill === skill));
  const diagnostic = attempts.find((a) => a.kind === "diagnostic") ?? null;
  const modules = skills.map((skill, index) => {
    const qa = attempts.filter((a) => a.kind === "quiz" && a.skill === skill);
    const best = qa.reduce((n, a) => Math.max(n, a.result.score), 0);
    const completed = [
      "game",
      "guided",
      "independent",
      "quiz",
      "reflection",
    ].every((k) => has(k, skill));
    return {
      skill,
      index,
      completed,
      best,
      quizAttempts: qa.length,
      stages: Object.fromEntries(
        ["game", "guided", "independent", "quiz", "reflection"].map((k) => [
          k,
          has(k, skill),
        ]),
      ),
      enabled: enabled.includes(skill),
    };
  });
  const latestFinal = attempts.filter((a) => a.kind === "final").at(-1) ?? null;
  const review = latestFinal
    ? (reviews.filter((r) => r.submission_id === latestFinal.id).at(-1) ?? null)
    : null;
  const profile = componentProfile(
    Object.fromEntries(modules.map((m) => [m.skill, m.best])),
    review?.rubric,
  );
  return {
    diagnostic,
    modules: modules.map((m, i) => ({
      ...m,
      unlocked:
        !!diagnostic &&
        m.enabled &&
        modules.slice(0, i).every((p) => p.completed),
    })),
    latestFinal,
    review,
    reviews,
    profile,
    total: review ? profile.reduce((n, p) => n + (p.total ?? 0), 0) : null,
    quizTotal: modules.reduce((n, m) => n + m.best, 0),
    completed: modules.filter((m) => m.completed).length,
    courseReflection:
      attempts.filter((a) => a.kind === "course_reflection").at(-1) ?? null,
    badges: rewards
      ? modules.filter((m) => m.completed).map((m) => m.skill)
      : [],
    attempts,
  };
}
export type StudentState = ReturnType<typeof deriveState> & {
  version: string;
  locked: boolean;
  hints: Row[];
  assessmentRubric: Catalog["rubric"];
};
export async function studentState(user: User): Promise<StudentState> {
  const [attempts, reviews, assignments, c, locks, hints, room] =
    await Promise.all([
      query("SELECT * FROM attempts WHERE user_id=$1 ORDER BY created_at,id", [
        user.id,
      ]),
      query(
        "SELECT r.* FROM reviews r JOIN attempts a ON a.id=r.submission_id WHERE a.user_id=$1 ORDER BY r.created_at,r.id",
        [user.id],
      ),
      query(
        "SELECT skill FROM assignments WHERE class_id=$1 AND enabled=true",
        [user.class_id],
      ),
      learnerContent(user),
      query("SELECT 1 FROM assessment_locks WHERE user_id=$1", [user.id]),
      query(
        "SELECT h.*,EXISTS(SELECT 1 FROM hint_revisions hr WHERE hr.hint_id=h.id) AS revised FROM hints h WHERE user_id=$1 ORDER BY created_at",
        [user.id],
      ),
      query("SELECT rewards_enabled FROM classrooms WHERE id=$1", [
        user.class_id,
      ]),
    ]);
  return {
    ...deriveState(
      attempts,
      reviews,
      assignments.map((a) => a.skill),
      room[0]?.rewards_enabled,
    ),
    version: c.version,
    locked: locks.length > 0,
    hints,
    assessmentRubric: c.rubric,
  };
}
export async function checkMission(db: DB, user: User, skill: Skill) {
  const a = (
    await db.query(
      "SELECT * FROM attempts WHERE user_id=$1 ORDER BY created_at,id",
      [user.id],
    )
  ).rows;
  const assignments = (
    await db.query(
      "SELECT skill FROM assignments WHERE class_id=$1 AND enabled=true",
      [user.class_id],
    )
  ).rows;
  const state = deriveState(
    a,
    [],
    assignments.map((a) => a.skill),
  );
  if (!state.modules.find((m) => m.skill === skill)?.unlocked)
    throw new AppError(
      409,
      "ทำแบบประเมินและภารกิจก่อนหน้าให้ครบ หรือให้ครูเปิดภารกิจนี้",
    );
  return a;
}
export async function saveAttempt(user: User, raw: unknown) {
  requireRole(user, "student");
  const input = attemptSchema.parse(raw);
  return transaction(user.id, async (db) => {
    const prior = (
      await db.query(
        "SELECT * FROM attempts WHERE user_id=$1 AND request_id=$2",
        [user.id, input.requestId],
      )
    ).rows[0];
    if (prior) {
      if (
        JSON.stringify(prior.payload) !==
        JSON.stringify(JSON.parse(JSON.stringify(input)))
      ) {
        if (canonical(prior.payload) !== canonical(input))
          throw new AppError(409, "รหัสส่งซ้ำมีข้อมูลไม่ตรงกัน");
      }
      return prior;
    }
    const c = await learnerContent(user, db);
    if (c.version !== input.version)
      throw new AppError(409, "เวอร์ชันบทเรียนไม่ตรง กรุณาโหลดใหม่");
    const attempts = (
      await db.query(
        "SELECT * FROM attempts WHERE user_id=$1 ORDER BY created_at,id",
        [user.id],
      )
    ).rows;
    const locked =
      (
        await db.query("SELECT 1 FROM assessment_locks WHERE user_id=$1", [
          user.id,
        ])
      ).rows.length > 0;
    const has = (kind: string, skill?: string) =>
      attempts.some((a) => a.kind === kind && (!skill || a.skill === skill));
    let result: Row = { saved: true };
    if (input.kind === "diagnostic") {
      if (has("diagnostic")) throw new AppError(409, "บันทึกจุดเริ่มต้นแล้ว");
      result = scoreQuiz(c.diagnostic, input.answers ?? []);
    } else if (["final", "final_draft"].includes(input.kind)) {
      if (!locked) throw new AppError(409, "เริ่มงานประเมินก่อน");
      if (has("final")) throw new AppError(409, "ส่งงานแล้ว รอครูตรวจ");
      if (!input.parts) throw new AppError(400, "ตอบให้ครบทั้ง 4 ส่วน");
      result = { saved: true, pending: input.kind === "final" };
    } else if (input.kind === "course_reflection") {
      const r = (
        await db.query(
          "SELECT r.id FROM reviews r JOIN attempts a ON a.id=r.submission_id WHERE a.user_id=$1",
          [user.id],
        )
      ).rows;
      if (!r.length || !input.text)
        throw new AppError(409, "สะท้อนคิดได้หลังครูตรวจงาน");
    } else {
      if (locked)
        throw new AppError(
          409,
          "อยู่ระหว่างการประเมิน เรียนและแก้คะแนนเพิ่มไม่ได้",
        );
      if (!input.skill) throw new AppError(400, "ระบุภารกิจ");
      await checkMission(db, user, input.skill);
      const lesson = c.lessons.find((l) => l.id === input.skill)!;
      const prerequisite: Partial<Record<AttemptInput["kind"], string>> = {
        guided: "game",
        independent: "guided",
        quiz: "independent",
        reflection: "quiz",
      };
      if (
        prerequisite[input.kind] &&
        !has(prerequisite[input.kind]!, input.skill)
      )
        throw new AppError(409, "ทำกิจกรรมก่อนหน้าให้เสร็จก่อน");
      if (input.kind === "game")
        result = scoreGame(lesson, input.answers ?? []);
      else if (input.kind === "quiz")
        result = scoreQuiz(lesson.quiz, input.answers ?? []);
      else if (!input.text)
        throw new AppError(400, "ลองเขียนความคิดอย่างน้อย 3 ตัวอักษร");
    }
    const id = randomUUID();
    const [saved] = (
      await db.query(
        "INSERT INTO attempts(id,user_id,request_id,version,skill,kind,payload,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [
          id,
          user.id,
          input.requestId,
          c.version,
          input.skill ?? null,
          input.kind,
          JSON.stringify(input),
          JSON.stringify(result),
        ],
      )
    ).rows;
    if (input.kind === "guided" || input.kind === "independent")
      await db.query(
        `INSERT INTO hint_revisions(hint_id,attempt_id) SELECT id,$1 FROM hints WHERE user_id=$2 AND skill=$3 AND stage=$4 AND input<>$5 AND created_at > COALESCE((SELECT max(created_at) FROM attempts WHERE user_id=$2 AND skill=$3 AND kind=$4 AND id<>$1),'-infinity'::timestamptz) ON CONFLICT DO NOTHING`,
        [id, user.id, input.skill, input.kind, input.text],
      );
    return saved;
  });
}
export async function startFinal(user: User) {
  requireRole(user, "student");
  return transaction(user.id, async (db) => {
    const a = (
      await db.query("SELECT * FROM attempts WHERE user_id=$1", [user.id])
    ).rows;
    if (deriveState(a, []).completed !== 4)
      throw new AppError(409, "ทำภารกิจทั้ง 4 ให้ครบก่อน");
    await db.query(
      "INSERT INTO assessment_locks(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [user.id],
    );
    return { locked: true };
  });
}
