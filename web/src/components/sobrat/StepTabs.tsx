"use client";

import { Check } from "lucide-react";
import { STEPS, type StepN } from "./model";

/** Прогресс конструктора: пять кружков на линии, каждый — кнопка-переход. */
export function StepTabs({ step, done, onStep }: { step: StepN; done: Record<StepN, boolean>; onStep: (n: StepN) => void }) {
  return (
    <nav aria-label="Шаги конструктора" className="sticky top-[var(--header-h)] z-30 border-b border-white/10 bg-rasp-950/92 text-white backdrop-blur-xl">
      <div className="wrap relative max-w-3xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-4 top-[25px] md:inset-x-8">
          <span className="absolute left-[10%] right-[10%] h-[3px] rounded-full bg-white/15" />
          <span
            className="absolute left-[10%] h-[3px] rounded-full bg-rasp-500 transition-[width] duration-500 ease-[var(--ease-out)]"
            style={{ width: `${(step - 1) * 20}%` }}
          />
        </div>
        <ol className="relative grid grid-cols-5">
        {STEPS.map((s) => {
          const n = s.n as StepN;
          const active = n === step;
          const ok = done[n] && !active;
          return (
            <li key={n} className="relative">
              <button
                type="button"
                onClick={() => onStep(n)}
                aria-current={active ? "step" : undefined}
                aria-label={`Шаг ${n}: ${s.tab}${ok ? ", готово" : ""}`}
                className="flex min-h-[64px] w-full flex-col items-center justify-start gap-1 pt-2.5 pb-2"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[14px] font-bold transition-all duration-300 ${
                    active
                      ? "scale-110 bg-rasp-500 text-white ring-4 ring-rasp-500/30"
                      : ok
                        ? "bg-white text-rasp-700"
                        : "bg-rasp-900 text-white/70 ring-1 ring-white/20"
                  }`}
                >
                  {ok ? <Check size={16} strokeWidth={3.5} /> : n}
                </span>
                <span className={`text-[11px] font-semibold leading-tight sm:text-[13px] ${active ? "text-white" : "text-white/60"}`}>{s.tab}</span>
              </button>
            </li>
          );
        })}
        </ol>
      </div>
    </nav>
  );
}
