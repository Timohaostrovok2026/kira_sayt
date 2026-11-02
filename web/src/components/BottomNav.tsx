"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, House, Send, ShoppingBag, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSite } from "@/lib/catalog-context";

/** Нижняя панель на телефоне. «Персонажей» нет (авторские права, решение Кирилла 02.11) — вместо них «Связаться». */
export function BottomNav() {
  const path = usePathname();
  const { count, ready } = useCart();
  const { contacts } = useSite();
  const items = [
    { href: "/", label: "Главная", icon: House, active: path === "/" },
    { href: "/sobrat", label: "Собрать", icon: Sparkles, active: path.startsWith("/sobrat") || path.startsWith("/programmy") },
    { href: "/pakety", label: "Пакеты", icon: Gift, active: path.startsWith("/pakety") },
    { href: contacts.telegram, label: "Связаться", icon: Send, active: false, external: true },
    { href: "/korzina", label: "Корзина", icon: ShoppingBag, active: path.startsWith("/korzina") },
  ];
  return (
    <nav className="mnav" aria-label="Разделы">
      {items.map(({ href, label, icon: Icon, active, external }) =>
        external ? (
          <a key={label} href={href} target="_blank" rel="noopener" data-track="bottom_contact">
            <Icon size={24} strokeWidth={1.8} />
            <span>{label}</span>
          </a>
        ) : (
          <Link key={label} href={href} data-track={`bottom_${label}`} aria-current={active ? "page" : undefined}>
            <Icon size={24} strokeWidth={1.8} />
            {href === "/korzina" && ready && count > 0 && <i className="tcnt">{count}</i>}
            <span>{label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
