// Доставка заявок: заявка не должна теряться из-за длины текста или одного сбоя сети.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RETRY_DELAYS_MS, TELEGRAM_MAX, leadMessage, withRetries } from "./notify.ts";

const noSleep = async () => {};

test("короткая заявка уходит целиком с номером", () => {
  assert.equal(leadMessage(12, "Иван, +7 900"), "🎉 Заявка №12 с сайта\n\nИван, +7 900");
});

test("досланная с опозданием заявка помечена временем", () => {
  assert.equal(
    leadMessage(5, "Текст", "30 окт 18:05"),
    "🎉 Заявка №5 с сайта\n⏰ Дошла с опозданием — отправлена 30 окт 18:05\n\nТекст",
  );
});

test("длинная заявка обрезается под лимит Telegram и отсылает в админку", () => {
  const m = leadMessage(7, "я".repeat(6000));
  assert.ok(m.length <= TELEGRAM_MAX);
  assert.ok(m.startsWith("🎉 Заявка №7 с сайта"));
  assert.ok(m.endsWith(TAIL));
});

test("заявка ровно на лимите не обрезается", () => {
  const head = "🎉 Заявка №1 с сайта\n\n";
  const text = "а".repeat(TELEGRAM_MAX - head.length);
  assert.equal(leadMessage(1, text), head + text);
});

test("повтор после сбоя: вторая попытка удалась", async () => {
  let calls = 0;
  const ok = await withRetries(async () => ++calls === 2, [0, 1, 1], noSleep);
  assert.equal(ok, true);
  assert.equal(calls, 2);
});

test("исключение сети не обрывает повторы", async () => {
  let calls = 0;
  const ok = await withRetries(
    async () => {
      calls++;
      if (calls < 3) throw new Error("fetch failed");
      return true;
    },
    [0, 1, 1],
    noSleep,
  );
  assert.equal(ok, true);
  assert.equal(calls, 3);
});

test("все попытки неудачны — false, попыток ровно по числу пауз", async () => {
  let calls = 0;
  const slept: number[] = [];
  const ok = await withRetries(
    async () => (calls++, false),
    [0, 2000, 5000],
    async (ms) => void slept.push(ms),
  );
  assert.equal(ok, false);
  assert.equal(calls, 3);
  assert.deepEqual(slept, [2000, 5000]);
});

// Дыры, найденные «ломанием» (code-breaker, 2026-10-30): границы обрезки, эмодзи, порядок пауз, значения по умолчанию.
const head = (id: number) => `🎉 Заявка №${id} с сайта\n\n`;
const TAIL = "целиком в админке, «Заявки»";

test("на символ длиннее лимита — уже обрезается", () => {
  const text = "а".repeat(TELEGRAM_MAX - head(1).length + 1);
  const m = leadMessage(1, text);
  assert.ok(m.length <= TELEGRAM_MAX);
  assert.ok(m.endsWith(TAIL));
});

test("обрезка занимает лимит целиком, без лишней потери текста", () => {
  assert.equal(leadMessage(1, "я".repeat(6000)).length, TELEGRAM_MAX);
});

test("пробелы на месте обреза не остаются перед хвостом", () => {
  const room = TELEGRAM_MAX - head(1).length;
  const text = "а".repeat(room - 100) + " ".repeat(200) + "б".repeat(3000);
  assert.ok(!/\s\n\n…/.test(leadMessage(1, text)));
});

test("лимит не выше настоящего лимита Telegram (4096)", () => {
  assert.ok(TELEGRAM_MAX <= 4096);
  assert.ok(leadMessage(99999, "я".repeat(6000)).length <= 4096);
});

test("обрезка не рвёт эмодзи пополам (иначе Telegram отклоняет текст)", () => {
  for (const pad of ["", "а"]) {
    const m = leadMessage(1, pad + "😀".repeat(3000));
    assert.ok(m.isWellFormed(), `одиночный суррогат при pad="${pad}"`);
  }
});

test("пауза — перед повтором и дожидается конца, после последней попытки не спим", async () => {
  const log: string[] = [];
  const ok = await withRetries(
    async () => (log.push("send"), false),
    [0, 2000, 5000],
    async (ms) => {
      log.push(`sleep:${ms}`);
      await new Promise((r) => setImmediate(r));
      log.push(`woke:${ms}`);
    },
  );
  assert.equal(ok, false);
  assert.deepEqual(log, ["send", "sleep:2000", "woke:2000", "send", "sleep:5000", "woke:5000", "send"]);
});

test("по умолчанию: первая попытка сразу, есть повторы, всё укладывается в минуту", async () => {
  assert.equal(RETRY_DELAYS_MS[0], 0);
  assert.ok(RETRY_DELAYS_MS.length >= 2);
  // 10 с — таймаут одного запроса в lib/leads.ts; after() не должен висеть дольше минуты.
  const total = RETRY_DELAYS_MS.reduce((s, ms) => s + ms, 0) + RETRY_DELAYS_MS.length * 10_000;
  assert.ok(total <= 60_000);
  let calls = 0;
  await withRetries(async () => (calls++, false), undefined, async () => {});
  assert.equal(calls, RETRY_DELAYS_MS.length);
});

test("одиночный суррогат в середине текста не ломает сообщение", () => {
  assert.ok(leadMessage(1, "Привет \ud83d мир").isWellFormed());
});
