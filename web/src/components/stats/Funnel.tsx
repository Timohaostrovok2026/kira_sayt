import type { Funnel as FunnelData } from "@/lib/stats/queries";
import { Empty, fmtNum, Panel, pct } from "./ui";

export function Funnel({ data }: { data: FunnelData }) {
  const first = data.steps[0]?.value ?? 0;
  const failed = data.failed || Math.max(0, data.submitted - data.succeeded);
  return (
    <Panel
      title="Воронка"
      hint="Сколько визитов дошли до каждого шага. Кто прошёл дальше, засчитан и на прошлых шагах."
      id="funnel"
    >
      {!first ? (
        <Empty />
      ) : (
        <ol className="space-y-1">
          {data.steps.map((s, i) => {
            const share = first ? s.value / first : 0;
            const prev = i > 0 ? data.steps[i - 1].value : 0;
            const lost = i > 0 ? Math.max(0, prev - s.value) : 0;
            return (
              <li key={s.label}>
                {i > 0 && (
                  <p className="py-1 pl-3 text-[12.5px] text-ink-soft" aria-label={`Ушли до этого шага: ${lost}`}>
                    ↓ ушли {fmtNum(lost)}
                    {prev ? ` (${pct(lost / prev)})` : ""}
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="font-semibold">
                    <span className="mr-1.5 text-ink-soft tabular-nums">{i + 1}.</span>
                    {s.label}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <b className="font-display text-[17px]">{fmtNum(s.value)}</b>
                    <span className="ml-1.5 text-[13px] text-ink-soft">{pct(share, share < 0.1 ? 1 : 0)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-rasp-50" aria-hidden>
                  <div
                    className={`h-full rounded-full ${i === data.steps.length - 1 ? "bg-rasp-600" : "bg-rasp-400"}`}
                    style={{ width: `${Math.max(share * 100, s.value ? 1.5 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {data.submitted > 0 && (
        <p className={`mt-4 rounded-2xl p-3 text-[13px] ${failed ? "bg-rasp-100 text-rasp-800" : "bg-paper text-ink-soft"}`}>
          Нажали «Отправить» {fmtNum(data.submitted)} раз, успешно ушло {fmtNum(data.succeeded)}.
          {failed > 0 && <b> {fmtNum(failed)} не отправились — проверьте форму.</b>}
        </p>
      )}
    </Panel>
  );
}
