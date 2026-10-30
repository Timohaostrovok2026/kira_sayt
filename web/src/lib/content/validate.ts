import "server-only";
import { EXTRA_GROUPS, KINDS, type CatalogData, type Costume, type Extra, type ExtraGroup, type Kind, type Package, type Program } from "@/data/catalog";
import type { SiteContent } from "@/data/site";

/** Ошибка проверки формы — текст показываем Кириллу как есть. */
export class Invalid extends Error {}

const fail = (msg: string): never => {
  throw new Invalid(msg);
};

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Строка в одну линию. */
export const str = (v: unknown, max = 200) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Многострочный текст: пустые строки по краям убираем, больше двух переводов подряд схлопываем. */
export const text = (v: unknown, max = 6000) =>
  String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

function price(v: unknown, label = "Цена") {
  const n = Number(String(v ?? "").replace(/[\s₽]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) fail(`${label}: нужно число`);
  if (n > 10_000_000) fail(`${label}: слишком большое число`);
  return Math.round(n);
}

function optNumber(v: unknown, min: number, max: number, label: string) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) fail(`${label}: число от ${min} до ${max}`);
  return Math.round(n);
}

function ages(raw: Raw) {
  const a = optNumber(raw.a, 0, 99, "Возраст «от»");
  const b = optNumber(raw.b, 0, 99, "Возраст «до»");
  if (a != null && b != null && a > b) fail("Возраст «от» больше, чем «до»");
  return { a, b };
}

const name = (v: unknown) => str(v, 120) || fail("Укажите название");

/** Фото: только наши адреса — загруженные (/media/...) или из комплекта сайта (/img/...). */
export function photo(v: unknown): string | undefined {
  const s = str(v, 300);
  if (!s) return undefined;
  if (/^\/media\/(costumes|programs|extras|gallery)\/[a-z0-9_-]+\.webp$/.test(s)) return s;
  if (/^\/img\/[a-z0-9/_-]+\.(webp|jpe?g|png)$/i.test(s) && !s.includes("..")) return s;
  return fail("Фото: загрузите файл ещё раз");
}

const hidden = (v: unknown) => (v ? { hidden: true as const } : {});

/* ---------- id ---------- */

const TR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Новый id из названия: «Шоу пузырей» → e_shou_puzyrey. Существующие id никогда не меняем. */
export function makeId(prefix: string, title: string, taken: Set<string>) {
  const slug =
    title
      .toLowerCase()
      .split("")
      .map((ch) => TR[ch] ?? ch)
      .join("")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "item";
  let id = `${prefix}_${slug}`;
  for (let i = 2; taken.has(id); i++) id = `${prefix}_${slug}_${i}`;
  return id;
}

/* ---------- позиции каталога ---------- */

export function cleanProgram(v: unknown, id: string, prev?: Program): Program {
  const r = obj(v);
  const kind = str(r.kind) as Kind;
  if (!KINDS.some((k) => k.id === kind)) fail("Выберите вид программы");
  const cover = str(r.cover, 40);
  return {
    ...prev,
    id,
    name: name(r.name),
    kind,
    group: str(r.group, 60) || prev?.group || "Каждый день",
    ...ages(r),
    price: price(r.price),
    dur: str(r.dur, 60),
    art: str(r.art, 80),
    how: text(r.how),
    inc: text(r.inc, 3000),
    cover: cover || undefined,
    photo: photo(r.photo),
    hidden: undefined,
    ...hidden(r.hidden),
  };
}

export function cleanExtra(v: unknown, id: string, prev?: Extra): Extra {
  const r = obj(v);
  const group = str(r.group) as ExtraGroup;
  if (!EXTRA_GROUPS.some((g) => g.id === group)) fail("Выберите раздел");
  const { a, b } = ages(r);
  return {
    ...prev,
    id,
    name: name(r.name),
    kind: str(r.kind, 40) || group,
    group,
    a,
    b,
    price: price(r.price),
    dur: str(r.dur, 60) || undefined,
    unit: str(r.unit, 60) || undefined,
    art: str(r.art, 80) || undefined,
    how: text(r.how) || undefined,
    inc: text(r.inc, 3000) || undefined,
    photo: photo(r.photo),
    hidden: undefined,
    ...hidden(r.hidden),
  };
}

export function cleanPackage(v: unknown, id: string, cat: CatalogData, prev?: Package): Package {
  const r = obj(v);
  const known = new Set([...cat.programs.map((p) => p.id), ...cat.extras.map((e) => e.id)]);
  const custom = !!r.custom;
  const items = arr(r.items).map((x, i) => {
    const it = obj(x);
    const ref = str(it.ref, 40);
    if (!known.has(ref)) fail(`Позиция ${i + 1}: выберите программу или доп`);
    const qty = optNumber(it.qty, 1, 99, `Позиция ${i + 1}, количество`) ?? 1;
    const alts = [...new Set(arr(it.alts).map((a) => str(a, 40)))].filter((a) => a && a !== ref);
    for (const a of alts) if (!known.has(a)) fail(`Позиция ${i + 1}: вариант не найден`);
    return alts.length ? { ref, qty, alts } : { ref, qty };
  });
  if (!custom && !items.length) fail("Добавьте в пакет хотя бы одну позицию");
  const disc = optNumber(r.disc, 0, 90, "Скидка");
  const override = r.override === "" || r.override == null ? null : price(r.override, "Своя цена");
  return {
    ...prev,
    id,
    name: name(r.name),
    tag: str(r.tag, 300),
    disc: disc || null,
    items,
    override,
    custom,
    note: text(r.note, 600),
    hidden: undefined,
    ...hidden(r.hidden),
  };
}

export function cleanCostume(v: unknown, id: string, prev?: Costume): Costume {
  const r = obj(v);
  const cat = str(r.cat, 60) || fail("Выберите категорию");
  const ph = photo(r.photo);
  if (!ph && !prev) fail("Загрузите фото героя");
  return {
    ...prev,
    id,
    name: name(r.name),
    cat,
    t: text(r.t, 600),
    photo: ph,
    hidden: undefined,
    ...hidden(r.hidden),
  };
}

/* ---------- тексты ---------- */

/** Что приходит из формы: вместо ссылок — ники и номер, ссылки собираем сами. */
export interface SiteInput extends Omit<SiteContent, "contacts"> {
  contacts: {
    phone: string;
    whatsappPhone: string;
    telegramHandle: string;
    channelHandle: string;
    instagramHandle: string;
    owner: string;
    geo: string;
  };
}

function digits(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "8") d = `7${d.slice(1)}`;
  if (d.length === 10) d = `7${d}`;
  return d;
}

function handle(v: unknown, label: string) {
  const h = str(v, 80)
    .replace(/^https?:\/\/(www\.)?(t\.me|instagram\.com)\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
  if (!/^[A-Za-z0-9_.]{3,64}$/.test(h)) fail(`${label}: ник латиницей, например @kkmochalov`);
  return h;
}

function url(v: unknown, label: string) {
  const s = str(v, 300);
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw 0;
    return u.toString();
  } catch {
    return fail(`${label}: нужна ссылка вида https://…`);
  }
}

export function cleanSite(v: unknown): SiteContent {
  const r = obj(v);
  const c = obj(r.contacts);
  const phone = str(c.phone, 40);
  const pd = digits(phone);
  if (pd.length < 11) fail("Телефон: проверьте номер");
  const wd = digits(str(c.whatsappPhone, 40) || phone);
  if (wd.length < 11) fail("WhatsApp: проверьте номер");
  const tg = handle(c.telegramHandle, "Telegram");
  const ch = handle(c.channelHandle, "Telegram-канал");
  const ig = handle(c.instagramHandle, "Instagram");

  const list = <T,>(v: unknown, f: (x: Raw, i: number) => T | null, max = 60) =>
    arr(v)
      .slice(0, max)
      .map((x, i) => f(obj(x), i))
      .filter((x): x is T => x != null);

  return {
    contacts: {
      phone,
      phoneRaw: `+${pd}`,
      whatsapp: `https://wa.me/${wd}`,
      telegram: `https://t.me/${tg}`,
      telegramHandle: `@${tg}`,
      channel: `https://t.me/${ch}`,
      channelHandle: `@${ch}`,
      instagram: `https://instagram.com/${ig}`,
      instagramHandle: `@${ig}`,
      owner: str(c.owner, 80),
      geo: str(c.geo, 120),
    },
    stats: list(r.stats, (x, i) => {
      const label = str(x.label, 80);
      if (!label) return null;
      const value = optNumber(x.value, 0, 1_000_000, `Цифра ${i + 1}`) ?? 0;
      return { value, suffix: str(x.suffix, 6), label };
    }, 8),
    steps: list(r.steps, (x) => (str(x.title) ? { title: str(x.title, 80), text: str(x.text, 300) } : null), 8),
    faq: list(r.faq, (x) => (str(x.q) ? { q: str(x.q, 200), a: text(x.a, 1500) } : null)),
    gallery: list(r.gallery, (x) => {
      const src = photo(x.src);
      if (!src) return null;
      const tag = str(x.tag, 40);
      return { src, alt: str(x.alt, 120), ...(tag ? { tag } : {}) };
    }, 200),
    reviews: list(r.reviews, (x) =>
      text(x.text) ? { name: str(x.name, 60) || "Гость", date: str(x.date, 40), text: text(x.text, 2000), source: str(x.source, 60) } : null,
    ),
    yandexRating: str(r.yandexRating, 6),
    yandexReviewsCount: optNumber(r.yandexReviewsCount, 0, 100000, "Число отзывов") ?? 0,
    yandexUrl: url(r.yandexUrl, "Ссылка на отзывы"),
    legal: str(r.legal, 200),
  };
}
