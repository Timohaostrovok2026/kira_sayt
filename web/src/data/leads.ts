// Заявки в админке: статусы и «потерянные» — чистые функции без базы (тесты — leads.test.ts).

export const LEAD_STATUSES = [
  { id: "new", label: "Новая" },
  { id: "work", label: "В работе" },
  { id: "agreed", label: "Согласована" },
  { id: "refused", label: "Отказ" },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]["id"];

/** Сколько последних заявок показываем в админке: за сезон их сотни, не тысячи. */
export const ADMIN_LEADS_LIMIT = 300;

export function isLeadStatus(x: unknown): x is LeadStatus {
  return LEAD_STATUSES.some((s) => s.id === x);
}

/** Неизвестное значение в базе (ручная правка, старая версия) показываем как «Новая» — так заявку точно заметят. */
export function leadStatus(x: unknown): LeadStatus {
  return isLeadStatus(x) ? x : "new";
}

export interface AdminLead {
  id: number;
  ts: number;
  /** Время по Москве строкой — форматируем на сервере, чтобы ICU браузера не разошёлся с серверным при гидратации. */
  when: string;
  name: string;
  phone: string;
  total: number;
  text: string;
  /** Дошла до Telegram. Когда появится почта — второй канал, см. leadLost. */
  delivered: boolean;
  status: LeadStatus;
  statusWhen: string | null;
}

/** Заявка не дошла ни в один канал — менеджер о ней не знает. Пока канал один: Telegram. */
export function leadLost(l: Pick<AdminLead, "delivered">): boolean {
  return !l.delivered;
}

/** Потерянные, которые ещё никто не взял: про них кричим наверху списка. */
export function lostAndNew(leads: readonly AdminLead[]): AdminLead[] {
  return leads.filter((l) => leadLost(l) && l.status === "new");
}

export function countByStatus(leads: readonly AdminLead[]): Record<LeadStatus, number> {
  const c = { new: 0, work: 0, agreed: 0, refused: 0 };
  for (const l of leads) c[l.status]++;
  return c;
}
