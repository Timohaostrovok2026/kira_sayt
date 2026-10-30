"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, Clock, Minus, Plus, Users } from "lucide-react";
import { type Costume, type Extra, type Package, type Program, ageText, slotRef } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { Photo } from "@/components/Photo";
import { ChoiceSheet } from "@/components/ChoiceSheet";
import { splitWords } from "@/components/SplitWords";

export function SectionHead({
  eyebrow,
  title,
  text,
  action,
  dark = false,
  center = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  action?: React.ReactNode;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <header
      className={`reveal reveal-words mb-6 flex flex-col gap-3 md:mb-10 ${center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className={`eyebrow mb-3 ${dark ? "text-rasp-300" : "text-rasp-600"}`}>{eyebrow}</p>}
        {/* Заголовок проявляется по словам, когда блок попадает на экран */}
        <h2 className="h-section">{splitWords(title)}</h2>
        {text && <p className={`lead mt-3 ${dark ? "text-white/70" : "text-ink-soft"}`}>{text}</p>}
      </div>
      {action}
    </header>
  );
}

/** Кнопка «в корзину ↔ выбрано». */
export function AddToggle({
  on,
  onClick,
  label = "Выбрать",
  onLabel = "Выбрано",
  size = "btn-sm",
  track,
}: {
  on: boolean;
  onClick: () => void;
  label?: string;
  onLabel?: string;
  size?: string;
  track?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-track={track}
      className={`btn ${size} ${on ? "bg-ink text-white hover:bg-ink/90" : "btn-primary"}`}
    >
      {on ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
      {on ? onLabel : label}
    </button>
  );
}

/** Карточка программы: фото героя на сцене, возраст, цена, выбор. */
export function ProgramCard({ p, compact = false }: { p: Program; compact?: boolean }) {
  const { has, toggleProgram } = useCart();
  const { programCover } = useCatalog();
  const on = has("program", p.id);
  return (
    <article data-tilt className={`card group relative flex flex-col overflow-hidden ${compact ? "w-[260px]" : ""}`}>
      <Link href={`/programmy/${p.id}`} className="stage relative block aspect-[4/3] overflow-hidden" data-track={`program_open_${p.id}`}>
        <Photo
          src={programCover(p.id)}
          alt=""
          fill
          sizes="(max-width: 768px) 80vw, 320px"
          className="object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/35 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur-md">
          {p.kind}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-rasp-700">
          {ageText(p)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/programmy/${p.id}`} className="h-card hover:text-rasp-600">
          {p.name}
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} /> {p.dur.replace(/\s*\(.*\)/, "")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={15} /> {p.art}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="price text-[20px]">
            {/^от\s/i.test(p.dur) ? "от " : ""}
            {money(p.price)}
          </span>
          <AddToggle on={on} onClick={() => toggleProgram(p.id)} track={`program_add_${p.id}`} />
        </div>
      </div>
    </article>
  );
}

/** Карточка героя: фото на малиновом фоне сливается со сценой. */
export function CostumeCard({ c, size = "md" }: { c: Costume; size?: "sm" | "md" }) {
  const { has, toggleCostume } = useCart();
  const { costumeImg } = useCatalog();
  const on = has("costume", c.id);
  return (
    <article
      data-tilt
      className={`group relative overflow-hidden rounded-[22px] bg-rasp-900 text-white ${size === "sm" ? "w-[160px] sm:w-[190px]" : ""}`}
    >
      <div className="relative aspect-[3/4]">
        <Photo
          src={costumeImg(c.id)}
          alt={c.name}
          fill
          sizes={size === "sm" ? "190px" : "(max-width: 640px) 50vw, 240px"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rasp-950/95 via-rasp-950/60 to-transparent p-3 pt-12">
          <h3 className="text-[15px] font-bold leading-tight">{c.name}</h3>
          <p className="mt-0.5 text-[12px] text-white/60">{c.cat}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleCostume(c.id)}
          aria-pressed={on}
          aria-label={on ? `Убрать героя ${c.name}` : `Выбрать героя ${c.name}`}
          data-track={`costume_add_${c.id}`}
          className={`absolute right-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-full shadow-lg transition-all duration-300 active:scale-90 ${on ? "bg-white text-rasp-600" : "bg-rasp-500 text-white"}`}
        >
          {on ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
        </button>
      </div>
    </article>
  );
}

/** Шоу, мастер-класс или доп: строка с ценой и счётчиком. */
export function ExtraCard({ e }: { e: Extra }) {
  const { state, setExtra } = useCart();
  const qty = state.extras[e.id] ?? 0;
  const perUnit = /шт|ребёнка|слайм|тыкву|позицию|сот|детей/.test(e.unit ?? "");
  return (
    <article data-tilt className="card group relative flex flex-col gap-3 overflow-hidden p-4">
      {e.photo && (
        <div className="relative -mx-4 -mt-4 aspect-[16/10] overflow-hidden bg-rasp-100">
          <Photo
            tone="light"
            src={e.photo}
            alt={e.name}
            fill
            sizes="(max-width: 768px) 85vw, 340px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="h-card text-[17px]">{e.name}</h3>
          <p className="mt-1 text-[14px] text-ink-soft">
            {[e.dur, ageText(e) !== "любой возраст" ? ageText(e) : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {e.how && <p className="line-clamp-3 text-[15px] leading-snug text-ink/80">{e.how.split("\n\n")[0]}</p>}
      <div className="mt-auto flex items-center justify-between gap-3">
        <span>
          <span className="price text-[18px]">{money(e.price)}</span>
          {e.unit && <span className="ml-1.5 text-[13px] text-ink-soft">{e.unit}</span>}
        </span>
        {perUnit && qty > 0 ? (
          <div className="flex items-center gap-1 rounded-full bg-rasp-100 p-1">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white text-rasp-700" onClick={() => setExtra(e.id, qty - 1)} aria-label="Меньше">
              <Minus size={16} strokeWidth={3} />
            </button>
            <span className="min-w-8 text-center font-bold tabular-nums">{qty}</span>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-rasp-500 text-white" onClick={() => setExtra(e.id, qty + 1)} aria-label="Больше">
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <AddToggle on={qty > 0} onClick={() => setExtra(e.id, qty > 0 ? 0 : 1)} label="Добавить" onLabel="Добавлено" track={`extra_add_${e.id}`} />
        )}
      </div>
    </article>
  );
}

/** Пакет: состав, выгода, выбор вариантов в слотах. */
export function PackageCard({
  k,
  choices = {},
  onChoose,
  featured = false,
}: {
  k: Package;
  choices?: Record<number, string>;
  onChoose?: (slot: number, ref: string) => void;
  featured?: boolean;
}) {
  const { has, addPackage, removePackage } = useCart();
  const { anyItem, packagePrice } = useCatalog();
  const on = has("package", k.id);
  const pr = packagePrice(k, choices);
  // Какой слот сейчас выбирают в шторке (null — шторка закрыта).
  const [picking, setPicking] = useState<number | null>(null);
  const pickItem = picking != null ? k.items[picking] : null;
  return (
    <article
      className={`relative flex w-full min-w-0 flex-col gap-4 rounded-[28px] p-5 md:p-6 ${featured ? "bg-white text-ink shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.6)]" : "glass text-white"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${featured ? "bg-rasp-500 text-white" : "bg-white/15 text-white"}`}>
          {k.custom ? "Под ваш сценарий" : k.disc ? `Скидка ${k.disc}%` : "Пакет"}
        </span>
        {featured && <span className="eyebrow text-rasp-600">Хит</span>}
      </div>
      <div>
        <h3 className="font-display text-[28px] font-bold leading-none tracking-tight">{k.name}</h3>
        <p className={`mt-2 text-[15px] leading-snug ${featured ? "text-ink-soft" : "text-white/70"}`}>{k.tag}</p>
      </div>
      {!k.custom && (
        <ul className="flex flex-col gap-2">
          {k.items.map((it, i) => {
            const ref = slotRef(it, choices[i]);
            const opts = it.alts ? [it.ref, ...it.alts] : null;
            return (
              <li key={i} className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-start gap-2 text-[15px] font-medium">
                  <Check size={18} strokeWidth={3} className={`mt-0.5 shrink-0 ${featured ? "text-rasp-500" : "text-rasp-300"}`} />
                  {anyItem(ref)?.name}
                </span>
                {/* Вариант меняется в шторке — без ряда чипсов карточка короче и спокойнее */}
                {opts && onChoose && (
                  <button
                    type="button"
                    onClick={() => setPicking(i)}
                    data-track={`package_slot_${k.id}`}
                    aria-label={`Сменить: ${anyItem(ref)?.name ?? ""}`}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded-full pr-2.5 pl-3 text-[13px] font-semibold transition-colors ${
                      featured ? "bg-rasp-50 text-rasp-700 hover:bg-rasp-100" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    Сменить <ChevronDown size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(k.note || k.custom) && <p className={`text-[14px] ${featured ? "text-ink-soft" : "text-white/60"}`}>{k.note}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-2">
        <div>
          {k.custom ? (
            <span className="price text-[24px]">По запросу</span>
          ) : (
            <>
              {pr.save > 0 && <s className={`block text-[14px] tabular-nums ${featured ? "text-ink-soft" : "text-white/50"}`}>{money(pr.full)}</s>}
              <span className="price text-[28px] leading-none">{money(pr.price)}</span>
            </>
          )}
        </div>
        <button
          type="button"
          aria-pressed={on}
          data-track={`package_add_${k.id}`}
          onClick={() => (on ? removePackage(k.id) : addPackage(k.id, choices))}
          className={`btn ${on ? (featured ? "bg-ink text-white" : "bg-white text-rasp-700") : featured ? "btn-primary" : "btn-light"}`}
        >
          {on ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
          {on ? "В корзине" : "Выбрать"}
        </button>
      </div>
      {pickItem && picking != null && onChoose && (
        <ChoiceSheet
          title="Выберите вариант"
          value={slotRef(pickItem, choices[picking])}
          options={[pickItem.ref, ...(pickItem.alts ?? [])].map((id) => ({ id, name: anyItem(id)?.name ?? id, price: anyItem(id)?.price }))}
          onPick={(ref) => onChoose(picking, ref)}
          onClose={() => setPicking(null)}
        />
      )}
    </article>
  );
}
