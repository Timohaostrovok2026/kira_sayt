/**
 * Типы каталога, постоянные справочники и чистые функции.
 * Сами данные живут в базе (см. src/lib/content), catalog.json — только начальное наполнение.
 * На сервере каталог берём через getCatalog(), в клиентских компонентах — useCatalog().
 */

export type Kind =
  | "Анимация"
  | "Настольные игры"
  | "Квест"
  | "Вечеринка"
  | "Новый год"
  | "Хэллоуин"
  | "Выпускной";

export type ExtraGroup =
  | "Шоу"
  | "Мастер-классы"
  | "Подарки и реквизит"
  | "Съёмка"
  | "Опции и услуги";

export interface Program {
  id: string;
  name: string;
  kind: Kind;
  group: string;
  a: number | null;
  b: number | null;
  price: number;
  dur: string;
  art: string;
  how: string;
  inc: string;
  /** Герой-обложка (id костюма), если нет своего фото. */
  cover?: string;
  /** Своё загруженное фото (/media/...). */
  photo?: string;
  hidden?: boolean;
}

export interface Extra {
  id: string;
  name: string;
  kind: string;
  group: ExtraGroup;
  a?: number | null;
  b?: number | null;
  price: number;
  dur?: string;
  unit?: string;
  art?: string;
  how?: string;
  inc?: string;
  /** Фото (/img/events/... или загруженное /media/...). Есть — карточка с картинкой. */
  photo?: string;
  hidden?: boolean;
}

export interface PackageItem {
  ref: string;
  qty: number;
  alts?: string[];
}

export interface Package {
  id: string;
  name: string;
  tag: string;
  disc: number | null;
  items: PackageItem[];
  override: number | null;
  custom: boolean;
  note: string;
  hidden?: boolean;
}

export interface Costume {
  id: string;
  name: string;
  cat: string;
  t: string;
  vip?: boolean;
  /** Загруженное фото (/media/...). Без него — /img/costumes/<id>.webp. */
  photo?: string;
  hidden?: boolean;
}

/** Всё редактируемое содержимое каталога (порядок в массивах = порядок на сайте). */
export interface CatalogData {
  programs: Program[];
  extras: Extra[];
  packages: Package[];
  costumes: Costume[];
  costumeCats: string[];
}

/**
 * Не показываем в каталоге: выезд и звук считаются в форме заявки,
 * VIP-костюм менеджер предлагает сам (по просьбе Кирилла не выделяем на сайте).
 */
export const SPECIAL_EXTRAS = new Set(["e_mkad", "e_sound", "e_vip"]);
export const MKAD_BASE = 1500;
export const MKAD_PER_KM = 100;
export const SOUND_PRICE = 4500;

export const AGE_GROUPS = [
  { id: "1-3", label: "1–3 года", a: 1, b: 3 },
  { id: "4-6", label: "4–6 лет", a: 4, b: 6 },
  { id: "7-10", label: "7–10 лет", a: 7, b: 10 },
  { id: "11-15", label: "11–15 лет", a: 11, b: 15 },
] as const;
export type AgeGroupId = (typeof AGE_GROUPS)[number]["id"];

export const KINDS: { id: Kind; title: string; slug: string; blurb: string }[] = [
  { id: "Анимация", title: "Анимация", slug: "animaciya", blurb: "Любимый герой ведёт праздник" },
  { id: "Квест", title: "Квесты", slug: "kvesty", blurb: "Сюжет, загадки, командная игра" },
  { id: "Вечеринка", title: "Вечеринки", slug: "vecherinki", blurb: "Пижамы, челленджи, движ" },
  { id: "Настольные игры", title: "Игры", slug: "igry", blurb: "Мафия, Бункер, Мелодия" },
  { id: "Новый год", title: "Новый год", slug: "novyj-god", blurb: "Дед Мороз, Гринч, спектакль" },
  { id: "Хэллоуин", title: "Хэллоуин", slug: "hellouin", blurb: "Страшно весело" },
  { id: "Выпускной", title: "Выпускной", slug: "vypusknoj", blurb: "Для 4 класса, до 20 детей" },
];

export const EXTRA_GROUPS: { id: ExtraGroup; title: string }[] = [
  { id: "Шоу", title: "Шоу" },
  { id: "Мастер-классы", title: "Мастер-классы" },
  { id: "Подарки и реквизит", title: "Подарки и реквизит" },
  { id: "Съёмка", title: "Фото и видео" },
  { id: "Опции и услуги", title: "Допы" },
];

/** Герой-обложка по умолчанию для программ без своего фото. */
export const DEFAULT_COVER = "h042";

/** Фото из комплекта сайта (public/img/costumes). */
export function staticCostumeImg(id: string) {
  return `/img/costumes/${id}.webp`;
}

/**
 * Фото уже нарезано под карточку (герои 480×640, загрузки из админки, кроме галереи):
 * отдаём файл как есть, без пережатия на сервере — так быстрее на первом заходе.
 */
export function isPresized(src: string) {
  return src.startsWith("/img/costumes/") || /^\/media\/(costumes|programs|extras)\/[a-z0-9_-]+\.webp$/i.test(src);
}

/** Большая версия загруженного фото (960×1280) — рядом с основной. */
export function largePhoto(url: string) {
  return url.startsWith("/media/") ? url.replace(/\.webp$/, "-lg.webp") : url;
}

export function ageFits(item: { a?: number | null; b?: number | null }, ageId: AgeGroupId | null) {
  if (!ageId) return true;
  const g = AGE_GROUPS.find((x) => x.id === ageId)!;
  const from = item.a ?? 0;
  const to = item.b ?? 99;
  return from <= g.b && to >= g.a;
}

export function ageText(item: { a?: number | null; b?: number | null }) {
  const { a, b } = item;
  if (a == null && b == null) return "любой возраст";
  if (b == null) return `от ${a} лет`;
  if (a == null) return `до ${b} лет`;
  return `${a}–${b} лет`;
}

/** Сезонные шоу показываем только к своей программе: хэллоуинские к Хэллоуину, новогодние к Новому году. */
export function showFitsProgram(e: Extra, p: Program | null) {
  const hal = /Хэллоуин|Страшн/.test(e.name);
  const ny = /Новый год|Ледяное/.test(e.name);
  if (!p) return true;
  if (hal) return p.kind === "Хэллоуин";
  if (ny) return p.kind === "Новый год";
  return true;
}

/** Текст how: первый абзац — описание, дальше по строке на шаг программы. */
export function splitHow(how?: string) {
  const parts = (how ?? "").split("\n\n");
  return {
    intro: parts[0] ?? "",
    steps: parts.slice(1).join("\n").split("\n").filter(Boolean),
  };
}

export function lines(s?: string) {
  return (s ?? "").split("\n").filter(Boolean);
}

export function minPrice(list: { price: number }[]) {
  return list.length ? Math.min(...list.map((x) => x.price)) : 0;
}

export type AnyItem = { id: string; name: string; price: number; kind: string };

/** Позиция в слоте пакета: выбранный вариант, если он ещё есть среди вариантов слота, иначе основной. */
export function slotRef(it: PackageItem, choice?: string) {
  return choice && (choice === it.ref || it.alts?.includes(choice)) ? choice : it.ref;
}

/** Цена пакета: сумма позиций (с выбранными вариантами) минус скидка, либо фиксированная цена. */
export function calcPackagePrice(
  k: Pick<Package, "items" | "disc" | "override">,
  find: (id: string) => { price: number } | undefined,
  choices?: Record<number, string>,
) {
  let full = 0;
  k.items.forEach((it, i) => {
    const e = find(slotRef(it, choices?.[i]));
    if (e) full += e.price * (it.qty || 1);
  });
  const d = k.disc ?? 0;
  const price = k.override ?? Math.round((full * (1 - d / 100)) / 100) * 100;
  return { full, price, save: full - price };
}

/** Каталог с готовыми справочниками. Списки и *ById — только видимые позиции. */
export interface Catalog extends CatalogData {
  /** Все позиции, включая скрытые (для состава пакетов и обложек). */
  all: CatalogData;
  programById: Record<string, Program>;
  extraById: Record<string, Extra>;
  packageById: Record<string, Package>;
  costumeById: Record<string, Costume>;
  costumeImg: (id: string) => string;
  programCover: (id: string) => string;
  /** Любая позиция, на которую может ссылаться пакет: доп или программа (в том числе скрытые). */
  anyItem: (id: string) => AnyItem | undefined;
  packagePrice: (k: Package, choices?: Record<number, string>) => { full: number; price: number; save: number };
}

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<string, T>;

export function buildCatalog(data: CatalogData): Catalog {
  const visible = <T extends { hidden?: boolean }>(list: T[]) => list.filter((x) => !x.hidden);
  const programs = visible(data.programs);
  const extras = visible(data.extras);
  const packages = visible(data.packages);
  const costumes = visible(data.costumes);

  const allPrograms = byId(data.programs);
  const allExtras = byId(data.extras);
  const allCostumes = byId(data.costumes);

  const costumeImg = (id: string) => allCostumes[id]?.photo || staticCostumeImg(id);
  const programCover = (id: string) => {
    const p = allPrograms[id];
    if (p?.photo) return p.photo;
    const cover = p?.cover && allCostumes[p.cover] ? p.cover : DEFAULT_COVER;
    return costumeImg(cover);
  };
  const anyItem = (id: string): AnyItem | undefined => allExtras[id] ?? allPrograms[id];

  return {
    all: data,
    programs,
    extras,
    packages,
    costumes,
    costumeCats: data.costumeCats,
    programById: byId(programs),
    extraById: byId(extras),
    packageById: byId(packages),
    costumeById: byId(costumes),
    costumeImg,
    programCover,
    anyItem,
    packagePrice: (k, choices) => calcPackagePrice(k, anyItem, choices),
  };
}
