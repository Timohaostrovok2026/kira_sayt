// Относительный путь с .ts — чтобы model.test.ts шёл в node --test.
import { AGE_GROUPS, KINDS, type AgeGroupId, type ExtraGroup, type Kind } from "../../data/catalog.ts";

/** Шаги конструктора (черновик Кирилла v11): мастер-классы отдельно, чтобы не терялись среди допов. */
export const STEPS = [
  { n: 1, tab: "Возраст" },
  { n: 2, tab: "Программа" },
  { n: 3, tab: "Шоу" },
  { n: 4, tab: "МК" },
  { n: 5, tab: "Допы" },
  { n: 6, tab: "Готово" },
] as const;

export type StepN = 1 | 2 | 3 | 4 | 5 | 6;

export function parseAge(v: string | null): AgeGroupId | null {
  return AGE_GROUPS.find((g) => g.id === v)?.id ?? null;
}

/** «Любой возраст» в адресе — тоже ответ на первый шаг. */
export const ANY_AGE = "all";

/**
 * Возраст обязателен (Кирилл, 03.11): пока на него не ответили, любой вход в конструктор
 * (плитка формата, «Все шоу», ?step=N) показывает шаг 1, а после ответа ведёт туда, куда шли.
 */
// jump — в адресе есть формат или возраст: без ?step= сразу к программам. Просто /sobrat — с шага 1, даже если возраст помним.
export function resolveStep(rawAge: string | null, rawStep: string | null, jump: boolean): { asked: boolean; step: StepN; next: StepN } {
  const asked = rawAge === ANY_AGE || parseAge(rawAge) != null;
  const want = parseStep(rawStep, jump ? 2 : 1);
  return { asked, step: asked ? want : 1, next: want > 1 ? want : 2 };
}

export function parseKind(v: string | null): Kind | null {
  return KINDS.find((k) => k.id === v)?.id ?? null;
}

/** Разделы шага «Допы» (шоу и мастер-классы — свои шаги). */
export const DOP_GROUPS: ExtraGroup[] = ["Подарки и реквизит", "Съёмка", "Опции и услуги"];

export function parseGroup(v: string | null): ExtraGroup | null {
  return DOP_GROUPS.find((g) => g === v) ?? null;
}

export function parseStep(v: string | null, fallback: StepN): StepN {
  const n = Number(v);
  return n >= 1 && n <= 6 && Number.isInteger(n) ? (n as StepN) : fallback;
}
