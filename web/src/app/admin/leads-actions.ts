"use server";

import type { AdminLead } from "@/data/leads";
import { isLeadStatus } from "@/data/leads";
import { isAuthed } from "@/lib/auth";
import { listLeads, updateLeadStatus } from "@/lib/leads";

export type LeadsResult = { ok: true; leads: AdminLead[] } | { ok: false; error: string };
export type LeadResult = { ok: true; lead: AdminLead } | { ok: false; error: string };

/** Статус заявки. Возвращает только её — список из 300 заявок на каждый клик гонять по мобильной сети незачем. */
export async function setLeadStatus(id: unknown, status: unknown): Promise<LeadResult> {
  if (!(await isAuthed())) return { ok: false, error: "Сессия закончилась — войдите заново (обновите страницу)." };
  if (!Number.isSafeInteger(id) || (id as number) <= 0 || !isLeadStatus(status)) return { ok: false, error: "Неизвестный статус" };
  try {
    const lead = updateLeadStatus(id as number, status);
    if (!lead) return { ok: false, error: "Этой заявки уже нет. Обновите страницу." };
    return { ok: true, lead };
  } catch (e) {
    console.error("[admin] статус заявки", e);
    return { ok: false, error: "Не получилось сохранить. Попробуйте ещё раз." };
  }
}

/** Обновить список без перезагрузки страницы. */
export async function refreshLeads(): Promise<LeadsResult> {
  if (!(await isAuthed())) return { ok: false, error: "Сессия закончилась — войдите заново (обновите страницу)." };
  try {
    return { ok: true, leads: listLeads() };
  } catch (e) {
    console.error("[admin] список заявок", e);
    return { ok: false, error: "Не получилось загрузить заявки. Попробуйте ещё раз." };
  }
}
