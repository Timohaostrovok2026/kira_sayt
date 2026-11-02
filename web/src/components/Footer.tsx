import type { Contacts } from "@/data/site";
import { CopyPhone } from "./CopyPhone";
import { Logo } from "./Logo";

/** Подвал по черновику Кирилла: крупный логотип и пять цветных «таблеток» контактов. */
export function Footer({ contacts, legal }: { contacts: Contacts; legal?: string }) {
  const bands = [
    { href: `tel:${contacts.phoneRaw}`, label: "Позвонить", value: contacts.phone },
    { href: contacts.whatsapp, label: "WhatsApp", value: contacts.phone },
    { href: contacts.telegram, label: "Telegram", value: contacts.telegramHandle },
    { href: contacts.channel, label: "Telegram-канал", value: contacts.channelHandle },
    { href: contacts.instagram, label: "Instagram", value: contacts.instagramHandle },
  ];
  return (
    <footer id="kontakty" className="foot scroll-mt-20">
      <div className="wrap">
        <div className="mega">
          <Logo height={240} alt="" className="mega-logo" />
        </div>
        <div className="bands">
          {bands.map((b) => (
            <a key={b.label} className="band" href={b.href} target={b.href.startsWith("http") ? "_blank" : undefined} rel="noopener">
              <small>{b.label}</small>
              <span>{b.value}</span>
            </a>
          ))}
        </div>
        <div className="foot-meta">
          <CopyPhone phone={contacts.phoneRaw} />
          {/* «По всей России» не пишем — ответ Кирилла 02.11 (ROADMAP §3, №19); в черновике v11 осталось. */}
          <p>Кирилл · {contacts.geo}</p>
          <p>© 2026 Улыбайся</p>
          {legal && <p className="text-[13px] text-white/45">{legal}</p>}
        </div>
      </div>
    </footer>
  );
}
