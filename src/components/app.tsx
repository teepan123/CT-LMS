"use client";
import { useEffect, useState } from "react";
import {
  Map,
  BookOpen,
  ChartNoAxesCombined,
  Backpack,
  LogOut,
  Menu,
  X,
  Leaf,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api, clearPrivate, flush, pending } from "@/lib/client-sync";
import { Avatar } from "./art";
import { MissionMap, Student } from "./student";
import { Teacher, Admin } from "./teacher";
import type { User } from "@/lib/auth";
import type { StudentState } from "@/modules/learning/service";
import type { PublicContent } from "@/modules/content/catalog";
export function LearningApp() {
  const [user, setUser] = useState<User | null>(null),
    [content, setContent] = useState<PublicContent>(),
    [state, setState] = useState<StudentState>(),
    [page, setPage] = useState("map"),
    [loginOpen, setLoginOpen] = useState(false),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(false),
    [online, setOnline] = useState(true),
    [queued, setQueued] = useState(0),
    [local, setLocal] = useState(false),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const me = await api("me");
    const [c, s] = await Promise.all([
      api("content"),
      me.user.role === "student" ? api("state") : Promise.resolve(undefined),
    ]);
    setContent(c);
    sessionStorage.setItem("ct:content", JSON.stringify(c));
    if (me.user.role === "student") {
      setState(s);
      setQueued(pending(me.user.id).length);
    } else setPage(me.user.role === "admin" ? "admin" : "teacher");
    setUser(me.user);
    setLocal(me.local);
  }
  useEffect(() => {
    if (!loginOpen) return;
    const prior = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".login-dialog");
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLoginOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        ),
      );
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      prior?.focus();
    };
  }, [loginOpen]);
  useEffect(() => {
    refresh().catch((e) => {
      if (e.status !== 401) setError(e.message);
    });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  async function sync() {
    if (!user) return;
    setBusy(true);
    try {
      await flush(user.id);
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQueued(pending(user.id).length);
      setBusy(false);
    }
  }
  useEffect(() => {
    if (online && user && pending(user.id).length) void sync();
  }, [online, user?.id]);
  // Shared-device idle privacy lock. Offline notes live only within this tab/session.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const lock = () => {
      clearPrivate();
      setUser(null);
      setState(undefined);
      setContent(undefined);
      setLoginOpen(true);
      api("logout", {}).catch(() => {});
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, 15 * 60 * 1000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [user?.id]);
  async function logout() {
    if (user && pending(user.id).length) {
      setError("ยังมีคำตอบรอส่ง กรุณากดซิงก์ก่อนออกจากระบบ เพื่อไม่ให้ร่างหาย");
      return;
    }
    try {
      await api("logout", {});
    } catch {
      setError(
        "ออกจากระบบเซิร์ฟเวอร์ไม่ได้ ล็อกหน้าจอแล้ว กรุณาเข้าสู่ระบบใหม่เมื่อออนไลน์",
      );
    }
    clearPrivate();
    setUser(null);
    setState(undefined);
    setContent(undefined);
    setPage("map");
  }
  const nav =
    user?.role === "teacher"
      ? [["teacher", "ภาพรวมห้องเรียน", ChartNoAxesCombined]]
      : user?.role === "admin"
        ? [
            ["admin", "จัดการระบบ", ShieldCheck],
            ["teacher", "ภาพรวมห้องเรียน", ChartNoAxesCombined],
          ]
        : [
            ["map", "แผนที่การเรียนรู้", Map],
            ["learn", "ภารกิจของฉัน", BookOpen],
            ["portfolio", "แฟ้มผลงาน", Backpack],
            ["progress", "พัฒนาการของฉัน", ChartNoAxesCombined],
          ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <aside className={`sidebar ${mobile ? "open" : ""}`} inert={loginOpen}>
        <a className="brand" href="/" aria-label="CT AI Learning Lab หน้าแรก">
          <span className="brand-mark">
            <Leaf size={25} />
          </span>
          <span>
            CT–AI <b>Learning Lab</b>
          </span>
        </a>
        <div className="sidebar-label">พื้นที่ของนักสำรวจ</div>
        <nav>
          {nav.map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setMobile(false);
                if (!user) {
                  setLoginOpen(true);
                  return;
                }
                setPage(
                  id === "learn"
                    ? !state?.diagnostic
                      ? "diagnostic"
                      : (state?.modules.find((m) => !m.completed)?.skill ??
                        "final")
                    : id,
                );
              }}
            >
              <Icon size={20} />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-story">
          <span>✧</span>
          <h3>
            โลกที่ดีขึ้น
            <br />
            เริ่มจากความคิดเล็ก ๆ
          </h3>
          <p>
            ค่อย ๆ เรียนรู้
            <br />
            แล้วเติบโตไปด้วยกัน
          </p>
          <div className="story-hills" />
        </div>
        <div className="sidebar-footer">
          <ShieldCheck size={17} />
          <span>พื้นที่ปลอดภัยสำหรับการเรียนรู้</span>
        </div>
      </aside>
      <div className="main-shell" inert={loginOpen}>
        <header className="topbar">
          <div className="row">
            <button
              className="mobile-menu"
              aria-label="เปิดเมนู"
              onClick={() => setMobile((v) => !v)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
            <span className="topbar-title">
              คิดเป็น แก้ปัญหาเป็น <span>เรียนรู้ร่วมกับ AI</span>
            </span>
          </div>
          <div className="row">
            <span className={`connection ${online ? "" : "offline"}`}>
              <i />
              {online ? "พร้อมเรียนรู้" : "ออฟไลน์"}
            </span>
            {user ? (
              <>
                <span className="username">{user.alias}</span>
                <Avatar animal={user.avatar} size={38} />
                <button
                  className="icon-button"
                  aria-label="ออกจากระบบ"
                  onClick={logout}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                className="login-button"
                onClick={() => setLoginOpen(true)}
              >
                เข้าสู่ห้องเรียน <ArrowRightIcon />
              </button>
            )}
          </div>
        </header>
        <main id="main">
          {local && (
            <div className="local-notice">
              โหมดทดลองในเครื่อง · ฐานข้อมูล PostgreSQL แบบฝังตัว ·
              ยังไม่ใช่ระบบใช้งานจริง
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="ปิดข้อความ">
                <X size={16} />
              </button>
            </div>
          )}
          {queued > 0 && (
            <div className="sync-banner" role="status">
              มี {queued} รายการรอส่ง
              ความก้าวหน้าจะเปลี่ยนเมื่อเซิร์ฟเวอร์รับแล้ว{" "}
              <button disabled={!online || busy} onClick={sync}>
                <RefreshCw size={16} />
                ซิงก์คำตอบ
              </button>
            </div>
          )}
          {!online && (
            <div className="sync-banner">
              อ่านบทเรียนที่เปิดไว้และเขียนร่างต่อได้
              การตรวจคำตอบและปลดล็อกต้องเชื่อมต่อเซิร์ฟเวอร์
            </div>
          )}
          {!user ? (
            <MissionMap
              onOpen={() => setLoginOpen(true)}
              onLogin={() => setLoginOpen(true)}
            />
          ) : user.role === "student" && content && state ? (
            <Student
              user={user}
              content={content}
              state={state}
              refresh={refresh}
              page={page}
              setPage={setPage}
              onQueued={() => setQueued(pending(user.id).length)}
            />
          ) : page === "admin" ? (
            <Admin />
          ) : content ? (
            <Teacher content={content} />
          ) : (
            <p>กำลังโหลดบทเรียน…</p>
          )}
          <footer className="page-footer">
            <span>CT–AI Learning Lab</span>
            <span>พื้นที่เล็ก ๆ สำหรับความคิดที่ยิ่งใหญ่</span>
          </footer>
        </main>
      </div>
      {loginOpen && (
        <div className="modal-backdrop">
          <section
            className="login-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
          >
            <button
              className="modal-close"
              aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
              onClick={() => setLoginOpen(false)}
            >
              <X />
            </button>
            <Avatar size={78} />
            <small className="eyebrow">WELCOME, LITTLE THINKER</small>
            <h2 id="login-title">พร้อมออกผจญภัยแล้ว!</h2>
            <p>ใช้รหัสที่ครูมอบให้เพื่อเข้าห้องเรียนของเธอ</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const d = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await api("login", d);
                  clearPrivate();
                  await refresh();
                  setPage("map");
                  const me = await api("me");
                  if (me.user.role !== "student")
                    setPage(me.user.role === "admin" ? "admin" : "teacher");
                  setLoginOpen(false);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                รหัสห้องเรียน <small>(ครู/ผู้ดูแลเว้นว่างได้)</small>
                <input
                  name="code"
                  autoComplete="off"
                  placeholder="เช่น LAB2569"
                  autoFocus
                  maxLength={20}
                />
              </label>
              <label>
                รหัสผู้ใช้
                <input
                  name="login"
                  required
                  autoComplete="username"
                  maxLength={64}
                />
              </label>
              <label>
                รหัสผ่าน
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                />
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? "กำลังเปิดประตู…" : "เข้าสู่การผจญภัย"}
                <ArrowRightIcon />
              </button>
            </form>
            <small>ใช้อุปกรณ์ร่วมกัน? ออกจากระบบทุกครั้งเมื่อเรียนเสร็จ</small>
          </section>
        </div>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <span aria-hidden="true">→</span>;
}
