"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { useSite } from "@/lib/catalog-context";

export function Header() {
  const path = usePathname();
  const { count, total, ready } = useCart();
  const { contacts } = useSite();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-rasp-950/85 text-white backdrop-blur-xl backdrop-saturate-150">
      <div className="wrap flex h-[var(--header-h)] items-center gap-6">
        <Link href="/" className="shrink-0" data-track="header_logo">
          <Logo />
        </Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Основное меню">
          {NAV.map((n) => {
            const active = n.href !== "/" && !n.href.includes("#") && path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                data-track={`nav_${n.href}`}
                aria-current={active ? "page" : undefined}
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/12 aria-[current=page]:text-white"
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:${contacts.phoneRaw}`}
            className="hidden whitespace-nowrap text-[15px] font-semibold text-white/80 hover:text-white xl:block"
          >
            {contacts.phone}
          </a>
          <Link
            href="/korzina"
            data-track="header_cart"
            className="btn btn-sm hidden bg-white/10 text-white hover:bg-white/20 sm:inline-flex lg:inline-flex"
          >
            <ShoppingBag size={18} />
            {ready && count > 0 ? (
              <span className="tabular-nums">{money(total)}</span>
            ) : (
              <span>Корзина</span>
            )}
            {ready && count > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-rasp-500 px-1.5 text-[13px]">{count}</span>
            )}
          </Link>
          <Link href="/sobrat" data-track="header_cta" className="btn btn-sm btn-primary hidden md:inline-flex">
            Рассчитать праздник
          </Link>
        </div>
      </div>
    </header>
  );
}
