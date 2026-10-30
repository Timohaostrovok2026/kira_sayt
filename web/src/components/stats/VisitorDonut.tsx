"use client";

import { useState } from "react";
import type { Segments } from "@/lib/stats/queries";

type SegKey = "left" | "interested" | "potential";

const SEGS: { key: SegKey; label: string; hint: string; stroke: string; swatch: string }[] = [
  { key: "left", label: "Зашли и ушли", hint: "Только смотрели, ничего не нажимали", stroke: "stroke-rasp-200", swatch: "bg-rasp-200" },
  { key: "interested", label: "Интересовались", hint: "Нажимали, листали героев, собирали корзину", stroke: "stroke-rasp-400", swatch: "bg-rasp-400" },
  { key: "potential", label: "Потенциальные клиенты", hint: "Оставили заявку или нажали позвонить/написать", stroke: "stroke-rasp-600", swatch: "bg-rasp-600" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
const pct = (x: number) => `${Math.round(x * 100)}%`;

const CSS = `
@keyframes uly-donut-in { from { stroke-dasharray: 0 100; } }
.uly-donut-seg { animation: uly-donut-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; transition: opacity .2s, stroke-width .2s; }
`;

/** Большой бублик: как распределились посетители за период. Легенда — кнопки, нажатие подсвечивает сектор. */
export function VisitorDonut({ data }: { data: Segments }) {
  const [active, setActive] = useState<SegKey | null>(null);
  const total = data.total;
  const R = 15.915; // длина окружности = 100
  const lens = SEGS.map((s) => (total ? (data[s.key] / total) * 100 : 0));
  const arcs = SEGS.map((s, i) => {
    const len = lens[i];
    const before = lens.slice(0, i).reduce((a, b) => a + b, 0);
    const gap = len > 2 ? 0.8 : 0;
    return { ...s, v: data[s.key], len: Math.max(0, len - gap), offset: 25 - before };
  });
  const cur = active ? arcs.find((a) => a.key === active)! : null;
  const summary =
    `Всего зашло ${fmt(total)}: ` + arcs.map((a) => `${a.label.toLowerCase()} ${fmt(a.v)} (${pct(total ? a.v / total : 0)})`).join(", ");

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
      <style>{CSS}</style>
      <div className="relative w-full max-w-[260px] shrink-0 md:w-[240px]">
        <svg viewBox="0 0 42 42" className="block h-auto w-full" role="img" aria-label={summary}>
          <circle cx="21" cy="21" r={R} fill="none" className="stroke-rasp-50" strokeWidth="6" />
          {total > 0 &&
            arcs.map((a) =>
              a.len > 0 ? (
                <circle
                  key={a.key}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  strokeWidth={active === a.key ? 7.2 : 6}
                  strokeDasharray={`${a.len} ${100 - a.len}`}
                  strokeDashoffset={a.offset}
                  className={`uly-donut-seg ${a.stroke} cursor-pointer`}
                  style={{ opacity: active && active !== a.key ? 0.3 : 1 }}
                  onClick={() => setActive(active === a.key ? null : a.key)}
                >
                  <title>{`${a.label}: ${fmt(a.v)} (${pct(a.v / total)})`}</title>
                </circle>
              ) : null,
            )}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden>
          <div>
            <div className="font-display text-[40px] font-bold leading-none tracking-tight tabular-nums sm:text-[44px]">
              {fmt(cur ? cur.v : total)}
            </div>
            <div className="mx-auto mt-1.5 max-w-[9.5rem] text-[13px] font-semibold leading-tight text-ink-soft">
              {cur ? `${cur.label.toLowerCase()} · ${pct(total ? cur.v / total : 0)}` : "всего зашло"}
            </div>
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {arcs.map((a) => {
          const share = total ? a.v / total : 0;
          return (
            <li key={a.key}>
              <button
                type="button"
                aria-pressed={active === a.key}
                onClick={() => setActive(active === a.key ? null : a.key)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-rasp-50 aria-pressed:bg-rasp-50 aria-pressed:shadow-[inset_0_0_0_1.5px_var(--color-rasp-200)]"
              >
                <span className={`h-4 w-4 shrink-0 rounded-md ${a.swatch}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold leading-snug">{a.label}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-soft">{a.hint}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <b className="block font-display text-[20px] leading-none">{fmt(a.v)}</b>
                  <span className="text-[13px] font-semibold text-ink-soft">{pct(share)}</span>
                </span>
              </button>
              {a.key === "potential" && a.v > 0 && (
                <dl className="ml-10 mr-3 mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-l-2 border-rasp-200 pl-3 text-[14px]">
                  <dt>Оставили заявку</dt>
                  <dd className="text-right font-bold tabular-nums">{fmt(data.leads)}</dd>
                  <dt>Нажали позвонить/написать</dt>
                  <dd className="text-right font-bold tabular-nums">{fmt(data.contacts)}</dd>
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
