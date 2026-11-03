/**
 * Новогодние цены по датам (вариант А, раунды 29–33; техническое решение Т19).
 * Кирилл правит таблицу в админке одним текстовым полем программы `datePrices`:
 *
 *   Даты | Стандарт, 30 мин | Премиум, 30 мин
 *   1.12–13.12 | 11 000 | 16 100
 *   23.12–27.12 | — | 27 600
 *   31.12 06:00–12:59 | — | 28 750
 *   Парковку оплачивает заказчик.
 *
 * Первая строка — столбцы (варианты), «—» — варианта на эту дату нет, строки без «|» — условия под таблицей.
 * Окна времени одной даты — по порядку, окно действует до начала следующего (ответ Кирилла 14). Окно через полночь
 * (23:00–00:59) и все после него — «ночь на 1 января» (ответы 15–16). Год не учитываем: таблица одна на сезон.
 * Чистые функции без React и базы — тесты в date-prices.test.ts.
 */

export interface PriceWindow {
  /** Как написал Кирилл: «06:00–12:59». По этой подписи окно выбирают в корзине. */
  label: string;
  /** Окно (целиком или частью) — ночь на следующий день. */
  night: boolean;
}

export interface PriceRow {
  /** День сезона: июль — 1…31, август — 32…, январь — 187… (см. seasonDay). */
  from: number;
  to: number;
  window?: PriceWindow;
  /** Цена по столбцам; null — варианта на эту дату нет. */
  cells: (number | null)[];
}

export interface PriceTable {
  cols: string[];
  rows: PriceRow[];
  /** Условия под таблицей — строки без «|». */
  notes: string[];
}

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** Сезон идёт с июля по июнь — так «31.12–3.01» остаётся обычным диапазоном. */
function seasonDay(day: number, month: number) {
  return ((month + 5) % 12) * 31 + day;
}

function dayMonth(n: number) {
  const m = ((Math.floor((n - 1) / 31) + 6) % 12) + 1;
  return { d: n - Math.floor((n - 1) / 31) * 31, m };
}

/** «1.12», «01.12.2026» → день сезона или null. */
function parseDay(s: string): number | null {
  const m = /^(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?$/.exec(s.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > MONTH_DAYS[mo - 1]) return null;
  return seasonDay(d, mo);
}

/** «2026-12-28» из поля даты → день сезона или null. */
export function isoSeasonDay(iso: string): number | null {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return parseDay(`${Number(m[2])}.${Number(m[1])}`);
}

function minutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h <= 24 && mi < 60 ? h * 60 + mi : null;
}

/** Число из клетки: «16 100», «16 100 ₽», «16100». Пусто или тире — варианта нет. */
function parseCell(s: string): number | null | undefined {
  const t = s.replace(/[\s  ₽]/g, "").replace(/руб\.?$/i, "");
  if (!t || /^[-–—]+$/.test(t)) return null;
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}

/** Разбор таблицы. Ошибки — с номером строки, текст показываем Кириллу в админке как есть. */
export function parseDatePrices(text: string): { table: PriceTable | null; errors: string[] } {
  const errors: string[] = [];
  const src = text.replace(/\r\n?/g, "\n").split("\n");
  let cols: string[] | null = null;
  const rows: (PriceRow & { line: number; start?: number; end?: number })[] = [];
  const notes: string[] = [];

  src.forEach((raw, i) => {
    const line = raw.replace(/[  ]/g, " ").trim();
    const n = i + 1;
    if (!line) return;
    if (!line.includes("|")) {
      if (cols) notes.push(line);
      else errors.push(`Строка ${n}: первой строкой нужны названия столбцов через «|», например «Даты | Цена»`);
      return;
    }
    const parts = line.split("|").map((x) => x.trim());
    if (!cols) {
      if (parseDay(parts[0].split(/\s|[-–—]/)[0] ?? "") != null) {
        errors.push(`Строка ${n}: первой строкой нужны названия столбцов, например «Даты | Стандарт | Премиум»`);
        return;
      }
      cols = parts.slice(1);
      if (!cols.length || cols.some((c) => !c)) errors.push(`Строка ${n}: у каждого столбца должно быть название`);
      return;
    }
    const m = /^(\S+?)(?:\s*[-–—]\s*(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?))?(?:\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2}))?$/.exec(parts[0]);
    const from = m ? parseDay(m[1]) : null;
    const to = m?.[2] ? parseDay(m[2]) : from;
    if (!m || from == null || to == null) {
      errors.push(`Строка ${n}: не понял дату «${parts[0]}». Пишите «1.12–13.12», «31.12» или «31.12 06:00–12:59»`);
      return;
    }
    if (to < from) {
      errors.push(`Строка ${n}: конец периода раньше начала`);
      return;
    }
    let window: PriceWindow | undefined;
    let start: number | undefined;
    let end: number | undefined;
    if (m[3]) {
      if (to !== from) {
        errors.push(`Строка ${n}: время пишется только к одной дате, например «31.12 06:00–12:59»`);
        return;
      }
      start = minutes(m[3]) ?? undefined;
      end = minutes(m[4]) ?? undefined;
      if (start == null || end == null) {
        errors.push(`Строка ${n}: не понял время «${m[3]}–${m[4]}»`);
        return;
      }
      window = { label: `${m[3]}–${m[4]}`, night: false };
    }
    const cells = parts.slice(1).map(parseCell);
    if (cells.length !== cols.length) {
      errors.push(`Строка ${n}: цен ${cells.length}, а столбцов ${cols.length}`);
      return;
    }
    const bad = cells.findIndex((c) => c === undefined);
    if (bad >= 0) {
      errors.push(`Строка ${n}: «${parts[bad + 1]}» — не число. Цена пишется цифрами, «—» — варианта нет`);
      return;
    }
    if (cells.every((c) => c == null)) {
      errors.push(`Строка ${n}: нет ни одной цены`);
      return;
    }
    rows.push({ from, to, window, cells: cells as (number | null)[], line: n, start, end });
  });

  if (!cols) errors.push("Таблица пустая: первой строкой — названия столбцов, дальше строки с датами");
  if (errors.length || !cols) return { table: null, errors };

  // Периоды без времени не пересекаются; дата с окнами времени не попадает в период.
  const plain = rows.filter((r) => !r.window);
  const timed = rows.filter((r) => r.window);
  for (let a = 0; a < plain.length; a++)
    for (let b = a + 1; b < plain.length; b++)
      if (plain[a].from <= plain[b].to && plain[b].from <= plain[a].to)
        errors.push(`Строки ${plain[a].line} и ${plain[b].line}: периоды пересекаются`);
  for (const t of timed) {
    const p = plain.find((r) => r.from <= t.from && t.from <= r.to);
    if (p) errors.push(`Строки ${p.line} и ${t.line}: у даты есть окна времени, её нельзя включать в период`);
  }

  // Окна одной даты идут по порядку; переход через полночь — один раз (дальше — ночь на следующий день).
  for (const day of new Set(timed.map((r) => r.from))) {
    let prev = -1;
    let night = false;
    let first: number | null = null;
    for (const r of timed.filter((x) => x.from === day)) {
      const wraps = r.end! <= r.start!;
      const s = r.start! + (night ? 1440 : 0);
      first ??= s;
      // Ночь начинается только окном через полночь (23:00–00:59); дальше окна без перехода и до начала дня.
      if (s <= prev || (night && (wraps || r.end! > first))) {
        errors.push(`Строка ${r.line}: окна времени одной даты пишутся по порядку; ночь на следующий день — после окна через полночь (23:00–00:59)`);
        break;
      }
      prev = s;
      if (wraps) night = true;
      if (night) r.window!.night = true;
    }
  }
  if (errors.length) return { table: null, errors };
  return { table: { cols, rows: rows.map(({ from, to, window, cells }) => ({ from, to, window, cells })), notes }, errors };
}

/** Наименьшая цена таблицы — для «от» на карточке и поля price программы. */
export function tableMin(t: PriceTable, col?: number) {
  let min = Infinity;
  for (const r of t.rows)
    r.cells.forEach((c, i) => {
      if (c != null && (col == null || i === col) && c < min) min = c;
    });
  return Number.isFinite(min) ? min : 0;
}

/** Подпись дат строки: «1–13 декабря», «31 декабря», «31 декабря – 3 января». */
export function rowDates(r: PriceRow) {
  const a = dayMonth(r.from);
  const b = dayMonth(r.to);
  if (r.from === r.to) return `${a.d} ${MONTHS_GEN[a.m - 1]}`;
  if (a.m === b.m) return `${a.d}–${b.d} ${MONTHS_GEN[a.m - 1]}`;
  return `${a.d} ${MONTHS_GEN[a.m - 1]} – ${b.d} ${MONTHS_GEN[b.m - 1]}`;
}

/** Столбцы вида «Стандарт, 30 мин»: две оси выбора (вариант и длительность). Иначе — одна. */
export function splitCols(cols: string[]): { a: string[]; b: string[] } | null {
  if (cols.length < 2) return null;
  const parts = cols.map((c) => c.split(/\s*,\s*/));
  if (parts.some((p) => p.length !== 2)) return null;
  const a = [...new Set(parts.map((p) => p[0]))];
  const b = [...new Set(parts.map((p) => p[1]))];
  if (a.length * b.length !== cols.length) return null;
  return { a, b };
}

export type PriceMode = "exact" | "from" | "manager";

export interface PriceResult {
  mode: PriceMode;
  /** Для «от» — нижняя граница, для «укажет менеджер» — 0. */
  price: number;
  /** Столбец, по которому посчитано (может отличаться от выбранного, если того на дату нет). */
  col: number;
  /** Столбцы, которых на эту дату нет (кнопки неактивны). */
  off: number[];
  /** Окна времени для выбора на эту дату (пусто — дата без окон). */
  windows: PriceWindow[];
  /** Выбранное окно, если оно есть на эту дату. */
  slot?: string;
  /** Окна только ночные (дата 1.01): без выбора — «укажет менеджер», а не «от». */
  nightOnly?: boolean;
  note?: string;
}

/**
 * Цена позиции по таблице, дате из заявки (ISO), выбранному столбцу и окну времени.
 * Нет даты — «от» по выбранному столбцу; дата вне таблицы — «укажет менеджер».
 */
export function priceFor(t: PriceTable, opt: { col?: string; date?: string; slot?: string }): PriceResult {
  const want = Math.max(0, opt.col ? t.cols.indexOf(opt.col) : 0);
  const day = opt.date ? isoSeasonDay(opt.date) : null;
  const base = { col: want, off: [] as number[], windows: [] as PriceWindow[] };

  if (!opt.date || day == null) {
    const min = tableMin(t, want) || tableMin(t);
    return { ...base, mode: "from", price: min, note: "Цена зависит от даты" };
  }

  // Окна этой даты и ночные окна прошлой (ночь на 1 января при дате 1.01).
  const own = t.rows.filter((r) => r.window && r.from === day);
  const night = t.rows.filter((r) => r.window?.night && r.from === day - 1);
  const timed = own.length ? own : night;
  const windows = timed.map((r) => r.window!);
  const chosen = timed.find((r) => r.window!.label === opt.slot);

  let row: PriceRow | undefined;
  if (chosen) row = chosen;
  else if (own.length) {
    // Дата с окнами, время не выбрано — «от» по окнам этого дня (выбранного варианта, если он есть).
    const pick = (cs: (number | null)[]) => cs[want] ?? null;
    const vals = own.map((r) => pick(r.cells)).filter((x): x is number => x != null);
    const all = own.flatMap((r) => r.cells).filter((x): x is number => x != null);
    const off = t.cols.map((_, i) => i).filter((i) => own.every((r) => r.cells[i] == null));
    const col = vals.length ? want : t.cols.findIndex((_, i) => !off.includes(i));
    return { col, off, windows, mode: "from", price: Math.min(...(vals.length ? vals : all)), note: "Выберите время приезда" };
  } else row = t.rows.find((r) => !r.window && r.from <= day && day <= r.to);

  if (!row) return { ...base, windows, nightOnly: night.length > 0 && !own.length, mode: "manager", price: 0, note: "Цену укажет менеджер" };

  const off = t.cols.map((_, i) => i).filter((i) => row.cells[i] == null);
  let col = want;
  let note: string | undefined;
  if (row.cells[want] == null) {
    // Варианта на эту дату нет (Стандарт после 22.12) — считаем доступный, с той же длительностью, если можно.
    const sp = splitCols(t.cols);
    const same = sp ? t.cols.findIndex((c, i) => row.cells[i] != null && c.split(/\s*,\s*/)[1] === t.cols[want].split(/\s*,\s*/)[1]) : -1;
    col = same >= 0 ? same : row.cells.findIndex((c) => c != null);
    const name = sp ? t.cols[col].split(/\s*,\s*/)[0] : t.cols[col];
    note = `На эту дату — только ${name}`;
  }
  return { col, off, windows, slot: chosen?.window!.label, nightOnly: night.length > 0 && !own.length, mode: "exact", price: row.cells[col]!, note };
}
