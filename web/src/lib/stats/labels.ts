import "server-only";
import { AGE_GROUPS, KINDS, type Costume, type Extra, type Package, type Program } from "@/data/catalog";
import { readContentShared, type ContentAll } from "@/lib/content/store";

/**
 * Названия позиций берём из базы — включая скрытые, чтобы в статистике были имена, а не id.
 * Статистика всегда считается на запросе, поэтому читаем без кэша (store сам не перечитывает JSON без изменений).
 */
let cached: { src: Readonly<ContentAll>; maps: ReturnType<typeof build> } | null = null;
function maps() {
  const src = readContentShared();
  if (cached?.src !== src) cached = { src, maps: build(src.catalog) };
  return cached.maps;
}
function build(c: ContentAll["catalog"]) {
  const by = <T extends { id: string }>(l: T[]) => Object.fromEntries(l.map((x) => [x.id, x])) as Record<string, T | undefined>;
  return { programById: by<Program>(c.programs), extraById: by<Extra>(c.extras), packageById: by<Package>(c.packages), costumeById: by<Costume>(c.costumes) };
}
const programById = new Proxy({} as Record<string, Program | undefined>, { get: (_, k: string) => maps().programById[k] });
const extraById = new Proxy({} as Record<string, Extra | undefined>, { get: (_, k: string) => maps().extraById[k] });
const packageById = new Proxy({} as Record<string, Package | undefined>, { get: (_, k: string) => maps().packageById[k] });
const costumeById = new Proxy({} as Record<string, Costume | undefined>, { get: (_, k: string) => maps().costumeById[k] });

/** Человеческие названия для адресов, кнопок, источников и позиций каталога. */

const PAGES: Record<string, string> = {
  "/": "Главная",
  "/sobrat": "Конструктор",
  "/kostyumy": "Костюмы",
  "/pakety": "Пакеты",
  "/korzina": "Корзина",
};

export function pageLabel(path: string) {
  if (PAGES[path]) return PAGES[path];
  const m = path.match(/^\/programmy\/([^/?#]+)/);
  if (m) return `Программа: ${programById[m[1]]?.name ?? m[1]}`;
  if (path.startsWith("/#")) return `Главная → ${path.slice(2)}`;
  return path;
}

const TYPE_LABEL: Record<string, string> = {
  program: "Программа",
  extra: "Доп",
  package: "Пакет",
  costume: "Герой",
};

export function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type;
}

export function itemName(type: string, id: string) {
  const name =
    type === "program"
      ? programById[id]?.name
      : type === "extra"
        ? extraById[id]?.name
        : type === "package"
          ? packageById[id]?.name
          : type === "costume"
            ? costumeById[id]?.name
            : undefined;
  return name ?? id;
}

export function costumeName(id: string) {
  return costumeById[id]?.name ?? id;
}

const CLICK_EXACT: Record<string, string> = {
  header_logo: "Логотип в шапке",
  header_cart: "Корзина в шапке",
  header_cta: "Шапка: «Собрать праздник»",
  hero_build: "Кнопка «Собрать праздник» на главной",
  hero_packs: "Кнопка «Пакеты» на главной",
  how_build: "Главная, «Как это работает»: «Собрать»",
  final_build: "Главная, низ: «Собрать праздник»",
  final_tg: "Главная, низ: «Написать в Telegram»",
  team_channel: "Главная: Telegram-канал",
  team_instagram: "Главная: Instagram",
  home_costumes_all: "Главная: «Все костюмы»",
  home_costumes_all_m: "Главная: «Все костюмы»",
  home_costumes_tile: "Главная: плитка костюмов",
  home_packs_all: "Главная: «Все пакеты»",
  home_packs_all_m: "Главная: «Все пакеты»",
  toast_to_cart: "Всплывашка «В корзину»",
  builder_checkout: "Конструктор: «Оформить»",
  builder_bar_checkout: "Конструктор, нижняя панель: «Оформить»",
  builder_add_hero: "Конструктор: «Добавить героя»",
  builder_to_packages: "Конструктор: «Готовые пакеты»",
  builder_age_skip: "Конструктор: пропустили возраст",
  costumes_bar_cart: "Костюмы, панель: «В корзину»",
  costumes_bar_programs: "Костюмы, панель: «К программам»",
  costume_sheet_to_programs: "Карточка героя: «К программам»",
  costume_search_reset: "Костюмы: сбросили поиск",
  program_sticky_cart: "Программа: «В корзину»",
  program_page_to_builder: "Программа: «В конструктор»",
  program_page_to_shows: "Программа: «Добавить шоу»",
  pakety_custom_tg: "Пакеты: свой пакет в Telegram",
  pakety_custom_jump: "Пакеты: «Собрать свой»",
  lead_submit_btn: "Корзина: «Отправить заявку»",
  lead_submit_bar: "Корзина, панель: «Отправить заявку»",
  lead_bar_to_form: "Корзина, панель: к форме",
  lead_copy: "Заявка: «Скопировать текст»",
  lead_ok_home: "После заявки: на главную",
  lead_fail_back: "Ошибка заявки: «Назад»",
  cart_undo: "Корзина: «Вернуть»",
  cart_sound: "Корзина: звук",
  cart_mkad: "Корзина: выезд за МКАД",
  cart_empty_wa: "Пустая корзина: WhatsApp",
  cart_empty_tg: "Пустая корзина: Telegram",
  pwa_install: "Плашка «На экран»: «Установить»",
  pwa_dismiss: "Плашка «На экран»: закрыли",
  pwa_ios_done: "Плашка «На экран»: «Понятно» (iPhone)",
};

/** Названия отдельных событий (не кликов), которые пишутся через track(). */
const EVENT_LABEL: Record<string, string> = {
  pwa_installed: "Добавили сайт на экран «Домой»",
};

export function eventLabel(name: string) {
  return EVENT_LABEL[name] ?? name;
}

const ageName = (id: string) => AGE_GROUPS.find((g) => g.id === id)?.label ?? id;

const CLICK_PREFIX: [string, (rest: string) => string][] = [
  ["nav_", (r) => `Меню: ${NAV_LABEL[r] ?? pageLabel(r)}`],
  ["bottom_", (r) => `Нижнее меню: ${r}`],
  ["program_open_", (r) => `Открыли программу: ${programById[r]?.name ?? r}`],
  ["program_add_", (r) => `Выбрали программу: ${programById[r]?.name ?? r}`],
  ["program_sticky_remove_", (r) => `Убрали программу: ${programById[r]?.name ?? r}`],
  ["extra_add_", (r) => `Выбрали доп: ${extraById[r]?.name ?? r}`],
  ["costume_add_", (r) => `Выбрали героя: ${costumeById[r]?.name ?? r}`],
  ["package_add_", (r) => `Выбрали пакет: ${packageById[r]?.name ?? r}`],
  ["package_slot_", (r) => `Пакет: меняют вариант в «${packageById[r]?.name ?? r}»`],
  ["cart_remove_", (r) => `Корзина: убрали «${anyName(r)}»`],
  ["cart_empty_", (r) => `Пустая корзина: ${pageLabel(`/${r}`)}`],
  ["hero_age_", (r) => `Главная: возраст ${ageName(r)}`],
  ["home_kind_", (r) => `Главная: раздел «${KINDS.find((k) => k.slug === r)?.title ?? r}»`],
  ["builder_next_", (r) => `Конструктор: «Дальше» с шага ${r}`],
  ["pakety_step_", (r) => `Пакеты: шаг ${r}`],
  ["faq_", (r) => `Вопрос: «${r}…»`],
  ["lead_ok_", (r) => `После заявки: ${r === "wa" ? "WhatsApp" : r === "tg" ? "Telegram" : r}`],
  ["lead_fail_", (r) => `Ошибка заявки: ${r === "wa" ? "WhatsApp" : r === "tg" ? "Telegram" : r}`],
];

const NAV_LABEL: Record<string, string> = {
  "/sobrat": "Собрать праздник",
  "/pakety": "Пакеты",
  "/kostyumy": "Костюмы",
  "/#otzyvy": "Отзывы",
  "/#kontakty": "Контакты",
};

function anyName(id: string) {
  return programById[id]?.name ?? extraById[id]?.name ?? packageById[id]?.name ?? costumeById[id]?.name ?? id;
}

export function clickLabel(el: string) {
  if (CLICK_EXACT[el]) return CLICK_EXACT[el];
  for (const [p, f] of CLICK_PREFIX) if (el.startsWith(p)) return f(el.slice(p.length));
  return el;
}

/** cart_add как «нажатие»: «Выбрали героя: Эльза». */
export function addLabel(type: string, id: string) {
  const what = { program: "программу", extra: "доп", package: "пакет", costume: "героя" }[type] ?? type;
  return `Выбрали ${what}: ${itemName(type, id)}`;
}

const STEP_NAMES: Record<string, string> = { "1": "Возраст", "2": "Программа", "3": "Шоу", "4": "Допы", "5": "Готово" };

export function stepLabel(step: string) {
  return STEP_NAMES[step] ? `${step}. ${STEP_NAMES[step]}` : `Шаг ${step}`;
}

export function ageLabel(age: string) {
  return age === "skip" ? "Пропустили" : ageName(age);
}

const HOSTS: [RegExp, string][] = [
  [/(^|\.)yandex\.|(^|\.)ya\.ru$|dzen\.ru$/, "Яндекс"],
  [/(^|\.)google\./, "Google"],
  [/(^|\.)t\.me$|telegram\.(org|me)$/, "Telegram"],
  [/instagram\.com$/, "Instagram"],
  [/(^|\.)vk\.(com|ru)$/, "ВКонтакте"],
  [/avito\.ru$/, "Авито"],
  [/whatsapp\.com$|wa\.me$/, "WhatsApp"],
  [/(^|\.)mail\.ru$/, "Mail.ru"],
  [/bing\.com$/, "Bing"],
];

export function sourceLabel(ref: string | null, utm: string | null) {
  if (utm) return `Метка: ${utm}`;
  if (!ref) return "Прямые заходы";
  for (const [re, name] of HOSTS) if (re.test(ref)) return name;
  return ref;
}

const CONTACTS: Record<string, string> = {
  phone: "Позвонили",
  whatsapp: "Написали в WhatsApp",
  telegram: "Написали в Telegram",
  tg_channel: "Открыли Telegram-канал",
  instagram: "Открыли Instagram",
};

export function contactLabel(via: string) {
  return CONTACTS[via] ?? via;
}

const DEVICES: Record<string, string> = {
  mobile: "Телефоны",
  tablet: "Планшеты",
  desktop: "Компьютеры",
};

export function deviceLabel(d: string | null) {
  return d ? (DEVICES[d] ?? d) : "Неизвестно";
}
