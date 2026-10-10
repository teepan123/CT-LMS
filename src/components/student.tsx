"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Lock,
  Check,
  Compass,
  Flag,
  BookOpen,
  Sparkles,
  Trophy,
} from "lucide-react";
import { WorldMap, Avatar } from "./art";
import { Quiz, Game, Draft, WasteTable } from "./ui";
import { api, enqueue } from "@/lib/client-sync";
import { skills, labels, type Skill } from "@/modules/content/skills";
import type { PublicContent } from "@/modules/content/catalog";
import type { StudentState } from "@/modules/learning/service";
import type { User } from "@/lib/auth";
const missionNames = [
  "ป่าแห่งการเริ่มต้น",
  "หุบเขานักสืบ",
  "เกาะแห่งสิ่งสำคัญ",
  "หอคอยนักออกแบบ",
];
const english = [
  "Decomposition",
  "Pattern Recognition",
  "Abstraction",
  "Algorithm Design",
];
export function MissionMap({
  state,
  user,
  onOpen,
  onLogin,
  onAvatar,
}: {
  state?: StudentState;
  user?: User;
  onOpen: (page: string) => void;
  onLogin: () => void;
  onAvatar?: (animal: User["avatar"]) => void;
}) {
  const completed = state?.completed ?? 0;
  const next = state?.modules.find((m) => !m.completed);
  return (
    <>
      <div className="eyebrow">
        <span /> YOUR LEARNING ADVENTURE
      </div>
      <div className="page-heading">
        <div>
          <h1>
            การผจญภัยของนักคิด<span className="leaf">✦</span>
          </h1>
          <p>ก้าวเล็ก ๆ ของเธอ เปลี่ยนโรงเรียนให้น่าอยู่ได้</p>
        </div>
        <span className="pill">
          <Compass size={16} /> นักสำรวจ ป.4–6
        </span>
      </div>
      <div className="adventure-layout">
        <section className="map-card">
          <div className="map-top">
            <div>
              <span className="eyebrow">CHAPTER 01</span>
              <h2>ภารกิจพิทักษ์โรงเรียน</h2>
            </div>
            <span className="map-tag">4 ดินแดนแห่งการคิด</span>
          </div>
          <WorldMap animal={user?.avatar} current={completed} />
          <div className="map-note">
            <span className="dot" /> ไม่มีจับเวลา <span>·</span> ลองใหม่ได้{" "}
            <span>·</span> ทุกความคิดมีคุณค่า
          </div>
        </section>
        <aside className="journey-aside">
          <section className="explorer-card">
            <div className="row">
              <Avatar animal={user?.avatar} />
              <div>
                <small>พร้อมออกเดินทางไหม?</small>
                <h3>{user?.alias ?? "นักสำรวจคนใหม่"}</h3>
              </div>
            </div>
            <div className="between">
              <span>ภารกิจที่สำเร็จ</span>
              <strong>{completed} / 4</strong>
            </div>
            <div className="progress">
              <span style={{ width: `${completed * 25}%` }} />
            </div>
            {user && onAvatar && (
              <fieldset className="avatar-picker">
                <legend>เลือกเพื่อนร่วมทาง</legend>
                {(["fox", "rabbit", "bear"] as const).map((a, i) => (
                  <button
                    key={a}
                    aria-label={`เลือก${["สุนัขจิ้งจอก", "กระต่าย", "หมี"][i]}`}
                    aria-pressed={user.avatar === a}
                    onClick={() => onAvatar(a)}
                  >
                    <Avatar animal={a} size={37} />
                  </button>
                ))}
              </fieldset>
            )}
            <p>
              {!user
                ? "เข้าสู่ห้องเรียน เพื่อเริ่มเส้นทางของเธอ"
                : !state?.diagnostic
                  ? "มาค้นหาจุดเริ่มต้นของเธอกัน"
                  : completed === 4
                    ? "ถึงเวลารวมพลังทั้ง 4 ทักษะแล้ว!"
                    : "ค่อย ๆ คิด ทีละก้าวก็เก่งขึ้นได้"}
            </p>
            <button
              className="primary full"
              onClick={() =>
                !user
                  ? onLogin()
                  : onOpen(
                      !state?.diagnostic
                        ? "diagnostic"
                        : completed === 4
                          ? "final"
                          : next!.skill,
                    )
              }
            >
              {!user
                ? "เข้าสู่ห้องเรียน"
                : !state?.diagnostic
                  ? "สำรวจจุดเริ่มต้น"
                  : "เดินทางต่อ"}
              <ArrowRight size={18} />
            </button>
          </section>
          <section className="tip-card">
            <div className="row">
              <span className="sun-icon">✧</span>
              <strong>เก่งขึ้นในแบบของเธอ</strong>
            </div>
            <p>
              ไม่ต้องแข่งกับใคร
              <br />
              ลองคิด ลองแก้ แล้วเรียนรู้จากสิ่งที่พบ
            </p>
            <div className="badge-previews">
              <span>
                <Compass size={20} />
              </span>
              <span>
                <BookOpen size={20} />
              </span>
              <span>
                <Flag size={20} />
              </span>
            </div>
            <small>สะสมเหรียญทักษะ • เหรียญไม่ใช่คะแนน</small>
          </section>
        </aside>
      </div>
      <div className="section-heading">
        <h2>เลือกดินแดนของเธอ</h2>
        <span>เส้นทางการเรียนรู้ 4 ภารกิจ</span>
      </div>
      <div className="mission-grid">
        {skills.map((skill, i) => {
          const m = state?.modules[i],
            available = m?.unlocked;
          return (
            <button
              className={`mission-card zone-${i} ${available ? "available" : ""}`}
              key={skill}
              onClick={() =>
                !user
                  ? onLogin()
                  : available
                    ? onOpen(skill)
                    : onOpen(!state?.diagnostic ? "diagnostic" : "map")
              }
              aria-label={`${i + 1} ${labels[skill]} ${m?.completed ? "สำเร็จแล้ว" : available ? "เริ่มภารกิจ" : "ยังไม่ปลดล็อก"}`}
            >
              <div className="between">
                <span className="mission-number">0{i + 1}</span>
                {m?.completed ? (
                  <Check size={19} />
                ) : available ? (
                  <ArrowRight size={19} />
                ) : (
                  <Lock size={17} />
                )}
              </div>
              <small>{missionNames[i]}</small>
              <h3>{labels[skill]}</h3>
              <p>{english[i]}</p>
              <div className="mission-bottom">
                {m?.completed
                  ? "สำเร็จแล้ว"
                  : available
                    ? "เริ่มสำรวจ"
                    : "ทำภารกิจก่อนหน้าเพื่อปลดล็อก"}{" "}
                <span>{m?.completed ? "● ● ●" : "○ ○ ○"}</span>
              </div>
            </button>
          );
        })}
      </div>
      <section className="final-banner">
        <div className="final-emblem">
          <Flag size={28} />
        </div>
        <div>
          <small>THE FINAL QUEST</small>
          <h3>โรงเรียนปลอดขยะ</h3>
          <p>รวมพลังทั้ง 4 ทักษะ ออกแบบการเปลี่ยนแปลงในแบบของเธอ</p>
        </div>
        <button onClick={() => (user ? onOpen("final") : onLogin())}>
          {completed === 4 ? "เปิดภารกิจสุดท้าย" : "พบกันเมื่อครบ 4 ภารกิจ"}
          {completed === 4 ? <ArrowRight size={16} /> : <Lock size={16} />}
        </button>
      </section>
    </>
  );
}
export function Student({
  user,
  content,
  state,
  refresh,
  page,
  setPage,
  onQueued,
}: {
  user: User;
  content: PublicContent;
  state: StudentState;
  refresh: () => Promise<void>;
  page: string;
  setPage: (p: string) => void;
  onQueued: () => void;
}) {
  async function save(kind: string, skill: Skill | undefined, data: any) {
    const body = {
      requestId: crypto.randomUUID(),
      version: content.version,
      kind,
      skill,
      ...data,
    };
    let saved;
    try {
      saved = await api("attempts", body);
    } catch (e) {
      if ((e as any).status) throw e;
      enqueue(user.id, body);
      onQueued();
      return { queued: true };
    }
    await refresh();
    return saved;
  }
  if (page === "map")
    return (
      <MissionMap
        user={user}
        state={state}
        onOpen={setPage}
        onLogin={() => {}}
        onAvatar={async (avatar) => {
          await api("avatar", { avatar });
          await refresh();
        }}
      />
    );
  if (page === "portfolio" || page === "progress")
    return (
      <Portfolio
        user={user}
        state={state}
        onSave={(d) => save("course_reflection", undefined, d)}
      />
    );
  if (page === "diagnostic")
    return (
      <section className="lesson-panel">
        <small className="eyebrow">จุดเริ่มต้นของนักสำรวจ</small>
        <h1>ก่อนออกเดินทาง</h1>
        <p>แบบประเมินนี้ไม่รวมในคะแนน 100 คะแนน ตอบตามความคิดของเธอได้เลย</p>
        {state.diagnostic ? (
          <>
            <div className="feedback">บันทึกจุดเริ่มต้นของเธอแล้ว</div>
            <button
              className="primary"
              onClick={() => setPage("decomposition")}
            >
              เริ่มภารกิจแรก <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <Quiz
            questions={content.diagnostic}
            onSave={(d) => save("diagnostic", undefined, d)}
          />
        )}
      </section>
    );
  if (page === "final")
    return (
      <FinalChallenge
        user={user}
        content={content}
        state={state}
        refresh={refresh}
        onSave={(kind, d) => save(kind, undefined, d)}
        setPage={setPage}
      />
    );
  const lesson = content.lessons.find((l) => l.id === page);
  if (!lesson) return null;
  const m = state.modules.find((m) => m.skill === page)!;
  if (!m.unlocked)
    return (
      <div className="lesson-panel">
        <h1>ภารกิจนี้ยังไม่เปิด</h1>
        <p>ทำแบบประเมินและภารกิจก่อนหน้าให้ครบ หรือให้ครูตรวจการมอบหมาย</p>
        <button onClick={() => setPage("map")}>กลับแผนที่</button>
      </div>
    );
  if (state.locked)
    return (
      <div className="lesson-panel">
        <h1>เข้าสู่การประเมินแล้ว</h1>
        <p>คะแนนแบบทดสอบถูกตรึงไว้ ดูบทเรียนย้อนหลังได้จากแฟ้มผลงาน</p>
        <button onClick={() => setPage("portfolio")}>เปิดแฟ้มผลงาน</button>
      </div>
    );
  return (
    <Mission
      key={lesson.id}
      user={user}
      lesson={lesson}
      state={m}
      finalData={content.finalData}
      onSave={(kind, d) => save(kind, lesson.id, d)}
      setPage={setPage}
    />
  );
}
function Mission({
  user,
  lesson,
  state,
  onSave,
  setPage,
  finalData,
}: {
  user: User;
  lesson: PublicContent["lessons"][number];
  state: StudentState["modules"][number];
  onSave: (kind: string, data: any) => Promise<any>;
  setPage: (s: string) => void;
  finalData: PublicContent["finalData"];
}) {
  const [step, setStep] = useState(0);
  const names = [
    "ภารกิจ",
    "เรียนรู้",
    "เกม",
    "ฝึกด้วยกัน",
    "ลองด้วยตนเอง",
    "แบบทดสอบ",
    "สะท้อนคิด",
  ];
  const required = [
    null,
    null,
    "game",
    "guided",
    "independent",
    "quiz",
    "reflection",
  ];
  const canNext = step < 2 || state.stages[required[step]!];
  return (
    <>
      <button className="back" onClick={() => setPage("map")}>
        <ChevronLeft size={18} />
        กลับแผนที่
      </button>
      <div className="page-heading">
        <div>
          <small className="eyebrow">
            MISSION 0{state.index + 1} · {lesson.zone}
          </small>
          <h1>{lesson.title}</h1>
          <p>{lesson.name}</p>
        </div>
        <span className="pill">{step + 1} / 7</span>
      </div>
      <nav className="stepper" aria-label="ขั้นตอนการเรียน">
        {names.map((name, i) => (
          <button
            key={name}
            aria-current={step === i ? "step" : undefined}
            disabled={i > 2 && !state.stages[required[i - 1]!]}
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {name}
          </button>
        ))}
      </nav>
      <section className="lesson-panel">
        {step === 0 ? (
          <>
            <span className="large-symbol">✧</span>
            <h2>{lesson.challenge}</h2>
            <div className="objective">
              <strong>ภารกิจนี้ เราจะฝึก…</strong>
              <p>{lesson.objective}</p>
            </div>
            <p>
              คิดคำตอบแรกของเธอไว้ แล้วมาดูว่ามีวิธีไหนช่วยจัดความคิดได้บ้าง
            </p>
          </>
        ) : step === 1 ? (
          <>
            <h2>คิดเรื่องใหญ่ ให้เห็นภาพเล็ก</h2>
            <p className="lead">{lesson.explanation}</p>
            <div className="examples">
              {lesson.examples.map((e, i) => (
                <article key={i}>
                  <small>ตัวอย่าง {i + 1}</small>
                  <h3>{e.title}</h3>
                  <ol>
                    {e.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            {lesson.id === "pattern" && (
              <WasteTable data={finalData.slice(0, 5)} />
            )}
            <Game lesson={lesson} onSave={(d) => onSave("game", d)} />
          </>
        ) : step === 3 || step === 4 ? (
          <Draft
            key={step}
            owner={user.id}
            id={`${lesson.id}-${step}`}
            prompt={step === 3 ? lesson.guided : lesson.independent}
            hint={{
              skill: lesson.id,
              stage: step === 3 ? "guided" : "independent",
            }}
            onSave={(d) => onSave(step === 3 ? "guided" : "independent", d)}
          />
        ) : step === 5 ? (
          <>
            <h2>ตรวจความเข้าใจ · 10 คะแนน</h2>
            <p>
              เก็บคะแนนครั้งที่ดีที่สุดก่อนเริ่มงานปลายทาง
              ลองใหม่เพื่อเรียนรู้ได้
            </p>
            <Quiz questions={lesson.quiz} onSave={(d) => onSave("quiz", d)} />
          </>
        ) : (
          <>
            <h2>เก็บความคิดจากการเดินทาง</h2>
            <Draft
              owner={user.id}
              id={`${lesson.id}-reflection`}
              prompt={lesson.reflection}
              onSave={(d) => onSave("reflection", d)}
            />
            {state.completed && (
              <div className="feedback">
                <Trophy size={22} />
                ผ่านภารกิจแล้ว! ความพยายามครั้งนี้เป็นส่วนหนึ่งของการเติบโต
              </div>
            )}
          </>
        )}
        <div className="lesson-footer">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ย้อนกลับ
          </button>
          <button
            className="primary"
            disabled={!canNext}
            onClick={() =>
              step === 6
                ? setPage(state.index < 3 ? skills[state.index + 1] : "final")
                : setStep((s) => s + 1)
            }
          >
            {step === 6 ? "ไปภารกิจต่อไป" : "ไปต่อ"}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </>
  );
}
function FinalChallenge({
  user,
  content,
  state,
  refresh,
  onSave,
  setPage,
}: {
  user: User;
  content: PublicContent;
  state: StudentState;
  refresh: () => Promise<void>;
  onSave: (kind: string, data: any) => Promise<any>;
  setPage: (s: string) => void;
}) {
  const key = `ct:${user.id}:final`;
  const [parts, setParts] = useState<Record<string, string>>({
      decomposition: "",
      pattern: "",
      abstraction: "",
      algorithm: "",
    }),
    [ready, setReady] = useState(false),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const latest = state.attempts.filter((a) => a.kind === "final_draft").at(-1)
      ?.payload.parts;
    try {
      setParts(
        JSON.parse(sessionStorage.getItem(key) ?? "null") ?? latest ?? parts,
      );
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready) sessionStorage.setItem(key, JSON.stringify(parts));
  }, [parts, ready, key]);
  if (state.completed < 4)
    return (
      <section className="lesson-panel">
        <Lock />
        <h1>ภารกิจสุดท้ายกำลังรอเธอ</h1>
        <p>ทำทั้ง 4 ภารกิจให้ครบก่อน แล้วนำทักษะมาช่วยโรงเรียนด้วยกัน</p>
        <button onClick={() => setPage("map")}>กลับแผนที่</button>
      </section>
    );
  return (
    <section className="lesson-panel">
      <small className="eyebrow">THE FINAL QUEST · 60 คะแนน</small>
      <h1>โรงเรียนปลอดขยะ</h1>
      <p>
        ออกแบบวิธีลดและคัดแยกขยะจากข้อมูลใหม่ 7 วัน
        เขียนคำตอบด้วยความคิดของเธอเอง
      </p>
      <WasteTable data={content.finalData} />
      <details>
        <summary>เกณฑ์ที่ครูใช้ตรวจ · ทักษะละ 15 คะแนน</summary>
        {content.rubric.map((r) => (
          <div key={r.skill}>
            <h3>{labels[r.skill]}</h3>
            {r.levels.map((l) => (
              <p key={l.score}>
                <strong>{l.score} คะแนน</strong> — {l.text}
              </p>
            ))}
          </div>
        ))}
      </details>
      {state.latestFinal ? (
        <>
          <div className="feedback">
            {state.review
              ? "ครูตรวจแล้ว เปิดผลการเรียนได้เลย"
              : "ส่งงานแล้ว · รอครูตรวจ (ยังไม่ใช่คะแนน 0)"}
          </div>
          <button className="primary" onClick={() => setPage("portfolio")}>
            ดูแฟ้มผลงาน
          </button>
        </>
      ) : !state.locked ? (
        <>
          <div className="objective">
            <h3>พร้อมใช้ความคิดของเธอเองแล้วไหม?</h3>
            <p>
              เมื่อเริ่มงานนี้ จะปิดคำใบ้และ AI และตรึงคะแนนแบบทดสอบ
              เธอยังบันทึกร่างและปรับแก้ได้ก่อนกดส่งให้ครู
            </p>
          </div>
          <button
            className="primary"
            onClick={async () => {
              try {
                await api("final/start", {});
                await refresh();
              } catch (e) {
                setMsg((e as Error).message);
              }
            }}
          >
            เริ่มภารกิจประเมิน
          </button>
        </>
      ) : (
        <>
          <p className="assessment-notice">
            <Lock size={16} /> โหมดประเมิน · ปิดคำใบ้และ AI
          </p>
          {skills.map((s, i) => (
            <label className="final-part" key={s}>
              {i + 1}. {labels[s]}
              <small>
                {
                  [
                    "แบ่งเป็นงานย่อยและอธิบายหน้าที่",
                    "ระบุรูปแบบ อ้างตัวเลขจากข้อมูล และเสนอการกระทำ",
                    "เลือกข้อมูลที่จำเป็นและอธิบายเหตุผลที่เลือก/ละ",
                    "เขียนลำดับขั้นตอนลดและแยกขยะ พร้อมวิธีตรวจผล",
                  ][i]
                }
              </small>
              <textarea
                rows={4}
                maxLength={4000}
                value={parts[s]}
                onChange={(e) =>
                  setParts((p) => ({ ...p, [s]: e.target.value }))
                }
              />
            </label>
          ))}
          <div className="row wrap">
            {["final_draft", "final"].map((kind) => (
              <button
                key={kind}
                className={kind === "final" ? "primary" : ""}
                disabled={
                  busy ||
                  (kind === "final" &&
                    skills.some((s) => parts[s].trim().length < 3))
                }
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await onSave(kind, { parts });
                    setMsg(
                      r?.queued
                        ? "รอส่งเมื่อมีอินเทอร์เน็ต"
                        : kind === "final"
                          ? "ส่งให้ครูแล้ว"
                          : "บันทึกร่างแล้ว ทุกครั้งที่แก้จะเก็บเป็นประวัติ",
                    );
                  } catch (e) {
                    setMsg((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {kind === "final_draft"
                  ? "บันทึกร่างอีกเวอร์ชัน"
                  : "ส่งงานให้ครูตรวจ"}
              </button>
            ))}
          </div>
          <small>
            ตรวจให้ครบก่อนส่ง งานที่ส่งแล้วแก้ไขไม่ได้
            ร่างในแท็บจะล้างเมื่อออกจากระบบ
          </small>
        </>
      )}
      <p role="status">{msg}</p>
    </section>
  );
}
function Portfolio({
  user,
  state,
  onSave,
}: {
  user: User;
  state: StudentState;
  onSave: (d: any) => Promise<any>;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <small className="eyebrow">MY LEARNING STORY</small>
          <h1>รอยเท้าของนักคิด</h1>
          <p>ทุกครั้งที่ลอง คือหลักฐานของการเรียนรู้</p>
        </div>
        <Avatar animal={user.avatar} size={70} />
      </div>
      <section className="lesson-panel">
        <h2>
          {state.total === null
            ? "คะแนนงานปลายทาง: รอครูตรวจ"
            : `คะแนนรวม ${state.total} / 100`}
        </h2>
        <p>
          แบบทดสอบ {state.quizTotal}/40 · งานปลายทาง{" "}
          {state.review
            ? `${state.total! - state.quizTotal}/60`
            : "ยังไม่มีผลตรวจ"}
        </p>
        <div className="profile-grid">
          {state.profile.map((p) => (
            <article key={p.skill}>
              <h3>{labels[p.skill]}</h3>
              <strong>
                {p.total ?? "—"}
                <small> / 25</small>
              </strong>
              <p>
                แบบทดสอบ {p.quiz}/10
                <br />
                Rubric {p.final ?? "รอตรวจ"}/15
              </p>
              <p>
                จุดเริ่มต้น:{" "}
                {state.diagnostic?.result.items.find(
                  (q: any) => q.skill === p.skill,
                )?.correct
                  ? "ตอบสถานการณ์ได้"
                  : "ยังต้องฝึก / ยังไม่ทำ"}
              </p>
              {(p.quiz < 6 || (p.final !== null && p.final < 10)) && (
                <small>
                  แนะนำ: ทบทวนตัวอย่างและฝึก {labels[p.skill]} เพิ่มกับครู
                </small>
              )}
            </article>
          ))}
        </div>
        {state.review && (
          <div className="feedback">
            <strong>ข้อความจากครู</strong>
            <p>{state.review.feedback}</p>
            {skills.map((s) => (
              <p key={s}>
                {labels[s]}: {state.review!.rubric[s].evidence}
              </p>
            ))}
          </div>
        )}
        <h3>เหรียญทักษะ · ไม่ใช่คะแนน</h3>
        <div className="row wrap">
          {state.badges.length ? (
            state.badges.map((s) => (
              <span className="pill" key={s}>
                <Trophy size={17} />
                {labels[s]}
              </span>
            ))
          ) : (
            <p>ทำภารกิจให้ครบเพื่อสะสมเหรียญ</p>
          )}
        </div>
      </section>
      {state.review && (
        <section className="lesson-panel">
          <h2>สะท้อนคิดหลังรับข้อเสนอแนะ</h2>
          <Draft
            owner={user.id}
            id="course-reflection"
            prompt="ครูช่วยให้เธอเห็นอะไรใหม่? ครั้งหน้าจะปรับวิธีคิดอย่างไร?"
            onSave={onSave}
          />
        </section>
      )}
      <section className="lesson-panel">
        <h2>แฟ้มผลงานและประวัติการแก้ไข</h2>
        <p>เก็บทุกครั้งที่ส่ง รวมทั้งร่างและคำแนะนำที่ได้รับ</p>
        {[...state.attempts].reverse().map((a) => (
          <details key={a.id}>
            <summary>
              {a.skill ? labels[a.skill as Skill] + " · " : ""}
              {
                (
                  {
                    diagnostic: "ประเมินก่อนเรียน",
                    game: "เกม",
                    guided: "ฝึกด้วยกัน",
                    independent: "ฝึกด้วยตนเอง",
                    quiz: "แบบทดสอบ",
                    reflection: "สะท้อนคิด",
                    final_draft: "ร่างงานปลายทาง",
                    final: "งานที่ส่งครู",
                    course_reflection: "สะท้อนคิดหลังตรวจ",
                  } as Record<string, string>
                )[a.kind]
              }{" "}
              · {new Date(a.created_at).toLocaleString("th-TH")}
            </summary>
            <small>
              เวอร์ชัน {a.version} · หลักฐาน {a.id}
            </small>
            {a.payload.text && <p className="preserve">{a.payload.text}</p>}
            {a.payload.parts &&
              skills.map((s) => (
                <p key={s}>
                  <strong>{labels[s]}</strong>
                  <br />
                  {a.payload.parts[s]}
                </p>
              ))}
            {a.result.items?.map((i: any) => (
              <p key={i.id}>{i.feedback}</p>
            ))}
            {a.result.feedback && <p>{a.result.feedback}</p>}
          </details>
        ))}
        <h3>ประวัติตัวช่วยคิด</h3>
        {state.hints.map((h) => (
          <details key={h.id}>
            <summary>
              {labels[h.skill as Skill]} · ระดับ {h.level} ·{" "}
              {h.revised ? "แก้คำตอบหลังคำใบ้แล้ว" : "ยังไม่พบการแก้ไข"}
            </summary>
            <p>
              {h.source === "live" ? "AI สด" : "คำใบ้ที่เตรียมไว้"}:{" "}
              {h.response}
            </p>
            <p>ความคิดก่อนขอ: {h.input}</p>
          </details>
        ))}
      </section>
    </>
  );
}
