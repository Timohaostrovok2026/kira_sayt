"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp } from "@/data/rate-limit";
import { COOKIE, COOKIE_MAX_AGE, COOKIE_PATH, LEGACY_COOKIE_PATH, safeEqual, statsPassword, tokenFor } from "@/lib/auth";
import { limits } from "@/lib/limits";
import { parsePeriod } from "@/lib/stats/period";

export interface LoginState {
  error?: string;
}

function back(formData: FormData): string {
  if (formData.get("next") === "/admin") return "/admin";
  const p = formData.get("p");
  return p ? `/stats?p=${parsePeriod(p)}` : "/stats";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const cfg = statsPassword();
  if (!cfg) return { error: "Статистика выключена: на сервере не задан STATS_PASSWORD." };
  const given = String(formData.get("password") ?? "");
  // Пауза ниже не спасает от перебора параллельными запросами — поэтому ещё и лимит попыток с адреса.
  const ip = clientIp((await headers()).get("x-forwarded-for"));
  if (!limits.login.hit(ip)) return { error: "Слишком много попыток. Подождите 15 минут." };
  if (!given || !safeEqual(tokenFor(given), tokenFor(cfg.password))) {
    // Небольшая пауза — чтобы перебор паролей был медленным.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Неверный пароль" };
  }
  limits.login.reset(ip);
  (await cookies()).set(COOKIE, tokenFor(cfg.password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE,
  });
  redirect(back(formData));
}

export async function logout(formData?: FormData) {
  const jar = await cookies();
  for (const path of [COOKIE_PATH, LEGACY_COOKIE_PATH]) {
    jar.set(COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path,
      maxAge: 0,
    });
  }
  redirect(formData?.get("next") === "/admin" ? "/admin" : "/stats");
}
