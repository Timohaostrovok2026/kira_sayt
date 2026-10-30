"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, House, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";

const ITEMS = [
  { href: "/", label: "Главная", icon: House },
  { href: "/sobrat", label: "Собрать", icon: Sparkles },
  { href: "/pakety", label: "Пакеты", icon: Gift },
  { href: "/kostyumy", label: "Костюмы", icon: Shirt },
  { href: "/korzina", label: "Корзина", icon: ShoppingBag },
];

/** Нижняя панель на телефоне: всё главное под большим пальцем. */
export function BottomNav() {
  const path = usePathname();
  const { count, ready } = useCart();
  return (
    <nav
      aria-label="Быстрая навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-rasp-950/92 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-h)] max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                data-track={`bottom_${label}`}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white/60 transition-colors aria-[current=page]:text-white"
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  {href === "/korzina" && ready && count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] animate-pop place-items-center rounded-full bg-rasp-500 px-1 text-[11px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </span>
                {label}
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-rasp-400" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
