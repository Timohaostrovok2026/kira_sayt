// Дыры, найденные code-breaker 03.11 (мутации в новогодних ценах): каждый тест падает на своей мутации.
import { test } from "node:test";
import assert from "node:assert/strict";
import { priceFor, type PriceTable } from "./date-prices.ts";
import { NY_DATE_PRICES } from "./migrations.ts";
import { buildCatalog, programTable, type Program } from "./catalog.ts";
import { buildLines, linesApprox, type CartLine, type CartState } from "./cart-lines.ts";
import { restoreCart } from "./cart-restore.ts";

const ded = programTable("p_ded", NY_DATE_PRICES.p_ded) as PriceTable;
const S60 = "Стандарт, 1 час";
const P60 = "Премиум, 1 час";

const ny = (id: string, hidden = false): Program => ({
  id, name: `Программа ${id}`, kind: "Новый год", group: "", a: 1, b: 8, price: 1, dur: "", art: "", how: "", inc: "", hidden, datePrices: NY_DATE_PRICES[id],
});
const cat = (hiddenDed = false) =>
  buildCatalog({ programs: [ny("p_ded", hiddenDed), ny("p_letter"), ny("p_grinch1")], extras: [], packages: [], costumes: [], costumeCats: [] });
const form = (f: Partial<CartState["form"]> = {}): CartState["form"] => ({
  childAge: "", date: "", place: "", name: "", phone: "", note: "", outsideMkad: false, km: 0, sound: false, soundAuto: false, outdoor: false, ...f,
});
const cart = (s: Partial<CartState>): CartState => ({ programs: [], extras: {}, packages: [], costumes: [], programOpts: {}, form: form(), ...s });

test("31.12 без времени, Премиум 1 час — «от» по столбцу 1 часа, а не по 30 минутам", () => {
  assert.equal(priceFor(ded, { date: "2026-12-31", col: P60 }).price, 46000);
});

// НАСТОЯЩАЯ ОШИБКА (падает на коде 48c9bbc): Стандарта 31.12 нет, «от» берётся по всем столбцам —
// клиент выбрал 1 час, а видит «Премиум, 30 мин · от 28 750», хотя каждое окно в списке — по цене 1 часа (46 000+).
test("31.12 без времени, Стандарт 1 час — замена на Премиум той же длительности, как при выбранном окне", () => {
  const r = priceFor(ded, { date: "2026-12-31", col: S60 });
  assert.equal(ded.cols[r.col], P60);
  assert.equal(r.price, 46000);
  assert.equal(r.price, Math.min(...r.windows.map((w) => priceFor(ded, { date: "2026-12-31", col: S60, slot: w.label }).price)));
});

test("цены в списке окон — по каждому окну, а не по выбранному", () => {
  const [l] = buildLines(cart({ programs: ["p_ded"], programOpts: { p_ded: { col: "Премиум, 30 мин" } }, form: form({ date: "2026-12-31" }) }), cat());
  assert.deepEqual(l.dated!.windowPrices, [28750, 32200, 34500, 39100, 71300, 57500]);
});

test("письма: 0 из памяти браузера — 1 письмо в подписи и в выборе", () => {
  const [l] = buildLines(cart({ programs: ["p_letter"], programOpts: { p_letter: { qty: 0 } }, form: form({ date: "2026-12-10" }) }), cat());
  assert.equal(l.dated!.letters, 1);
  assert.equal(l.subtitle, "1 письмо");
});

test("на улице: скрытая программа из старой корзины не добавляет доплату", () => {
  const ls = buildLines(cart({ programs: ["p_ded", "p_grinch1"], form: form({ outdoor: true, date: "2026-12-10" }) }), cat(true));
  assert.equal(ls.find((l) => l.type === "outdoor")!.price, 2000);
});

test("итог «от» — если хотя бы одна строка «от», а не все", () => {
  const exact: CartLine = { key: "a", type: "program", id: "a", title: "a", qty: 1, price: 100 };
  const from: CartLine = { ...exact, key: "b", mode: "from" };
  assert.deepEqual(linesApprox([exact, from]), { from: true, manager: false });
});

test("выбор из памяти браузера: дробное и нулевое число писем — выкидываем, больше 100 — 100, длинное окно режем", () => {
  const empty = { programs: [] as string[], extras: {}, packages: [], costumes: [], programOpts: {} as Record<string, { col?: string; slot?: string; qty?: number }> };
  const r = restoreCart({ programOpts: { a: { qty: 2.5 }, b: { qty: 0 }, c: { qty: 1000 }, d: { slot: "x".repeat(100) } } }, empty);
  assert.deepEqual(r.programOpts, { a: {}, b: {}, c: { qty: 100 }, d: { slot: "x".repeat(40) } });
});
