"use client";

import { Photo } from "@/components/Photo";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useCart } from "@/lib/cart";

/** Липкая плашка над нижней навигацией: сколько героев выбрано и куда дальше. */
export function SelectedBar() {
  const { state, ready, notice } = useCart();
  const { costumeImg, costumeById } = useCatalog();
  // Героев, которых убрали с сайта, не показываем.
  const ids = state.costumes.filter((id) => costumeById[id]);
  const n = ids.length;
  if (!ready || n === 0) return null;
  return (
    <div
      className={`fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+10px)] z-30 mx-auto max-w-md animate-pop transition-[opacity,transform] duration-300 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 ${
        // Пока показывается всплывашка «добавлено» (она на этом же месте) — прячемся.
        notice ? "pointer-events-none translate-y-3 opacity-0" : ""
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl bg-ink p-2 pl-3 text-white shadow-2xl shadow-rasp-900/40">
        <span className="hidden shrink-0 -space-x-3 sm:flex" aria-hidden="true">
          {ids.slice(-3).map((id) => (
            <span key={id} className="relative h-9 w-9 overflow-hidden rounded-full bg-rasp-900 ring-2 ring-ink">
              <Photo src={costumeImg(id)} alt="" fill sizes="36px" className="object-cover object-top" />
            </span>
          ))}
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-tight text-white/65 sm:text-[14px]" aria-live="polite">
          Выбрано <br className="sm:hidden" />
          героев: <b className="text-[15px] tabular-nums text-white">{n}</b>
        </p>
        <Link
          href="/sobrat"
          data-track="costumes_bar_programs"
          className="btn min-h-10 shrink-0 bg-white/12 px-3.5 text-[14px] text-white hover:bg-white/20"
        >
          К программам
        </Link>
        <Link href="/korzina" data-track="costumes_bar_cart" className="btn btn-primary min-h-10 shrink-0 px-3.5 text-[14px]">
          <ShoppingBag size={16} strokeWidth={2.5} className="max-[359px]:hidden" />В корзину
        </Link>
      </div>
    </div>
  );
}
