"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Go } from "@/components/Arrows";

/** Всплывашка после добавления: «… добавлено в заявку · Корзина ›», 3 секунды. */
export function AddedToast() {
  const { notice, dismissNotice } = useCart();
  const path = usePathname();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, 3200);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  if (!notice || path === "/korzina") return null;
  return (
    <Link key={notice.at} href="/korzina" onClick={dismissNotice} role="status" className="toast" data-track="toast_to_cart">
      Добавлено в заявку
      <b>
        Корзина <Go />
      </b>
    </Link>
  );
}
