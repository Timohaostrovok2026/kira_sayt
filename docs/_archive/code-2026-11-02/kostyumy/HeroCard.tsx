"use client";

import { Photo } from "@/components/Photo";
import { Check, Plus } from "lucide-react";
import type { Costume } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { useCart } from "@/lib/cart";

/**
 * Карточка героя для каталога: выглядит как CostumeCard,
 * но тап по фото открывает подробности, а «+» — выбирает героя.
 */
export function HeroCard({ c, index, onOpen }: { c: Costume; index: number; onOpen: (id: string) => void }) {
  const { has, toggleCostume } = useCart();
  const { costumeImg } = useCatalog();
  const on = has("costume", c.id);
  // Первые ряды грузим сразу, остальное — лениво по мере прокрутки.
  const eager = index < 5;
  return (
    <article
      className={`group relative overflow-hidden rounded-[22px] bg-rasp-900 text-white transition-shadow duration-300 ${
        on ? "shadow-[0_0_0_3px_var(--color-paper),0_0_0_6px_var(--color-rasp-500)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(c.id)}
        aria-haspopup="dialog"
        aria-label={`${c.name} — подробнее`}
        className="relative block aspect-[3/4] w-full cursor-zoom-in text-left focus-visible:outline-offset-[-3px]"
      >
        <Photo
          src={costumeImg(c.id)}
          alt={c.name}
          fill
          sizes="(min-width: 1280px) 232px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={index < 2 ? "high" : undefined}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-rasp-950/95 via-rasp-950/60 to-transparent p-3 pt-12">
          <span className="block text-[15px] font-bold leading-tight">{c.name}</span>
          <span className="mt-0.5 block text-[12px] text-white/60">{c.cat}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggleCostume(c.id)}
        aria-pressed={on}
        aria-label={on ? `Убрать героя ${c.name}` : `Выбрать героя ${c.name}`}
        data-track={`costume_add_${c.id}`}
        className={`absolute right-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-full shadow-lg transition-all duration-300 active:scale-90 ${
          on ? "bg-white text-rasp-600" : "bg-rasp-500 text-white hover:bg-rasp-600"
        }`}
      >
        {on ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
      </button>
    </article>
  );
}
