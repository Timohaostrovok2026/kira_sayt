// Миграция черновика Кирилла v11 меняет цены и состав пакетов в боевой базе — проверяем, что точечно.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MIGRATIONS, type ContentSnapshot } from "./migrations.ts";
import { SITE_SEED } from "./site.ts";
import type { Extra, Package, Program } from "./catalog.ts";

const prog = (id: string, extra: Partial<Program> = {}): Program => ({
  id, name: id, kind: "Анимация", group: "", a: 1, b: 8, price: 1000, dur: "", art: "", how: "", inc: "старое", ...extra,
});
const ex = (id: string, extra: Partial<Extra> = {}): Extra => ({ id, name: id, kind: "Опция", group: "Опции и услуги", price: 100, ...extra });
const pk = (id: string, extra: Partial<Package> = {}): Package => ({
  id, name: id, tag: "", disc: 10, items: [], override: null, custom: false, note: "", ...extra,
});

function snapshot(): ContentSnapshot {
  return {
    programs: [prog("p_anim", { price: 8900 }), prog("p_halloween"), prog("p_ded")],
    extras: [ex("e_ice", { price: 17900 }), ex("e_aqua", { price: 100 }), ex("e_snow"), ex("e_coord", { price: 7000 }), ex("xmvlk0qi0")],
    packages: [
      pk("k_start", { name: "Улыбка «х2»", tag: "Анимация, VIP-костюм, пузыри.", items: [{ ref: "xmvlk0qi0", qty: 1 }, { ref: "e_vip", qty: 1 }] }),
      pk("k_all", { items: [{ ref: "e_cryo30", qty: 1 }] }),
    ],
    site: { ...structuredClone(SITE_SEED), reviews: [{ name: "Антон П.", date: "21 сентября", text: "Спасибо", source: "Яндекс Карты" }] },
  };
}

const v11 = MIGRATIONS.find((m) => m.id === "2026-11-02-kirill-v11")!;

test("v11: скрывает Хэллоуин и бывшие допы, а не удаляет", () => {
  const out = v11.apply(snapshot());
  assert.equal(out.programs!.length, 3);
  assert.equal(out.programs!.find((p) => p.id === "p_halloween")!.hidden, true);
  assert.equal(out.extras!.find((e) => e.id === "e_snow")!.hidden, true);
  assert.equal(out.extras!.find((e) => e.id === "xmvlk0qi0")!.hidden, true);
  assert.equal(out.extras!.find((e) => e.id === "e_coord")!.hidden, undefined);
});

test("v11: меняет только перечисленные цены", () => {
  const out = v11.apply(snapshot());
  assert.equal(out.extras!.find((e) => e.id === "e_ice")!.price, 21900);
  assert.equal(out.extras!.find((e) => e.id === "e_aqua")!.price, 500);
  assert.equal(out.extras!.find((e) => e.id === "e_coord")!.price, 7000);
  assert.equal(out.programs!.find((p) => p.id === "p_anim")!.price, 8900);
  assert.match(out.programs!.find((p) => p.id === "p_ded")!.inc, /Снежный фокус от Дедушки Мороза: доплата 2 000 ₽/);
});

test("v11: «Счастье» без VIP, «Подарок» со слотом шоу", () => {
  const out = v11.apply(snapshot());
  const happy = out.packages!.find((k) => k.id === "k_start")!;
  assert.equal(happy.name, "Счастье");
  assert.ok(!happy.items.some((it) => it.ref === "e_vip"));
  assert.ok(!/VIP/.test(happy.tag));
  const gift = out.packages!.find((k) => k.id === "k_all")!;
  assert.deepEqual(gift.items[1], { ref: "e_cryo45", qty: 1, alts: ["e_cryo30", "e_soap", "e_paper"] });
});

test("v11: отзывы Яндекса остаются, Профи.ру не задваиваются при повторе", () => {
  const once = v11.apply(snapshot());
  const twice = v11.apply({ ...snapshot(), site: once.site! });
  const yandex = twice.site!.reviews.filter((r) => r.source === "Яндекс Карты");
  const profi = twice.site!.reviews.filter((r) => r.source === "Профи.ру");
  assert.equal(yandex.length, 1);
  assert.equal(profi.length, 10);
  assert.equal(twice.site!.gallery.length, 29);
});

const answers = MIGRATIONS.find((m) => m.id === "2026-11-03-kirill-answers")!;

test("03.11: текст «Счастья» и «100+ костюмов», остальное не трогает", () => {
  const snap = snapshot();
  snap.programs[0] = prog("p_anim", { inc: "Любой персонаж из 200+ костюмов\nИнтерактив" });
  const out = answers.apply(snap);
  assert.match(out.packages!.find((k) => k.id === "k_start")!.tag, /^Счастье в двойном размере/);
  assert.equal(out.packages!.find((k) => k.id === "k_all")!.items[0].ref, "e_cryo30");
  assert.equal(out.programs!.find((p) => p.id === "p_anim")!.inc, "Любой персонаж из 100+ костюмов\nИнтерактив");
  assert.equal(out.programs!.find((p) => p.id === "p_ded")!.inc, "старое");
  assert.equal(out.extras, undefined);
  assert.equal(out.site, undefined);
});

const answers2 = MIGRATIONS.find((m) => m.id === "2026-11-03-kirill-answers-2")!;

test("03.11 вечер: фотограф, возраст «от», числа выезда в вопросе — и больше ничего", () => {
  const snap = snapshot();
  snap.programs.push(prog("p_grinch1", { a: 5, b: 16 }), prog("p_letter", { a: 1, b: 10 }));
  snap.extras.push(ex("e_photo1", { price: 8900 }), ex("e_photo2", { price: 17500 }), ex("e_reels1", { price: 7900 }));
  // Ответ с правкой Кирилла: меняются только числа.
  snap.site.faq = [{ q: "Сколько стоит выезд за МКАД?", a: "Выезд за МКАД стоит 1 500 ₽ плюс 100 ₽ за каждый километр. Своя правка." }, { q: "Другое", a: "1 500 ₽" }];
  const out = answers2.apply(snap);
  const pr = (id: string) => out.programs!.find((p) => p.id === id)!;
  const xp = (id: string) => out.extras!.find((e) => e.id === id)!.price;
  assert.deepEqual([pr("p_grinch1").a, pr("p_grinch1").b, pr("p_letter").a, pr("p_letter").b], [5, null, 1, null]);
  assert.deepEqual([pr("p_anim").a, pr("p_anim").b], [1, 8], "чужие возрасты не трогаем");
  assert.deepEqual([xp("e_photo1"), xp("e_photo2"), xp("e_reels1"), xp("e_ice")], [9000, 17000, 7900, 17900]);
  assert.equal(out.site!.faq[0].a, "Выезд за МКАД стоит 2 000 ₽ плюс 150 ₽ за каждый километр. Своя правка.");
  assert.equal(out.site!.faq[1].a, "1 500 ₽");
  assert.equal(out.packages, undefined);
});

const nyMig = MIGRATIONS.find((m) => m.id === "2026-11-03-ny-date-prices")!;

test("новогодние цены: таблица и price = минимум; Дед Мороз — «30 минут или 1 час»", () => {
  const c = snapshot();
  c.programs = [
    prog("p_ded", { price: 11900, dur: "30 минут (программа на 1 час: цена в личном чате)" }),
    prog("p_letter", { price: 10900 }),
    prog("p_grinch1", { price: 12900 }),
    prog("p_grinch2", { price: 34900 }),
    prog("p_yaga", { price: 9900 }),
    prog("p_video", { price: 3900 }),
  ];
  const out = nyMig.apply(c).programs!;
  const by = Object.fromEntries(out.map((p) => [p.id, p]));
  assert.deepEqual(["p_ded", "p_letter", "p_grinch1", "p_grinch2", "p_yaga"].map((id) => by[id].price), [11000, 11000, 14300, 40300, 9900]);
  assert.ok(by.p_ded.datePrices!.startsWith("Даты | Стандарт | Премиум"), "у Деда Мороза — цены на 30 минут, 1 час сайт считает сам");
  assert.equal(by.p_ded.dur, "30 минут или 1 час");
  assert.deepEqual(by.p_video, c.programs[5], "видео-поздравление не тронуто");
  assert.equal(by.p_grinch1.inc, "старое", "остальные поля не тронуты");
});

test("новогодние цены: таблицу, вписанную Кириллом, и его длительность не перетираем; повтор ничего не меняет", () => {
  const c = snapshot();
  c.programs = [prog("p_ded", { price: 12000, dur: "30 минут", datePrices: "Даты | Цена\n1.12–31.12 | 12 000" }), prog("p_yaga")];
  const once = { ...c, ...nyMig.apply(c) };
  assert.deepEqual(once.programs[0], c.programs[0]);
  assert.deepEqual({ ...once, ...nyMig.apply(structuredClone(once)) }, once);
});
