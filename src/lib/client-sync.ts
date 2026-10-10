export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(data.error ?? "เชื่อมต่อไม่ได้"), {
      status: r.status,
    });
  return data;
}
export type QueueItem = { requestId: string; [k: string]: unknown };
const key = (owner: string) => `ct:${owner}:outbox`;
export function pending(owner: string): QueueItem[] {
  try {
    return JSON.parse(sessionStorage.getItem(key(owner)) ?? "[]");
  } catch {
    return [];
  }
}
export function enqueue(owner: string, item: QueueItem) {
  const items = pending(owner);
  if (!items.some((i) => i.requestId === item.requestId)) items.push(item);
  sessionStorage.setItem(key(owner), JSON.stringify(items));
}
export async function flush(owner: string) {
  const { user } = await api("me");
  if (user.id !== owner)
    throw new Error("บัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบบัญชีเดิม");
  for (const item of pending(owner)) {
    await api("attempts", item);
    sessionStorage.setItem(
      key(owner),
      JSON.stringify(
        pending(owner).filter((i) => i.requestId !== item.requestId),
      ),
    );
  }
}
export function clearPrivate() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const k = sessionStorage.key(i)!;
    if (k.startsWith("ct:")) sessionStorage.removeItem(k);
  }
}
