import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { catalog, lessons } from "../../src/modules/content/catalog";
import { skills, labels } from "../../src/modules/content/skills";
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
async function login(
  page: Page,
  login: string,
  password = "Explore2026!",
  code = "LAB2569",
) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "เข้าสู่ห้องเรียน", exact: true })
    .first()
    .click();
  await page.locator("input[name=code]").fill(code);
  await page.locator("input[name=login]").fill(login);
  await page.locator("input[name=password]").fill(password);
  await page.getByRole("button", { name: "เข้าสู่การผจญภัย" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}
async function post(page: Page, path: string, body: unknown) {
  const r = await page.request.post(base + "/api/" + path, {
    data: body,
    headers: { Origin: base },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return r.json();
}
test("landing is accessible and fits viewport", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "การผจญภัยของนักคิด" }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-map.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("student completes course, teacher reviews, student sees 100", async ({
  page,
  browser,
}, info) => {
  // Fresh pseudonymous fixture provisioned via the same administrator API used by schools.
  const password = crypto.randomUUID() + "Aa1!";
  const suffix = Date.now().toString(36) + info.project.name[0],
    account = "e2e-" + suffix;
  await login(
    page,
    process.env.E2E_ADMIN_LOGIN ?? "admin01",
    process.env.E2E_ADMIN_PASSWORD ?? "Explore2026!",
    "",
  );
  const state = await (await page.request.get(base + "/api/admin")).json();
  const classroom =
    state.classes.find((c: any) => c.code === "LAB2569") ?? state.classes[0];
  await post(page, "admin/users", {
    login: account,
    password: password,
    alias: "นักสำรวจทดสอบ " + suffix,
    role: "student",
    classId: classroom.id,
  });
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await login(page, account, password, classroom.code);
  await page.getByRole("button", { name: "สำรวจจุดเริ่มต้น" }).click();
  for (const q of catalog.diagnostic)
    await page.locator(`input[name="${q.id}"]`).nth(q.correct).check();
  await page.getByRole("button", { name: "ส่งคำตอบ", exact: true }).click();
  await expect(page.getByText("บันทึกจุดเริ่มต้นของเธอแล้ว")).toBeVisible();
  await page.getByRole("button", { name: "เริ่มภารกิจแรก" }).click();
  for (const lesson of lessons) {
    await expect(
      page.getByRole("heading", { name: lesson.title, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    if (lesson.game.type === "select") {
      for (const n of lesson.game.correct)
        await page.getByRole("checkbox").nth(n).check();
    } else {
      for (let target = 0; target < lesson.game.correct.length; target++) {
        const text = lesson.game.items[lesson.game.correct[target]];
        let indices = await page
          .locator(".order-list li>span:nth-child(2)")
          .allTextContents();
        let index = indices.indexOf(text);
        while (index > target) {
          await page
            .getByRole("button", { name: `ย้าย ${text} ขึ้น`, exact: true })
            .click();
          index--;
        }
      }
    }
    await page
      .getByRole("button", {
        name:
          lesson.game.type === "select" ? "ตรวจการ์ดของฉัน" : "ทดลองขั้นตอน",
      })
      .click();
    await expect(
      page.getByText("ทำได้แล้ว! ลองอธิบายว่าเลือกแบบนี้เพราะอะไร"),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    await page
      .locator("textarea")
      .fill("ฉันจะสำรวจ แบ่งหน้าที่ และตรวจข้อมูลก่อนเลือกวิธีทำ");
    await page.getByRole("button", { name: "ขอคำใบ้", exact: true }).click();
    await expect(
      page.getByText("คำใบ้ที่เตรียมไว้ · ไม่ใช่ AI สด"),
    ).toBeVisible();
    await page
      .locator("textarea")
      .fill(
        "ฉันจะสำรวจ แบ่งหน้าที่ และตรวจข้อมูลก่อนเลือกวิธีทำ แล้ววัดผลอีกครั้ง",
      );
    await page
      .getByRole("button", { name: "บันทึกความคิด", exact: true })
      .click();
    await expect(
      page.getByText("บันทึกความคิดแล้ว แก้ไขและบันทึกใหม่ได้"),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    await page
      .locator("textarea")
      .fill("ฉันจะจัดข้อมูลที่เกี่ยวข้อง ออกแบบขั้นตอน และตรวจว่าทำตามได้จริง");
    await page
      .getByRole("button", { name: "บันทึกความคิด", exact: true })
      .click();
    await expect(
      page.getByText("บันทึกความคิดแล้ว แก้ไขและบันทึกใหม่ได้"),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    for (const q of lesson.quiz)
      await page.locator(`input[name="${q.id}"]`).nth(q.correct).check();
    await page.getByRole("button", { name: "ส่งคำตอบ", exact: true }).click();
    await expect(page.getByText("บันทึกแล้ว 10/10")).toBeVisible();
    await page.getByRole("button", { name: "ไปต่อ", exact: true }).click();
    await page
      .locator("textarea")
      .fill("ฉันได้ลองคิดใหม่และตรวจเหตุผลก่อนเลือกคำตอบ");
    await page
      .getByRole("button", { name: "บันทึกความคิด", exact: true })
      .click();
    await expect(
      page.getByText("ผ่านภารกิจแล้ว!", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ไปภารกิจต่อไป" }).click();
  }
  await page.getByRole("button", { name: "เริ่มภารกิจประเมิน" }).click();
  await expect(page.getByText("โหมดประเมิน · ปิดคำใบ้และ AI")).toBeVisible();
  expect(
    await page.getByText("AI Thinking Buddy", { exact: false }).count(),
  ).toBe(0);
  const answers = [
    "สำรวจชนิดขยะ แบ่งหน้าที่ ตั้งถังและติดตามผล",
    "เศษอาหารมากที่สุดทั้ง 7 วัน เช่น จันทร์ 12 และศุกร์ 15 ถุง ทดลองลดอาหารเหลือ",
    "เลือกชนิด ปริมาณและความจุถัง เพราะช่วยจัดถังให้พอ ละสีรองเท้า",
    "สำรวจ แบ่งประเภท ตั้งถัง ทดลองคัดแยก แล้วนับผลทุกวัน ถ้าไม่พอให้เพิ่มรอบเก็บ",
  ];
  for (let i = 0; i < 4; i++)
    await page.locator("textarea").nth(i).fill(answers[i]);
  await page.getByRole("button", { name: "บันทึกร่างอีกเวอร์ชัน" }).click();
  await expect(
    page.getByText("บันทึกร่างแล้ว ทุกครั้งที่แก้จะเก็บเป็นประวัติ"),
  ).toBeVisible();
  await page.getByRole("button", { name: "ส่งงานให้ครูตรวจ" }).click();
  await expect(
    page.getByText("ส่งงานแล้ว · รอครูตรวจ (ยังไม่ใช่คะแนน 0)"),
  ).toBeVisible();
  // Separate browser context verifies saved records across independent sessions/devices.
  const teacherContext = await browser.newContext({
    baseURL: base,
    viewport: info.project.use.viewport,
  });
  const tp = await teacherContext.newPage();
  await login(
    tp,
    process.env.E2E_TEACHER_LOGIN ?? "teacher01",
    process.env.E2E_TEACHER_PASSWORD ?? "Explore2026!",
    "",
  );
  await tp
    .getByRole("button", {
      name: "ดูหลักฐาน นักสำรวจทดสอบ " + suffix,
      exact: true,
    })
    .click();
  for (const skill of skills) {
    await tp
      .getByLabel("คะแนน " + labels[skill], { exact: true })
      .selectOption("15");
    await tp
      .getByLabel("หลักฐานและเหตุผล " + labels[skill], { exact: true })
      .fill("คำตอบแสดงหลักฐานและเหตุผลตรงกับเกณฑ์ครบถ้วน");
  }
  await tp
    .getByLabel("ข้อเสนอแนะรวม")
    .fill("เชื่อมข้อมูลกับการตัดสินใจได้ดี ลองนำวิธีนี้ไปช่วยห้องเรียน");
  await tp.getByRole("button", { name: "บันทึกผลตรวจ 60/60" }).click();
  await expect(
    tp.getByText("บันทึกผลตรวจแล้ว นักเรียนเปิดดูคะแนนได้"),
  ).toBeVisible();
  await tp.screenshot({
    path: `docs/screenshots/${info.project.name}-teacher.png`,
    fullPage: true,
  });
  await teacherContext.close();
  await page.reload();
  await expect(page.getByRole("button", { name: "ออกจากระบบ" })).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await page.getByRole("button", { name: "แฟ้มผลงาน", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "คะแนนรวม 100 / 100" }),
  ).toBeVisible();
  await page
    .getByLabel("ครูช่วยให้เธอเห็นอะไรใหม่? ครั้งหน้าจะปรับวิธีคิดอย่างไร?")
    .fill("จะเก็บข้อมูลหลายวันก่อนสรุป และตรวจว่าขั้นตอนทำได้จริง");
  await page
    .getByRole("button", { name: "บันทึกความคิด", exact: true })
    .click();
  await expect(
    page.getByText("บันทึกความคิดแล้ว แก้ไขและบันทึกใหม่ได้"),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-results.png`,
    fullPage: true,
  });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  const raw = await (await page.request.get(base + "/api/content")).text();
  expect(raw).not.toContain('"correct"');
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(sessionStorage).filter((k) => k.startsWith("ct:")),
      ),
    )
    .toEqual([]);
});
