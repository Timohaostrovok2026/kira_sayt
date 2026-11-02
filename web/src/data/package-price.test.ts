// Цена пакетов на настоящем каталоге после миграции v11: суммы, которые клиент видит на сайте.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCatalog, calcPackagePrice, type CatalogData } from "./catalog.ts";
import { MIGRATIONS } from "./migrations.ts";
import { SITE_SEED } from "./site.ts";

const seed = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8")) as CatalogData;

/** Начальный каталог с применёнными миграциями — как в базе после выкладки. */
function migrated() {
  let c = { programs: seed.programs, extras: seed.extras, packages: seed.packages, site: structuredClone(SITE_SEED) };
  for (const m of MIGRATIONS) c = { ...c, ...m.apply(c) };
  return buildCatalog({ ...seed, programs: c.programs, extras: c.extras, packages: c.packages });
}

test("«Подарок» −15%: суммы по каждому шоу в слоте, округление до 100 ₽", () => {
  const cat = migrated();
  const gift = cat.packageById.k_all;
  // Скрытая «Тематическая анимация» остаётся в составе и в цене пакета.
  assert.ok(!cat.extraById.xmvlk0qi0);
  assert.deepEqual(cat.packagePrice(gift), { full: 39300, price: 33400, save: 5900 });
  assert.deepEqual(cat.packagePrice(gift, { 1: "e_cryo30" }), { full: 34300, price: 29200, save: 5100 });
  assert.deepEqual(cat.packagePrice(gift, { 1: "e_soap" }), { full: 40300, price: 34300, save: 6000 });
  assert.deepEqual(cat.packagePrice(gift, { 1: "e_paper" }), { full: 47300, price: 40200, save: 7100 });
});

test("вариант не из списка слота (старая корзина, подделка) — цена основного варианта", () => {
  const cat = migrated();
  const gift = cat.packageById.k_all;
  // e_neon — существующее шоу, но не вариант этого слота; e_ball — позиция из соседнего слота.
  assert.equal(cat.packagePrice(gift, { 1: "e_neon" }).price, 33400);
  assert.equal(cat.packagePrice(gift, { 1: "e_ball" }).price, 33400);
  assert.equal(cat.packagePrice(gift, { 0: "e_paper" }).price, 33400);
});

test("скрытые после v11 допы не видны в каталоге, но позиции не удалены", () => {
  const cat = migrated();
  for (const id of ["e_time30", "e_time60", "e_snow", "e_scary"]) {
    assert.ok(!cat.extraById[id], id);
    assert.ok(cat.all.extras.some((e) => e.id === id && e.hidden), id);
  }
  assert.ok(!cat.programById.p_halloween);
});

test("фиксированная цена пакета заменяет скидку, даже если та дала бы другую сумму", () => {
  const find = (id: string) => ({ a: { price: 30000 }, b: { price: 20000 } })[id];
  const k = { items: [{ ref: "a", qty: 1 }, { ref: "b", qty: 1 }], disc: 15, override: 39990 };
  assert.deepEqual(calcPackagePrice(k, find), { full: 50000, price: 39990, save: 10010 });
});

test("индивидуальный пакет — без позиций, цена 0", () => {
  const cat = migrated();
  const k = cat.packageById.k_custom;
  assert.equal(k.custom, true);
  assert.deepEqual(cat.packagePrice(k), { full: 0, price: 0, save: 0 });
});

// НАСТОЯЩАЯ ОШИБКА (падает на текущем коде): 5 500 × 0,7 в плавающей точке = 3 849,999… → 3 800 вместо 3 900.
// Сейчас скидки 10/15/20% не задеты, но Кирилл может поставить в админке 30–34% (или 6–7%).
test("ровно 50 ₽ округляется вверх при любой скидке (без ошибки плавающей точки)", () => {
  const find = (id: string) => ({ a: { price: 5500 }, b: { price: 10500 } })[id];
  assert.equal(calcPackagePrice({ items: [{ ref: "a", qty: 1 }], disc: 30, override: null }, find).price, 3900);
  assert.equal(calcPackagePrice({ items: [{ ref: "b", qty: 1 }], disc: 30, override: null }, find).price, 7400);
});
