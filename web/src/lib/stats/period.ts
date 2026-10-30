/** Периоды статистики. Все «дни» считаются по Москве (UTC+3, без перехода на летнее время). */

export const MSK_OFFSET = 3 * 3600_000;
export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export const PERIODS = [
  { id: "today", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "all", label: "Всё время" },
] as const;

export type PeriodId = (typeof PERIODS)[number]["id"];

export function parsePeriod(v: unknown): PeriodId {
  const s = Array.isArray(v) ? v[0] : v;
  return PERIODS.some((p) => p.id === s) ? (s as PeriodId) : "7d";
}

export interface Range {
  from: number;
  to: number;
}

/** Полночь по Москве для момента `ts` (в мс UTC). */
export function mskMidnight(ts: number) {
  return Math.floor((ts + MSK_OFFSET) / DAY) * DAY - MSK_OFFSET;
}

export interface ResolvedPeriod {
  id: PeriodId;
  cur: Range;
  /** Предыдущий отрезок той же длины (для «Всё время» сравнения нет). */
  prev: Range | null;
  /** Шаг графика. */
  bucket: "hour" | "day" | "week";
}

/** `firstTs` — время самого раннего события (для «Всё время»). */
export function resolvePeriod(id: PeriodId, now: number, firstTs: number | null): ResolvedPeriod {
  const midnight = mskMidnight(now);
  const to = now + 1;
  if (id === "all") {
    const from = mskMidnight(firstTs ?? now);
    const days = (to - from) / DAY;
    return { id, cur: { from, to }, prev: null, bucket: days > 92 ? "week" : "day" };
  }
  const from = id === "today" ? midnight : midnight - (id === "7d" ? 6 : 29) * DAY;
  const len = to - from;
  return { id, cur: { from, to }, prev: { from: from - len, to: from }, bucket: id === "today" ? "hour" : "day" };
}

/** Параметры группировки в SQL: bucket = CAST((ts + shift) / size AS INTEGER). */
export function bucketSpec(b: ResolvedPeriod["bucket"]) {
  if (b === "hour") return { size: HOUR, shift: MSK_OFFSET };
  if (b === "day") return { size: DAY, shift: MSK_OFFSET };
  // Неделя с понедельника: 01.01.1970 — четверг, сдвигаем на 3 дня.
  return { size: WEEK, shift: MSK_OFFSET + 3 * DAY };
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

export function mskTime(ts: number) {
  return fmt({ hour: "2-digit", minute: "2-digit" }).format(ts);
}

export function mskDateTime(ts: number) {
  return fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(ts).replace(",", "");
}

export function mskDay(ts: number) {
  return fmt({ day: "numeric", month: "short" }).format(ts).replace(".", "");
}

export function mskDayLong(ts: number) {
  return fmt({ weekday: "short", day: "numeric", month: "long" }).format(ts);
}
