import { Phone } from "lucide-react";
import type { Lead } from "@/lib/stats/queries";
import { mskDateTime } from "@/lib/stats/period";
import { money } from "@/lib/format";
import { Empty, Panel } from "./ui";

export function LeadsList({ leads }: { leads: Lead[] }) {
  const lost = leads.filter((l) => !l.delivered).length;
  return (
    <Panel
      title="Последние заявки"
      hint={
        lost ? (
          <span className="font-semibold text-rasp-700">
            {lost} из последних {leads.length} не дошли до Telegram — перезвоните по ним.
          </span>
        ) : (
          "Нажмите на заявку, чтобы увидеть её целиком. Время московское."
        )
      }
      id="leads"
    >
      {!leads.length ? (
        <Empty>Заявок пока нет</Empty>
      ) : (
        <div className="-mx-1">
          <div
            className="hidden grid-cols-[3.5rem_8.5rem_1fr_11rem_7rem_7.5rem] gap-3 px-3 pb-2 text-[12px] font-semibold text-ink-soft md:grid"
            aria-hidden
          >
            <span>№</span>
            <span>Время</span>
            <span>Имя</span>
            <span>Телефон</span>
            <span className="text-right">Сумма</span>
            <span>Telegram</span>
          </div>
          <ul className="divide-y divide-line">
            {leads.map((l) => (
              <li key={l.id}>
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-2xl px-3 py-3 hover:bg-paper md:grid-cols-[3.5rem_8.5rem_1fr_11rem_7rem_7.5rem] md:items-center [&::-webkit-details-marker]:hidden">
                    <span className="text-[13px] text-ink-soft tabular-nums md:text-[14px]">
                      №{l.id}
                      <span className="md:hidden"> · {mskDateTime(l.ts)}</span>
                    </span>
                    <span className="hidden text-[14px] tabular-nums md:block">{mskDateTime(l.ts)}</span>
                    <span className="col-start-1 truncate text-[16px] font-semibold md:col-start-auto">
                      {l.name || "Без имени"}
                    </span>
                    <a
                      href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}
                      className="col-start-1 inline-flex items-center gap-1.5 justify-self-start text-[15px] font-semibold text-rasp-600 underline-offset-2 hover:underline md:col-start-auto"
                    >
                      <Phone size={14} aria-hidden />
                      {l.phone}
                    </a>
                    <span className="col-start-2 row-span-2 row-start-1 text-right font-display text-[16px] font-bold tabular-nums md:col-start-auto md:row-span-1 md:row-start-auto">
                      {l.total ? money(l.total) : "—"}
                    </span>
                    <span className="col-start-2 row-start-3 text-right text-[12.5px] md:col-start-auto md:row-start-auto md:text-left">
                      {l.delivered ? (
                        <span className="text-ink-soft">✓ доставлена</span>
                      ) : (
                        <span className="rounded-full bg-rasp-100 px-2 py-0.5 font-bold text-rasp-700">не дошла</span>
                      )}
                    </span>
                  </summary>
                  <pre className="mx-3 mb-3 whitespace-pre-wrap break-words rounded-2xl bg-paper p-4 font-sans text-[14px] leading-relaxed">
                    {l.text}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
