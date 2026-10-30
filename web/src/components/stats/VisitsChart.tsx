import type { Point } from "@/lib/stats/queries";
import { mskDay, mskDayLong, mskTime } from "@/lib/stats/period";
import { plural } from "@/lib/format";
import { Empty, fmtNum, Panel } from "./ui";

type Bucket = "hour" | "day" | "week";

function label(p: Point, b: Bucket, long = false) {
  if (b === "hour") return mskTime(p.start);
  if (b === "week") return `нед. с ${mskDay(p.start)}`;
  return long ? mskDayLong(p.start) : mskDay(p.start);
}

function tip(p: Point, b: Bucket) {
  const parts = [
    `${fmtNum(p.sessions)} ${plural(p.sessions, "визит", "визита", "визитов")}`,
    `${fmtNum(p.visitors)} ${plural(p.visitors, "посетитель", "посетителя", "посетителей")}`,
  ];
  if (p.leads) parts.push(`${p.leads} ${plural(p.leads, "заявка", "заявки", "заявок")}`);
  return `${label(p, b, true)}: ${parts.join(", ")}`;
}

/** Простые столбики на SVG, без библиотек. Подсказки — через <title>. */
export function VisitsChart({ points, bucket, now }: { points: Point[]; bucket: Bucket; now: number }) {
  const title = bucket === "hour" ? "Визиты по часам" : bucket === "week" ? "Визиты по неделям" : "Визиты по дням";
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.sessions));
  const total = points.reduce((s, p) => s + p.sessions, 0);
  const leads = points.reduce((s, p) => s + p.leads, 0);
  const best = points.reduce<Point | null>((b, p) => (!b || p.sessions > b.sessions ? p : b), null);
  // Подписи по оси X: 3–5 штук.
  const ticks =
    bucket === "hour"
      ? [0, 6, 12, 18, 23].filter((i) => i < n)
      : n <= 1
        ? [0]
        : [...new Set([0, Math.round((n - 1) / 2), n - 1])];

  return (
    <Panel
      title={title}
      hint={
        <>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rasp-300 align-middle" aria-hidden /> визиты
          <span className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rasp-600 align-middle" aria-hidden />{" "}
          {bucket === "hour" ? "часы" : "дни"} с заявками · время московское
        </>
      }
      id="chart"
    >
      {!total ? (
        <Empty />
      ) : (
        <>
          <div className="relative">
            <span className="absolute left-0 top-0 rounded bg-white/85 pr-1 text-[11px] font-semibold text-ink-soft tabular-nums">
              {fmtNum(max)}
            </span>
            <svg
              viewBox={`0 0 ${n} 100`}
              preserveAspectRatio="none"
              className="block h-40 w-full sm:h-48"
              role="img"
              aria-label={`${title}: всего ${fmtNum(total)} визитов${best ? `, больше всего — ${label(best, bucket, true)} (${fmtNum(best.sessions)})` : ""}`}
            >
              <line x1="0" x2={n} y1="8" y2="8" className="stroke-line" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={n} y1="54" y2="54" className="stroke-line" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={n} y1="100" y2="100" className="stroke-line" vectorEffect="non-scaling-stroke" />
              {points.map((p, i) => {
                const h = (p.sessions / max) * 92;
                const future = p.start > now;
                return (
                  <g key={p.start}>
                    <title>{future ? `${label(p, bucket)}: ещё не наступило` : tip(p, bucket)}</title>
                    <rect x={i} y={0} width={1} height={100} fill="transparent" />
                    {p.sessions > 0 && (
                      <rect
                        x={i + (n > 40 ? 0.1 : 0.16)}
                        y={100 - h}
                        width={n > 40 ? 0.8 : 0.68}
                        height={h}
                        rx={0}
                        className={p.leads ? "fill-rasp-600" : "fill-rasp-300"}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] text-ink-soft tabular-nums" aria-hidden>
            {ticks.map((i) => {
              const left = ((i + 0.5) / n) * 100;
              const edge = i === 0 ? "translate-x-0" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span
                  key={i}
                  className={`absolute top-0 whitespace-nowrap ${edge}`}
                  style={{ left: i === 0 ? 0 : i === n - 1 ? "100%" : `${left}%` }}
                >
                  {label(points[i], bucket)}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-ink-soft">
            Всего {fmtNum(total)} {plural(total, "визит", "визита", "визитов")}
            {leads > 0 && (
              <>
                {" "}
                и {leads} {plural(leads, "заявка", "заявки", "заявок")}
              </>
            )}
            {best && best.sessions > 0 && (
              <>
                . Пик — {label(best, bucket, true)}: {fmtNum(best.sessions)}
              </>
            )}
            .
          </p>
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Период</th>
                <th scope="col">Визиты</th>
                <th scope="col">Посетители</th>
                <th scope="col">Заявки</th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter((p) => p.start <= now)
                .map((p) => (
                  <tr key={p.start}>
                    <th scope="row">{label(p, bucket, true)}</th>
                    <td>{p.sessions}</td>
                    <td>{p.visitors}</td>
                    <td>{p.leads}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}
