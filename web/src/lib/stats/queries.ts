import "server-only";
import { getDb } from "@/lib/db";
import { normQuery } from "@/lib/format";
import { bucketSpec, type Range, type ResolvedPeriod } from "./period";
import {
  addLabel,
  ageLabel,
  clickLabel,
  contactLabel,
  costumeName,
  deviceLabel,
  itemName,
  pageLabel,
  sourceLabel,
  stepLabel,
  typeLabel,
} from "./labels";

/*
  Все запросы — синхронные (node:sqlite), с параметрами.
  Визиты самой страницы статистики (/stats) не учитываются.
  Визит (сессия) = пара visitor + session: ключ из sessionStorage может быть «na», поэтому склеиваем с visitor.
*/

const SK = "(visitor || '|' || session)";
const SITE = "path NOT LIKE '/stats%'";
const IN_RANGE = `ts >= ? AND ts < ? AND ${SITE}`;

/** Безопасное чтение поля из JSON props. Ключ — только из кода, не от пользователя. */
function prop(key: string) {
  if (!/^[a-z_]+$/i.test(key)) throw new Error("bad prop key");
  return `(CASE WHEN json_valid(props) THEN json_extract(props, '$.${key}') END)`;
}

type Row = Record<string, unknown>;

function num(v: unknown) {
  return typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number(v ?? 0) || 0;
}

function str(v: unknown) {
  return v == null ? null : String(v);
}

function all(sql: string, ...params: (number | string | null)[]) {
  return getDb().prepare(sql).all(...params) as Row[];
}

function get(sql: string, ...params: (number | string | null)[]) {
  return (getDb().prepare(sql).get(...params) ?? {}) as Row;
}

const r2 = (r: Range) => [r.from, r.to] as const;

/* ---------- Общее ---------- */

export function dataBounds() {
  const e = get(`SELECT COUNT(*) n, MIN(ts) first FROM events WHERE ${SITE}`);
  const l = get("SELECT COUNT(*) n, MIN(ts) first FROM leads");
  const firsts = [e.first, l.first].filter((x) => x != null).map(num);
  return {
    events: num(e.n),
    leads: num(l.n),
    first: firsts.length ? Math.min(...firsts) : null,
  };
}

export function liveNow(now: number) {
  return num(get(`SELECT COUNT(DISTINCT ${SK}) n FROM events WHERE ts >= ? AND ${SITE}`, now - 5 * 60_000).n);
}

/* ---------- KPI ---------- */

export interface Kpi {
  visitors: number;
  sessions: number;
  pageviews: number;
  adds: number;
  leads: number;
  contacts: number;
  conversion: number; // заявки / визиты, 0..1
}

export function kpis(r: Range): Kpi {
  const e = get(
    `SELECT COUNT(DISTINCT visitor) visitors, COUNT(DISTINCT ${SK}) sessions,
       SUM(name = 'pageview') pageviews, SUM(name = 'cart_add') adds, SUM(name = 'contact') contacts
     FROM events WHERE ${IN_RANGE}`,
    ...r2(r),
  );
  const leads = num(get("SELECT COUNT(*) n FROM leads WHERE ts >= ? AND ts < ?", ...r2(r)).n);
  const sessions = num(e.sessions);
  return {
    visitors: num(e.visitors),
    sessions,
    pageviews: num(e.pageviews),
    adds: num(e.adds),
    leads,
    contacts: num(e.contacts),
    conversion: sessions ? leads / sessions : 0,
  };
}

/* ---------- Воронка ---------- */

export interface Funnel {
  steps: { label: string; value: number }[];
  submitted: number;
  succeeded: number;
  failed: number;
}

export function funnel(r: Range): Funnel {
  const f = get(
    `SELECT COUNT(*) total,
       SUM(cat OR addc OR cart OR lead) s1,
       SUM(addc OR cart OR lead) s2,
       SUM(cart OR lead) s3,
       SUM(lead) s4
     FROM (
       SELECT ${SK} sk,
         MAX(name = 'pageview' AND (path IN ('/sobrat', '/kostyumy', '/pakety') OR path LIKE '/programmy/%')) cat,
         MAX(name = 'cart_add') addc,
         MAX(name = 'pageview' AND path = '/korzina') cart,
         MAX(name = 'lead_submit') lead
       FROM events WHERE ${IN_RANGE} GROUP BY sk
     )`,
    ...r2(r),
  );
  const ok = get(
    `SELECT SUM(name = 'lead_submit') submitted, SUM(name = 'lead_ok') succeeded, SUM(name = 'lead_fail') failed
     FROM events WHERE ${IN_RANGE} AND name IN ('lead_submit', 'lead_ok', 'lead_fail')`,
    ...r2(r),
  );
  return {
    steps: [
      { label: "Зашли на сайт", value: num(f.total) },
      { label: "Смотрели каталог", value: num(f.s1) },
      { label: "Добавили в корзину", value: num(f.s2) },
      { label: "Открыли корзину", value: num(f.s3) },
      { label: "Отправили заявку", value: num(f.s4) },
    ],
    submitted: num(ok.submitted),
    succeeded: num(ok.succeeded),
    failed: num(ok.failed),
  };
}

/* ---------- График по дням / часам ---------- */

export interface Point {
  start: number;
  sessions: number;
  visitors: number;
  leads: number;
}

export function series(p: ResolvedPeriod): Point[] {
  const { size, shift } = bucketSpec(p.bucket);
  const b = `CAST((ts + ?) / ? AS INTEGER)`;
  const ev = all(
    `SELECT ${b} b, COUNT(DISTINCT ${SK}) sessions, COUNT(DISTINCT visitor) visitors
     FROM events WHERE ${IN_RANGE} GROUP BY b`,
    shift,
    size,
    ...r2(p.cur),
  );
  const ld = all(`SELECT ${b} b, COUNT(*) n FROM leads WHERE ts >= ? AND ts < ? GROUP BY b`, shift, size, ...r2(p.cur));
  const map = new Map<number, Point>();
  const first = Math.floor((p.cur.from + shift) / size);
  // Для «Сегодня» показываем все 24 часа, иначе — до текущего момента.
  const last = p.bucket === "hour" ? first + 23 : Math.floor((p.cur.to - 1 + shift) / size);
  for (let i = first; i <= last; i++) map.set(i, { start: i * size - shift, sessions: 0, visitors: 0, leads: 0 });
  for (const row of ev) {
    const pt = map.get(num(row.b));
    if (pt) {
      pt.sessions = num(row.sessions);
      pt.visitors = num(row.visitors);
    }
  }
  for (const row of ld) {
    const pt = map.get(num(row.b));
    if (pt) pt.leads = num(row.n);
  }
  return [...map.values()];
}

/* ---------- Топ-списки ---------- */

export interface Item {
  key: string;
  label: string;
  value: number;
  sub?: string;
}

export function topPages(r: Range, limit = 10): Item[] {
  return all(
    `SELECT path, COUNT(*) views, COUNT(DISTINCT ${SK}) sessions
     FROM events WHERE name = 'pageview' AND ${IN_RANGE}
     GROUP BY path ORDER BY views DESC LIMIT ?`,
    ...r2(r),
    limit,
  ).map((x) => ({
    key: String(x.path),
    label: pageLabel(String(x.path)),
    value: num(x.views),
    sub: `${num(x.sessions)} виз.`,
  }));
}

/** Где уходят: последняя страница визита. */
export function exitPages(r: Range, limit = 8) {
  const rows = all(
    `WITH pv AS (
       SELECT ${SK} sk, path, ts, id FROM events WHERE name = 'pageview' AND ${IN_RANGE}
     ),
     last AS (
       SELECT path, ROW_NUMBER() OVER (PARTITION BY sk ORDER BY ts DESC, id DESC) rn FROM pv
     ),
     views AS (SELECT path, COUNT(*) views FROM pv GROUP BY path)
     SELECT l.path, COUNT(*) exits, v.views
     FROM last l JOIN views v ON v.path = l.path
     WHERE l.rn = 1 GROUP BY l.path ORDER BY exits DESC LIMIT ?`,
    ...r2(r),
    limit,
  );
  const b = get(
    `SELECT COUNT(*) sessions, SUM(n = 1) single FROM (
       SELECT COUNT(*) n FROM events WHERE name = 'pageview' AND ${IN_RANGE} GROUP BY ${SK}
     )`,
    ...r2(r),
  );
  const items: Item[] = rows.map((x) => {
    const exits = num(x.exits);
    const views = num(x.views);
    return {
      key: String(x.path),
      label: pageLabel(String(x.path)),
      value: exits,
      sub: views ? `${Math.round((exits / views) * 100)}% просмотров` : undefined,
    };
  });
  const sessions = num(b.sessions);
  return { items, bounce: sessions ? num(b.single) / sessions : 0, sessions };
}

export function topClicks(r: Range, limit = 12): Item[] {
  return all(
    `SELECT ${prop("el")} el, COUNT(*) n, COUNT(DISTINCT ${SK}) s
     FROM events WHERE name = 'click' AND ${IN_RANGE}
     GROUP BY el HAVING el IS NOT NULL ORDER BY n DESC LIMIT ?`,
    ...r2(r),
    limit,
  ).map((x) => ({ key: String(x.el), label: clickLabel(String(x.el)), value: num(x.n), sub: `${num(x.s)} виз.` }));
}

export function topAdded(r: Range, limit = 12): Item[] {
  return all(
    `SELECT type, id, SUM(name = 'cart_add') adds, SUM(name = 'cart_remove') removes FROM (
       SELECT name, ${prop("type")} type, ${prop("id")} id
       FROM events WHERE name IN ('cart_add', 'cart_remove') AND ${IN_RANGE}
     ) WHERE id IS NOT NULL GROUP BY type, id HAVING adds > 0 ORDER BY adds DESC LIMIT ?`,
    ...r2(r),
    limit,
  ).map((x) => {
    const type = String(x.type ?? "");
    const removes = num(x.removes);
    return {
      key: `${type}:${x.id}`,
      label: itemName(type, String(x.id)),
      value: num(x.adds),
      sub: [typeLabel(type), removes ? `убрали ${removes}` : ""].filter(Boolean).join(" · "),
    };
  });
}

export function topHeroes(r: Range, limit = 10): Item[] {
  return all(
    `SELECT id, SUM(name = 'costume_view') views, SUM(name = 'cart_add') adds FROM (
       SELECT name, ${prop("id")} id FROM events
       WHERE ${IN_RANGE} AND (name = 'costume_view' OR (name = 'cart_add' AND ${prop("type")} = 'costume'))
     ) WHERE id IS NOT NULL GROUP BY id ORDER BY (views + adds * 2) DESC, adds DESC LIMIT ?`,
    ...r2(r),
    limit,
  ).map((x) => {
    const views = num(x.views);
    const adds = num(x.adds);
    return {
      key: String(x.id),
      label: costumeName(String(x.id)),
      value: views + adds,
      sub: `${views} просм. · ${adds} в корзину`,
    };
  });
}

/** Значения одного поля props у события, по убыванию частоты. */
function propCounts(name: string, key: string, r: Range, limit: number) {
  return all(
    `SELECT ${prop(key)} v, COUNT(*) n, COUNT(DISTINCT ${SK}) s
     FROM events WHERE name = ? AND ${IN_RANGE}
     GROUP BY v HAVING v IS NOT NULL AND v != '' ORDER BY n DESC LIMIT ?`,
    name,
    ...r2(r),
    limit,
  ).map((x) => ({ v: String(x.v), n: num(x.n), s: num(x.s) }));
}

export function topSearches(r: Range, limit = 12): Item[] {
  const rows = all(
    `SELECT ${prop("q")} v, COUNT(*) n, COUNT(DISTINCT ${SK}) s, SUM(${prop("n")} = 0) zero
     FROM events WHERE name = 'costume_search' AND ${IN_RANGE}
     GROUP BY v HAVING v IS NOT NULL AND v != '' ORDER BY n DESC LIMIT 500`,
    ...r2(r),
  );
  // SQLite lower() не умеет кириллицу — нормализуем в JS.
  const merged = new Map<string, { label: string; n: number; s: number; zero: number }>();
  for (const x of rows) {
    const raw = String(x.v);
    const k = normQuery(raw);
    if (k.length < 2) continue;
    const m = merged.get(k);
    if (m) {
      m.n += num(x.n);
      m.s += num(x.s);
      m.zero += num(x.zero);
    } else merged.set(k, { label: raw.trim(), n: num(x.n), s: num(x.s), zero: num(x.zero) });
  }
  return [...merged.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, limit)
    .map(([k, m]) => ({
      key: k,
      label: `«${m.label}»`,
      value: m.n,
      sub: [`${m.s} виз.`, m.zero ? `ничего не нашли: ${m.zero}` : ""].filter(Boolean).join(" · "),
    }));
}

export function topCostumeCats(r: Range, limit = 8): Item[] {
  return propCounts("costume_cat", "cat", r, limit).map((x) => ({ key: x.v, label: x.v, value: x.n }));
}

export function topContacts(r: Range): Item[] {
  return propCounts("contact", "via", r, 10).map((x) => ({
    key: x.v,
    label: contactLabel(x.v),
    value: x.n,
    sub: `${x.s} виз.`,
  }));
}

export function builder(r: Range) {
  const steps = propCounts("builder_step", "step", r, 10)
    .map((x) => ({ key: x.v, label: stepLabel(x.v), value: x.s, sub: `${x.n} раз` }))
    .sort((a, b) => a.key.localeCompare(b.key, "ru", { numeric: true }));
  const ages = propCounts("builder_age", "age", r, 10).map((x) => ({ key: x.v, label: ageLabel(x.v), value: x.n }));
  const opens = num(
    get(`SELECT COUNT(DISTINCT ${SK}) n FROM events WHERE name = 'cart_open' AND ${IN_RANGE}`, ...r2(r)).n,
  );
  return { steps, ages, opens };
}

export function sources(r: Range, limit = 10): Item[] {
  const rows = all(
    `SELECT ref, utm, COUNT(*) n FROM (
       SELECT MAX(ref) ref, MAX(utm) utm FROM events WHERE ${IN_RANGE} GROUP BY ${SK}
     ) GROUP BY ref, utm`,
    ...r2(r),
  );
  const merged = new Map<string, number>();
  for (const x of rows) {
    const label = sourceLabel(str(x.ref), str(x.utm));
    merged.set(label, (merged.get(label) ?? 0) + num(x.n));
  }
  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, n]) => ({ key: label, label, value: n }));
}

export function devices(r: Range): Item[] {
  return all(
    `SELECT device, COUNT(DISTINCT ${SK}) n FROM events WHERE ${IN_RANGE} GROUP BY device ORDER BY n DESC`,
    ...r2(r),
  ).map((x) => ({ key: String(x.device), label: deviceLabel(str(x.device)), value: num(x.n) }));
}

export interface ScrollRow {
  key: string;
  label: string;
  views: number;
  d50: number;
  d90: number;
}

export function scrollDepth(r: Range, limit = 8): ScrollRow[] {
  return all(
    `SELECT path, SUM(name = 'pageview') views,
       SUM(name = 'scroll' AND ${prop("depth")} = 50) d50,
       SUM(name = 'scroll' AND ${prop("depth")} = 90) d90
     FROM events WHERE name IN ('pageview', 'scroll') AND ${IN_RANGE}
     GROUP BY path HAVING views > 0 ORDER BY views DESC LIMIT ?`,
    ...r2(r),
    limit,
  ).map((x) => {
    const views = num(x.views);
    return {
      key: String(x.path),
      label: pageLabel(String(x.path)),
      views,
      d50: Math.min(1, num(x.d50) / views),
      d90: Math.min(1, num(x.d90) / views),
    };
  });
}

/* ---------- Сегменты посетителей ---------- */

/** События, которые значат «человек что-то сделал», а не просто открыл страницу. */
const ACTIONS = `('click', 'contact', 'cart_add', 'cart_remove', 'cart_open', 'costume_view', 'builder_age',
  'costume_search', 'costume_cat', 'lead_submit', 'lead_ok', 'lead_fail')`;

export interface Segments {
  total: number;
  left: number;
  interested: number;
  potential: number;
  leads: number;
  contacts: number;
}

/**
 * Посетители (уникальные visitor) за период, три группы:
 * ушли — только просмотры и прокрутка; интересовались — что-то нажимали, но без цели;
 * потенциальные клиенты — нажали на контакт или отправили заявку.
 * builder_step шага 1 срабатывает сам при открытии конструктора, поэтому считаем только шаги 2+.
 */
export function segments(r: Range): Segments {
  const x = get(
    `WITH v AS (
       SELECT visitor,
         MAX(name IN ${ACTIONS} OR (name = 'builder_step' AND ${prop("step")} > 1)) act,
         MAX(name IN ('lead_submit', 'lead_ok')) lead,
         MAX(name = 'contact') contact
       FROM events WHERE ${IN_RANGE} GROUP BY visitor
     ),
     w AS (
       SELECT act, contact,
         (lead OR visitor IN (SELECT visitor FROM leads WHERE ts >= ? AND ts < ? AND visitor IS NOT NULL)) lead
       FROM v
     )
     SELECT COUNT(*) total,
       SUM(lead OR contact) potential,
       SUM(lead) leads,
       SUM(contact AND NOT lead) contacts,
       SUM(act AND NOT lead AND NOT contact) interested
     FROM w`,
    ...r2(r),
    ...r2(r),
  );
  const total = num(x.total);
  const potential = num(x.potential);
  const interested = num(x.interested);
  return {
    total,
    potential,
    interested,
    left: Math.max(0, total - potential - interested),
    leads: num(x.leads),
    contacts: num(x.contacts),
  };
}

/** Кнопки-«контакты», которые уже видны как contact.via — чтобы не считать дважды. */
const CONTACT_EL = /(_wa|_tg|_instagram|_channel)$/;
const ADD_EL = /^(program|extra|costume|package)_add_/;

/** «На что нажимали»: кнопки с меткой + добавления в корзину по названиям + контакты. */
export function clickTargets(r: Range, limit = 20): Item[] {
  const rows = all(
    `SELECT name, ${prop("el")} el, ${prop("via")} via, ${prop("type")} type, ${prop("id")} id, COUNT(*) n
     FROM events WHERE name IN ('click', 'contact', 'cart_add') AND ${IN_RANGE}
     GROUP BY name, el, via, type, id`,
    ...r2(r),
  );
  const merged = new Map<string, { label: string; n: number; kind: string }>();
  const put = (label: string, n: number, kind: string) => {
    const m = merged.get(label);
    if (m) m.n += n;
    else merged.set(label, { label, n, kind });
  };
  for (const x of rows) {
    const n = num(x.n);
    if (x.name === "click" && x.el) {
      const el = String(x.el);
      if (ADD_EL.test(el) || CONTACT_EL.test(el)) continue;
      put(clickLabel(el), n, "Кнопка");
    } else if (x.name === "contact" && x.via) put(contactLabel(String(x.via)), n, "Контакт");
    else if (x.name === "cart_add" && x.id) put(addLabel(String(x.type ?? ""), String(x.id)), n, "В корзину");
  }
  return [...merged.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((m) => ({ key: m.label, label: m.label, value: m.n, sub: m.kind }));
}

/* ---------- Заявки ---------- */

export interface Lead {
  id: number;
  ts: number;
  name: string;
  phone: string;
  total: number;
  text: string;
  delivered: boolean;
}

export function recentLeads(limit = 30): Lead[] {
  return all("SELECT id, ts, name, phone, total, text, delivered FROM leads ORDER BY id DESC LIMIT ?", limit).map(
    (x) => ({
      id: num(x.id),
      ts: num(x.ts),
      name: String(x.name ?? ""),
      phone: String(x.phone ?? ""),
      total: num(x.total),
      text: String(x.text ?? ""),
      delivered: num(x.delivered) === 1,
    }),
  );
}
