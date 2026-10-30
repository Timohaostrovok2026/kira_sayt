"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Phone, RefreshCw, TriangleAlert } from "lucide-react";
import { refreshLeads, setLeadStatus, type LeadResult, type LeadsResult } from "@/app/admin/leads-actions";
import { ADMIN_LEADS_LIMIT, LEAD_STATUSES, countByStatus, leadLost, lostAndNew, type AdminLead, type LeadStatus } from "@/data/leads";
import { money, plural } from "@/lib/format";
import { useAdmin } from "./ui";

/** Цвета статусов — только бренд и ink (DESIGN.md §2): новая кричит, отказ уходит в тень. */
const BADGE: Record<LeadStatus, string> = {
  new: "bg-rasp-500 text-white",
  work: "bg-rasp-100 text-rasp-700",
  agreed: "bg-ink text-white",
  refused: "bg-white text-ink-soft ring-1 ring-line",
};
const PLURAL: Record<LeadStatus, string> = { new: "Новые", work: "В работе", agreed: "Согласованы", refused: "Отказ" };

type Filter = LeadStatus | "all";

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function LeadsTab({ leads, setLeads }: { leads: AdminLead[]; setLeads: Dispatch<SetStateAction<AdminLead[]>> }) {
  const { notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<number | "refresh" | null>(null);

  const run = async (p: Promise<LeadsResult | LeadResult>, key: number | "refresh", okText?: string) => {
    setBusy(key);
    try {
      const r = await p;
      if (r.ok) {
        if ("lead" in r) setLeads((all) => all.map((l) => (l.id === r.lead.id ? r.lead : l)));
        else setLeads(r.leads);
        if (okText) notify(okText);
      } else notify(r.error, true);
    } catch {
      notify("Нет связи с сервером. Проверьте интернет.", true);
    } finally {
      setBusy(null);
    }
  };

  // Вкладку держат открытой весь день — вернулись к ней, подтягиваем новые заявки.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      refreshLeads()
        .then((r) => r.ok && setLeads(r.leads))
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [setLeads]);

  const counts = countByStatus(leads);
  const alarm = lostAndNew(leads);
  const shown = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <>
      {alarm.length > 0 && (
        <div className="mb-4 flex gap-3 rounded-2xl bg-rasp-700 px-4 py-3 text-white" role="alert">
          <TriangleAlert size={22} className="mt-0.5 shrink-0" aria-hidden />
          <p className="text-[15px] leading-snug">
            <span className="font-bold">
              {alarm.length === 1
                ? `Заявка №${alarm[0].id} не дошла`
                : `${alarm.length} ${plural(alarm.length, "заявка", "заявки", "заявок")} не дошли`}{" "}
              до Telegram.
            </span>{" "}
            Сайт пробует дослать их двое суток после отправки. Не ждите — позвоните клиенту и переведите заявку «В работу».
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          Все <Count n={leads.length} on={filter === "all"} />
        </button>
        {LEAD_STATUSES.map((s) => (
          <button key={s.id} type="button" className="chip" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
            {PLURAL[s.id]} <Count n={counts[s.id]} on={filter === s.id} />
          </button>
        ))}
        <button
          type="button"
          className="chip ml-auto"
          onClick={() => run(refreshLeads(), "refresh", "Список обновлён")}
          disabled={busy === "refresh"}
          aria-label="Обновить список"
          title="Обновить список"
        >
          <RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} aria-hidden />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {!shown.length ? (
        <p className="card px-5 py-10 text-center text-[16px] text-ink-soft">
          {leads.length ? "В этом статусе заявок нет" : "Заявок пока нет. Как только клиент отправит корзину, она появится здесь."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((l) => (
            <LeadRow key={l.id} l={l} busy={busy === l.id} onStatus={(s) => run(setLeadStatus(l.id, s), l.id)} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-center text-[13px] text-ink-soft">Последние {ADMIN_LEADS_LIMIT} заявок · время московское</p>
    </>
  );
}

function Count({ n, on }: { n: number; on: boolean }) {
  return <span className={`text-[13px] tabular-nums ${on ? "text-white/75" : "text-ink-soft"}`}>{n}</span>;
}

function LeadRow({ l, busy, onStatus }: { l: AdminLead; busy: boolean; onStatus: (s: LeadStatus) => void }) {
  const lost = leadLost(l);
  const label = LEAD_STATUSES.find((s) => s.id === l.status)?.label;
  return (
    <li className={`card overflow-hidden ${lost ? "ring-2 ring-rasp-500" : ""}`}>
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 px-4 py-3.5 hover:bg-rasp-50/60 [&::-webkit-details-marker]:hidden">
          <span className="text-[13px] text-ink-soft tabular-nums">
            №{l.id} · {l.when}
          </span>
          <span className="text-right font-display text-[16px] font-bold tabular-nums">{l.total ? money(l.total) : "—"}</span>
          <span className="truncate text-[17px] font-semibold">{l.name || "Без имени"}</span>
          <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-[13px] font-bold ${BADGE[l.status]}`}>{label}</span>
          {/* Номер — текстом: ссылка внутри summary — интерактив в интерактиве; звонок — кнопкой в раскрытой заявке. */}
          <span className="inline-flex items-center gap-1.5 justify-self-start text-[15px] font-semibold tabular-nums">
            <Phone size={14} className="text-rasp-500" aria-hidden />
            {l.phone}
          </span>
          {lost ? (
            <span className="self-center justify-self-end rounded-full bg-rasp-100 px-2.5 py-0.5 text-[13px] font-bold text-rasp-700">
              не дошла в Telegram
            </span>
          ) : (
            <span className="self-center justify-self-end text-[13px] text-ink-soft">✓ в Telegram</span>
          )}
        </summary>

        <div className="border-t border-line px-4 pb-4 pt-3">
          <div role="group" aria-label={`Статус заявки №${l.id}`} className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                aria-pressed={l.status === s.id}
                disabled={busy}
                onClick={() => l.status !== s.id && onStatus(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {l.statusWhen && <p className="mt-2 text-[13px] text-ink-soft">Статус изменён {l.statusWhen}</p>}
          <a href={telHref(l.phone)} className="btn btn-primary mt-3 w-full sm:w-auto">
            <Phone size={18} aria-hidden /> Позвонить {l.phone}
          </a>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-paper p-4 font-sans text-[15px] leading-relaxed">{l.text}</pre>
        </div>
      </details>
    </li>
  );
}
