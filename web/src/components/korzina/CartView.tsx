"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Send, Undo2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money, plural } from "@/lib/format";
import { flushNow, track, visitorId } from "@/lib/track";
import { CartLines, type Removed } from "./CartLines";
import { CartOptions } from "./CartOptions";
import { EmptyCart } from "./EmptyCart";
import { LeadForm } from "./LeadForm";
import { LeadResult, type LeadResultData } from "./LeadResult";
import { buildLeadText, phoneValid, telegramLink, whatsappLink } from "./lead";
import { useCatalog, useSite } from "@/lib/catalog-context";

export function CartView() {
  const cart = useCart();
  const cat = useCatalog();
  const { contacts } = useSite();
  const { state, lines, total, count, ready, clear } = cart;

  const [result, setResult] = useState<LeadResultData | null>(null);
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [undo, setUndo] = useState<{ label: string; restore: Parameters<Removed>[1]; at: number } | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Отмена удаления: 5 секунд на «Вернуть».
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  const onRemoved = useCallback<Removed>((label, restore) => setUndo({ label, restore, at: Date.now() }), []);

  // Липкая панель на телефоне видна, пока итоговая карточка ниже экрана.
  const hasItems = ready && count > 0 && !result;
  useEffect(() => {
    const el = summaryRef.current;
    if (!hasItems || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setBarVisible(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [hasItems]);

  const custom = lines.some((l) => l.type === "package" && l.price === 0);
  const okPhone = phoneValid(state.form.phone);
  // Текст заявки: уходит с формой и в ссылки «в мессенджер» под ней.
  const msgText = buildLeadText(state, lines, total, cat);

  const focusPhone = () => {
    const el = phoneRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };

  async function submit() {
    if (sending) return;
    if (!okPhone) {
      setShowErrors(true);
      focusPhone();
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
        body: JSON.stringify({ visitor: visitorId(), name: state.form.name.trim(), phone: state.form.phone, total, text, payload: state }),
        signal: ctrl.signal,
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; id?: number } | null;
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

  if (result) return <LeadResult r={result} onBack={() => setResult(null)} />;

  if (!ready) {
    return (
      <div className="wrap py-10" aria-busy="true" aria-label="Загружаем корзину">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-rasp-100" />
        <div className="mt-6 h-40 animate-pulse rounded-[24px] bg-rasp-100/70" />
        <div className="mt-4 h-28 animate-pulse rounded-[24px] bg-rasp-100/50" />
      </div>
    );
  }

  if (count === 0) return <EmptyCart />;

  const submitLabel = sending ? "Отправляем…" : "Отправить заявку";

  return (
    <>
      <section className="wrap pt-8 pb-12 md:pt-12 md:pb-20">
        <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="eyebrow text-rasp-600">Корзина</p>
            <h1 className="h-section mt-2">Ваш праздник</h1>
          </div>
          <p className="pb-1 text-[15px] font-semibold text-ink-soft tabular-nums">
            {count} {plural(count, "позиция", "позиции", "позиций")}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
            <CartLines onRemoved={onRemoved} />
            <CartOptions />

            <form
              id="lead-form"
              ref={formRef}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              onFocus={(e) => {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) setTyping(true);
              }}
              onBlur={() => setTyping(false)}
              aria-labelledby="lead-title"
              className="scroll-mt-24"
            >
              <h2 id="lead-title" className="px-1 font-display text-[22px] font-semibold">
                Куда прислать ответ
              </h2>
              <p className="mt-1 mb-4 px-1 text-[15px] text-ink-soft">Обязателен только телефон. Остальное — если знаете.</p>
              <LeadForm showErrors={showErrors} phoneRef={phoneRef} />
            </form>
          </div>

          {/* Итог: на телефоне — в конце, на десктопе — липкая колонка справа */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
            <div ref={summaryRef} className="card overflow-hidden">
              <div className="stage-soft p-5">
                <p className="text-[15px] font-semibold text-white/70">Ориентировочно</p>
                <p className="price mt-1 text-[38px] leading-none" aria-live="polite">
                  {money(total)}
                </p>
                {custom && <p className="mt-2 text-[14px] text-white/80">+ «Индивидуальный» посчитаем отдельно</p>}
                <p className="mt-3 text-[14px] leading-snug text-white/70">Точную стоимость подтвердим после заявки</p>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <button
                  type="submit"
                  form="lead-form"
                  disabled={sending}
                  data-track="lead_submit_btn"
                  className="btn btn-lg btn-primary w-full disabled:opacity-70"
                >
                  {sending ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />}
                  {submitLabel}
                </button>
                <p className="text-center text-[13px] leading-snug text-ink-soft">
                  Менеджер напишет в мессенджер и всё уточнит. Без созвонов.
                </p>
                {/* Второй путь (раунд 15): часть мам не любит формы. Такая заявка идёт мимо базы — поэтому мелко и со счётчиком. */}
                <p className="border-t border-line pt-3 text-center text-[14px] text-ink-soft">
                  Удобнее в мессенджере?{" "}
                  <span className="whitespace-nowrap">
                    <a
                      href={whatsappLink(contacts, msgText)}
                      target="_blank"
                      rel="noopener"
                      data-track="lead_msg_wa"
                      className="font-semibold text-rasp-600 underline decoration-rasp-200 underline-offset-4 hover:decoration-rasp-600"
                    >
                      WhatsApp
                    </a>{" "}
                    ·{" "}
                    <a
                      href={telegramLink(contacts, msgText)}
                      target="_blank"
                      rel="noopener"
                      data-track="lead_msg_tg"
                      className="font-semibold text-rasp-600 underline decoration-rasp-200 underline-offset-4 hover:decoration-rasp-600"
                    >
                      Telegram
                    </a>
                  </span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Низ экрана на телефоне: «Вернуть» после удаления + липкая кнопка заявки над нижней навигацией */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+8px)] z-30 flex flex-col gap-2 px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[380px] lg:px-0">
        {undo && (
          <div
            key={undo.at}
            role="status"
            className="pointer-events-auto mx-auto flex w-full max-w-md animate-pop items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-white shadow-2xl"
          >
            <span className="min-w-0 flex-1 truncate text-[15px]">
              Убрали: <span className="font-semibold">{undo.label}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                undo.restore(cart);
                setUndo(null);
              }}
              data-track="cart_undo"
              className="btn btn-sm shrink-0 bg-white/10 text-white hover:bg-white/20"
            >
              <Undo2 size={18} /> Вернуть
            </button>
          </div>
        )}
        {barVisible && !typing && (
          <div className="pointer-events-auto mx-auto flex w-full max-w-md animate-pop items-center gap-3 rounded-[22px] bg-white p-2 pl-4 shadow-[0_12px_40px_-10px_rgb(66_2_15/0.45)] ring-1 ring-line lg:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-ink-soft">Ориентировочно</span>
              <span className="price block truncate text-[20px] leading-tight">{money(total)}</span>
            </span>
            {okPhone ? (
              <button
                type="submit"
                form="lead-form"
                disabled={sending}
                data-track="lead_submit_bar"
                className="btn btn-primary shrink-0 px-5 disabled:opacity-70"
              >
                {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                {submitLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (state.form.name.trim()) focusPhone();
                  else {
                    const name = formRef.current?.querySelector<HTMLInputElement>("#lead-name");
                    name?.scrollIntoView({ behavior: "smooth", block: "center" });
                    name?.focus({ preventScroll: true });
                  }
                }}
                data-track="lead_bar_to_form"
                className="btn btn-primary shrink-0 px-5"
              >
                Оформить <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
