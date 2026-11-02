"use client";

import { Photo } from "@/components/Photo";
import Link from "next/link";
import { ArrowRight, Camera, Gift, Minus, Palette, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { type CartLine, useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { isPerUnit } from "./lead";

type CartApi = ReturnType<typeof useCart>;
/** restore получает актуальный useCart(): старые замыкания видят устаревшую корзину. */
export type Removed = (label: string, restore: (c: CartApi) => void) => void;

const EXTRA_ICON = {
  Шоу: Sparkles,
  "Мастер-классы": Palette,
  "Подарки и реквизит": Gift,
  Съёмка: Camera,
  "Опции и услуги": SlidersHorizontal,
} as const;

export function CartLines({ onRemoved }: { onRemoved: Removed }) {
  const { lines } = useCart();
  const by = (t: CartLine["type"]) => lines.filter((l) => l.type === t);
  const programs = by("program");
  const pkgs = by("package");
  const extras = by("extra");
  const heroes = by("costume");

  return (
    <div className="flex flex-col gap-6">
      <Group title="Программы" items={programs} onRemoved={onRemoved} />
      <Group title="Пакеты" items={pkgs} onRemoved={onRemoved} />
      <Group title="Шоу и допы" items={extras} onRemoved={onRemoved} />
      <Group title="Герои" note="Стандарт — без доплаты" items={heroes} onRemoved={onRemoved} />

      {/* Подсказки, чего не хватает */}
      {(programs.length > 0 || pkgs.length > 0) && heroes.length === 0 && (
        <Hint href="/kostyumy" track="cart_hint_hero" title="Какой герой придёт?" text="Выберите из 110+ костюмов" />
      )}
      {programs.length === 0 && pkgs.length === 0 && (
        <Hint href="/sobrat" track="cart_hint_program" title="Добавьте программу" text="Анимация, квест или вечеринка" />
      )}
    </div>
  );
}

function Hint({ href, title, text, track }: { href: string; title: string; text: string; track: string }) {
  return (
    <Link
      href={href}
      data-track={track}
      className="flex min-h-[68px] items-center gap-3 rounded-[20px] border-2 border-dashed border-rasp-200 p-4 text-ink transition-colors hover:border-rasp-400 hover:bg-white"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rasp-100 text-rasp-600">
        <Plus size={20} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-tight">{title}</span>
        <span className="block text-[14px] text-ink-soft">{text}</span>
      </span>
      <ArrowRight size={20} className="shrink-0 text-rasp-500" />
    </Link>
  );
}

function Group({ title, note, items, onRemoved }: { title: string; note?: string; items: CartLine[]; onRemoved: Removed }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="font-display text-[18px] font-semibold">{title}</span>
        <span className="text-[14px] font-semibold text-ink-soft tabular-nums">{items.length}</span>
        {note && <span className="ml-auto text-[13px] text-ink-soft">{note}</span>}
      </h2>
      <ul className="card divide-y divide-line overflow-hidden">
        {items.map((l) => (
          <Row key={l.key} l={l} onRemoved={onRemoved} />
        ))}
      </ul>
    </section>
  );
}

function Thumb({ l }: { l: CartLine }) {
  const { costumeImg, programCover, extraById } = useCatalog();
  if (l.type === "costume" || l.type === "program") {
    return (
      <span className="relative block h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-rasp-900">
        <Photo
          src={l.type === "costume" ? costumeImg(l.id) : programCover(l.id)}
          alt=""
          fill
          sizes="48px"
          className="object-cover object-[50%_20%]"
        />
      </span>
    );
  }
  const Icon = l.type === "package" ? Gift : (EXTRA_ICON[extraById[l.id]?.group as keyof typeof EXTRA_ICON] ?? Sparkles);
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rasp-100 text-rasp-600">
      <Icon size={22} />
    </span>
  );
}

function Row({ l, onRemoved }: { l: CartLine; onRemoved: Removed }) {
  const { state, toggleProgram, setExtra, removePackage, toggleCostume } = useCart();
  const { extraById } = useCatalog();
  const e = l.type === "extra" ? extraById[l.id] : undefined;
  const stepper = !!e && isPerUnit(e.unit);

  const remove = () => {
    if (l.type === "program") {
      toggleProgram(l.id);
      onRemoved(l.title, (c) => !c.has("program", l.id) && c.toggleProgram(l.id));
    } else if (l.type === "extra") {
      const qty = l.qty;
      setExtra(l.id, 0);
      onRemoved(l.title, (c) => c.setExtra(l.id, qty));
    } else if (l.type === "package") {
      const choices = state.packages.find((p) => p.id === l.id)?.choices ?? {};
      removePackage(l.id);
      onRemoved(l.title, (c) => c.addPackage(l.id, choices));
    } else if (l.type === "costume") {
      toggleCostume(l.id);
      onRemoved(l.title, (c) => !c.has("costume", l.id) && c.toggleCostume(l.id));
    }
  };

  return (
    <li className="flex gap-3 p-3 pr-2 sm:p-4 sm:pr-3">
      <Thumb l={l} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[16px] font-bold leading-snug">
              {l.title}
            </p>
            {l.subtitle && l.type !== "extra" && l.type !== "costume" && (
              <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">{l.subtitle}</p>
            )}
            {e && (
              <p className="mt-0.5 text-[14px] text-ink-soft">
                {money(e.price)} {e.unit}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label={`Убрать: ${l.title}`}
            data-track={`cart_remove_${l.id}`}
            className="-mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-rasp-50 hover:text-rasp-600"
          >
            <X size={20} />
          </button>
        </div>

        {l.type !== "costume" && (
          <div className="flex items-center justify-between gap-3 pr-2">
            {stepper ? (
              <div className="flex items-center gap-1 rounded-full bg-rasp-100 p-1">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-rasp-700 disabled:opacity-40"
                  onClick={() => setExtra(l.id, l.qty - 1)}
                  disabled={l.qty <= 1}
                  aria-label={`Меньше: ${l.title}`}
                >
                  <Minus size={18} strokeWidth={3} />
                </button>
                <span className="min-w-9 text-center text-[17px] font-bold tabular-nums" aria-live="polite">
                  {l.qty}
                </span>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full bg-rasp-500 text-white"
                  onClick={() => setExtra(l.id, l.qty + 1)}
                  aria-label={`Больше: ${l.title}`}
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <span />
            )}
            <span className="text-right">
              {l.type === "package" && l.price === 0 ? (
                <span className="text-[15px] font-semibold text-ink-soft">Посчитаем</span>
              ) : (
                <>
                  {l.fullPrice != null && l.fullPrice > l.price && (
                    <s className="mr-2 text-[14px] text-ink-soft tabular-nums">{money(l.fullPrice)}</s>
                  )}
                  <span className="price text-[18px]">{money(l.price)}</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
