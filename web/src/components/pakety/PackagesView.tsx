"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Gift, MessageCircle, Shirt, ShoppingBag } from "lucide-react";
import type { Package } from "@/data/catalog";
import { useCatalog, useSite } from "@/lib/catalog-context";
import { PackageCard } from "@/components/cards";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

const FEATURED = "kmvlki0fs";

/** Хит первым, «Индивидуальный» — последним, остальные в порядке каталога. */
function ordered(packages: Package[]): Package[] {
  return [
    ...packages.filter((k) => k.id === FEATURED),
    ...packages.filter((k) => k.id !== FEATURED && !k.custom),
    ...packages.filter((k) => k.id !== FEATURED && k.custom),
  ];
}

type Choices = Record<number, string>;

export function PackagesView() {
  const { state, has, setPackageChoices } = useCart();
  const { packages } = useCatalog();
  const list = ordered(packages);
  // Локальный выбор слотов; если пакет уже в корзине — стартуем с его выбора.
  const [local, setLocal] = useState<Record<string, Choices>>({});

  const choicesOf = (id: string): Choices => local[id] ?? state.packages.find((p) => p.id === id)?.choices ?? {};

  const choose = (id: string, slot: number, ref: string) => {
    const next = { ...choicesOf(id), [slot]: ref };
    setLocal((m) => ({ ...m, [id]: next }));
    // Выбор сразу попадает в пакет, который уже лежит в корзине.
    if (has("package", id)) setPackageChoices(id, next);
  };

  return (
    <div className="stage">
      {/* Короткий первый экран */}
      <section className="wrap pt-10 pb-8 md:pt-16 md:pb-12">
        <p className="eyebrow text-rasp-300">Готовые пакеты</p>
        <h1 className="h-hero mt-3 max-w-4xl">Не хотите собирать? Возьмите готовое</h1>
        <p className="lead mt-4 max-w-2xl text-white/75">
          Пакет всегда дешевле, чем те же позиции по отдельности. Внутри можно выбрать шоу, квест или съёмку.
        </p>
      </section>

      {/* Пакеты: на телефоне — столбиком (внутри карточек свои свайп-ленты с выбором) */}
      <section aria-label="Пакеты" className="wrap pb-12 md:pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {list.map((k) => {
            const featured = k.id === FEATURED;
            return (
              <div
                key={k.id}
                id={k.id}
                className={`flex scroll-mt-24 flex-col [&>article]:flex-1 ${featured ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : ""}`}
              >
                <PackageCard
                  k={k}
                  featured={featured}
                  choices={choicesOf(k.id)}
                  onChoose={(slot, ref) => choose(k.id, slot, ref)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <HowTo customId={list.find((k) => k.custom)?.id} />
      <Compare list={list} choicesOf={choicesOf} />
    </div>
  );
}

/** «Как выбрать героя»: пакет → герой → заявка. Плюс подсказка про «Индивидуальный». */
function HowTo({ customId }: { customId?: string }) {
  const { contacts } = useSite();
  const steps = [
    { icon: Gift, title: "Выберите пакет", text: "И шоу, квест или съёмку внутри" },
    { icon: Shirt, title: "Выберите героя", text: "110+ костюмов, стандартный — без доплаты", href: "/kostyumy", cta: "К героям" },
    { icon: ShoppingBag, title: "Отправьте заявку", text: "Менеджер всё уточнит сам", href: "/korzina", cta: "В корзину" },
  ];
  return (
    <section aria-labelledby="howto" className="wrap reveal pb-12 md:pb-16">
      <h2 id="howto" className="h-card text-[22px] md:text-[26px]">
        Как выбрать героя
      </h2>
      <ol className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const body = (
            <>
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rasp-500">
                <Icon size={22} />
                <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[13px] font-black text-rasp-700">
                  {i + 1}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold leading-tight">{s.title}</span>
                <span className="mt-0.5 block text-[14px] text-white/65">{s.text}</span>
              </span>
              {s.href && (
                <span className="flex shrink-0 items-center gap-1 text-[14px] font-bold text-rasp-300">
                  <span className="sr-only md:not-sr-only">{s.cta}</span>
                  <ArrowRight size={18} />
                </span>
              )}
            </>
          );
          const cls = "flex min-h-[76px] items-center gap-4 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/12";
          return (
            <li key={s.title}>
              {s.href ? (
                <Link href={s.href} data-track={`pakety_step_${i + 1}`} className={`${cls} transition-colors hover:bg-white/[0.12]`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-col gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between md:p-5">
        <p className="text-[15px] leading-snug text-white/75">
          <span className="font-bold text-white">Нужно что-то своё?</span> Пакет «Индивидуальный»: сценарий, любые герои и шоу,
          оформление. Посчитаем после короткого разговора.
        </p>
        <div className="flex gap-2">
          {customId && (
            <a href={`#${customId}`} className="btn btn-sm btn-ghost flex-1 md:flex-none" data-track="pakety_custom_jump">
              Смотреть
            </a>
          )}
          <a
            href={contacts.telegram}
            target="_blank"
            rel="noopener"
            className="btn btn-sm btn-light flex-1 md:flex-none"
            data-track="pakety_custom_tg"
          >
            <MessageCircle size={18} /> Обсудить
          </a>
        </div>
      </div>
    </section>
  );
}

/** Сравнение: отдельно → в пакете → выгода. Учитывает текущий выбор в слотах. */
function Compare({ list, choicesOf }: { list: Package[]; choicesOf: (id: string) => Choices }) {
  const { packagePrice } = useCatalog();
  const rows = list.filter((k) => !k.custom).map((k) => ({ k, ...packagePrice(k, choicesOf(k.id)) }));
  return (
    <section aria-labelledby="compare" className="wrap reveal pb-16 md:pb-24">
      <h2 id="compare" className="h-card text-[22px] md:text-[26px]">
        Сколько вы экономите
      </h2>
      <p className="mt-1 text-[15px] text-white/60">Цены с учётом того, что вы выбрали внутри пакета.</p>
      <ul className="mt-4 overflow-hidden rounded-2xl bg-white text-ink">
        {rows.map(({ k, full, price, save }) => (
          <li key={k.id} className="border-b border-line last:border-0">
            <a
              href={`#${k.id}`}
              className="flex flex-col gap-1.5 p-4 transition-colors hover:bg-rasp-50 sm:flex-row sm:items-center sm:gap-4 md:px-5"
            >
              <span className="font-display text-[17px] font-semibold sm:w-44 sm:shrink-0">{k.name}</span>
              <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                <span className="text-ink-soft">
                  отдельно <s className="tabular-nums">{money(full)}</s>
                </span>
                <ArrowRight size={16} className="text-ink-soft" aria-hidden />
                <span>
                  в пакете <b className="price text-[17px]">{money(price)}</b>
                </span>
              </span>
              {save > 0 && (
                <span className="self-start rounded-full bg-rasp-500 px-3 py-1 text-[14px] font-bold text-white tabular-nums sm:self-auto">
                  выгода {money(save)}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
