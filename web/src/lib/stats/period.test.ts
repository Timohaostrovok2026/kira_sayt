// Периоды статистики: «день» — по Москве (UTC+3), «7 дней» — сегодня и 6 полных дней до него.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, HOUR, WEEK, bucketSpec, mskMidnight, parsePeriod, resolvePeriod } from "./period.ts";

// 03.11.2026 01:30 по Москве = 02.11.2026 22:30 UTC — в UTC ещё «вчера».
const now = Date.UTC(2026, 10, 2, 22, 30);
const mskToday = Date.UTC(2026, 10, 2, 21, 0); // 03.11 00:00 МСК

test("полночь по Москве, а не по UTC", () => {
  assert.equal(mskMidnight(now), mskToday);
  assert.equal(mskMidnight(mskToday), mskToday, "ровно полночь — тот же день");
  assert.equal(mskMidnight(mskToday - 1), mskToday - DAY);
});

test("«Сегодня»: с полуночи МСК до текущего момента включительно, сравнение — с тем же отрезком до неё", () => {
  const p = resolvePeriod("today", now, null);
  assert.deepEqual(p.cur, { from: mskToday, to: now + 1 });
  assert.deepEqual(p.prev, { from: mskToday - (now + 1 - mskToday), to: mskToday });
  assert.equal(p.bucket, "hour");
});

test("«7 дней» и «30 дней» включают сегодня: 6 и 29 полных дней до него", () => {
  const w = resolvePeriod("7d", now, null);
  assert.equal(w.cur.from, mskToday - 6 * DAY);
  assert.equal(w.prev!.to, w.cur.from);
  assert.equal(w.prev!.to - w.prev!.from, w.cur.to - w.cur.from);
  assert.equal(w.bucket, "day");
  assert.equal(resolvePeriod("30d", now, null).cur.from, mskToday - 29 * DAY);
});

test("«Всё время»: с полуночи первого события, без сравнения, неделями после 92 дней", () => {
  const first = now - 10 * DAY;
  const p = resolvePeriod("all", now, first);
  assert.equal(p.cur.from, mskMidnight(first));
  assert.equal(p.prev, null);
  assert.equal(p.bucket, "day");
  assert.equal(resolvePeriod("all", now, now - 100 * DAY).bucket, "week");
  assert.equal(resolvePeriod("all", now, null).cur.from, mskToday, "событий нет — с сегодняшней полуночи");
});

test("ячейки графика: день начинается в полночь МСК, неделя — в понедельник", () => {
  const bucket = (ts: number, b: "hour" | "day" | "week") => {
    const { size, shift } = bucketSpec(b);
    return Math.floor((ts + shift) / size) * size - shift;
  };
  assert.equal(bucket(now, "day"), mskToday);
  assert.equal(bucket(now, "hour"), mskToday + HOUR);
  // 03.11.2026 — вторник; понедельник 02.11 00:00 МСК.
  assert.equal(bucket(now, "week"), mskToday - DAY);
  assert.equal(bucketSpec("week").size, WEEK);
});

test("неизвестный период из адреса — 7 дней", () => {
  assert.equal(parsePeriod("30d"), "30d");
  assert.equal(parsePeriod(["all", "today"]), "all");
  assert.equal(parsePeriod("year"), "7d");
  assert.equal(parsePeriod(undefined), "7d");
});
