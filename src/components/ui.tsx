"use client";
import { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  Send,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import type { PublicContent } from "@/modules/content/catalog";
import { api } from "@/lib/client-sync";
type PublicLesson = PublicContent["lessons"][number];
export function Quiz({
  questions,
  onSave,
  label = "ส่งคำตอบ",
}: {
  questions: PublicContent["diagnostic"];
  onSave: (data: any) => Promise<any>;
  label?: string;
}) {
  const [answers, setAnswers] = useState<number[]>(
      Array(questions.length).fill(-1),
    ),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <p className="muted">เลือกคำตอบที่ตรงกับสถานการณ์ที่สุด • ไม่จับเวลา</p>
      {questions.map((q, i) => (
        <fieldset className="question" key={q.id}>
          <legend>
            <span className="number">{i + 1}</span>
            {q.prompt}
          </legend>
          {q.options.map((o, j) => (
            <label
              className={`choice ${answers[i] === j ? "selected" : ""}`}
              key={j}
            >
              <input
                type="radio"
                name={q.id}
                checked={answers[i] === j}
                onChange={() => {
                  setAnswers((a) => a.map((x, k) => (k === i ? j : x)));
                  setResult(null);
                }}
              />
              {o}
            </label>
          ))}
          {result?.items?.[i] && (
            <p className="feedback">{result.items[i].feedback}</p>
          )}
        </fieldset>
      ))}
      <button
        className="primary"
        disabled={busy || answers.includes(-1)}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await onSave({ answers });
            setResult(r?.result ?? null);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Send size={17} />
        {busy ? "กำลังบันทึก…" : label}
      </button>
      <p role="status">
        {result && `บันทึกแล้ว ${result.score}/${result.max}`}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Game({
  lesson,
  onSave,
}: {
  lesson: PublicLesson;
  onSave: (data: any) => Promise<any>;
}) {
  const [values, setValues] = useState<number[]>(
      lesson.game.type === "order" ? lesson.game.items.map((_, i) => i) : [],
    ),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const move = (i: number, delta: number) =>
    setValues((old) => {
      const n = [...old];
      [n[i], n[i + delta]] = [n[i + delta], n[i]];
      return n;
    });
  return (
    <div>
      <h3>{lesson.game.prompt}</h3>
      {lesson.game.type === "order" ? (
        <ol className="order-list">
          {values.map((v, i) => (
            <li key={v}>
              <span className="number">{i + 1}</span>
              <span>{lesson.game.items[v]}</span>
              <button
                aria-label={`ย้าย ${lesson.game.items[v]} ขึ้น`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={18} />
              </button>
              <button
                aria-label={`ย้าย ${lesson.game.items[v]} ลง`}
                disabled={i === values.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={18} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="game-grid">
          {lesson.game.items.map((text, i) => (
            <label
              className={`choice ${values.includes(i) ? "selected" : ""}`}
              key={i}
            >
              <input
                type="checkbox"
                checked={values.includes(i)}
                onChange={() =>
                  setValues((v) =>
                    v.includes(i) ? v.filter((n) => n !== i) : [...v, i],
                  )
                }
              />
              <span>
                {text}
                <small>
                  {lesson.id === "abstraction"
                    ? values.includes(i)
                      ? "KEEP · เก็บ"
                      : "REMOVE · ละไว้ก่อน"
                    : ""}
                </small>
              </span>
            </label>
          ))}
        </div>
      )}
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await onSave({ answers: values });
            setResult(r?.result);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {lesson.game.type === "order" ? "ทดลองขั้นตอน" : "ตรวจการ์ดของฉัน"}
      </button>
      {result && (
        <div className="feedback" role="status">
          <CheckCircle2 size={19} />
          {result.feedback}
          <p>ลองใหม่ได้ การฝึกนี้ไม่รวมในคะแนน 100 คะแนน</p>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Draft({
  owner,
  id,
  prompt,
  onSave,
  hint,
}: {
  owner: string;
  id: string;
  prompt: string;
  onSave: (data: any) => Promise<any>;
  hint?: { skill: string; stage: string };
}) {
  const key = `ct:${owner}:draft:${id}`;
  const [text, setText] = useState(""),
    [loaded, setLoaded] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setText(sessionStorage.getItem(key) ?? "");
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) sessionStorage.setItem(key, text);
  }, [text, key, loaded]);
  return (
    <div>
      <label className="draft-label" htmlFor={id}>
        {prompt}
      </label>
      <textarea
        id={id}
        rows={6}
        maxLength={4000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ลองเขียนความคิดของเธอที่นี่…"
      />
      <div className="draft-meta">
        <span>ร่างเก็บในแท็บนี้ • ล้างเมื่อออกจากระบบ</span>
        <span>{text.length}/4000</span>
      </div>
      <button
        className="primary"
        disabled={busy || text.trim().length < 3}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await onSave({ text });
            setMessage(
              r?.queued
                ? "รอส่งเมื่อเชื่อมต่ออีกครั้ง"
                : "บันทึกความคิดแล้ว แก้ไขและบันทึกใหม่ได้",
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "กำลังบันทึก…" : "บันทึกความคิด"}
      </button>
      <p role="status">{message}</p>
      {hint && <Buddy {...hint} text={text} />}
    </div>
  );
}
function Buddy({
  skill,
  stage,
  text,
}: {
  skill: string;
  stage: string;
  text: string;
}) {
  const [level, setLevel] = useState(1),
    [reply, setReply] = useState<any>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <aside className="buddy">
      <div className="row">
        <div className="buddy-icon">
          <Lightbulb size={24} />
        </div>
        <div>
          <h3>เพื่อนช่วยคิด</h3>
          <small>AI Thinking Buddy • ขอความช่วยเหลือเมื่อพร้อม</small>
        </div>
      </div>
      <p>
        {stage === "independent"
          ? "ลองคิดเองก่อน ตัวช่วยมีเพียงคำถามนำระดับ 1"
          : "เริ่มจากคำถามนำ แล้วค่อยขอคำใบ้ที่ชัดขึ้น"}
      </p>
      <label>
        ระดับความช่วยเหลือ{" "}
        <select value={level} onChange={(e) => setLevel(+e.target.value)}>
          {[1, ...(stage === "guided" ? [2, 3] : [])].map((l) => (
            <option key={l} value={l}>
              {l} · {["คำถามนำ", "คำใบ้เจาะจง", "ตัวอย่างบางส่วน"][l - 1]}
            </option>
          ))}
        </select>
      </label>
      <div className="buddy-actions">
        {[
          ["question", "ถามให้ฉันคิด"],
          ["hint", "ขอคำใบ้"],
          ["check", "ตรวจวิธีคิด"],
          ["revise", "ช่วยฉันปรับแก้"],
        ].map(([action, label]) => (
          <button
            key={action}
            disabled={busy || text.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                setReply(
                  await api("hints", {
                    requestId: crypto.randomUUID(),
                    skill,
                    stage,
                    action,
                    level,
                    text,
                  }),
                );
                setError("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {text.trim().length < 3 && <small>เขียนความคิดของเธอก่อนขอตัวช่วย</small>}
      {reply && (
        <div className="hint-response" role="status">
          <strong>
            {reply.source === "live"
              ? "คำแนะนำจาก AI สด"
              : "คำใบ้ที่เตรียมไว้ · ไม่ใช่ AI สด"}
          </strong>
          <p>{reply.response}</p>
          <small>ลองแก้คำตอบแล้วบันทึกอีกครั้ง ครูจะเห็นพัฒนาการของเธอ</small>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
export function WasteTable({ data }: { data: (string | number)[][] }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>ข้อมูลขยะ · หน่วย: ถุงขนาดเท่ากัน</caption>
        <thead>
          <tr>
            <th>วัน</th>
            <th>พลาสติก</th>
            <th>กระดาษ</th>
            <th>เศษอาหาร</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th scope="row" key={j}>
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
