import type { ReactNode } from "react";
import type { Item, ScrollRow } from "@/lib/stats/queries";
import { Empty, fmtNum, Panel, pct } from "./ui";

/** Список «что чаще всего» с полосками. `share` — показывать долю от суммы вместо числа. */
export function TopList({
  title,
  hint,
  items,
  share = false,
  empty,
  footer,
  limit = 8,
}: {
  title: string;
  hint?: ReactNode;
  items: Item[];
  share?: boolean;
  empty?: ReactNode;
  footer?: ReactNode;
  limit?: number;
}) {
  const max = Math.max(1, ...items.map((x) => x.value));
  const sum = items.reduce((s, x) => s + x.value, 0) || 1;
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  const row = (x: Item) => (
    <li key={x.key} className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 left-0 rounded-xl bg-rasp-50"
        style={{ width: `${(x.value / max) * 100}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3 px-3 py-2">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-snug" title={x.label}>
            {x.label}
          </span>
          {x.sub && <span className="block truncate text-[12.5px] leading-snug text-ink-soft">{x.sub}</span>}
        </span>
        <span className="shrink-0 text-right tabular-nums">
          {share ? (
            <>
              <b className="font-display text-[16px]">{pct(x.value / sum)}</b>
              <span className="block text-[12px] text-ink-soft">{fmtNum(x.value)}</span>
            </>
          ) : (
            <b className="font-display text-[16px]">{fmtNum(x.value)}</b>
          )}
        </span>
      </div>
    </li>
  );
  return (
    <Panel title={title} hint={hint}>
      {!items.length ? (
        <Empty>{empty}</Empty>
      ) : (
        <>
          <ul className="space-y-1">{shown.map(row)}</ul>
          {rest.length > 0 && (
            <details className="group mt-1">
              <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[14px] font-semibold text-rasp-600 hover:bg-rasp-50 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Ещё {rest.length}</span>
                <span className="hidden group-open:inline">Свернуть</span>
              </summary>
              <ul className="space-y-1">{rest.map(row)}</ul>
            </details>
          )}
        </>
      )}
      {footer && <div className="mt-3 text-[13px] text-ink-soft">{footer}</div>}
    </Panel>
  );
}

export function ScrollList({ rows }: { rows: ScrollRow[] }) {
  return (
    <Panel title="Глубина прокрутки" hint="Какая доля просмотров страницы долистала до середины и почти до конца.">
      {!rows.length ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-semibold" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 text-[12.5px] text-ink-soft tabular-nums">{fmtNum(r.views)} просм.</span>
              </div>
              <dl className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-[12.5px] tabular-nums">
                <dt className="text-ink-soft">50%</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-rasp-50" aria-hidden>
                  <div className="h-full rounded-full bg-rasp-300" style={{ width: `${r.d50 * 100}%` }} />
                </dd>
                <dd className="w-10 text-right font-semibold">{pct(r.d50)}</dd>
                <dt className="text-ink-soft">90%</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-rasp-50" aria-hidden>
                  <div className="h-full rounded-full bg-rasp-600" style={{ width: `${r.d90 * 100}%` }} />
                </dd>
                <dd className="w-10 text-right font-semibold">{pct(r.d90)}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
