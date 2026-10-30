"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { login, type LoginState } from "@/app/stats/actions";

export function LoginForm({
  period,
  devPassword,
  next,
  title = "Статистика сайта",
}: {
  period?: string;
  devPassword?: string;
  /** Куда вернуться после входа: "/admin" или статистика по умолчанию. */
  next?: "/admin";
  title?: string;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card mx-auto w-full max-w-sm p-6 sm:p-8">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-rasp-100 text-rasp-600">
        <LockKeyhole size={24} aria-hidden />
      </div>
      <h1 className="h-card text-[22px]">{title}</h1>
      <p className="mt-1 text-[15px] text-ink-soft">Только для владельца. Введите пароль.</p>
      {period && <input type="hidden" name="p" value={period} />}
      {next && <input type="hidden" name="next" value={next} />}
      <label className="mt-6 block">
        <span className="mb-1.5 block text-[14px] font-semibold">Пароль</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "stats-login-error" : undefined}
          className="h-12 w-full rounded-2xl bg-paper px-4 text-[17px] border-[1.5px] border-line outline-none transition focus:border-rasp-400"
        />
      </label>
      {state.error && (
        <p id="stats-login-error" role="alert" className="mt-2 text-[14px] font-semibold text-rasp-600">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary mt-5 w-full disabled:opacity-60">
        {pending ? "Проверяем…" : "Войти"}
      </button>
      {devPassword && (
        <p className="mt-4 rounded-2xl bg-rasp-50 p-3 text-[13px] text-ink-soft">
          Режим разработки: пароль <b className="text-ink">{devPassword}</b>. На сервере задайте STATS_PASSWORD.
        </p>
      )}
    </form>
  );
}
