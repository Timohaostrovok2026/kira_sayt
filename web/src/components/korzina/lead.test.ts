// Текст заявки — то, что видит менеджер: позиции, количество и суммы должны совпадать с корзиной.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { buildCatalog, type CatalogData, type Extra, type Package, type Program } from "../../data/catalog.ts";
import type { CartLine, CartState } from "../../lib/cart.tsx";

// lead.ts импортирует через «@/…» — node сам такие пути не понимает, подсказываем.
registerHooks({
  resolve(spec, ctx, next) {
    return next(spec.startsWith("@/") ? new URL(`../../${spec.slice(2)}.ts`, import.meta.url).href : spec, ctx);
  },
});
const lead = await import("./lead.ts");
const { phoneValid, formatPhone, needsLoudSound } = lead;
// Сумма в тексте — с неразрывными пробелами («10 000 ₽»), для проверки приводим к обычным.
const buildLeadText = (...a: Parameters<typeof lead.buildLeadText>) => lead.buildLeadText(...a).replace(/[\u00a0\u202f]/g, " ");

const prog = (id: string, price: number): Program => ({
  id, name: `Программа ${id}`, kind: "Анимация", group: "", a: 1, b: 8, price, dur: "", art: "", how: "", inc: "",
});
const ex = (id: string, price: number, unit: string): Extra => ({ id, name: `Доп ${id}`, kind: "Шоу", group: "Шоу", price, unit });
const pk = (id: string, extra: Partial<Package>): Package => ({
  id, name: id, tag: "", disc: null, items: [], override: null, custom: false, note: "", ...extra,
});
const data: CatalogData = {
  programs: [prog("p1", 10000)],
  extras: [ex("cryo", 16900, "за шоу"), ex("ball", 5600, "за 1 шт.")],
  packages: [pk("custom", { custom: true, name: "Индивидуальный" })],
  costumes: [],
  costumeCats: [],
};
const cat = buildCatalog(data);

const state = (form: Partial<CartState["form"]> = {}): CartState => ({
  programs: ["p1"],
  extras: { cryo: 2, ball: 3 },
  packages: [{ id: "custom", choices: {} }],
  costumes: [],
  programOpts: {},
  form: { childAge: "", date: "", place: "", name: "Анна", phone: "+7 (977) 593-97-39", note: "", outsideMkad: true, km: 0, sound: true, soundAuto: false, outdoor: false, ...form },
});
const lines: CartLine[] = [
  { key: "p:p1", type: "program", id: "p1", title: "Программа p1", qty: 1, price: 10000 },
  { key: "k:custom", type: "package", id: "custom", title: "Пакет «Индивидуальный»", subtitle: "Стоимость обсудим", qty: 1, price: 0 },
  { key: "x:cryo", type: "extra", id: "cryo", title: "Доп cryo", qty: 2, price: 33800 },
  { key: "x:ball", type: "extra", id: "ball", title: "Доп ball", qty: 3, price: 16800 },
  { key: "mkad", type: "mkad", id: "e_mkad", title: "Выезд за МКАД", qty: 1, price: 1500 },
  { key: "sound", type: "sound", id: "e_sound", title: "Усиленный звук", qty: 1, price: 4500 },
];
const total = lines.reduce((s, l) => s + l.price, 0);

test("суммы, МКАД 0 км = 1 500 ₽, звук 4 500 ₽, итог", () => {
  const t = buildLeadText(state(), lines, total, cat);
  assert.match(t, /• Программа p1 — 10 000 ₽/);
  assert.match(t, /• Пакет «Индивидуальный» — стоимость обсудим/);
  assert.match(t, /• Доп ball × 3 — 16 800 ₽/);
  assert.match(t, /Выезд за МКАД, 0 км — 1 500 ₽/);
  assert.match(t, /Усиленный звук — 4 500 ₽/);
  assert.match(t, /Итого ориентировочно: 66 600 ₽/);
  assert.match(t, /Телефон: \+7 \(977\) 593-97-39/);
});

test("отрицательные км из старой корзины в тексте — 0 км", () => {
  assert.match(buildLeadText(state({ km: -5 }), lines, total, cat), /Выезд за МКАД, 0 км/);
});

// НАСТОЯЩАЯ ОШИБКА (падает на текущем коде): с v11 «Добавить» у любого допа прибавляет штуку,
// а количество в тексте пишется только для «поштучных» (шт., ребёнка…). Два крио-шоу уходят менеджеру
// как «• Доп cryo — 33 800 ₽» — цена двойная, а позиция одна.
test("количество больше 1 видно у любого допа, не только поштучного", () => {
  assert.match(buildLeadText(state(), lines, total, cat), /• Доп cryo × 2 — 33 800 ₽/);
});

test("телефон: ровно 10 цифр без кода страны (ЗАЯ-1)", () => {
  assert.equal(phoneValid("+7 (977) 593-97-3"), false);
  assert.equal(phoneValid("977593973"), false);
  assert.equal(phoneValid("9775939739"), true);
  assert.equal(phoneValid("8 977 593 97 39"), true);
  assert.equal(phoneValid(""), false);
});

test("телефон с 8 в начале приводится к +7", () => {
  assert.equal(formatPhone("8 977 593 97 39"), "+7 (977) 593-97-39");
  assert.equal(formatPhone("+7 977 593 97 39"), "+7 (977) 593-97-39");
});

test("бумажное шоу в слоте пакета требует усиленный звук, крио — нет", () => {
  const c = buildCatalog({
    ...data,
    extras: [...data.extras, ex("e_paper", 24900, "за шоу"), ex("e_cryo45", 16900, "за шоу")],
    packages: [pk("gift", { items: [{ ref: "e_cryo45", qty: 1, alts: ["e_paper"] }] })],
  });
  const s = (choice?: string): CartState => ({ ...state(), extras: {}, packages: [{ id: "gift", choices: choice ? { 0: choice } : {} }] });
  assert.equal(needsLoudSound(s(), c), false);
  assert.equal(needsLoudSound(s("e_paper"), c), true);
  assert.equal(needsLoudSound({ ...state(), packages: [], extras: { e_paper: 1 } }, c), true);
});

test("новогодние позиции: вариант, время, письма, «от», «укажет менеджер», улица — в тексте для менеджера", async () => {
  const { NY_DATE_PRICES } = await import("../../data/migrations.ts");
  const { buildLines, linesTotal } = await import("../../data/cart-lines.ts");
  const ny = (id: string, name: string): Program => ({ ...prog(id, 1), name, kind: "Новый год", datePrices: NY_DATE_PRICES[id] });
  const c = buildCatalog({ programs: [ny("p_ded", "Дед Мороз"), ny("p_letter", "Письмо"), ny("p_grinch1", "Гринч")], extras: [], packages: [], costumes: [], costumeCats: [] });
  const s = (date: string): CartState => ({
    ...state({ outsideMkad: false, sound: false, outdoor: true, date }),
    programs: ["p_ded", "p_letter", "p_grinch1"],
    extras: {},
    packages: [],
    programOpts: { p_ded: { col: "Премиум, 30 мин", slot: "19:00–22:59" }, p_letter: { qty: 3 }, p_grinch1: { slot: "18:00–22:59" } },
  });
  const st = s("2026-12-31");
  const ls = buildLines(st, c);
  const text = buildLeadText(st, ls, linesTotal(ls), c);
  assert.match(text, /• Дед Мороз \(Премиум, 30 мин · 19:00–22:59\) — 39 100 ₽/);
  assert.match(text, /• Письмо \(3 письма\) — цену укажет менеджер/);
  assert.match(text, /• Гринч \(18:00–22:59\) — 34 100 ₽/);
  assert.match(text, /Праздник на улице \(Дед Мороз, Гринч\) — 6 000 ₽/);
  assert.match(text, /Итого ориентировочно: 79 200 ₽ \(цену части позиций укажет менеджер\)/);
  assert.match(text, /Дата: 31\.12\.2026/);
  const st2 = s("");
  const ls2 = buildLines(st2, c);
  const t2 = buildLeadText(st2, ls2, linesTotal(ls2), c);
  assert.match(t2, /• Дед Мороз \(Премиум, 30 мин\) — от 16 100 ₽, цена зависит от даты/);
  assert.match(t2, /Итого ориентировочно: от /);
});
