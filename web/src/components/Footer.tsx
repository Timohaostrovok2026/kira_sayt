import Link from "next/link";
import { ArrowUpRight, Camera, MessageCircle, Phone, Send } from "lucide-react";
import type { Contacts } from "@/data/site";
import { Accent } from "./Accent";
import { NAV } from "./nav";

function bands(contacts: Contacts) {
  return [
  { href: `tel:${contacts.phoneRaw}`, label: "Позвонить", value: contacts.phone, icon: Phone },
  { href: contacts.whatsapp, label: "WhatsApp", value: contacts.phone, icon: MessageCircle },
  { href: contacts.telegram, label: "Telegram менеджера", value: contacts.telegramHandle, icon: Send },
  { href: contacts.channel, label: "Telegram-канал", value: contacts.channelHandle, icon: Send },
    { href: contacts.instagram, label: "Instagram", value: contacts.instagramHandle, icon: Camera },
  ];
}

export function Footer({ contacts, legal }: { contacts: Contacts; legal?: string }) {
  return (
    <footer id="kontakty" className="stage pb-nav scroll-mt-16 overflow-hidden">
      <div className="wrap pt-16 pb-10 md:pt-24">
        <p className="eyebrow text-rasp-300">Контакты</p>
        <h2 className="h-section mt-3 max-w-xl">
          Ответим на любой <Accent>вопрос</Accent> за&nbsp;пару минут
        </h2>
        <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bands(contacts).map(({ href, label, value, icon: Icon }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener"
                className="group flex items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rasp-500">
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-white/60">{label}</span>
                  <span className="block truncate text-[17px] font-semibold">{value}</span>
                </span>
                <ArrowUpRight size={20} className="text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
              </a>
            </li>
          ))}
        </ul>

        <p aria-hidden="true" className="mt-16 select-none font-display text-[clamp(56px,15vw,220px)] font-bold leading-[0.85] tracking-[-0.05em] text-white/[0.08]">
          Улыбайся
        </p>

        <div className="mt-8 flex flex-col gap-6 border-t border-white/10 pt-8 text-[14px] text-white/55 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Разделы сайта">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-1 md:items-end">
            <p>
              {contacts.geo} · © 2026 Улыбайся
            </p>
            {legal && <p className="text-[13px] text-white/40">{legal}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
