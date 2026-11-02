// Битая корзина в памяти браузера не должна ронять сайт у клиента.
import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreCart } from "./cart-restore.ts";

const EMPTY = {
  programs: [] as string[],
  extras: {} as Record<string, number>,
  packages: [] as { id: string; choices: Record<number, string> }[],
  costumes: [] as string[],
  form: { name: "", km: 0, sound: false },
};

test("целая корзина восстанавливается как была", () => {
  const saved = {
    programs: ["p_anim"],
    extras: { e_bubbles: 2 },
    packages: [{ id: "k_1", choices: { 0: "p_x" } }],
    costumes: ["c_1"],
    form: { name: "Аня", km: 5, sound: true },
  };
  assert.deepEqual(restoreCart(saved, EMPTY), saved);
});

test("мусор вместо корзины — пустая корзина", () => {
  for (const junk of [null, 42, "x", [], undefined]) assert.deepEqual(restoreCart(junk, EMPTY), EMPTY);
});

test("поля не того типа заменяются пустыми", () => {
  const r = restoreCart({ programs: null, extras: [], packages: "x", costumes: {}, form: null }, EMPTY);
  assert.deepEqual(r, EMPTY);
});

test("из списков выкидываются чужие элементы, в форме — поля не того типа", () => {
  const r = restoreCart(
    {
      programs: ["p_anim", 5, null],
      extras: { a: 1, b: -1, c: "2", d: 1.5 },
      packages: [{ id: "k_1", choices: {} }, { id: 3 }, null, { id: "k_2" }],
      costumes: [],
      form: { name: 7, km: "10", sound: true, extra: "x" },
    },
    EMPTY,
  );
  assert.deepEqual(r.programs, ["p_anim"]);
  assert.deepEqual(r.extras, { a: 1 });
  assert.deepEqual(r.packages, [{ id: "k_1", choices: {} }]);
  assert.deepEqual(r.form, { name: "", km: 0, sound: true });
});
