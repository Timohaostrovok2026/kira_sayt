/**
 * Разовые правки контента в базе. Контент живёт в базе (правки Кирилла в админке),
 * поэтому новое от Кирилла, пришедшее не через админку, приезжает сюда миграцией:
 * каждая применяется один раз (отметка в content_migrations), прошлые значения уходят в content_history.
 * Правки точечные: меняем только перечисленные поля перечисленных позиций, остальное не трогаем.
 */
import type { CatalogData, Extra, Package, Program } from "./catalog.ts";
import { parseDatePrices, tableMin } from "./date-prices.ts";
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

/** Ответы Кирилла 03.11 вечером (раунд 30): фотограф и выезд за МКАД — как в презентациях, возраст новогодних программ. */
const kirillAnswers1103b: Migration = {
  id: "2026-11-03-kirill-answers-2",
  apply(c) {
    let extras: Extra[] = c.extras;
    const price: Record<string, number> = { e_photo1: 9000, e_photo15: 13000, e_photo2: 17000 };
    for (const [id, v] of Object.entries(price)) extras = patch(extras, id, (e) => ({ ...e, price: v }));
    // «5 и старше», «1 и старше» — без верхней границы.
    let programs: Program[] = c.programs;
    const from: Record<string, number> = { p_grinch1: 5, p_yaga: 5, p_letter: 1 };
    for (const [id, a] of Object.entries(from)) programs = patch(programs, id, (p) => ({ ...p, a, b: null }));
    // Цена выезда в вопросах — только сами числа: остальной текст ответа мог править Кирилл.
    const faq = c.site.faq.map((f) => (f.a.includes("1 500 ₽ плюс 100 ₽") ? { ...f, a: f.a.replace("1 500 ₽ плюс 100 ₽", "2 000 ₽ плюс 150 ₽") } : f));
    return { programs, extras, site: { ...c.site, faq } };
  },
};

/** Общие условия презентаций Кирилла (раунды 30–33). */
const PARKING = "Парковку оплачивает заказчик.\nДля артистов нужно удобное место, чтобы переодеться.";
const OUTSIDE = "Праздник на улице зимой — +2 000 ₽ за каждый начатый час на каждого артиста (переключатель в заявке).";

/**
 * Цены по датам из презентаций Кирилла (вариант А, раунды 29–33). У Деда Мороза — цены на 30 минут; 1 час сайт считает сам (LONGER в catalog.ts).
 * Окна 31.12 — до начала следующего (ответ 14), у Гринча и Бабы Яги — с 07:00 (ответ 16).
 */
export const NY_DATE_PRICES: Record<string, string> = {
  p_ded: `Даты | Стандарт | Премиум
1.12–13.12 | 11 000 | 16 100
14.12–18.12 | 13 200 | 20 700
19.12–22.12 | 16 500 | 25 300
23.12–27.12 | — | 27 600
28.12–30.12 | — | 29 900
31.12 06:00–12:59 | — | 28 750
31.12 13:00–15:59 | — | 32 200
31.12 16:00–18:59 | — | 34 500
31.12 19:00–22:59 | — | 39 100
31.12 23:00–00:59 | — | 71 300
31.12 01:00–04:00 | — | 57 500
2.01–7.01 | — | 19 550
Цены — за 30 минут. 1 час — +60% к цене 30 минут.
Стандарт — только до 22 декабря, дальше работает Премиум.
31 декабря цена зависит от времени приезда.
Другие даты — цену укажет менеджер.
С программой «Волшебное письмо» — скидка 15% на Деда Мороза и Снегурочку, её сделает менеджер.
${OUTSIDE}
${PARKING}`,
  p_letter: `Даты | До 2 писем
1.12–25.12 | 11 000
26.12–30.12 | 14 300
Одно письмо — один ребёнок. Каждое письмо сверх двух — +2 000 ₽.
31 декабря волшебная почта не работает — такой запрос менеджер согласует отдельно.
Другие даты — цену укажет менеджер.
С программой — скидка 15% на поздравление Деда Мороза и Снегурочки, её сделает менеджер.
${PARKING}`,
  p_grinch1: `Даты | Цена
1.12–20.12 | 14 300
21.12–25.12 | 17 600
26.12–30.12 | 19 800
31.12 07:00–17:59 | 26 400
31.12 18:00–22:59 | 34 100
31.12 23:00–00:59 | 57 200
31 декабря цена зависит от времени приезда.
Январь и другие даты — цену укажет менеджер.
${OUTSIDE}
${PARKING}`,
  p_grinch2: `Даты | Цена
1.12–17.12 | 40 300
18.12–22.12 | 44 200
23.12–25.12 | 53 300
26.12–28.12 | 58 500
29.12–30.12 | 66 300
31.12–3.01 | 72 800
Другие даты — цену укажет менеджер.
${OUTSIDE} В спектакле три артиста.
${PARKING}`,
  p_yaga: `Даты | Цена
1.12–20.12 | 9 900
21.12–25.12 | 14 300
26.12–30.12 | 16 500
31.12 07:00–17:59 | 22 000
31.12 18:00–22:59 | 27 500
31.12 23:00–00:59 | 57 200
31 декабря цена зависит от времени приезда.
Январь и другие даты — цену укажет менеджер.
${OUTSIDE}
${PARKING}`,
};

/** Новогодние цены по датам: таблица — только если её ещё нет (Кирилл мог вписать сам), price = минимум таблицы. */
const nyDatePrices: Migration = {
  id: "2026-11-03-ny-date-prices",
  apply(c) {
    let programs: Program[] = c.programs;
    for (const [id, text] of Object.entries(NY_DATE_PRICES)) {
      const t = parseDatePrices(text).table;
      if (!t) continue;
      programs = patch(programs, id, (p) => (p.datePrices?.trim() ? p : { ...p, datePrices: text, price: tableMin(t) }));
    }
    // Длительность Деда Мороза — без «цена в личном чате»: цена на 1 час теперь в таблице (раунд 30, п. 12). Только если текст прежний.
    programs = patch(programs, "p_ded", (p) => (p.dur === "30 минут (программа на 1 час: цена в личном чате)" ? { ...p, dur: "30 минут или 1 час" } : p));
    return { programs };
  },
};

export const MIGRATIONS: Migration[] = [kirillV11, kirillAnswers1103, kirillAnswers1103b, nyDatePrices];
