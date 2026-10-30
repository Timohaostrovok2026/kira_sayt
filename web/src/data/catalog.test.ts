// Цена пакета — деньги клиента, проверяем на примерах из журнала сессии 2026-10-29.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcPackagePrice, slotRef } from "./catalog.ts";

const prices: Record<string, number> = { a: 30000, b: 20000, paper: 9300, cryo: 1300 };
const find = (id: string) => (id in prices ? { price: prices[id] } : undefined);

test("скидка 10% округляется до сотни", () => {
  // «ВАУ!» с бумажным шоу: 59 300 → 53 400 ₽
  const k = { items: [{ ref: "a", qty: 1 }, { ref: "b", qty: 1 }, { ref: "paper", qty: 1, alts: ["cryo"] }], disc: 10, override: null };
  assert.deepEqual(calcPackagePrice(k, find), { full: 59300, price: 53400, save: 5900 });
  // То же с крио вместо бумажного: 51 300 → 46 200 ₽
  assert.deepEqual(calcPackagePrice(k, find, { 2: "cryo" }), { full: 51300, price: 46200, save: 5100 });
});

test("фиксированная цена важнее скидки", () => {
  const k = { items: [{ ref: "a", qty: 1 }, { ref: "b", qty: 1 }], disc: 10, override: 45000 };
  assert.deepEqual(calcPackagePrice(k, find), { full: 50000, price: 45000, save: 5000 });
});

test("количество умножает цену, неизвестная позиция не считается", () => {
  const k = { items: [{ ref: "b", qty: 2 }, { ref: "nope", qty: 1 }], disc: null, override: null };
  assert.deepEqual(calcPackagePrice(k, find), { full: 40000, price: 40000, save: 0 });
});

test("чужой вариант в выборе не подменяет позицию", () => {
  assert.equal(slotRef({ ref: "paper", qty: 1, alts: ["cryo"] }, "a"), "paper");
  assert.equal(slotRef({ ref: "paper", qty: 1, alts: ["cryo"] }, "cryo"), "cryo");
  assert.equal(slotRef({ ref: "paper", qty: 1 }), "paper");
});
