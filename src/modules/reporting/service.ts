import { randomUUID } from "node:crypto";
import { query, transaction } from "../../lib/db";
import { authorizeClass, AppError, type User } from "../../lib/auth";
import { reviewSchema } from "../learning/validation";
import { studentState } from "../learning/service";
export async function teacherClasses(user: User) {
  return user.role === "admin"
    ? query("SELECT * FROM classrooms ORDER BY name")
    : query(
        "SELECT c.* FROM classrooms c JOIN teacher_classes tc ON tc.class_id=c.id WHERE tc.user_id=$1 ORDER BY name",
        [user.id],
      );
}
export async function classReport(user: User, classId: string) {
  await authorizeClass(user, classId);
  const students = await query<User>(
    "SELECT id,login,role,class_id,alias,avatar FROM users WHERE class_id=$1 AND role='student' ORDER BY alias",
    [classId],
  );
  const profiles = await Promise.all(
    students.map(async (s) => ({ user: s, state: await studentState(s) })),
  );
  const reviewed = profiles.filter((p) => p.state.total !== null);
  const missed: Record<string, number> = {};
  for (const p of profiles)
    for (const a of p.state.attempts.filter((a) => a.kind === "quiz"))
      for (const item of a.result.items ?? [])
        if (!item.correct)
          missed[item.concept] = (missed[item.concept] ?? 0) + 1;
  const hints = profiles.flatMap((p) => p.state.hints);
  return {
    students: profiles,
    summary: {
      students: students.length,
      completed: profiles.filter((p) => p.state.completed === 4).length,
      pending: profiles.filter((p) => p.state.latestFinal && !p.state.review)
        .length,
      reviewed: reviewed.length,
      average: reviewed.length
        ? reviewed.reduce((n, p) => n + p.state.total!, 0) / reviewed.length
        : null,
      hintLevels: [1, 2, 3].map((level) => ({
        level,
        count: hints.filter((h) => h.level === level).length,
      })),
      revisionsAfterHints: hints.filter((h) => h.revised).length,
      missed,
    },
    assignments: await query("SELECT * FROM assignments WHERE class_id=$1", [
      classId,
    ]),
  };
}
export async function saveReview(user: User, raw: unknown) {
  const input = reviewSchema.parse(raw);
  const [submission] = await query(
    "SELECT a.*,u.class_id FROM attempts a JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND a.kind='final'",
    [input.submissionId],
  );
  if (!submission) throw new AppError(404, "ไม่พบงานส่ง");
  await authorizeClass(user, submission.class_id);
  return transaction(submission.user_id, async (db) => {
    const prior = (
      await db.query(
        "SELECT * FROM reviews WHERE teacher_id=$1 AND request_id=$2",
        [user.id, input.requestId],
      )
    ).rows[0];
    if (prior) return prior;
    const [saved] = (
      await db.query(
        "INSERT INTO reviews(id,submission_id,teacher_id,request_id,rubric,feedback) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          randomUUID(),
          input.submissionId,
          user.id,
          input.requestId,
          JSON.stringify(input.rubric),
          input.feedback,
        ],
      )
    ).rows;
    return saved;
  });
}
