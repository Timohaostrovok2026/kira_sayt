import type { Point } from "@/lib/stats/queries";
import { mskTime } from "@/lib/stats/period";
import { plural } from "@/lib/format";
import { fmtNum, Panel } from "./ui";

/** «Сейчас на сайте» + посетители по часам за сегодня (по Москве). */
export function LiveToday({ live, hours, now }: { live: number; hours: Point[]; now: number }) {
  const n = hours.length || 24;
  const max = Math.max(1, ...hours.map((h) => h.visitors));
  const today = hours.reduce((s, h) => s + h.visitors, 0);
  const peak = hours.reduce<Point | null>((b, h) => (h.visitors && (!b || h.visitors > b.visitors) ? h : b), null);
  const nowHour = hours.findIndex((h) => h.start <= now && now < h.start + 3600_000);

  return (
    <Panel title="Сейчас на сайте" hint="Кто был активен за последние 5 минут" id="live">
      <div className="flex items-center gap-3" aria-live="polite">
        <span className="relative flex h-4 w-4" aria-hidden>
          {live > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-rasp-400 opacity-60" />}
          <span className={`relative h-4 w-4 rounded-full ${live > 0 ? "bg-rasp-500" : "bg-ink-soft/30"}`} />
        </span>
        <span className="font-display text-[48px] font-bold leading-none tracking-tight tabular-nums">{fmtNum(live)}</span>
        <span className="text-[14px] leading-tight text-ink-soft">
          {plural(live, "человек", "человека", "человек")}
          <br />
          на сайте
        </span>
      </div>

      <h3 className="mt-6 text-[14px] font-bold">Сегодня по часам</h3>
      <p className="text-[12.5px] text-ink-soft">
        {fmtNum(today)} {plural(today, "посетитель", "посетителя", "посетителей")}
        {peak && <> · больше всего в {mskTime(peak.start)}</>}
      </p>
      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${n} 100`}
          preserveAspectRatio="none"
          className="block h-24 w-full"
          role="img"
          aria-label={`Посетители сегодня по часам: ${hours
            .filter((h) => h.visitors)
            .map((h) => `${mskTime(h.start)} — ${h.visitors}`)
            .join(", ") || "пока никого"}`}
        >
          <line x1="0" x2={n} y1="100" y2="100" className="stroke-line" vectorEffect="non-scaling-stroke" />
          {hours.map((h, i) => {
            const height = (h.visitors / max) * 94;
            const future = h.start > now;
            return (
              <g key={h.start}>
                <title>
                  {future
                    ? `${mskTime(h.start)}: ещё не наступило`
                    : `${mskTime(h.start)}–${mskTime(h.start + 3600_000)}: ${h.visitors} ${plural(h.visitors, "посетитель", "посетителя", "посетителей")}`}
                </title>
                <rect x={i} y={0} width={1} height={100} fill="transparent" />
                {future ? (
                  <rect x={i + 0.42} y={97} width={0.16} height={3} className="fill-rasp-100" />
                ) : (
                  h.visitors > 0 && (
                    <rect
                      x={i + 0.14}
                      y={100 - height}
                      width={0.72}
                      height={height}
                      className={i === nowHour ? "fill-rasp-600" : "fill-rasp-300"}
                    />
                  )
                )}
              </g>
            );
          })}
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-ink-soft tabular-nums" aria-hidden>
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>
    </Panel>
  );
}
