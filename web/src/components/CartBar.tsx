"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { Go } from "@/components/Arrows";

/**
 * Липкая «Заявка · N · сумма» над нижним меню. В корзине и на последнем шаге конструктора не нужна.
 * Читает адрес (useSearchParams) — в макете стоит внутри <Suspense>.
 */
export function CartBar() {
  const path = usePathname();
  const step = useSearchParams().get("step");
  const lastStep = path.startsWith("/sobrat") && step === "6";
  const { count, total, ready } = useCart();
  const ref = useRef<HTMLAnchorElement>(null);
  const sig = `${count}|${total}`;
  const prev = useRef("init");

  // Короткий «прыжок» кнопки, когда сумма изменилась.
  useEffect(() => {
    // Пока корзина не прочитана из памяти браузера — запоминаем без «прыжка», иначе он на каждой загрузке.
    if (!ready) return;
    if (prev.current === "init") {
      prev.current = sig;
      return;
    }
    if (prev.current === sig) return;
    prev.current = sig;
    const el = ref.current;
    if (!el) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }, [sig, ready]);

  if (!ready || count === 0 || lastStep || path.startsWith("/korzina")) return null;
  return (
    <div className="bar">
      <Link ref={ref} href="/korzina" className="barBtn" data-track="bar_cart">
        <span>Заявка · {count}</span>
        {/* Только «Индивидуальный» — суммы нет, его считают после разговора: «0 ₽» не показываем. */}
        {total > 0 && <span className="barSum num">{money(total)}</span>}
        <span className="barGo">
          Оформить <Go />
        </span>
      </Link>
    </div>
  );
}
