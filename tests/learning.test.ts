import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { useTestDatabase, query } from "../src/lib/db";
import {
  passwordHash,
  login,
  currentUser,
  authorizeClass,
  type User,
} from "../src/lib/auth";
import {
  catalog,
  publicContent,
  lessons,
  VERSION,
} from "../src/modules/content/catalog";
import { skills } from "../src/modules/content/skills";
import {
  scoreQuiz,
  scoreGame,
  componentProfile,
} from "../src/modules/assessment/scoring";
import {
  saveAttempt,
  startFinal,
  studentState,
} from "../src/modules/learning/service";
import { getHint } from "../src/modules/ai/service";
import { saveReview, classReport } from "../src/modules/reporting/service";
import { createClass, createUser } from "../src/modules/admin/service";
let db: PGlite,
  student: User,
  teacher: User,
  otherTeacher: User,
  admin: User,
  classId: string;
const submit = (kind: string, extra: any = {}, u = student) =>
  saveAttempt(u, { requestId: randomUUID(), version: VERSION, kind, ...extra });
const parts = {
  decomposition: "สำรวจ แบ่งหน้าที่ ตั้งถัง และติดตามผล",
  pattern: "เศษอาหารมากกว่าทุกชนิด เช่น วันแรก 12 วันถัดมา 13",
  abstraction: "ใช้ชนิดและปริมาณขยะเพื่อเลือกถัง ละสีรองเท้า",
  algorithm: "สำรวจ แยกชนิด ตั้งถัง ทดลอง แล้วตรวจทุกวัน",
};
beforeAll(async () => {
  db = new PGlite();
  useTestDatabase(db);
  await db.exec(
    await readFile("netlify/database/migrations/001_initial.sql", "utf8"),
  );
  classId = randomUUID();
  await query("INSERT INTO classrooms(id,name,code) VALUES($1,$2,$3)", [
    classId,
    "Test class",
    "TEST01",
  ]);
  await query("INSERT INTO content_versions(id,catalog) VALUES($1,$2)", [
    VERSION,
    JSON.stringify(catalog),
  ]);
  for (const s of skills)
    await query("INSERT INTO assignments(class_id,skill) VALUES($1,$2)", [
      classId,
      s,
    ]);
  async function user(role: User["role"]): Promise<User> {
    const id = randomUUID(),
      login = role + id.slice(0, 8);
    await query(
      "INSERT INTO users(id,login,password_hash,role,class_id,alias) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        login,
        passwordHash("LongTestPass12!"),
        role,
        role === "student" ? classId : null,
        login,
      ],
    );
    return {
      id,
      login,
      role,
      class_id: role === "student" ? classId : null,
      alias: login,
      avatar: "fox",
    };
  }
  student = await user("student");
  teacher = await user("teacher");
  otherTeacher = await user("teacher");
  admin = await user("admin");
  await query("INSERT INTO teacher_classes VALUES($1,$2)", [
    teacher.id,
    classId,
  ]);
  await query("INSERT INTO enrollments VALUES($1,$2)", [student.id, VERSION]);
});
afterAll(async () => {
  useTestDatabase(undefined);
  await db.close();
});
describe("Stage 1: identity, content and Decomposition", () => {
  it("strips keys, hints and answer-specific feedback from public content", () => {
    const c = JSON.stringify(publicContent());
    expect(c).not.toContain('"correct"');
    expect(c).not.toContain('"feedback":[');
    expect(c).not.toContain('"hints"');
  });
  it("scores objective questions, rejecting incomplete answers", () => {
    expect(
      scoreQuiz(
        lessons[0].quiz,
        lessons[0].quiz.map((q) => q.correct),
      ).score,
    ).toBe(10);
    expect(() => scoreQuiz(lessons[0].quiz, [0])).toThrow();
  });
  it("requires a correct class code and password", async () => {
    await expect(
      login(student.login, "LongTestPass12!", "WRONG"),
    ).rejects.toMatchObject({ status: 401 });
    const { token } = await login(student.login, "LongTestPass12!", "TEST01");
    expect((await currentUser(token)).id).toBe(student.id);
    await expect(currentUser("wrong")).rejects.toMatchObject({ status: 401 });
  });
  it("authorizes teacher only within assigned classes", async () => {
    await authorizeClass(teacher, classId);
    await expect(authorizeClass(otherTeacher, classId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(authorizeClass(student, classId)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("blocks mission before diagnostic and role escalation", async () => {
    await expect(
      submit("game", { skill: "decomposition", answers: [0] }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      submit("diagnostic", { answers: [0, 1, 2, 0] }, teacher),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("persists baseline once, without adding it to course score", async () => {
    await submit("diagnostic", {
      answers: catalog.diagnostic.map((q) => q.correct),
    });
    await expect(
      submit("diagnostic", { answers: [0, 1, 2, 0] }),
    ).rejects.toMatchObject({ status: 409 });
    const s = await studentState(student);
    expect(s.diagnostic!.result.score).toBe(8);
    expect(s.quizTotal).toBe(0);
    expect(s.modules[0].unlocked).toBe(true);
  });
  it("enforces stage order", async () => {
    await expect(
      submit("quiz", { skill: "decomposition", answers: [1, 0, 2, 0, 1] }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("deduplicates simultaneous reconnect attempts", async () => {
    const input = {
      requestId: randomUUID(),
      version: VERSION,
      kind: "game",
      skill: "decomposition",
      answers: [0, 1, 3],
    };
    const a = await Promise.all([
      saveAttempt(student, input),
      saveAttempt(student, input),
    ]);
    expect(a[0].id).toBe(a[1].id);
    expect(
      (
        await query("SELECT * FROM attempts WHERE request_id=$1", [
          input.requestId,
        ])
      ).length,
    ).toBe(1);
  });
  it("rejects a mismatched payload reusing the same request ID", async () => {
    const input = {
      requestId: randomUUID(),
      version: VERSION,
      kind: "game",
      skill: "decomposition",
      answers: [0],
    };
    await saveAttempt(student, input);
    await expect(
      saveAttempt(student, { ...input, answers: [1] }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("saves practice, links a revised answer to its hint, and completes mission", async () => {
    await submit("guided", { skill: "decomposition", text: "เตรียมสนาม" });
    const hint = await getHint(student, {
      requestId: randomUUID(),
      skill: "decomposition",
      stage: "guided",
      action: "hint",
      level: 2,
      text: "เตรียมสนาม",
    });
    expect(hint.source).toBe("prepared");
    await submit("guided", {
      skill: "decomposition",
      text: "เตรียมสนาม แบ่งทีม และจัดอุปกรณ์",
    });
    await submit("independent", {
      skill: "decomposition",
      text: "รวบรวม แยกหมวด จัดชั้น แล้วตรวจ",
    });
    await submit("quiz", {
      skill: "decomposition",
      answers: lessons[0].quiz.map((q) => q.correct),
    });
    await submit("reflection", {
      skill: "decomposition",
      text: "เห็นว่างานใหญ่แบ่งเป็นหลายส่วนได้",
    });
    const s = await studentState(student);
    expect(s.modules[0].completed).toBe(true);
    expect(s.modules[1].unlocked).toBe(true);
    expect(s.hints[0].revised).toBe(true);
    expect(s.quizTotal).toBe(10);
    const report = await classReport(teacher, classId);
    expect(report.students[0].state.attempts.length).toBeGreaterThan(5);
  });
});
describe("Stage 2: remaining missions", () => {
  it("contains two examples and five scored questions with feedback per module", () => {
    for (const l of lessons) {
      expect(l.examples.length).toBeGreaterThanOrEqual(2);
      expect(l.quiz).toHaveLength(5);
      l.quiz.forEach((q) => expect(q.feedback).toHaveLength(q.options.length));
    }
  });
  it("supports multiple valid algorithm orders and debugging", () => {
    expect(scoreGame(lessons[3], [3, 1, 5, 4, 2, 0]).correct).toBe(true);
    expect(scoreGame(lessons[3], [4, 3, 1, 5, 2, 0]).correct).toBe(true);
    expect(scoreGame(lessons[3], [0, 1, 2, 3, 4, 5]).correct).toBe(false);
  });
  it("enforces assignments and independent fading", async () => {
    await query(
      "UPDATE assignments SET enabled=false WHERE class_id=$1 AND skill='pattern'",
      [classId],
    );
    await expect(
      submit("game", { skill: "pattern", answers: [0, 2] }),
    ).rejects.toMatchObject({ status: 409 });
    await query(
      "UPDATE assignments SET enabled=true WHERE class_id=$1 AND skill='pattern'",
      [classId],
    );
    await expect(
      getHint(student, {
        requestId: randomUUID(),
        skill: "decomposition",
        stage: "independent",
        level: 3,
        action: "hint",
        text: "รวบรวมหนังสือ",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("completes the remaining missions and caps quiz score at 40", async () => {
    for (const l of lessons.slice(1)) {
      await submit("game", { skill: l.id, answers: l.game.correct });
      await submit("guided", {
        skill: l.id,
        text: "ตัวอย่างการฝึกพร้อมเหตุผล",
      });
      await submit("independent", {
        skill: l.id,
        text: "คำตอบอิสระพร้อมเหตุผลของฉัน",
      });
      await submit("quiz", {
        skill: l.id,
        answers: l.quiz.map((q) => q.correct),
      });
      await submit("reflection", {
        skill: l.id,
        text: "ฉันได้ฝึกวิธีคิดใหม่และตรวจข้อมูล",
      });
    }
    const s = await studentState(student);
    expect(s.completed).toBe(4);
    expect(s.quizTotal).toBe(40);
    expect(s.total).toBeNull();
  });
});
describe("Stage 3 and 4: final, rubric, safety and reports", () => {
  it("locks hints and quiz changes during final assessment, preserves drafts", async () => {
    await startFinal(student);
    await expect(
      getHint(student, {
        requestId: randomUUID(),
        skill: "algorithm",
        stage: "guided",
        level: 1,
        action: "hint",
        text: "ช่วยคิดขั้นตอน",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      submit("quiz", { skill: "algorithm", answers: [0, 1, 2, 1, 0] }),
    ).rejects.toMatchObject({ status: 409 });
    await submit("final_draft", { parts });
    await submit("final_draft", {
      parts: { ...parts, algorithm: parts.algorithm + " ถ้าไม่พอเพิ่มถัง" },
    });
    expect(
      (await studentState(student)).attempts.filter(
        (a) => a.kind === "final_draft",
      ),
    ).toHaveLength(2);
  });
  it("leaves final score pending and blocks unauthorized review", async () => {
    const final = await submit("final", { parts });
    expect((await studentState(student)).total).toBeNull();
    const rubric = Object.fromEntries(
      skills.map((s) => [
        s,
        { score: 15, evidence: "คำตอบมีหลักฐานตรงเกณฑ์ระดับนี้" },
      ]),
    );
    await expect(
      saveReview(otherTeacher, {
        requestId: randomUUID(),
        submissionId: final.id,
        rubric,
        feedback: "คิดได้เป็นระบบ",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(submit("final", { parts })).rejects.toMatchObject({
      status: 409,
    });
  });
  it("teacher applies visible rubric and student sees 100, with no badge/pretest points", async () => {
    const s = await studentState(student),
      rubric = Object.fromEntries(
        skills.map((s) => [
          s,
          { score: 15, evidence: "ครูตรวจคำตอบตามเกณฑ์ พร้อมหลักฐาน" },
        ]),
      );
    const input = {
      requestId: randomUUID(),
      submissionId: s.latestFinal!.id,
      rubric,
      feedback: "มีข้อมูลสนับสนุนและตรวจผลได้ดี",
    };
    const a = await saveReview(teacher, input),
      b = await saveReview(teacher, input);
    expect(a.id).toBe(b.id);
    const reviewed = await studentState(student);
    expect(reviewed.total).toBe(100);
    expect(reviewed.profile.every((p) => p.total === 25)).toBe(true);
    await submit("course_reflection", {
      text: "จะเก็บข้อมูลให้ครบก่อนตัดสินใจ",
    });
    expect((await studentState(student)).courseReflection).toBeTruthy();
  });
  it("calculates analytics from stored evidence and protects exports", async () => {
    const r = await classReport(teacher, classId);
    expect(r.summary.students).toBe(1);
    expect(r.summary.reviewed).toBe(1);
    expect(r.summary.average).toBe(100);
    expect(r.summary.hintLevels[1].count).toBe(1);
    expect(r.summary.revisionsAfterHints).toBe(1);
    await expect(classReport(otherTeacher, classId)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("validates rubric bounds and content version", async () => {
    const s = await studentState(student);
    await expect(
      saveReview(teacher, {
        requestId: randomUUID(),
        submissionId: s.latestFinal!.id,
        rubric: {},
        feedback: "ok",
      }),
    ).rejects.toThrow();
    await expect(
      saveAttempt(student, {
        requestId: randomUUID(),
        version: "changed",
        kind: "course_reflection",
        text: "ทดสอบเวอร์ชัน",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("disabling rewards leaves academic scores unchanged", async () => {
    await query("UPDATE classrooms SET rewards_enabled=false WHERE id=$1", [
      classId,
    ]);
    const s = await studentState(student);
    expect(s.badges).toHaveLength(0);
    expect(s.total).toBe(100);
    expect(
      componentProfile(
        { decomposition: 10 },
        {
          decomposition: { score: 15 },
          pattern: { score: 0 },
          abstraction: { score: 0 },
          algorithm: { score: 0 },
        },
      )[0].total,
    ).toBe(25);
  });
  it("admin creates class and assigned accounts, ordinary teachers cannot", async () => {
    const c = await createClass(admin, { name: "New class", code: "NEW01" });
    await createUser(admin, {
      login: "new-student",
      alias: "นักสำรวจใหม่",
      password: "LongSafePass12!",
      role: "student",
      classId: c.id,
    });
    await expect(
      createClass(teacher, { name: "Forbidden", code: "NOPE01" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await query("SELECT * FROM assignments WHERE class_id=$1", [c.id]),
    ).toHaveLength(4);
  });
});
