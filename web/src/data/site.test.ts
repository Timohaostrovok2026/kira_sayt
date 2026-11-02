// Сезон переключает первый экран: новогодние герои — до 15 января включительно (Кирилл, 03.11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { currentSeason } from "./site.ts";

const on = (m: number, d: number) => currentSeason(new Date(2027, m - 1, d, 12));

test("Новый год: с 3 ноября до 15 января включительно", () => {
  assert.equal(on(11, 2), "halloween");
  assert.equal(on(11, 3), "newyear");
  assert.equal(on(12, 31), "newyear");
  assert.equal(on(1, 15), "newyear");
  assert.equal(on(1, 16), "birthday");
});

test("сезон меняется в полночь по Москве, а не по UTC сервера", () => {
  // 2 ноября 21:30 UTC = 3 ноября 00:30 МСК
  assert.equal(currentSeason(new Date(Date.UTC(2027, 10, 2, 21, 30))), "newyear");
  assert.equal(currentSeason(new Date(Date.UTC(2027, 10, 2, 20, 30))), "halloween");
});
