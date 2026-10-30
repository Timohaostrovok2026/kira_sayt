"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

/** Всплывашка после добавления в корзину: что добавили и сколько уже набралось. */
export function AddedToast() {
  const { notice, dismissNotice, total } = useCart();
  const path = usePathname();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, 3200);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  if (!notice || path === "/korzina") return null;
  // На этих страницах внизу своя липкая панель с кнопкой — поднимаемся над ней.
  const raised = path.startsWith("/sobrat") || path.startsWith("/programmy");
  return (
    <div
      key={notice.at}
      role="status"
      className={`fixed inset-x-3 z-50 mx-auto max-w-md animate-pop lg:bottom-6 lg:right-6 lg:left-auto lg:mx-0 ${
        raised
          ? "bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+92px)]"
          : "bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+10px)]"
      }`}
    >
      <Link
        href="/korzina"
        onClick={dismissNotice}
        data-track="toast_to_cart"
        className="flex items-center gap-3 rounded-2xl bg-ink p-3 pr-4 text-white shadow-2xl shadow-rasp-900/40"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rasp-500">
          <Check size={20} strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{notice.title}</span>
          <span className="block text-[13px] text-white/60">
            В корзине на <span className="tabular-nums text-white">{money(total)}</span>
          </span>
        </span>
        <span className="flex items-center text-[14px] font-bold text-rasp-300">
          Корзина <ChevronRight size={18} />
        </span>
      </Link>
    </div>
  );
}
