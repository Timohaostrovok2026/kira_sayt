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
  childAge: "", date: "", place: "", name: "", phone: "", note: "", outsideMkad: false, km: 0, sound: false, soundAuto: false, ...f,
});
const cart = (s: Partial<CartState>): CartState => ({ programs: [], extras: {}, packages: [], costumes: [], form: form(), ...s });

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
