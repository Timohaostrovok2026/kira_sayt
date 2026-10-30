"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Обновляет данные раз в минуту, пока вкладка открыта, и по кнопке. */
export function AutoRefresh({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    }, 60_000);
    const onShow = () => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink"
      aria-label={`Обновить данные. Обновлено в ${updatedAt}`}
    >
      <RefreshCw size={15} className={pending ? "animate-spin" : ""} aria-hidden />
      {updatedAt}
    </button>
  );
}
