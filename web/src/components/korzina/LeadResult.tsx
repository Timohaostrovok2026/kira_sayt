"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle, PartyPopper, Phone, Send, TriangleAlert } from "lucide-react";
import { useSite } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { copyText, telegramLink, whatsappLink } from "./lead";

export type LeadResultData = { ok: true; id: number; text: string; total: number } | { ok: false; text: string; total: number };

/** Мессенджеры с готовым текстом и звонок: WhatsApp в РФ работает плохо, звонок доходит всегда. */
function Messengers({ text, place }: { text: string; place: string }) {
  const { contacts } = useSite();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <a
        href={telegramLink(contacts, text)}
        target="_blank"
        rel="noopener"
        data-track={`${place}_tg`}
        className="btn btn-lg btn-primary w-full"
      >
        <Send size={20} /> Telegram
      </a>
      <a
        href={whatsappLink(contacts, text)}
        target="_blank"
        rel="noopener"
        data-track={`${place}_wa`}
        className="btn btn-lg w-full bg-ink text-white hover:bg-ink/90"
      >
        <MessageCircle size={20} /> WhatsApp
      </a>
      {/* Клик по tel: аналитика ловит сама (contact, via=phone) — data-track только чтобы отличить это место. */}
      <a href={`tel:${contacts.phoneRaw}`} data-track={`${place}_call`} className="btn btn-lg btn-soft w-full sm:col-span-2">
        {/* Номер — только на широком экране: на телефоне звонит само нажатие, а с номером кнопка шире карточки на 375–390 px. */}
        <Phone size={20} /> Позвонить <span className="hidden tabular-nums sm:inline">{contacts.phone}</span>
      </a>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      type="button"
      data-track="lead_copy"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "ok" : "fail");
        if (ok) setTimeout(() => setState("idle"), 2500);
      }}
      className="btn btn-lg btn-soft w-full"
    >
      {state === "ok" ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}
      {state === "ok" ? "Скопировано" : state === "fail" ? "Выделите текст ниже" : "Скопировать текст заявки"}
    </button>
  );
}

export function LeadResult({ r, onBack }: { r: LeadResultData; onBack: () => void }) {
  if (r.ok) {
    // В мессенджер — с номером заявки, чтобы менеджер сразу её нашёл.
    const msg = `Заявка №${r.id} с сайта.\n\n${r.text}`;
    return (
      <section className="wrap py-10 md:py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="grid h-24 w-24 animate-pop place-items-center rounded-full bg-rasp-500 text-white shadow-2xl shadow-rasp-500/40">
            <PartyPopper size={44} />
          </span>
          <h1 className="h-section mt-6">Заявка №{r.id} отправлена!</h1>
          <p className="lead mt-3 text-ink-soft">Менеджер напишет вам в течение 15 минут в рабочее время.</p>
          {r.total > 0 && (
            <p className="mt-2 text-[15px] text-ink-soft">
              Ориентировочно <span className="font-bold text-ink tabular-nums">{money(r.total)}</span>
            </p>
          )}
        </div>

        <div className="card mx-auto mt-8 max-w-xl p-5">
          <p className="font-display text-[18px] font-semibold">Ускорить</p>
          <p className="mt-1 mb-4 text-[15px] text-ink-soft">Напишите сами — текст заявки уже вставлен. Или позвоните и назовите номер заявки.</p>
          <Messengers text={msg} place="lead_ok" />
        </div>

        <div className="mx-auto mt-6 flex max-w-xl justify-center">
          <Link href="/" className="btn btn-ghost text-ink-soft" data-track="lead_ok_home">
            На главную
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap py-10 md:py-16">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-rasp-100 text-rasp-600">
          <TriangleAlert size={36} />
        </span>
        <h1 className="h-section mt-5">Не получилось отправить</h1>
        <p className="lead mt-3 text-ink-soft">
          Похоже, проблема со связью. Отправьте заявку в мессенджер — текст уже готов, ничего не потеряется.
        </p>
      </div>

      <div className="card mx-auto mt-8 flex max-w-xl flex-col gap-3 p-5">
        <Messengers text={r.text} place="lead_fail" />
        <CopyButton text={r.text} />
      </div>

      <details className="mx-auto mt-4 max-w-xl rounded-2xl bg-white/70 p-4 ring-1 ring-line">
        <summary className="cursor-pointer text-[15px] font-semibold">Текст заявки</summary>
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed select-all">{r.text}</pre>
      </details>

      <div className="mx-auto mt-6 flex max-w-xl justify-center">
        <button type="button" onClick={onBack} className="btn btn-soft" data-track="lead_fail_back">
          <ArrowLeft size={18} /> Вернуться и попробовать ещё раз
        </button>
      </div>
    </section>
  );
}
