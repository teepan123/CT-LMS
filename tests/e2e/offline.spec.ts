import { test, expect, type Page } from "@playwright/test";
import { catalog } from "../../src/modules/content/catalog";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
async function post(page: Page, path: string, body: unknown) {
  const r = await page.request.post(base + "/api/" + path, {
    data: body,
    headers: { Origin: base },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return r.json();
}
test("offline drafts reconnect exactly once and cached lessons remain readable", async ({
  page,
  context,
}, info) => {
  const account = "offline-" + Date.now().toString(36) + info.project.name[0],
    password = crypto.randomUUID() + "Aa1!";
  await post(page, "login", {
    login: process.env.E2E_ADMIN_LOGIN ?? "admin01",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Explore2026!",
    code: "",
  });
  const admin = await (await page.request.get(base + "/api/admin")).json(),
    room =
      admin.classes.find((c: any) => c.code === "LAB2569") ?? admin.classes[0];
  await post(page, "admin/users", {
    login: account,
    password,
    alias: "ทดสอบออฟไลน์ " + account,
    role: "student",
    classId: room.id,
  });
  await post(page, "logout", {});
  await post(page, "login", { login: account, password, code: room.code });
  await post(page, "attempts", {
    requestId: crypto.randomUUID(),
    version: catalog.version,
    kind: "diagnostic",
    answers: catalog.diagnostic.map((q) => q.correct),
  });
  await post(page, "attempts", {
    requestId: crypto.randomUUID(),
    version: catalog.version,
    kind: "game",
    skill: "decomposition",
    answers: [0, 1, 3],
  });
  await page.goto("/");
  await page.getByRole("button", { name: "เดินทางต่อ", exact: true }).click();
  await page.getByRole("button", { name: "4 ฝึกด้วยกัน", exact: true }).click();
  await page
    .locator("textarea")
    .fill("ร่างออฟไลน์: สำรวจขยะ แบ่งหน้าที่ แล้วตรวจจำนวนถัง");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "บันทึกความคิด", exact: true })
    .click();
  await expect(
    page.getByText("รอส่งเมื่อเชื่อมต่ออีกครั้ง", { exact: true }),
  ).toBeVisible();
  const queued = await page.evaluate(() =>
    Object.entries(sessionStorage)
      .filter(([k]) => k.endsWith(":outbox"))
      .flatMap(([, v]) => JSON.parse(v)),
  );
  expect(queued).toHaveLength(1);
  await context.setOffline(false);
  await expect(page.getByText(/มี 1 รายการรอส่ง/)).toBeHidden();
  await expect
    .poll(async () => {
      const s = await (await page.request.get(base + "/api/state")).json();
      return s.attempts.filter((a: any) => a.request_id === queued[0].requestId)
        .length;
    })
    .toBe(1);
  await post(page, "attempts", queued[0]);
  const s = await (await page.request.get(base + "/api/state")).json();
  expect(
    s.attempts.filter((a: any) => a.request_id === queued[0].requestId),
  ).toHaveLength(1);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "อ่านบทเรียนต่อแบบออฟไลน์" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "การแยกย่อยปัญหา · Decomposition" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "ลองเชื่อมต่ออีกครั้ง" }).click();
  await expect(page.getByRole("button", { name: "ออกจากระบบ" })).toBeVisible();
  const badOrigin = await page.request.post(base + "/api/avatar", {
    data: { avatar: "rabbit" },
    headers: { Origin: "https://unrelated.example" },
  });
  expect(badOrigin.status()).toBe(403);
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(sessionStorage).filter((k) => k.startsWith("ct:")),
      ),
    )
    .toEqual([]);
});
