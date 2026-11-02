// Доставка заявок в Telegram с базой: «дошла» ставим только после ответа Telegram, досылка — свежие и новые первыми.
import { test, beforeEach, after as afterAll, mock } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "uly-leads-"));
process.env.DATA_DIR = dir;
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TELEGRAM_CHAT_ID = "-100";

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    return next(spec.startsWith("@/") ? new URL(`../${spec.slice(2)}.ts`, import.meta.url).href : spec, ctx);
  },
});
const { deliverLead, resendUndelivered } = await import("./leads.ts");
const { getDb } = await import("./db.ts");
const { LATE_MS, RESEND_WINDOW_MS } = await import("../data/notify.ts");

mock.method(console, "warn", () => {}); // «Telegram ответил 500» — ожидаемо, не засоряем вывод тестов
const g = globalThis as { __siteDb?: { close(): void } };
const realFetch = globalThis.fetch;
afterAll(() => {
  globalThis.fetch = realFetch;
  g.__siteDb?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Ответы Telegram по очереди; тексты отправленных сообщений — в sent. */
let replies: (number | "throw")[] = [];
let sent: string[] = [];
beforeEach(() => {
  getDb().exec("DELETE FROM leads");
  replies = [];
  sent = [];
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const r = replies.shift() ?? 200;
    if (r === "throw") throw new Error("fetch failed");
    sent.push(JSON.parse(init.body).text);
    return new Response(r === 200 ? "{}" : JSON.stringify({ description: "Bad Request" }), { status: r });
  }) as typeof fetch;
});

const insert = (ts: number, text = "Текст", delivered = 0) =>
  Number(
    getDb()
      .prepare("INSERT INTO leads (ts, name, phone, total, text, payload, delivered) VALUES (?, '', '', 0, ?, 'null', ?)")
      .run(ts, text, delivered).lastInsertRowid,
  );
const delivered = (id: number) => Number((getDb().prepare("SELECT delivered FROM leads WHERE id = ?").get(id) as { delivered: number }).delivered);

/** Паузы между повторами (2 с, 5 с) прокручиваем подменёнными таймерами. */
async function withFakeTimers<T>(run: () => Promise<T>): Promise<T> {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let done = false;
    const p = run().finally(() => (done = true));
    while (!done) {
      await new Promise((r) => setImmediate(r));
      mock.timers.tick(10_000);
    }
    return await p;
  } finally {
    mock.timers.reset();
  }
}

test("свежая заявка уходит сразу и помечается доставленной, без пометки об опоздании", async () => {
  const id = insert(Date.now(), "Пакет «Подарок»");
  await deliverLead(id);
  assert.equal(delivered(id), 1);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].startsWith(`🎉 Заявка №${id} с сайта\n\n`));
  assert.ok(!sent[0].includes("опозданием"));
});

test("Telegram не принял ни одну попытку — заявка остаётся недоставленной", async () => {
  const id = insert(Date.now());
  replies = [500, "throw", 400];
  await withFakeTimers(() => deliverLead(id));
  assert.equal(delivered(id), 0);
});

test("вторая попытка удалась — доставлена", async () => {
  const id = insert(Date.now());
  replies = ["throw", 200];
  await withFakeTimers(() => deliverLead(id));
  assert.equal(delivered(id), 1);
});

test("уже доставленную не шлём повторно", async () => {
  const id = insert(Date.now(), "x", 1);
  await deliverLead(id);
  assert.equal(sent.length, 0);
});

test("досланная позже 5 минут — с пометкой времени", async () => {
  const id = insert(Date.now() - LATE_MS - 60_000);
  await deliverLead(id);
  assert.match(sent[0], /⏰ Дошла с опозданием/);
});

test("досылка: только недоставленные за двое суток, новые первыми", async () => {
  const now = Date.now();
  const old = insert(now - RESEND_WINDOW_MS - 60_000, "старая");
  const a = insert(now - 10 * 60_000, "первая");
  const b = insert(now - 5 * 60_000, "вторая");
  insert(now, "доставленная", 1);
  await resendUndelivered();
  assert.equal(sent.length, 2);
  assert.ok(sent[0].includes("вторая") && sent[1].includes("первая"));
  assert.equal(delivered(a), 1);
  assert.equal(delivered(b), 1);
  assert.equal(delivered(old), 0);
});
