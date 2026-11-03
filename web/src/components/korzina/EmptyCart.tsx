"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSite } from "@/lib/catalog-context";

/** Пустая заявка: собрать праздник, взять пакет или просто написать. `children` — под заголовком (убранная позиция с «Вернуть»). */
export function EmptyCart({ children }: { children?: ReactNode }) {
  const { contacts } = useSite();
  return (
    <div className="grid gap-[18px]">
      <h1 className="display" style={{ fontSize: "clamp(28px, 7vw, 40px)", color: "var(--rasp-700)" }}>
        Ваша заявка
      </h1>
      {children}
      <p className="empty">Пока ничего не выбрано. Откройте программу и нажмите «Выбрать», затем добавьте шоу и допы. Или возьмите готовый пакет со скидкой.</p>
      <div className="send">
        <Link className="pill pill--hot pill--big2" href="/sobrat" data-track="cart_empty_sobrat">
          Собрать праздник
        </Link>
        <Link className="pill pill--ghost" href="/pakety" data-track="cart_empty_pakety">
          Готовые пакеты
        </Link>
        <a className="pill pill--ghost" href={contacts.telegram} target="_blank" rel="noopener" data-track="cart_empty_tg">
          Написать в Telegram
        </a>
      </div>
    </div>
  );
}
