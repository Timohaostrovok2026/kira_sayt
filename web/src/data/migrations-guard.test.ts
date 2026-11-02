// Миграция v11 на настоящем начальном каталоге: повтор ничего не меняет, лишнего не трогает, id на месте.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CatalogData } from "./catalog.ts";
import { MIGRATIONS, type ContentSnapshot } from "./migrations.ts";
import { SITE_SEED } from "./site.ts";

const seed = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8")) as CatalogData;
const v11 = MIGRATIONS.find((m) => m.id === "2026-11-02-kirill-v11")!;

function snap(): ContentSnapshot {
  const site = structuredClone(SITE_SEED);
  // Фото, которое Кирилл загрузил в админке до выкладки.
  site.gallery = [...site.gallery, { src: "/media/gallery/kirill1.webp", alt: "Праздник" }];
  return structuredClone({ programs: seed.programs, extras: seed.extras, packages: seed.packages, site });
}
const run = (c: ContentSnapshot) => ({ ...c, ...v11.apply(c) });

test("второй прогон ничего не меняет", () => {
  const once = run(snap());
  assert.deepEqual(run(structuredClone(once)), once);
});

test("id и порядок позиций неизменны, ничего не удалено", () => {
  const before = snap();
  const after = run(snap());
  for (const k of ["programs", "extras", "packages"] as const) {
    assert.deepEqual(after[k].map((x) => x.id), before[k].map((x) => x.id), k);
  }
});

test("позиции вне списка миграции не тронуты", () => {
  const before = snap();
  const after = run(snap());
  const touched = new Set([
    "p_halloween", "p_ded", "p_grinch1", "p_yaga",
    "e_scary", "e_shake", "e_stories", "e_mk_pumpkin", "e_mk_slime", "e_grim", "e_snow", "e_time30", "e_time60", "xmvlk0qi0",
    "e_ice", "e_neon", "e_vip", "e_aqua", "k_all", "k_start",
  ]);
  for (const k of ["programs", "extras", "packages"] as const) {
    before[k].forEach((x, i) => {
      if (!touched.has(x.id)) assert.deepEqual(after[k][i], x, x.id);
    });
  }
  // У изменённых — только перечисленные поля: цена Деда Мороза и скидка «Подарка» прежние.
  const ded = (c: ContentSnapshot) => c.programs.find((p) => p.id === "p_ded")!;
  assert.deepEqual({ ...ded(after), inc: "" }, { ...ded(before), inc: "" });
  const gift = (c: ContentSnapshot) => c.packages.find((p) => p.id === "k_all")!;
  assert.deepEqual({ ...gift(after), items: [] }, { ...gift(before), items: [] });
});

test("фото, загруженные Кириллом в админке, не теряются", () => {
  const after = run(snap());
  assert.ok(after.site.gallery.some((g) => g.src === "/media/gallery/kirill1.webp"));
});

test("контакты и прочие тексты сайта не тронуты", () => {
  const before = snap();
  const after = run(snap());
  const { stats, steps, faq, gallery, reviews, ...restAfter } = after.site;
  const { stats: s0, steps: st0, faq: f0, gallery: g0, reviews: r0, ...restBefore } = before.site;
  void [stats, steps, faq, gallery, reviews, s0, st0, f0, g0, r0];
  assert.deepEqual(restAfter, restBefore);
});
