"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import { useCart } from "@/lib/cart";
import { useSite } from "@/lib/catalog-context";

/** Шапка-пилюля: на телефоне — логотип и «Позвонить», на ноутбуке — меню и «Заявка» со счётчиком. */
export function Header() {
  const path = usePathname();
  const { count, ready } = useCart();
  const { contacts } = useSite();
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Основное меню">
        <Link href="/" data-track="header_logo" className="no-underline">
          <Logo />
        </Link>
        <div className="nav-links">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-track={`nav_${n.href}`}
              aria-current={!n.href.includes("#") && path.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <a className="nav-call" href={`tel:${contacts.phoneRaw}`} aria-label="Позвонить">
          <Phone size={18} />
        </a>
        <Link className="nav-req" href="/korzina" data-track="header_cart">
          Заявка <b className="num">{ready ? count : 0}</b>
        </Link>
      </nav>
    </header>
  );
}
