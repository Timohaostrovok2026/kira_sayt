// /api/lead: что сервер принимает от клиента (ЗАЯ-1) и что кладёт в базу. База — временная, Telegram — заглушка.
import { test, after as afterAll } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "uly-lead-"));
process.env.DATA_DIR = dir;
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// after() из next/server вне запроса падает, а доставку в Telegram здесь не проверяем — подменяем обе.
const g = globalThis as { __delivered?: number[]; __siteDb?: { close(): void } };
g.__delivered = [];
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (spec === "next/server") return { url: "data:text/javascript,export function after(fn){fn()}", shortCircuit: true };
    if (spec === "@/lib/leads")
      return { url: "data:text/javascript,export function deliverLead(id){globalThis.__delivered.push(id)}", shortCircuit: true };
    return next(spec.startsWith("@/") ? new URL(`../../../${spec.slice(2)}.ts`, import.meta.url).href : spec, ctx);
  },
});
const { POST } = await import("./route.ts");
const { getDb } = await import("../../../lib/db.ts");
afterAll(() => g.__siteDb?.close());

const post = (body: unknown) =>
  POST(new Request("http://x/api/lead", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const row = (id: number) => getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as Record<string, unknown>;

test("заявка с телефоном и текстом сохраняется и уходит в доставку", async () => {
  const r = await post({ name: "Анна", phone: "+7 (977) 593-97-39", total: 33400.4, text: "Пакет «Подарок»", payload: { a: 1 } });
  assert.equal(r.status, 200);
  const { ok, id } = (await r.json()) as { ok: boolean; id: number };
  assert.equal(ok, true);
  const x = row(id);
  assert.equal(x.phone, "+7 (977) 593-97-39");
  assert.equal(x.name, "Анна");
  assert.equal(Number(x.total), 33400);
  assert.equal(x.text, "Пакет «Подарок»");
  assert.equal(Number(x.delivered), 0);
  assert.equal(x.status, "new");
  assert.ok(g.__delivered!.includes(id));
});

test("без телефона, с коротким телефоном или пустым текстом — 400 и в базу не пишем", async () => {
  const before = Number((getDb().prepare("SELECT COUNT(*) n FROM leads").get() as { n: number }).n);
  for (const body of [
    { phone: "", text: "x" },
    { text: "x" },
    { phone: "977 593 97 3", text: "x" }, // 9 цифр
    { phone: "+7 977", text: "x" },
    { phone: "9775939739", text: "" },
    { phone: "9775939739" },
    { phone: "9775939739", text: "   \n " }, // одни пробелы
    { phone: "+7 977 593 97 39 1", text: "x" }, // 12 цифр
  ]) {
    const r = await post(body);
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  assert.equal((await post("{не json")).status, 400);
  const after = Number((getDb().prepare("SELECT COUNT(*) n FROM leads").get() as { n: number }).n);
  assert.equal(after, before);
});

test("огромный запрос отклоняется сразу, в базу не пишем", async () => {
  const r = await post({ phone: "9775939739", text: "x", payload: "я".repeat(200_000) });
  assert.equal(r.status, 413);
});

test("отрицательная сумма от браузера — 0", async () => {
  const r = await post({ phone: "9775939739", text: "x", total: -99999 });
  assert.equal(Number(row(((await r.json()) as { id: number }).id).total), 0);
});

test("длинные поля обрезаются, мусорная сумма — 0", async () => {
  const r = await post({ phone: "9775939739", text: "я".repeat(7000), name: "И".repeat(500), visitor: "v".repeat(100), total: "много" });
  const x = row(((await r.json()) as { id: number }).id);
  assert.equal(String(x.text).length, 6000);
  assert.equal(String(x.name).length, 120);
  assert.equal(String(x.visitor).length, 64);
  assert.equal(Number(x.total), 0);
});

// НАСТОЯЩАЯ ОШИБКА (падает на текущем коде): тело «null» или число — валидный JSON, но b.phone падает
// с TypeError, и маршрут отвечает 500 вместо 400.
test("тело-не-объект (null, число) — 400, а не исключение", async () => {
  for (const body of ["null", "42"]) {
    const r = await post(body).catch((e: unknown) => e);
    assert.ok(r instanceof Response, `${body}: исключение ${String(r)}`);
    assert.equal(r.status, 400, body);
  }
});
