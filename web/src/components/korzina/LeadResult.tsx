"use client";

import Link from "next/link";
import { useState } from "react";
import { useSite } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { copyText, telegramLink, whatsappLink } from "./lead";
import { Fold } from "@/components/Fold";
import { Back, Chevron } from "@/components/Arrows";

/** from — в итоге были цены «от» (новогодние без даты). */
export type LeadResultData = { ok: true; id: number; text: string; total: number; from?: boolean } | { ok: false; text: string; total: number; from?: boolean; limited?: boolean };

/** Мессенджеры с готовым текстом и звонок: WhatsApp в РФ работает плохо, звонок доходит всегда. */
function Messengers({ text, place }: { text: string; place: string }) {
  const { contacts } = useSite();
  return (
    <div className="send">
      <a href={telegramLink(contacts, text)} target="_blank" rel="noopener" data-track={`${place}_tg`} className="pill pill--hot">
        Открыть Telegram
      </a>
      <a href={whatsappLink(contacts, text)} target="_blank" rel="noopener" data-track={`${place}_wa`} className="pill pill--dark">
        Открыть WhatsApp
      </a>
      {/* Клик по tel: аналитика ловит сама (contact, via=phone) — data-track только чтобы отличить это место. */}
      <a href={`tel:${contacts.phoneRaw}`} data-track={`${place}_call`} className="pill pill--ghost">
        Позвонить<span className="hidden sm:inline">: {contacts.phone}</span>
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
      className="pill pill--ghost w-full"
    >
      {state === "ok" ? "Скопировано" : state === "fail" ? "Выделите текст ниже" : "Скопировать текст заявки"}
    </button>
  );
}

export function LeadResult({ r, onBack }: { r: LeadResultData; onBack: () => void }) {
  if (r.ok) {
    // В мессенджер — с номером заявки, чтобы менеджер сразу её нашёл.
    const msg = `Заявка №${r.id} с сайта.\n\n${r.text}`;
    return (
      <div className="sdone">
        <div className="dico" aria-hidden="true">
          🎉
        </div>
        <h1 className="display">Заявка №{r.id} отправлена</h1>
        <p>
          Менеджер напишет вам в течение 15 минут, с 7:00 до 23:00.
          {r.total > 0 && (
            <>
              {" "}
              Ориентировочно <b className="num">{r.from ? "от " : ""}{money(r.total)}</b>.
            </>
          )}
        </p>
        <p className="hint">Хотите быстрее — напишите сами, текст заявки уже вставлен.</p>
        <Messengers text={msg} place="lead_ok" />
        <Link href="/" className="back" style={{ margin: "6px 0 0" }} data-track="lead_ok_home">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="sdone">
      <h1 className="display">Не получилось отправить</h1>
      <p>
        {r.limited ? "С вашего адреса только что ушло несколько заявок подряд." : "Похоже, проблема со связью."} Отправьте заявку в
        мессенджер — текст уже готов, ничего не потеряется.
      </p>
      <Messengers text={r.text} place="lead_fail" />
      <CopyButton text={r.text} />
      <Fold
        className="empty w-full text-left"
        summaryClassName="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden"
        summary={
          <>
            Текст заявки <Chevron />
          </>
        }
      >
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed select-all">{r.text}</pre>
      </Fold>
      <button type="button" onClick={onBack} className="back" style={{ margin: 0 }} data-track="lead_fail_back">
        <Back /> Вернуться и попробовать ещё раз
      </button>
    </div>
  );
}
