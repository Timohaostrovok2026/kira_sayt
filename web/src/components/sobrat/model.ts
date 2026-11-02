import { AGE_GROUPS, KINDS, type AgeGroupId, type ExtraGroup, type Kind } from "@/data/catalog";

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
