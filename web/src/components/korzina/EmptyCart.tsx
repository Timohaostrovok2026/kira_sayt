"use client";

import Link from "next/link";
import { ChevronRight, Gift, MessageCircle, Send, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import { useSite } from "@/lib/catalog-context";

const ENTRIES = [
  { href: "/sobrat", title: "Собрать праздник", text: "Программа, шоу и допы за пару минут", icon: Sparkles, primary: true },
  { href: "/pakety", title: "Готовые пакеты", text: "Всё включено и дешевле, чем по отдельности", icon: Gift },
  { href: "/kostyumy", title: "Выбрать героя", text: "110+ костюмов: от принцесс до Человека-паука", icon: Shirt },
];

export function EmptyCart() {
  const { contacts } = useSite();
  return (
    <section className="wrap py-10 md:py-16">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-[28px] bg-rasp-100 text-rasp-600">
          <ShoppingBag size={36} />
        </span>
        <h1 className="h-section mt-5">Корзина пока пустая</h1>
        <p className="lead mt-3 text-ink-soft">С чего начнём?</p>
      </div>

      <ul className="mx-auto mt-8 grid max-w-xl gap-3">
        {ENTRIES.map(({ href, title, text, icon: Icon, primary }) => (
          <li key={href}>
            <Link
              href={href}
              data-track={`cart_empty_${href.slice(1)}`}
              className={`group flex min-h-[84px] items-center gap-4 rounded-[22px] p-4 transition-transform active:scale-[0.98] ${
                primary ? "bg-rasp-500 text-white shadow-xl shadow-rasp-500/30" : "card"
              }`}
            >
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${primary ? "bg-white/20" : "bg-rasp-100 text-rasp-600"}`}
              >
                <Icon size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[18px] font-semibold leading-tight">{title}</span>
                <span className={`mt-1 block text-[14px] leading-snug ${primary ? "text-white/80" : "text-ink-soft"}`}>{text}</span>
              </span>
              <ChevronRight size={22} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${primary ? "" : "text-rasp-500"}`} />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-8 max-w-xl text-center text-[15px] text-ink-soft">Или просто напишите — подскажем</p>
      <div className="mx-auto mt-3 flex max-w-xl gap-2">
        <a href={contacts.telegram} target="_blank" rel="noopener" data-track="cart_empty_tg" className="btn btn-soft flex-1">
          <Send size={18} /> Telegram
        </a>
        <a href={contacts.whatsapp} target="_blank" rel="noopener" data-track="cart_empty_wa" className="btn btn-soft flex-1">
          <MessageCircle size={18} /> WhatsApp
        </a>
      </div>
    </section>
  );
}
