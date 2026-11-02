// Запросы статистики на временной базе: визиты, воронка, график. /stats не считается, границы периода — [from, to).
import { test, after as afterAll } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "uly-stats-"));
process.env.DATA_DIR = dir;

// labels.ts тянет весь контент и конструктор — для этих запросов подписи не нужны.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (spec === "./labels")
      return {
        url:
          "data:text/javascript," +
          ["addLabel", "ageLabel", "clickLabel", "contactLabel", "costumeName", "deviceLabel", "itemName", "pageLabel", "sourceLabel", "stepLabel", "typeLabel"]
            .map((n) => `export const ${n}=(x)=>String(x);`)
            .join(""),
        shortCircuit: true,
      };
    if (spec.startsWith("@/")) return next(new URL(`../../${spec.slice(2)}.ts`, import.meta.url).href, ctx);
    // В коде относительные импорты без расширения (так принято в Next) — node их сам не находит.
    if (/^\.\.?\//.test(spec) && !/\.[a-z]+$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});
const q = await import("./queries.ts");
const { getDb } = await import("../db.ts");
const { resolvePeriod, mskMidnight, HOUR } = await import("./period.ts");

const g = globalThis as { __siteDb?: { close(): void } };
afterAll(() => {
  g.__siteDb?.close();
  rmSync(dir, { recursive: true, force: true });
});

const now = Date.UTC(2026, 10, 3, 9, 0); // 12:00 МСК
const today = mskMidnight(now);
const ev = (ts: number, visitor: string, session: string, name: string, p = "/", props: object | null = null) =>
  getDb()
    .prepare("INSERT INTO events (ts, visitor, session, name, path, props) VALUES (?, ?, ?, ?, ?, ?)")
    .run(ts, visitor, session, name, p, props ? JSON.stringify(props) : null);
const lead = (ts: number) => getDb().prepare("INSERT INTO leads (ts, text, payload) VALUES (?, 'x', 'null')").run(ts);

// Визит 1 (v1): главная → пакеты → добавил → корзина → заявка. Визит 2 (тот же v1, другая вкладка): только главная.
// Визит 3 (v2): главная, «na» в session — склеивается с visitor и не сливается с чужим «na».
// Визит 4 (v3): только /stats — не считается. Событие вчера и событие ровно в to — вне периода.
ev(today + 1 * HOUR, "v1", "s1", "pageview", "/");
ev(today + 1 * HOUR + 1, "v1", "s1", "pageview", "/pakety");
ev(today + 1 * HOUR + 2, "v1", "s1", "cart_add", "/pakety", { type: "package", id: "k_all" });
ev(today + 1 * HOUR + 3, "v1", "s1", "pageview", "/korzina");
ev(today + 1 * HOUR + 4, "v1", "s1", "lead_submit", "/korzina");
ev(today + 1 * HOUR + 5, "v1", "s1", "lead_ok", "/korzina");
ev(today + 2 * HOUR, "v1", "s2", "pageview", "/");
ev(today + 3 * HOUR, "v2", "na", "pageview", "/");
ev(today + 3 * HOUR, "v4", "na", "pageview", "/programmy/p_1");
ev(today + 4 * HOUR, "v3", "s9", "pageview", "/stats");
ev(today - 1, "v5", "s5", "pageview", "/");
lead(today + 1 * HOUR + 4);
lead(today - 1);

const period = resolvePeriod("today", now, null);

test("KPI: визиты = visitor+session, /stats и чужие дни не считаются", () => {
  const k = q.kpis(period.cur);
  assert.deepEqual(k, { visitors: 3, sessions: 4, pageviews: 6, adds: 1, leads: 1, contacts: 0, conversion: 1 / 4 });
});

test("граница периода: ts = to не входит, ts = from входит", () => {
  ev(now + 1, "v6", "s6", "pageview", "/");
  ev(today, "v7", "s7", "pageview", "/");
  try {
    assert.equal(q.kpis({ from: today, to: now + 1 }).sessions, 5);
  } finally {
    getDb().exec("DELETE FROM events WHERE visitor IN ('v6', 'v7')");
  }
});

test("воронка: шаги вложены, каталог — /pakety и /programmy/…", () => {
  const f = q.funnel(period.cur);
  assert.deepEqual(
    f.steps.map((s) => s.value),
    [4, 2, 1, 1, 1],
  );
  assert.deepEqual({ s: f.submitted, ok: f.succeeded, fail: f.failed }, { s: 1, ok: 1, fail: 0 });
});

test("график «Сегодня»: 24 часа по Москве, визиты и заявки в своих часах", () => {
  const s = q.series(period);
  assert.equal(s.length, 24);
  assert.equal(s[0].start, today);
  assert.deepEqual([s[1].sessions, s[1].leads], [1, 1]);
  assert.equal(s[2].sessions, 1);
  assert.equal(s[3].sessions, 2);
  assert.equal(s[4].sessions, 0, "/stats не попадает в график");
  assert.equal(s[23].start, today + 23 * HOUR);
});

test("общие границы данных: первое событие сайта, /stats не в счёт", () => {
  const b = q.dataBounds();
  assert.equal(b.first, today - 1);
  assert.equal(b.events, 10);
  assert.equal(b.leads, 2);
});
