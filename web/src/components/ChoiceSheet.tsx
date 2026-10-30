"use client";

import { useEffect, useId, useRef } from "react";
import { Check, X } from "lucide-react";
import { money } from "@/lib/format";

export type ChoiceOption = { id: string; name: string; price?: number };

/**
 * Выбор варианта (например, шоу в пакете): на телефоне — шторка снизу, на ноутбуке — окно.
 * Закрывается по Esc, по фону и после выбора; фокус возвращается на кнопку, которая открыла.
 */
export function ChoiceSheet({
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  title: string;
  options: ChoiceOption[];
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dlg = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    // gutter — чтобы страница не прыгала вбок, когда пропадает полоса прокрутки.
    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    if (dlg && !dlg.open) dlg.showModal();
    dlg?.querySelector<HTMLButtonElement>("[aria-pressed='true']")?.focus();
    return () => {
      if (dlg?.open) dlg.close();
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Если окно закрылось в обход Esc (например, браузером) — всё равно убираем шторку и блокировку прокрутки.
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div className="flex h-full items-end justify-center md:items-center md:p-8">
        <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-rasp-950/70 backdrop-blur-sm" />
        <div className="relative flex max-h-[85dvh] w-full animate-rise flex-col rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:max-w-md md:rounded-[28px]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id={titleId} className="h-card text-[18px]">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rasp-50 text-ink">
              <X size={20} />
            </button>
          </div>
          <ul className="flex flex-col gap-2 overflow-y-auto p-4">
            {options.map((o) => {
              const on = o.id === value;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onPick(o.id);
                      onClose();
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      on ? "bg-ink text-white" : "bg-rasp-50 hover:bg-rasp-100"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${on ? "bg-white text-ink" : "ring-2 ring-rasp-200"}`}
                    >
                      {on && <Check size={15} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 text-[16px] font-semibold leading-snug">{o.name}</span>
                    {o.price != null && (
                      <span className={`price shrink-0 text-[15px] ${on ? "text-white/80" : "text-ink-soft"}`}>{money(o.price)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
