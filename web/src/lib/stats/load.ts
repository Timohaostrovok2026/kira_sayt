import "server-only";
import { resolvePeriod, type PeriodId } from "./period";
import * as q from "./queries";

/** Собирает все цифры для дашборда за один проход. Вызывать только после проверки входа. */
export function loadStats(pid: PeriodId) {
  const now = Date.now();
  const bounds = q.dataBounds();
  const period = resolvePeriod(pid, now, bounds.first);
  const r = period.cur;
  const live = q.liveNow(now);
  if (!bounds.events && !bounds.leads) return { now, live, period, empty: true as const };
  const today = resolvePeriod("today", now, null);
  return {
    now,
    live,
    period,
    empty: false as const,
    segments: q.segments(r),
    targets: q.clickTargets(r),
    todayHours: q.series(today),
    kpi: q.kpis(r),
    prevKpi: period.prev ? q.kpis(period.prev) : null,
    series: q.series(period),
    funnel: q.funnel(r),
    pages: q.topPages(r),
    exits: q.exitPages(r),
    clicks: q.topClicks(r),
    added: q.topAdded(r),
    heroes: q.topHeroes(r),
    searches: q.topSearches(r),
    cats: q.topCostumeCats(r),
    builder: q.builder(r),
    sources: q.sources(r),
    devices: q.devices(r),
    contacts: q.topContacts(r),
    scroll: q.scrollDepth(r),
    leads: q.recentLeads(),
  };
}
