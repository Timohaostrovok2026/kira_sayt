"use client";

import { Photo } from "@/components/Photo";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronRight, Gift, PartyPopper, Shirt, Sparkles, X } from "lucide-react";
import {
  AGE_GROUPS,
  EXTRA_GROUPS,
  SPECIAL_EXTRAS,
  type AgeGroupId,
  type ExtraGroup,
  type Kind,
  type Program,
  ageFits,
  minPrice,
  showFitsProgram,
} from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import type { Season } from "@/data/site";
import { ExtraCard, ProgramCard } from "@/components/cards";
import { useCart, type CartLine } from "@/lib/cart";
import { money, plural } from "@/lib/format";
import { orderedKinds, type StepN } from "./model";

/* ---------- Общие кусочки ---------- */

/** Ряд чипсов со свайпом на телефоне. */
function ChipRow({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
      {children}
    </div>
  );
}

export function PackHint() {
  return (
    <Link
      href="/pakety"
      data-track="builder_to_packages"
      className="group mt-8 flex items-center gap-3 rounded-[22px] bg-rasp-50 p-4 ring-1 ring-rasp-200 transition-colors hover:bg-rasp-100"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rasp-500 text-white">
        <Gift size={22} />
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block font-bold">Не хотите собирать?</span>
        <span className="block text-[15px] text-ink-soft">Готовые пакеты со скидкой до 20%</span>
      </span>
      <ChevronRight size={22} className="shrink-0 text-rasp-500 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-ink-soft">{text}</p>
      {action}
    </div>
  );
}

const grid = "grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3";

/* ---------- Шаг 1. Возраст ---------- */

const AGE_IMG: Record<AgeGroupId, string> = { "1-3": "h005", "4-6": "h046", "7-10": "h042", "11-15": "h113" };

export function AgeStep({ age, onAge }: { age: AgeGroupId | null; onAge: (a: AgeGroupId | null) => void }) {
  const { programs, costumeImg } = useCatalog();
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {AGE_GROUPS.map((g, i) => {
          const on = g.id === age;
          const n = programs.filter((p) => ageFits(p, g.id)).length;
          const [num, word] = g.label.split(" ");
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onAge(g.id)}
              aria-pressed={on}
              className={`stage group relative aspect-[3/4] animate-rise overflow-hidden rounded-[24px] text-left shadow-lg shadow-rasp-900/20 transition-transform duration-300 active:scale-[0.97] ${
                on ? "ring-4 ring-rasp-500 ring-offset-2 ring-offset-paper" : ""
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Photo
                src={costumeImg(AGE_IMG[g.id])}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 240px"
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rasp-950 via-rasp-950/70 to-transparent p-4 pt-16">
                <span className="block font-display text-[34px] font-bold leading-none tracking-tight">{num}</span>
                <span className="mt-1 block text-[15px] font-semibold">{word}</span>
                <span className="mt-1 block text-[13px] text-white/65">
                  {n} {plural(n, "программа", "программы", "программ")}
                </span>
              </span>
              {on && (
                <span className="absolute right-3 top-3 grid h-9 w-9 animate-pop place-items-center rounded-full bg-white text-rasp-600">
                  <Check size={20} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex justify-center">
        <button type="button" onClick={() => onAge(null)} className="btn btn-soft" data-track="builder_age_skip">
          Пропустить <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}

/* ---------- Шаг 2. Программа ---------- */

export function ProgramStep({
  age,
  kind,
  season,
  onKind,
}: {
  age: AgeGroupId | null;
  kind: Kind | null;
  season: Season;
  onKind: (k: Kind | null) => void;
}) {
  const { programs } = useCatalog();
  const list = programs.filter((p) => ageFits(p, age));
  const kinds = orderedKinds(season)
    .map((k) => ({ ...k, items: list.filter((p) => p.kind === k.id) }))
    .filter((k) => k.items.length > 0);
  const active = kinds.find((k) => k.id === kind) ?? null;

  if (!list.length) return <Empty text="Для этого возраста пока нет программ." />;

  return (
    <>
      <ChipRow label="Вид программы">
        <button type="button" className="chip" aria-pressed={!active} onClick={() => onKind(null)}>
          Все <span className="opacity-60">{list.length}</span>
        </button>
        {kinds.map((k) => (
          <button key={k.id} type="button" className="chip" aria-pressed={active?.id === k.id} onClick={() => onKind(k.id)}>
            {k.title}
            <span className="text-[13px] font-medium opacity-70">от {money(minPrice(k.items))}</span>
          </button>
        ))}
      </ChipRow>

      {active ? (
        <div key={active.id} className={`${grid} animate-rise`}>
          {active.items.map((p) => (
            <ProgramCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {kinds.map((k) => (
            <section key={k.id} aria-labelledby={`kind-${k.slug}`}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 id={`kind-${k.slug}`} className="font-display text-[22px] font-bold leading-tight tracking-tight">
                    {k.title}
                  </h3>
                  <p className="text-[15px] text-ink-soft">{k.blurb}</p>
                </div>
                {k.items.length > 1 && (
                  <button type="button" onClick={() => onKind(k.id)} className="shrink-0 py-2 text-[15px] font-bold text-rasp-600 lg:hidden">
                    Все {k.items.length}
                  </button>
                )}
              </div>
              <div className="rail lg:mx-0 lg:grid-flow-row lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3">
                {k.items.map((p) => (
                  <div key={p.id} className="flex w-[268px] lg:w-auto [&>article]:flex-1">
                    <ProgramCard p={p} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <PackHint />
    </>
  );
}

/* ---------- Шаг 3. Шоу ---------- */

export function ShowStep({ age, program, onStep }: { age: AgeGroupId | null; program: Program | null; onStep: (n: StepN) => void }) {
  const { extras } = useCatalog();
  const shows = extras.filter((e) => e.group === "Шоу" && !SPECIAL_EXTRAS.has(e.id) && ageFits(e, age) && showFitsProgram(e, program));
  return (
    <>
      {program ? (
        <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-4 py-2 text-[15px] shadow-sm ring-1 ring-line">
          <Sparkles size={16} className="shrink-0 text-rasp-500" />
          <span className="truncate">
            Подходят к «<b>{program.name}</b>»
          </span>
        </p>
      ) : (
        <button type="button" onClick={() => onStep(2)} className="mb-5 inline-flex items-center gap-2 text-[15px] font-semibold text-rasp-600">
          Сначала выбрать программу <ArrowRight size={16} />
        </button>
      )}
      {shows.length ? (
        <div className={grid}>
          {shows.map((e) => (
            <ExtraCard key={e.id} e={e} />
          ))}
        </div>
      ) : (
        <Empty text="Под этот возраст шоу нет. Идём дальше!" />
      )}
      <PackHint />
    </>
  );
}

/* ---------- Шаг 4. Мастер-классы и допы ---------- */

export function ExtrasStep({ age, program }: { age: AgeGroupId | null; program: Program | null }) {
  const [group, setGroup] = useState<ExtraGroup | null>(null);
  const { extras } = useCatalog();
  const list = extras.filter((e) => e.group !== "Шоу" && !SPECIAL_EXTRAS.has(e.id) && ageFits(e, age) && showFitsProgram(e, program));
  const groups = EXTRA_GROUPS.filter((g) => g.id !== "Шоу")
    .map((g) => ({ ...g, items: list.filter((e) => e.group === g.id) }))
    .filter((g) => g.items.length > 0);
  const active = groups.find((g) => g.id === group) ?? null;

  return (
    <>
      <ChipRow label="Раздел">
        <button type="button" className="chip" aria-pressed={!active} onClick={() => setGroup(null)}>
          Все
        </button>
        {groups.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={active?.id === g.id} onClick={() => setGroup(g.id)}>
            {g.title} <span className="opacity-60">{g.items.length}</span>
          </button>
        ))}
      </ChipRow>
      <div className="flex flex-col gap-9">
        {(active ? [active] : groups).map((g) => (
          <section key={g.id} aria-label={g.title} className="animate-rise">
            {!active && <h3 className="mb-3 font-display text-[22px] font-bold leading-tight tracking-tight">{g.title}</h3>}
            <div className={grid}>
              {g.items.map((e) => (
                <ExtraCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ---------- Шаг 5. Готово ---------- */

function useRemove() {
  const { toggleProgram, setExtra, removePackage, toggleCostume } = useCart();
  return (l: CartLine) => {
    if (l.type === "program") toggleProgram(l.id);
    else if (l.type === "extra") setExtra(l.id, 0);
    else if (l.type === "package") removePackage(l.id);
    else if (l.type === "costume") toggleCostume(l.id);
  };
}

export function DoneStep({ onStep }: { onStep: (n: StepN) => void }) {
  const { lines, total, ready, state } = useCart();
  const remove = useRemove();
  const hasBase = state.programs.length > 0 || state.packages.length > 0;

  if (ready && !lines.length)
    return (
      <Empty
        text="Пока пусто. Начните с программы — это пара касаний."
        action={
          <button type="button" className="btn btn-primary" onClick={() => onStep(2)}>
            Выбрать программу <ArrowRight size={18} />
          </button>
        }
      />
    );

  return (
    <div className="flex flex-col gap-5">
      <ul className="card divide-y divide-line overflow-hidden">
        {lines.map((l) => (
          <li key={l.key} className="flex animate-rise items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">
                {l.title}
                {l.qty > 1 && <span className="text-ink-soft"> × {l.qty}</span>}
              </p>
              {l.subtitle && <p className="truncate text-[14px] text-ink-soft">{l.subtitle}</p>}
            </div>
            {l.price > 0 && <span className="price shrink-0 text-[17px]">{money(l.price)}</span>}
            {l.type !== "mkad" && l.type !== "sound" && (
              <button
                type="button"
                onClick={() => remove(l)}
                aria-label={`Убрать «${l.title}»`}
                className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-rasp-50 hover:text-rasp-600"
              >
                <X size={18} />
              </button>
            )}
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-rasp-50 p-4">
          <span className="font-bold">Итого</span>
          <span className="price text-[26px] text-rasp-700">{money(total)}</span>
        </li>
      </ul>

      {!hasBase && (
        <button type="button" onClick={() => onStep(2)} className="flex items-center gap-3 rounded-[22px] bg-white p-4 text-left ring-1 ring-rasp-200">
          <PartyPopper size={22} className="shrink-0 text-rasp-500" />
          <span className="flex-1 font-semibold">Добавьте программу — основу праздника</span>
          <ChevronRight size={20} className="text-rasp-500" />
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/korzina" className="btn btn-primary btn-lg w-full sm:w-auto" data-track="builder_checkout">
          Оформить заявку <ArrowRight size={20} />
        </Link>
        <Link href="/kostyumy" className="btn btn-soft btn-lg w-full sm:w-auto" data-track="builder_add_hero">
          <Shirt size={20} /> Добавить героя
        </Link>
      </div>
      <p className="text-[14px] text-ink-soft">Цена — ориентир. Точную сумму подтвердим после заявки.</p>
    </div>
  );
}
