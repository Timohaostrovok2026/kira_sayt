// Возраст в конструкторе обязателен (раунд 24): любой вход ведёт на шаг 1, ответ — туда, куда шли.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANY_AGE, resolveStep } from "./model.ts";

test("без ответа на возраст — всегда шаг 1, даже по ?step= и ?kind=", () => {
  assert.deepEqual(resolveStep(null, null, false), { asked: false, step: 1, next: 2 });
  assert.deepEqual(resolveStep(null, "3", false), { asked: false, step: 1, next: 3 });
  assert.deepEqual(resolveStep(null, null, true), { asked: false, step: 1, next: 2 });
  assert.deepEqual(resolveStep("ерунда", "6", false), { asked: false, step: 1, next: 6 });
});

test("ответили (возраст или «любой») — шаг из адреса, без шага — программа", () => {
  assert.deepEqual(resolveStep("4-6", "5", false), { asked: true, step: 5, next: 5 });
  assert.deepEqual(resolveStep(ANY_AGE, null, true), { asked: true, step: 2, next: 2 });
  assert.deepEqual(resolveStep("4-6", null, true), { asked: true, step: 2, next: 2 });
});

test("просто /sobrat с запомненным возрастом — шаг 1, его можно сменить", () => {
  assert.deepEqual(resolveStep("4-6", null, false), { asked: true, step: 1, next: 2 });
});

test("вернулись на шаг 1 — после выбора дальше на программу", () => {
  assert.deepEqual(resolveStep("1-3", "1", false), { asked: true, step: 1, next: 2 });
});
