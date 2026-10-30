import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "uly_stats";
/** Одна кука на /stats и /admin. Раньше была только на /stats — её тоже чистим при выходе. */
export const COOKIE_PATH = "/";
export const LEGACY_COOKIE_PATH = "/stats";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 дней

const DEV_PASSWORD = "uly-dev";

/**
 * Пароль из STATS_PASSWORD. В разработке без него — "uly-dev" (с предупреждением).
 * В продакшене без пароля статистика выключена (null).
 */
export function statsPassword(): { password: string; devDefault: boolean } | null {
  const env = process.env.STATS_PASSWORD?.trim();
  if (env) return { password: env, devDefault: false };
  if (process.env.NODE_ENV !== "production") return { password: DEV_PASSWORD, devDefault: true };
  return null;
}

/** В куке храним не пароль, а HMAC-SHA256 от него. Сменили пароль — все старые входы недействительны. */
export function tokenFor(password: string) {
  const key = process.env.STATS_SECRET || "uly-stats-v1";
  return createHmac("sha256", key).update(password).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Проверка входа. Вызывать только внутри <Suspense> или серверной функции: читает cookies(). */
export async function isAuthed() {
  const cfg = statsPassword();
  if (!cfg) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, tokenFor(cfg.password));
}
