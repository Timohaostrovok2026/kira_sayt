import type { Kpi } from "@/lib/stats/queries";
import { fmtNum, pct } from "./ui";

type Key = keyof Kpi;

const TILES: { key: Key; label: string; hint: string; wide?: boolean; accent?: boolean }[] = [
  { key: "visitors", label: "Посетители", hint: "Разные люди (устройства)" },
  { key: "sessions", label: "Визиты", hint: "Заходы на сайт" },
  { key: "pageviews", label: "Просмотры страниц", hint: "Всего открытых страниц" },
  { key: "adds", label: "Добавления в корзину", hint: "Нажали «Добавить»" },
  { key: "leads", label: "Заявки", hint: "Отправили форму", accent: true },
  { key: "contacts", label: "Клики по контактам", hint: "Телефон, мессенджеры" },
  { key: "conversion", label: "Конверсия визит → заявка", hint: "Заявки ÷ визиты", wide: true },
];

function Delta({ cur, prev, points }: { cur: number; prev: number; points?: boolean }) {
  if (points) {
    const d = (cur - prev) * 100;
    if (Math.abs(d) < 0.05) return <span className="text-ink-soft">как раньше</span>;
    const up = d > 0;
    return (
      <span className={up ? "font-bold text-rasp-600" : "font-semibold text-ink-soft"}>
        {up ? "▲" : "▼"} {Math.abs(d).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} п.п.
      </span>
    );
  }
  if (!prev && !cur) return <span className="text-ink-soft">—</span>;
  if (!prev) return <span className="font-bold text-rasp-600">▲ новое</span>;
  const d = (cur - prev) / prev;
  if (Math.abs(d) < 0.005) return <span className="text-ink-soft">как раньше</span>;
  const up = d > 0;
  return (
    <span className={up ? "font-bold text-rasp-600" : "font-semibold text-ink-soft"}>
      {up ? "▲" : "▼"} {pct(Math.abs(d))}
    </span>
  );
}

export function Kpis({ cur, prev, prevLabel }: { cur: Kpi; prev: Kpi | null; prevLabel: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILES.map((t) => {
        const isConv = t.key === "conversion";
        const value = isConv ? pct(cur[t.key], 1) : fmtNum(cur[t.key]);
        const prevValue = prev ? (isConv ? pct(prev[t.key], 1) : fmtNum(prev[t.key])) : null;
        return (
          <li
            key={t.key}
            className={`card flex flex-col p-4 ${t.wide ? "col-span-2" : ""} ${t.accent ? "ring-2 ring-rasp-200" : ""}`}
          >
            <span className="text-[13px] font-semibold leading-tight text-ink-soft">{t.label}</span>
            <span
              className={`mt-1.5 font-display text-[28px] font-bold leading-none tracking-tight tabular-nums sm:text-[34px] ${
                t.accent ? "text-rasp-600" : ""
              }`}
            >
              {value}
            </span>
            <span className="mt-auto pt-2 text-[12.5px] leading-snug">
              {prev && prevValue != null ? (
                <>
                  <Delta cur={cur[t.key]} prev={prev[t.key]} points={isConv} />
                  <span className="text-ink-soft">
                    {" "}
                    · {prevLabel}: {prevValue}
                  </span>
                </>
              ) : (
                <span className="text-ink-soft">{t.hint}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
