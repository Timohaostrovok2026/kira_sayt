"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { money, plural } from "@/lib/format";
import { STEPS, type StepN } from "./model";

function countText(n: number) {
  return n ? `${n} ${plural(n, "позиция", "позиции", "позиций")}` : "Пока пусто";
}

function NextButton({ step, onNext, className }: { step: StepN; onNext: () => void; className: string }) {
  if (step === 5)
    return (
      <Link href="/korzina" className={`btn btn-primary ${className}`} data-track="builder_bar_checkout">
        Оформить <ArrowRight size={18} />
      </Link>
    );
  return (
    <button type="button" onClick={onNext} className={`btn btn-primary ${className}`} data-track={`builder_next_${step}`}>
      {step === 4 ? "Готово" : "Дальше"} <ArrowRight size={18} />
    </button>
  );
}

/** Липкая плашка на телефоне: сумма, сколько выбрано, «Дальше». */
export function SummaryBar({ step, onNext }: { step: StepN; onNext: () => void }) {
  const { total, count, ready } = useCart();
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+8px)] z-30 mx-auto max-w-md lg:hidden">
      <div className="flex items-center gap-2 rounded-[24px] bg-ink p-2 pl-4 text-white shadow-2xl shadow-rasp-900/40 ring-1 ring-white/10">
        <Link href="/korzina" className="min-w-0 flex-1 py-1" aria-label="Открыть корзину">
          <span className="block text-[12px] leading-tight text-white/60">{ready ? countText(count) : "\u00a0"}</span>
          <span key={total} className="price block animate-pop text-[20px] leading-tight">
            {money(ready ? total : 0)}
          </span>
        </Link>
        <NextButton step={step} onNext={onNext} className="min-h-[52px] px-6" />
      </div>
    </div>
  );
}

/** Боковая панель на десктопе. */
export function SummaryPanel({ step, onNext }: { step: StepN; onNext: () => void }) {
  const { lines, total, count, ready } = useCart();
  const shown = lines.slice(0, 7);
  return (
    <aside className="hidden lg:block" aria-label="Ваш праздник">
      <div className="card sticky top-[calc(var(--header-h)+96px)] flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-rasp-600">Ваш праздник</p>
          <span className="text-[13px] text-ink-soft">{ready ? countText(count) : ""}</span>
        </div>
        {ready && lines.length ? (
          <ul className="flex flex-col gap-2 text-[15px]">
            {shown.map((l) => (
              <li key={l.key} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{l.title}</span>
                {l.price > 0 && <span className="shrink-0 tabular-nums text-ink-soft">{money(l.price)}</span>}
              </li>
            ))}
            {lines.length > shown.length && <li className="text-ink-soft">и ещё {lines.length - shown.length}</li>}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-soft">Выбирайте — всё появится здесь.</p>
        )}
        <div className="flex items-end justify-between border-t border-line pt-4">
          <span className="font-semibold">Итого</span>
          <span key={total} className="price animate-pop text-[26px] leading-none text-rasp-700">
            {money(ready ? total : 0)}
          </span>
        </div>
        <NextButton step={step} onNext={onNext} className="btn-lg w-full" />
        {step < 5 && (
          <p className="-mt-1 text-center text-[13px] text-ink-soft">
            Дальше: {STEPS[step as 1 | 2 | 3 | 4].tab.toLowerCase()}
          </p>
        )}
        {count > 0 && step < 5 && (
          <Link href="/korzina" className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-rasp-600 hover:text-rasp-700">
            <ShoppingBag size={17} /> Перейти в корзину
          </Link>
        )}
      </div>
    </aside>
  );
}
