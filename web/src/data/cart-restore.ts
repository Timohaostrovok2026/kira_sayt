// Корзина из памяти браузера: там может лежать что угодно (старая версия сайта, ручная правка, сбой записи).
// Битое поле не должно ронять сайт — берём только то, что совпадает по типу с пустой корзиной.

type Kind = "array" | "object" | "string" | "number" | "boolean" | "other";

function kind(v: unknown): Kind {
  if (Array.isArray(v)) return "array";
  if (v === null) return "other";
  const t = typeof v;
  return t === "object" || t === "string" || t === "number" || t === "boolean" ? t : "other";
}

/** Поля `saved`, совпадающие по типу с `empty`, поверх `empty`. Вложенные объекты — так же, на один уровень. */
export function restoreLike<T extends object>(saved: unknown, empty: T): T {
  if (kind(saved) !== "object") return empty;
  const src = saved as Record<string, unknown>;
  const out = { ...empty } as Record<string, unknown>;
  for (const [k, def] of Object.entries(empty)) {
    const v = src[k];
    if (kind(v) !== kind(def)) continue;
    if (kind(v) === "number" && !Number.isFinite(v)) continue;
    out[k] = kind(def) === "object" && Object.keys(def as object).length ? restoreLike(v, def as object) : v;
  }
  return out as T;
}

/** Корзина целиком: верхние поля по типу, а в списках — только элементы нужного вида. */
export function restoreCart<T extends { programs: string[]; costumes: string[]; packages: { id: string }[]; extras: Record<string, number> }>(
  saved: unknown,
  empty: T,
): T {
  const s = restoreLike(saved, empty);
  const strings = (xs: unknown[]) => xs.filter((x): x is string => typeof x === "string");
  return {
    ...s,
    programs: strings(s.programs),
    costumes: strings(s.costumes),
    packages: s.packages.filter((p) => kind(p) === "object" && typeof p.id === "string" && kind((p as { choices?: unknown }).choices) === "object"),
    extras: Object.fromEntries(Object.entries(s.extras).filter(([, n]) => Number.isInteger(n) && n > 0)),
  };
}
