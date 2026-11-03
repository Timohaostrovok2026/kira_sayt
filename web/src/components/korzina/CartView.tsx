"use client";

import { useEffect, useRef, useState } from "react";
import { LINE_GROUPS, useCart, useRemoveLine, type CartLine } from "@/lib/cart";
import { money, plural } from "@/lib/format";
import { flushNow, track, visitorId } from "@/lib/track";
import { useCatalog, useSite } from "@/lib/catalog-context";
import { CartOptions } from "./CartOptions";
import { EmptyCart } from "./EmptyCart";
import { LeadForm } from "./LeadForm";
import { LeadResult, type LeadResultData } from "./LeadResult";
import { buildLeadText, isPerUnit, phoneValid, telegramLink, whatsappLink } from "./lead";

/** Позиции заявки по группам: количество для допов, «Убрать» у всех. */
function Lines({ remove }: { remove: (l: CartLine) => void }) {
  const { lines, setExtra } = useCart();
  const { extraById } = useCatalog();
  return (
    <div>
      {LINE_GROUPS.map((g) => {
        const ls = lines.filter((l) => l.type === g.type);
        if (!ls.length) return null;
        return (
          <div key={g.type}>
            <h3 className="cg">
              {g.title} <small>{ls.length}</small>
            </h3>
            {ls.map((l) => (
              <div className="li" key={l.key}>
                <div className="t">
                  {l.title}
                  {l.subtitle && <small>{l.subtitle}</small>}
                </div>
                <div className="p num">{l.price ? money(l.price) : ""}</div>
                <div className="ctl">
                  {l.type === "extra" && (isPerUnit(extraById[l.id]?.unit) || l.qty > 1) && (
                    <>
                      <button className="qbtn" type="button" aria-label="Меньше" onClick={() => setExtra(l.id, l.qty - 1)}>
                        −
                      </button>
                      <b className="num">{l.qty}</b>
                      <button className="qbtn" type="button" aria-label="Больше" onClick={() => setExtra(l.id, l.qty + 1)}>
                        +
                      </button>
                    </>
                  )}
                  <button className="rm" type="button" onClick={() => remove(l)} data-track={`cart_remove_${l.id}`}>
                    Убрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * «Ваша заявка»: устройство прежнее (позиции и форма слева, липкий итог справа), вид — черновика Кирилла v11.
 * Главное — «Отправить заявку» (база и Telegram-бот менеджеров); ниже мелко — написать напрямую в WhatsApp или Telegram (решение владельца 02.11).
 */
export function CartView() {
  const cart = useCart();
  const cat = useCatalog();
  const { contacts } = useSite();
  const { state, lines, total, count, ready, clear } = cart;
  const removeLine = useRemoveLine();

  const [result, setResult] = useState<LeadResultData | null>(null);
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  // «Убрали: … · Вернуть» — 5 секунд (решение владельца 03.11: на телефоне легко промахнуться по «Убрать»).
  const [undo, setUndo] = useState<{ l: CartLine; choices?: Record<number, string>; at: number } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);
  const remove = (l: CartLine) => {
    // Выбор вариантов пакета запоминаем, чтобы вернуть пакет таким же.
    const choices = l.type === "package" ? state.packages.find((p) => p.id === l.id)?.choices : undefined;
    removeLine(l);
    setUndo({ l, choices, at: Date.now() });
  };
  const restore = () => {
    if (!undo) return;
    const { l, choices } = undo;
    if (l.type === "program") cart.toggleProgram(l.id);
    else if (l.type === "extra") cart.setExtra(l.id, l.qty);
    else if (l.type === "package") cart.addPackage(l.id, choices);
    else if (l.type === "costume") cart.toggleCostume(l.id);
    setUndo(null);
  };

  const custom = lines.some((l) => l.type === "package" && l.price === 0);
  const okPhone = phoneValid(state.form.phone);
  const msgText = buildLeadText(state, lines, total, cat);

  async function submit() {
    if (sending) return;
    if (!okPhone) {
      setShowErrors(true);
      const el = phoneRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    const text = msgText;
    setSending(true);
    track("lead_submit", { total });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitor: visitorId(), name: state.form.name.trim(), phone: state.form.phone, total, text, payload: state, hp: hpRef.current?.value || undefined }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; id?: number } | null;
      if (r.status === 429) {
        track("lead_fail", { total, reason: "limit" });
        flushNow();
        setResult({ ok: false, text, total, limited: true });
        return;
      }
      if (!r.ok || !j?.ok || typeof j.id !== "number") throw new Error("lead_failed");
      track("lead_ok", { id: j.id });
      flushNow();
      setResult({ ok: true, id: j.id, text, total });
      // Экран успеха рисуется из result, поэтому корзину можно чистить сразу.
      clear();
    } catch {
      track("lead_fail", { total });
      flushNow();
      setResult({ ok: false, text, total });
    } finally {
      clearTimeout(timer);
      setSending(false);
      window.scrollTo({ top: 0 });
    }
  }

  // Липкая «Отправить заявку» на телефоне: видна, пока главная кнопка в итоге ниже экрана
  // (на ноутбуке итог липкий справа и всегда на виду — панель не появляется).
  const showResult = result && !(result.ok && count > 0);
  const hasItems = ready && count > 0 && !showResult;
  useEffect(() => {
    const el = sendRef.current;
    if (!hasItems || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => {
      io.disconnect();
      setBarVisible(false);
      // Форма размонтируется с фокусом внутри (экран «Заявка отправлена») — onBlur не придёт.
      setTyping(false);
    };
  }, [hasItems]);

  let body;
  // Next 16 хранит состояние страницы при переходах: экран «Заявка отправлена» показываем, только пока заявка пустая,
  // иначе после первой заявки вторую не собрать (баг с боевого сайта 02.11).
  if (showResult) body = <LeadResult r={result} onBack={() => setResult(null)} />;
  else if (!ready) body = <div className="h-[60vh]" aria-busy="true" aria-label="Загружаем заявку" />;
  else if (count === 0) body = <EmptyCart />;
  else
    body = (
      <>
        <header className="mb-5 flex items-end justify-between gap-4">
          <h1 className="display" style={{ fontSize: "clamp(28px, 6vw, 48px)", color: "var(--rasp-700)" }}>
            Ваша заявка
          </h1>
          <p className="hint num pb-1">
            {count} {plural(count, "позиция", "позиции", "позиций")}
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
          {/* Пока печатают (форма и поле «км» в переключателях), липкую панель прячем: на iPhone клавиатура поднимает её на поля. */}
          <div className="grid min-w-0 gap-[18px]" onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}>
            <div className="sum">
              <div>
                Комплект персонажей пришлёт менеджер
                <small>После заявки покажем героев и образы, вы выберете своё.</small>
              </div>
            </div>
            <Lines remove={remove} />
            <CartOptions />
            <form
              id="lead-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              aria-labelledby="lead-title"
            >
              <h2 id="lead-title" className="cg" style={{ marginTop: 4, fontSize: 22 }}>
                Куда прислать ответ <small>обязателен только телефон</small>
              </h2>
              <LeadForm showErrors={showErrors} phoneRef={phoneRef} />
              {/* Ловушка для ботов: человек поле не видит и не заполнит; не display:none — такие боты пропускают. */}
              <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
                <label htmlFor="lead-hp">Оставьте пустым</label>
                <input ref={hpRef} id="lead-hp" name="hp_extra" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>
            </form>
          </div>

          {/* Итог: на телефоне — после формы, на ноутбуке — липкая колонка справа */}
          <aside className="lg:sticky lg:top-[100px]">
            <div className="overflow-hidden rounded-[var(--r-lg)] bg-white shadow-[0_14px_40px_rgba(126,15,69,0.12)]">
              <div className="sum" style={{ borderRadius: 0, display: "block" }}>
                <span className="block">Ориентировочно</span>
                <b className="num block" aria-live="polite" style={{ color: "var(--lime)", marginTop: 4, fontSize: 40, lineHeight: 1 }}>
                  {money(total)}
                </b>
                <small style={{ marginTop: 8 }}>{custom ? "«Индивидуальный» посчитаем отдельно. " : ""}Точную стоимость подтвердим после заявки</small>
              </div>
              <div className="send" style={{ padding: 16 }}>
                <button ref={sendRef} type="submit" form="lead-form" disabled={sending} className="pill pill--hot pill--big2" data-track="lead_submit_btn">
                  {sending ? "Отправляем…" : "Отправить заявку"}
                </button>
                <p className="hint text-center">Менеджер напишет в мессенджер в течение 15 минут, с 7:00 до 23:00. Без созвонов.</p>
                {/* Второй путь: напрямую в мессенджер, мимо базы — поэтому мелко и со счётчиком кликов (data-track). */}
                <p className="hint border-t border-[var(--line)] pt-3 text-center" style={{ fontSize: 14 }}>
                  Удобнее в мессенджере?{" "}
                  <span className="whitespace-nowrap">
                    <a href={whatsappLink(contacts, msgText)} target="_blank" rel="noopener" data-track="lead_msg_wa" className="font-extrabold text-[var(--hot)] underline underline-offset-4">
                      WhatsApp
                    </a>{" "}
                    ·{" "}
                    <a href={telegramLink(contacts, msgText)} target="_blank" rel="noopener" data-track="lead_msg_tg" className="font-extrabold text-[var(--hot)] underline underline-offset-4">
                      Telegram
                    </a>
                  </span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </>
    );

  return (
    <section className="sec sec--cream" style={{ paddingTop: 28 }}>
      <div className="wrap" style={{ maxWidth: showResult || count === 0 ? 600 : undefined }}>
        {body}
      </div>
      {undo && !showResult && (
        <div className="bar bar--undo" key={undo.at} role="status">
          <div className="undo">
            <span>
              Убрали: <b>{undo.l.title}</b>
            </span>
            <button type="button" onClick={restore} data-track="cart_undo">
              Вернуть
            </button>
          </div>
        </div>
      )}
      {hasItems && barVisible && !typing && !undo && (
        <div className="bar">
          {/* Без телефона submit() сам прокрутит к полю и подсветит его. */}
          <button type="button" className="barBtn barBtn--send" disabled={sending} onClick={() => void submit()} data-track="lead_submit_bar">
            <span>{sending ? "Отправляем…" : "Отправить заявку"}</span>
            <span className="barSum num">{money(total)}</span>
          </button>
        </div>
      )}
    </section>
  );
}
