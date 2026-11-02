/**
 * Разовые правки контента в базе. Контент живёт в базе (правки Кирилла в админке),
 * поэтому новое от Кирилла, пришедшее не через админку, приезжает сюда миграцией:
 * каждая применяется один раз (отметка в content_migrations), прошлые значения уходят в content_history.
 * Правки точечные: меняем только перечисленные поля перечисленных позиций, остальное не трогаем.
 */
import type { CatalogData, Extra, Package, Program } from "./catalog.ts";
import { FAQ_V11, LIVE_GALLERY, PROFI_REVIEWS, STATS_V11, STEPS_V11, type SiteContent } from "./site.ts";

export type ContentSnapshot = Pick<CatalogData, "programs" | "extras" | "packages"> & { site: SiteContent };

export interface Migration {
  id: string;
  apply: (c: ContentSnapshot) => Partial<ContentSnapshot>;
}

const patch = <T extends { id: string }>(list: T[], id: string, f: (x: T) => T) => list.map((x) => (x.id === id ? f(x) : x));
const hide = <T extends { id: string; hidden?: boolean }>(list: T[], ids: string[]) =>
  list.map((x) => (ids.includes(x.id) ? { ...x, hidden: true } : x));

/** Черновик Кирилла, версия 11 (02.11.2026): docs/_reviews/2026-11-02_kirill-v11.md. */
const kirillV11: Migration = {
  id: "2026-11-02-kirill-v11",
  apply(c) {
    let programs: Program[] = c.programs;
    let extras: Extra[] = c.extras;
    let packages: Package[] = c.packages;

    // Хэллоуин убран полностью (программа и допы). Скрываем, а не удаляем: id неизменны.
    programs = hide(programs, ["p_halloween"]);
    extras = hide(extras, ["e_scary", "e_shake", "e_stories", "e_mk_pumpkin", "e_mk_slime", "e_grim"]);
    // Снежный фокус и доп. время — теперь строки в составе программ, а не кнопки в допах.
    // Тематическая анимация — только внутри пакетов, отдельно в допах не показываем.
    extras = hide(extras, ["e_snow", "e_time30", "e_time60", "xmvlk0qi0"]);

    const inc: Record<string, string> = {
      p_ded:
        "Артисты, а не аниматоры: театральная подача и голос\nГерои не выходят из образа весь праздник\nАвторский сценарий без случайностей\nПриезжаем заранее: праздник начнётся без спешки\nКостюмы на выбор: Стандарт или Премиум\nПремиум: натуральные борода, брови и усы, премиальный реквизит, авторский плей-лист\nСнежный фокус от Дедушки Мороза: доплата 2 000 ₽",
      p_grinch1:
        "Формат «Противный»: больше дерзости, пакостей и комичных ситуаций\nФормат «Позитивный»: больше дружелюбия, совместных игр и общения\nАвторская музыка\nВесёлые задания и конкурсы\nФото с Гринчем\nДополнительное время: +30 минут 7 000 ₽, +1 час 12 000 ₽",
      p_yaga:
        "Баба Яга в образе\nПодвижные игры, эстафеты и шуточные испытания\nМузыкальные интерактивы\nПоиск подсказок, загадки\nПоздравления, подарки и общие фото\nДополнительное время: +30 минут 7 000 ₽, +1 час 12 000 ₽",
    };
    for (const [id, text] of Object.entries(inc)) programs = patch(programs, id, (p) => ({ ...p, inc: text }));

    const price: Record<string, number> = { e_ice: 21900, e_neon: 37900, e_vip: 2500 };
    for (const [id, v] of Object.entries(price)) extras = patch(extras, id, (e) => ({ ...e, price: v }));
    extras = patch(extras, "e_aqua", (e) => ({
      ...e,
      price: 500,
      how: "Аквагрим на ваше мероприятие\n1 ребёнок + 500₽ к основной программе",
      inc: "Аквагрим для каждого желающего\n1 ребёнок + 500₽ к основной программе",
    }));

    // «Подарок»: шоу на выбор (крио 45 мин по умолчанию, крио 30, пузыри или бумажное).
    packages = patch(packages, "k_all", (k) => ({
      ...k,
      items: [
        { ref: "xmvlk0qi0", qty: 1 },
        { ref: "e_cryo45", qty: 1, alts: ["e_cryo30", "e_soap", "e_paper"] },
        { ref: "e_reels1", qty: 1 },
        { ref: "e_ball", qty: 1 },
      ],
    }));
    // «Улыбка х2» → «Счастье», без VIP-костюма (VIP на сайте не выделяем — AGENTS.md §1.5).
    packages = patch(packages, "k_start", (k) => ({
      ...k,
      name: "Счастье",
      tag: k.tag.replace("VIP-костюм, ", ""),
      items: k.items.filter((it) => it.ref !== "e_vip"),
    }));

    const site: SiteContent = {
      ...c.site,
      stats: STATS_V11,
      steps: STEPS_V11,
      faq: FAQ_V11,
      // Фото, загруженные Кириллом в админке (/media/...), не теряем — ставим после ленты черновика.
      gallery: [...LIVE_GALLERY, ...c.site.gallery.filter((g) => g.src.startsWith("/media/"))],
      // Отзывы с Яндекса — как были (их правят в админке), Профи.ру — добавляем, если ещё нет.
      reviews: [...c.site.reviews.filter((r) => r.source !== "Профи.ру"), ...PROFI_REVIEWS],
    };
    return { programs, extras, packages, site };
  },
};

/** Ответы Кирилла 03.11: текст «Счастья», костюмов «больше 100» (их 170+, сфотографированы не все). */
const kirillAnswers1103: Migration = {
  id: "2026-11-03-kirill-answers",
  apply(c) {
    const packages = patch(c.packages, "k_start", (k) => ({
      ...k,
      tag: "Счастье в двойном размере: всё для яркого праздника в одном пакете со скидкой 20%. Любимый герой приходит на праздник, играет с детьми, показывает фокусы и пускает мыльные пузыри. В конце гостей ждёт шар-сюрприз с морем шариков и конфетти. Всё продумано заранее, вам остаётся только наслаждаться праздником и улыбками детей.",
    }));
    // Только «200+» → «100+»: остальной текст состава мог править Кирилл.
    const programs = c.programs.map((p) => (p.inc.includes("200+") ? { ...p, inc: p.inc.replaceAll("200+", "100+") } : p));
    return { programs, packages };
  },
};

export const MIGRATIONS: Migration[] = [kirillV11, kirillAnswers1103];
