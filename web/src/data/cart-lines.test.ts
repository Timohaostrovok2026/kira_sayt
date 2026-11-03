// Строки корзины и итог — то, что клиент видит в корзине и что уходит менеджеру (ЦЕН-2, ЦЕН-3, ЦЕН-4, КОН-4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, type CatalogData, type Extra, type Package, type Program } from "./catalog.ts";
import { buildLines, linesCount, linesTotal, type CartState } from "./cart-lines.ts";

const prog = (id: string, price: number, hidden = false): Program => ({
  id, name: `Программа ${id}`, kind: "Анимация", group: "", a: 1, b: 8, price, dur: "", art: "", how: "", inc: "", hidden,
});
const ex = (id: string, price: number, hidden = false): Extra => ({ id, name: `Доп ${id}`, kind: "Шоу", group: "Шоу", price, hidden });
const pk = (id: string, extra: Partial<Package>): Package => ({
  id, name: id, tag: "", disc: null, items: [], override: null, custom: false, note: "", ...extra,
});
const cat = buildCatalog({
  programs: [prog("p1", 10000), prog("p_old", 9000, true)],
  extras: [ex("cryo", 16900), ex("paper", 24900), ex("ball", 5600), ex("e_old", 3000, true)],
  packages: [
    pk("gift", { disc: 15, items: [{ ref: "p1", qty: 1 }, { ref: "cryo", qty: 1, alts: ["paper"] }] }),
    pk("custom", { custom: true, items: [{ ref: "p1", qty: 1 }] }), // состав для примера — цена всё равно «обсудим»
    pk("gone", { hidden: true, items: [{ ref: "p1", qty: 1 }] }),
  ],
  costumes: [{ id: "h1", name: "Человек-паук", cat: "", t: "" }, { id: "h_old", name: "Старый", cat: "", t: "", hidden: true }],
  costumeCats: [],
} satisfies CatalogData);

const form = (f: Partial<CartState["form"]> = {}): CartState["form"] => ({
  childAge: "", date: "", place: "", name: "", phone: "", note: "", outsideMkad: false, km: 0, sound: false, soundAuto: false, outdoor: false, ...f,
});
const cart = (s: Partial<CartState>): CartState => ({ programs: [], extras: {}, packages: [], costumes: [], programOpts: {}, form: form(), ...s });

test("пакет со скидкой и выбранным вариантом: цена, полная цена и состав", () => {
  const [l] = buildLines(cart({ packages: [{ id: "gift", choices: { 1: "paper" } }] }), cat);
  // 10 000 + 24 900 = 34 900 −15% = 29 665 → 29 700
  assert.equal(l.price, 29700);
  assert.equal(l.fullPrice, 34900);
  assert.equal(l.subtitle, "Программа p1 + Доп paper");
  const [d] = buildLines(cart({ packages: [{ id: "gift", choices: { 1: "ball" } }] }), cat);
  assert.equal(d.price, 22900, "вариант не из списка слота — цена основного (крио)");
});

test("индивидуальный пакет — 0 ₽ и «Стоимость обсудим», без полной цены", () => {
  const [l] = buildLines(cart({ packages: [{ id: "custom", choices: {} }] }), cat);
  assert.equal(l.price, 0);
  assert.equal(l.fullPrice, undefined);
  assert.equal(l.subtitle, "Стоимость обсудим");
});

test("доп умножается на количество, 0 и меньше — строки нет", () => {
  const ls = buildLines(cart({ extras: { cryo: 2, ball: 0, paper: -1 } }), cat);
  assert.deepEqual(ls.map((l) => [l.id, l.qty, l.price]), [["cryo", 2, 33800]]);
});

test("выезд за МКАД: 2 000 + 150 ₽/км; отрицательные и пустые км — 0", () => {
  const mkad = (km: number) => buildLines(cart({ form: form({ outsideMkad: true, km }) }), cat)[0];
  assert.equal(mkad(0).price, 2000);
  assert.equal(mkad(12).price, 3800);
  assert.equal(mkad(-5).price, 2000);
  assert.equal(mkad(-5).subtitle, "0 км от МКАД");
  assert.equal(mkad(NaN).price, 2000);
  assert.equal(buildLines(cart({ form: form({ outsideMkad: false, km: 30 }) }), cat).length, 0, "галочка снята — км не считаются");
});

test("звук — 4 500 ₽", () => {
  assert.deepEqual(buildLines(cart({ form: form({ sound: true }) }), cat).map((l) => [l.type, l.price]), [["sound", 4500]]);
});

test("скрытые и удалённые позиции из старой корзины не попадают ни в строки, ни в итог, ни в счётчик", () => {
  const ls = buildLines(
    cart({
      programs: ["p1", "p_old", "p_deleted"],
      extras: { e_old: 1, e_deleted: 2 },
      packages: [{ id: "gone", choices: {} }],
      costumes: ["h1", "h_old"],
    }),
    cat,
  );
  assert.deepEqual(ls.map((l) => l.key), ["p:p1", "c:h1"]);
  assert.equal(linesTotal(ls), 10000);
  assert.equal(linesCount(ls), 2);
});

test("герой — без цены (ЦЕН-4); итог всей корзины; МКАД и звук не входят в счётчик позиций", () => {
  const ls = buildLines(
    cart({
      programs: ["p1"],
      extras: { ball: 3 },
      packages: [{ id: "gift", choices: {} }, { id: "custom", choices: {} }],
      costumes: ["h1"],
      form: form({ outsideMkad: true, km: 10, sound: true }),
    }),
    cat,
  );
  assert.equal(ls.find((l) => l.type === "costume")!.price, 0);
  // 10 000 + 22 900 (пакет) + 0 + 16 800 + 0 + 3 500 (МКАД 2 000 + 10 × 150) + 4 500
  assert.equal(linesTotal(ls), 57700);
  assert.equal(linesCount(ls), 5);
});

// ---------- Новогодние программы с ценами по датам (вариант А, раунды 29–33) ----------
import { NY_DATE_PRICES } from "./migrations.ts";
import { linesApprox } from "./cart-lines.ts";

const ny = (id: string): Program => ({ ...prog(id, 1), kind: "Новый год", datePrices: NY_DATE_PRICES[id] });
const nyCat = buildCatalog({
  programs: [ny("p_ded"), ny("p_letter"), ny("p_grinch1"), ny("p_grinch2"), ny("p_yaga"), prog("p1", 10000), { ...prog("p_bad", 5000), datePrices: "мусор" }],
  extras: [],
  packages: [],
  costumes: [],
  costumeCats: [],
} satisfies CatalogData);
const nyLine = (id: string, date: string, opts: CartState["programOpts"][string] = {}) =>
  buildLines(cart({ programs: [id], programOpts: { [id]: opts }, form: form({ date }) }), nyCat)[0];

test("Дед Мороз: точная цена по дате и варианту, подпись — вариант", () => {
  const l = nyLine("p_ded", "2026-12-28", { col: "Премиум, 1 час" });
  assert.deepEqual([l.price, l.mode, l.subtitle], [47900, undefined, "Премиум, 1 час"]);
});

test("без даты — «от» по варианту; итог помечен «от»", () => {
  const l = nyLine("p_ded", "");
  assert.deepEqual([l.price, l.mode, l.note], [11000, "from", "Цена зависит от даты"]);
  assert.deepEqual(linesApprox([l]), { from: true, manager: false });
});

test("Стандарт 24.12 → Премиум с подписью; выбор клиента не теряется", () => {
  const l = nyLine("p_ded", "2026-12-24", { col: "Стандарт, 30 мин" });
  assert.deepEqual([l.price, l.subtitle, l.note], [27600, "Премиум, 30 мин", "На эту дату — только Премиум"]);
  assert.equal(l.dated!.want, 0);
  assert.equal(l.dated!.col, 1);
});

test("31.12 с окном — цена окна, окно в подписи", () => {
  const l = nyLine("p_ded", "2026-12-31", { col: "Премиум, 30 мин", slot: "19:00–22:59" });
  assert.deepEqual([l.price, l.subtitle], [39100, "Премиум, 30 мин · 19:00–22:59"]);
  assert.equal(nyLine("p_grinch1", "2026-12-31", { slot: "23:00–00:59" }).price, 57200);
  assert.equal(nyLine("p_ded", "2026-12-31", { col: "Премиум, 30 мин", slot: "01:00–04:00" }).subtitle, "Премиум, 30 мин · ночь на 1 января, 01:00–04:00");
});

test("31.12 «другое время» — менеджер, в подписи «другое время», а не служебное значение", () => {
  const l = nyLine("p_yaga", "2026-12-31", { slot: "other" });
  assert.deepEqual([l.price, l.mode, l.subtitle], [0, "manager", "другое время"]);
});

test("дата вне таблицы — 0 и «укажет менеджер», не в «от»", () => {
  const l = nyLine("p_grinch1", "2027-01-05");
  assert.deepEqual([l.price, l.mode, l.note], [0, "manager", "Цену укажет менеджер"]);
  assert.deepEqual(linesApprox([l]), { from: false, manager: true });
});

test("письма: до 2 — цена по дате, каждое следующее +2 000; 31.12 — менеджер", () => {
  const p = (qty: unknown, date = "2026-12-10") => nyLine("p_letter", date, { qty: qty as number }).price;
  assert.deepEqual([p(1), p(2), p(3), p(5)], [11000, 11000, 13000, 17000]);
  assert.equal(p(4, "2026-12-27"), 18300);
  assert.equal(nyLine("p_letter", "2026-12-10", { qty: 3 }).subtitle, "3 письма");
  assert.equal(p(3, ""), 13000, "без даты — «от» тоже с письмами");
  assert.equal(nyLine("p_letter", "2026-12-31", { qty: 5 }).price, 0);
  assert.deepEqual([p(0), p(-3), p(2.5), p("7"), p(1000)], [11000, 11000, 11000, 11000, 11000 + 28 * 2000], "мусор — 1 письмо, больше 30 — 30");
});

test("битая таблица в базе — «укажет менеджер», сайт не падает", () => {
  const l = nyLine("p_bad", "2026-12-10");
  assert.deepEqual([l.price, l.mode], [0, "manager"]);
});

test("мусорный выбор из памяти браузера не ломает расчёт", () => {
  const l = nyLine("p_ded", "2026-12-10", { col: 5 as unknown as string, slot: {} as unknown as string });
  assert.equal(l.price, 11000);
});

test("на улице: только новогодние программы, сумма по программам; письмо и обычные не считаются", () => {
  const ls = buildLines(cart({ programs: ["p_ded", "p_grinch2", "p_letter", "p1"], form: form({ outdoor: true, date: "2026-12-10" }) }), nyCat);
  const o = ls.find((l) => l.type === "outdoor")!;
  assert.equal(o.price, 16000);
  assert.equal(linesCount(ls), 4, "улица — не позиция");
  assert.equal(buildLines(cart({ programs: ["p_letter", "p1"], form: form({ outdoor: true }) }), nyCat).some((l) => l.type === "outdoor"), false);
  assert.equal(buildLines(cart({ programs: ["p_yaga"], form: form({ outdoor: false }) }), nyCat).length, 1);
});

test("три примера суммы заявки вручную", () => {
  const total = (s: Partial<CartState>) => linesTotal(buildLines(cart(s), nyCat));
  // 1) Дед Мороз Премиум 1 час 20.12 + 3 письма 20.12 + выезд 10 км: 40 500 + 13 000 + 3 500 = 57 000
  assert.equal(total({ programs: ["p_ded", "p_letter"], programOpts: { p_ded: { col: "Премиум, 1 час" }, p_letter: { qty: 3 } }, form: form({ date: "2026-12-20", outsideMkad: true, km: 10 }) }), 57000);
  // 2) Гринч 31.12 18:00–22:59 + на улице + звук: 34 100 + 2 000 + 4 500 = 40 600
  assert.equal(total({ programs: ["p_grinch1"], programOpts: { p_grinch1: { slot: "18:00–22:59" } }, form: form({ date: "2026-12-31", outdoor: true, sound: true }) }), 40600);
  // 3) Спектакль 2.01 + Баба Яга 2.01 (вне таблицы — менеджер, 0) + на улице: 72 800 + 0 + 12 000 + 2 000 = 86 800
  assert.equal(total({ programs: ["p_grinch2", "p_yaga"], form: form({ date: "2027-01-02", outdoor: true }) }), 86800);
});
