"use client";

import { Photo } from "@/components/Photo";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { type Costume, largePhoto } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { AddToggle } from "@/components/cards";
import { useCart } from "@/lib/cart";

/**
 * Подробности героя: на телефоне — шторка снизу, на десктопе — окно.
 * Листается стрелками, клавишами ← → и свайпом по фото.
 */
export function HeroSheet({
  list,
  index,
  onIndex,
  onClose,
}: {
  list: Costume[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { has, toggleCostume } = useCart();
  const { costumeImg } = useCatalog();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const c = list[index];
  const total = list.length;
  const on = c ? has("costume", c.id) : false;
  const go = (d: number) => {
    if (total > 1) onIndex((index + d + total) % total);
  };

  // Открываем как модальное окно (фон становится inert), блокируем прокрутку страницы,
  // по закрытию возвращаем фокус туда, откуда пришли.
  useEffect(() => {
    const dlg = dialogRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    if (dlg && !dlg.open) dlg.showModal();
    // Фокус — на видимую кнопку «Закрыть» (на телефоне и десктопе они разные).
    const closers = dlg?.querySelectorAll<HTMLButtonElement>("[data-close]") ?? [];
    Array.from(closers).find((b) => b.offsetParent !== null)?.focus();
    return () => {
      if (dlg?.open) dlg.close();
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  if (!c) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="hero-sheet-title"
      aria-describedby="hero-sheet-desc"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div className="flex h-full items-end justify-center md:items-center md:p-8">
        {/* Подложка: клик закрывает */}
        <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-rasp-950/70 backdrop-blur-sm" />

        <div className="relative flex max-h-[94dvh] w-full animate-rise flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl shadow-black/40 md:max-h-[min(720px,calc(100dvh-64px))] md:max-w-[880px] md:flex-row md:rounded-[32px]">
          {/* Фото на сцене */}
          <div
            className="stage relative h-[52dvh] shrink-0 touch-pan-y select-none md:aspect-[3/4] md:h-[min(600px,calc(100dvh-64px))] md:w-auto"
            onTouchStart={(e) => {
              const t = e.touches[0];
              touch.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              const s = touch.current;
              touch.current = null;
              if (!s) return;
              const t = e.changedTouches[0];
              const dx = t.clientX - s.x;
              const dy = t.clientY - s.y;
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
            }}
          >
            <span className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/35 md:hidden" aria-hidden="true" />
            <div key={c.id} className="absolute inset-0 animate-pop">
              <Photo
                src={largePhoto(costumeImg(c.id))}
                alt={c.name}
                fill
                loading="eager"
                sizes="(min-width: 768px) 450px, 100vw"
                className="object-contain object-bottom md:object-cover md:object-center"
                draggable={false}
              />
            </div>

            {total > 1 && (
              <>
                <span className="absolute left-4 top-4 z-10 rounded-full bg-black/30 px-3 py-1 text-[13px] font-semibold tabular-nums text-white backdrop-blur-md">
                  {index + 1} / {total}
                </span>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Предыдущий герой"
                  className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45 active:scale-90"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Следующий герой"
                  className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/45 active:scale-90"
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </>
            )}

            <button
              data-close
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-lg transition-transform active:scale-90 md:hidden"
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>

          {/* Текст и выбор */}
          <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:p-8">
            <button
              data-close
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-5 top-5 hidden h-11 w-11 place-items-center rounded-full bg-rasp-50 text-ink transition-colors hover:bg-rasp-100 md:grid"
            >
              <X size={22} strokeWidth={2.5} />
            </button>

            <div className="md:pr-12">
              <p className="eyebrow flex items-center gap-2 text-rasp-600">
                {c.cat}
              </p>
              <h2 id="hero-sheet-title" className="mt-2 font-display text-[26px] font-bold leading-[1.1] tracking-tight md:text-[34px]">
                {c.name}
              </h2>
            </div>

            <p id="hero-sheet-desc" className="text-[17px] leading-relaxed text-ink/85">
              {c.t}
            </p>

            <p className="flex gap-3 rounded-2xl bg-rasp-50 p-4 text-[15px] leading-snug text-ink/80">
              <Sparkles size={20} className="mt-0.5 shrink-0 text-rasp-500" />
              <span>Герой подходит к любой анимационной программе. Костюм уже входит в её стоимость.</span>
            </p>

            <div className="mt-auto flex flex-col gap-2 pt-1">
              <AddToggle
                on={on}
                onClick={() => toggleCostume(c.id)}
                label="Выбрать героя"
                onLabel="Выбрано"
                size="btn-lg w-full"
                track={`costume_sheet_add_${c.id}`}
              />
              {on && (
                <Link href="/sobrat" data-track="costume_sheet_to_programs" className="btn btn-soft w-full">
                  Подобрать программу <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
