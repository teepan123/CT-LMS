"use client";
import { useState, useEffect } from "react";
import { Download, Users, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { api } from "@/lib/client-sync";
import { skills, labels } from "@/modules/content/skills";
import type { PublicContent } from "@/modules/content/catalog";
export function Teacher({ content }: { content: PublicContent }) {
  const [classes, setClasses] = useState<any[]>([]),
    [classId, setClassId] = useState(""),
    [report, setReport] = useState<any>(),
    [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  async function load() {
    try {
      setReport(await api("teacher/report?classId=" + classId));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    api("teacher/classes")
      .then((c) => {
        setClasses(c);
        if (c.length) setClassId(c[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (classId) void load();
  }, [classId]);
  const student = report?.students.find((p: any) => p.user.id === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <small className="eyebrow">TEACHER WORKSPACE</small>
          <h1>ห้องเรียนของนักคิด</h1>
          <p>ติดตามกระบวนการเรียนรู้จากหลักฐานที่บันทึกจริง</p>
        </div>
        <label>
          ห้องเรียน{" "}
          <select
            aria-label="เลือกห้องเรียน"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSelected("");
            }}
          >
            {classes.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!classes.length && (
        <p>
          ยังไม่มีห้องเรียนที่มอบหมาย ให้ผู้ดูแลสร้างห้องและบัญชีผู้เรียนก่อน
        </p>
      )}
      {report && (
        <>
          <div className="stats-grid">
            {[
              [Users, "นักเรียน", report.summary.students],
              [CheckCircle2, "ครบ 4 ภารกิจ", report.summary.completed],
              [Clock, "รอตรวจ", report.summary.pending],
              [
                BarChart3,
                "เฉลี่ยเฉพาะที่ตรวจแล้ว",
                report.summary.average === null
                  ? "—"
                  : report.summary.average.toFixed(1) + "/100",
              ],
            ].map(([Icon, label, value]: any) => (
              <article key={label}>
                <Icon size={21} />
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <section className="lesson-panel">
            <div className="section-heading">
              <h2>มอบหมายภารกิจ</h2>
              <a
                className="button"
                href={"/api/teacher/export?classId=" + classId}
              >
                <Download size={16} />
                ส่งออกหลักฐาน JSON
              </a>
            </div>
            <div className="row wrap">
              {report.assignments.map((a: any) => (
                <label className="choice" key={a.skill}>
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={async (e) => {
                      try {
                        await api("teacher/assignment", {
                          classId,
                          skill: a.skill,
                          enabled: e.target.checked,
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  />
                  {labels[a.skill as keyof typeof labels]}
                </label>
              ))}
            </div>
            <label className="choice">
              <input
                type="checkbox"
                checked={
                  classes.find((c) => c.id === classId)?.rewards_enabled ?? true
                }
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  try {
                    await api("teacher/rewards", { classId, enabled });
                    setClasses((c) =>
                      c.map((x) =>
                        x.id === classId
                          ? { ...x, rewards_enabled: enabled }
                          : x,
                      ),
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
              แสดงเหรียญทักษะส่วนบุคคล
            </label>
          </section>
          <section className="lesson-panel">
            <h2>รายชื่อนักสำรวจ</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ผู้เรียน</th>
                    <th>ภารกิจ</th>
                    <th>Quiz /40</th>
                    <th>รวม /100</th>
                    <th>หลักฐาน</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((p: any) => (
                    <tr key={p.user.id}>
                      <th scope="row">{p.user.alias}</th>
                      <td>{p.state.completed}/4</td>
                      <td>{p.state.quizTotal}</td>
                      <td>{p.state.total ?? "รอตรวจ"}</td>
                      <td>
                        <button onClick={() => setSelected(p.user.id)}>
                          ดูหลักฐาน {p.user.alias}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!report.students.length && (
              <p>
                ยังไม่มีนักเรียนในห้องนี้ ไม่มีการสร้างข้อมูลตัวอย่างในรายงาน
              </p>
            )}
          </section>
          <div className="two-column">
            <section className="lesson-panel">
              <h2>รูปแบบการขอความช่วยเหลือ</h2>
              {report.summary.hintLevels.map((h: any) => (
                <p key={h.level}>
                  ระดับ {h.level}: {h.count} ครั้ง
                </p>
              ))}
              <p>
                คำใบ้ที่ตามด้วยการแก้ไข: {report.summary.revisionsAfterHints}
              </p>
              <small>
                การแก้ไขหมายถึงข้อความเปลี่ยน ยังไม่ใช่หลักฐานว่าคุณภาพดีขึ้น
              </small>
            </section>
            <section className="lesson-panel">
              <h2>แนวคิดที่ตอบพลาดบ่อย</h2>
              <p className="muted">นับทุกครั้งที่ตอบผิด รวมการลองใหม่</p>
              {Object.entries(report.summary.missed).length ? (
                Object.entries(report.summary.missed)
                  .sort((a: any, b: any) => b[1] - a[1])
                  .map(([concept, n]: any) => (
                    <p key={concept}>
                      {concept}: {n} ครั้ง
                    </p>
                  ))
              ) : (
                <p>ยังไม่มีข้อที่ตอบพลาด</p>
              )}
            </section>
          </div>
          {student && (
            <section className="lesson-panel" id="student-evidence">
              <h2>หลักฐานของ {student.user.alias}</h2>
              <p>
                Pre-test:{" "}
                {student.state.diagnostic
                  ? `${student.state.diagnostic.result.score}/${student.state.diagnostic.result.max} (ไม่รวมคะแนน)`
                  : "ยังไม่ทำ"}
              </p>
              <div className="profile-grid">
                {student.state.profile.map((p: any) => (
                  <article key={p.skill}>
                    <h3>{labels[p.skill as keyof typeof labels]}</h3>
                    <strong>{p.total ?? "—"}/25</strong>
                    <p>
                      Quiz {p.quiz}/10 · Rubric {p.final ?? "รอตรวจ"}/15
                    </p>
                  </article>
                ))}
              </div>
              {student.state.latestFinal && (
                <Review
                  key={student.state.latestFinal.id}
                  submission={student.state.latestFinal}
                  content={{
                    ...content,
                    rubric: student.state.assessmentRubric,
                  }}
                  existing={student.state.review}
                  onDone={load}
                />
              )}
              <h3>ประวัติคำตอบ</h3>
              {student.state.attempts.map((a: any) => (
                <details key={a.id}>
                  <summary>
                    {a.kind} · {a.skill ?? "รวม"} ·{" "}
                    {new Date(a.created_at).toLocaleString("th-TH")}
                  </summary>
                  <p>
                    หลักฐาน {a.id} · เนื้อหา {a.version}
                  </p>
                  <pre>
                    {JSON.stringify(
                      { answer: a.payload, result: a.result },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              ))}
              <h3>คำใบ้และการแก้ไข</h3>
              {student.state.hints.map((h: any) => (
                <details key={h.id}>
                  <summary>
                    ระดับ {h.level} · {h.action} ·{" "}
                    {h.revised ? "มีการแก้ไขตามมา" : "ยังไม่มีการแก้ไข"}
                  </summary>
                  <p>ก่อนขอ: {h.input}</p>
                  <p>{h.response}</p>
                  <small>
                    {h.source} · {h.id}
                  </small>
                </details>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
function Review({
  submission,
  content,
  onDone,
  existing,
}: {
  submission: any;
  content: PublicContent;
  onDone: () => Promise<void>;
  existing: any;
}) {
  const [rubric, setRubric] = useState<any>(
      existing?.rubric ??
        Object.fromEntries(skills.map((s) => [s, { score: 0, evidence: "" }])),
    ),
    [feedback, setFeedback] = useState(existing?.feedback ?? ""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="review">
      <h3>ตรวจภารกิจโรงเรียนปลอดขยะ</h3>
      <p>ให้คะแนนจากหลักฐานในคำตอบ การตรวจครั้งใหม่เก็บแยกจากครั้งก่อน</p>
      {skills.map((s) => (
        <article key={s}>
          <h4>{labels[s]}</h4>
          <blockquote className="preserve">
            {submission.payload.parts[s]}
          </blockquote>
          <label>
            คะแนน {labels[s]}
            <select
              aria-label={"คะแนน " + labels[s]}
              value={rubric[s].score}
              onChange={(e) =>
                setRubric((r: any) => ({
                  ...r,
                  [s]: { ...r[s], score: +e.target.value },
                }))
              }
            >
              {content.rubric
                .find((r) => r.skill === s)!
                .levels.map((l) => (
                  <option key={l.score} value={l.score}>
                    {l.score} — {l.text}
                  </option>
                ))}
            </select>
          </label>
          <label>
            หลักฐานและเหตุผล {labels[s]}
            <textarea
              rows={2}
              value={rubric[s].evidence}
              onChange={(e) =>
                setRubric((r: any) => ({
                  ...r,
                  [s]: { ...r[s], evidence: e.target.value },
                }))
              }
            />
          </label>
        </article>
      ))}
      <label>
        ข้อเสนอแนะรวม
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </label>
      <button
        className="primary"
        disabled={
          busy ||
          feedback.trim().length < 3 ||
          skills.some((s) => rubric[s].evidence.trim().length < 3)
        }
        onClick={async () => {
          setBusy(true);
          try {
            await api("teacher/review", {
              requestId: crypto.randomUUID(),
              submissionId: submission.id,
              rubric,
              feedback,
            });
            setMessage("บันทึกผลตรวจแล้ว นักเรียนเปิดดูคะแนนได้");
            await onDone();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        บันทึกผลตรวจ {skills.reduce((n, s) => n + rubric[s].score, 0)}/60
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
export function Admin() {
  const [state, setState] = useState<any>(),
    [error, setError] = useState("");
  async function load() {
    try {
      setState(await api("admin"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api(path, data);
      form.reset();
      setError("บันทึกแล้ว");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <h1>จัดการระบบ</h1>
      <p>บัญชีใช้นามแฝง หลีกเลี่ยงชื่อจริง วันเกิด และข้อมูลส่วนตัวของเด็ก</p>
      <p role="status">{error}</p>
      {state && (
        <>
          <div className="two-column">
            <form
              className="lesson-panel"
              onSubmit={(e) => submit(e, "admin/classes")}
            >
              <h2>สร้างห้องเรียน</h2>
              <label>
                ชื่อห้อง
                <input name="name" required minLength={2} maxLength={80} />
              </label>
              <label>
                รหัสห้อง (A–Z และตัวเลข 4–16 ตัว)
                <input name="code" required pattern="[A-Z0-9]{4,16}" />
              </label>
              <button className="primary">สร้างห้อง</button>
            </form>
            <form
              className="lesson-panel"
              onSubmit={(e) => submit(e, "admin/users")}
            >
              <h2>สร้างบัญชีผู้เรียน/ครู</h2>
              <label>
                รหัสผู้ใช้
                <input
                  name="login"
                  required
                  pattern="[a-zA-Z0-9_-]{3,40}"
                  autoComplete="off"
                />
              </label>
              <label>
                นามแฝง
                <input name="alias" required minLength={2} />
              </label>
              <label>
                รหัสผ่าน (อย่างน้อย 12 ตัว)
                <input
                  name="password"
                  required
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                />
              </label>
              <label>
                บทบาท
                <select name="role">
                  <option value="student">นักเรียน</option>
                  <option value="teacher">ครู</option>
                </select>
              </label>
              <label>
                ห้องเรียน
                <select name="classId" required>
                  {state.classes.map((c: any) => (
                    <option value={c.id} key={c.id}>
                      {c.name} · {c.code}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={!state.classes.length}>
                สร้างบัญชี
              </button>
            </form>
          </div>
          <section className="lesson-panel">
            <h2>สถานะระบบ</h2>
            <p>
              AI provider:{" "}
              {state.aiConfigured
                ? "ตั้งค่าแล้ว — ต้องทดสอบก่อนใช้งานจริง"
                : "ยังไม่ตั้งค่า · ใช้คำใบ้ที่เตรียมไว้"}
            </p>
            <p>เนื้อหา: {state.versions.map((v: any) => v.id).join(", ")}</p>
            <p>
              การแก้เนื้อหาและ AI settings ทำผ่านโค้ดที่มีเวอร์ชันและ
              environment ฝั่งเซิร์ฟเวอร์ในรุ่นแรก
            </p>
            <h3>บัญชีทั้งหมด ({state.users.length})</h3>
            {state.users.map((u: any) => (
              <p key={u.id}>
                {u.alias} · {u.login} · {u.role}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
