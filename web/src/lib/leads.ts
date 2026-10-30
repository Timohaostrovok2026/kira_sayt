import "server-only";
import { getDb } from "@/lib/db";
import { mskDateTime } from "@/lib/stats/period";
import { LATE_MS, RESEND_EVERY_MS, RESEND_WINDOW_MS, leadMessage, withRetries } from "@/data/notify";
import { ADMIN_LEADS_LIMIT, leadStatus, type AdminLead, type LeadStatus } from "@/data/leads";

// Состояние на globalThis, потому что маршрут /api/lead и фоновая досылка
// (instrumentation) — разные бандлы одного процесса.
const g = globalThis as {
  __leadsInFlight?: Set<number>;
  __leadsLoop?: ReturnType<typeof setInterval>;
  __leadsResending?: boolean;
};
const inFlight = (g.__leadsInFlight ??= new Set<number>());

function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendTelegram(text: string) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    // Из РФ Telegram иногда «молчит» — без таймаута запрос висел бы минутами.
    signal: AbortSignal.timeout(10_000),
  });
  // Код ответа — чтобы в журнале отличать 401/400 (настройки) от молчащей сети. URL с токеном не пишем.
  if (!r.ok) console.warn(`[leads] Telegram ответил ${r.status}`);
  await r.body?.cancel();
  return r.ok;
}

/** Отправляет заявку в Telegram с повторами; при успехе помечает доставленной. */
export async function deliverLead(id: number) {
  if (!telegramConfigured() || inFlight.has(id)) return;
  inFlight.add(id);
  try {
    // Перечитываем строку: заявку могли уже доставить или удалить, пока она ждала очереди.
    const row = getDb().prepare("SELECT ts, text, delivered FROM leads WHERE id = ?").get(id) as
      | { ts: number; text: string; delivered: number }
      | undefined;
    if (!row || Number(row.delivered) === 1) return;
    const ts = Number(row.ts);
    const late = Date.now() - ts > LATE_MS ? mskDateTime(ts) : undefined;
    const ok = await withRetries(() => sendTelegram(leadMessage(id, String(row.text), late)));
    if (ok) getDb().prepare("UPDATE leads SET delivered = 1 WHERE id = ?").run(id);
    else console.warn(`[leads] заявка №${id} не дошла до Telegram, повторим позже`);
  } finally {
    inFlight.delete(id);
  }
}

/** Досылает свежие недоставленные заявки (по одной, чтобы не долбить Telegram; новые — первыми,
 * чтобы «вечно падающие» старые не загораживали их). */
export async function resendUndelivered() {
  // Проход может идти дольше интервала (20 заявок × до ~37 с) — не запускаем второй поверх.
  if (!telegramConfigured() || g.__leadsResending) return;
  g.__leadsResending = true;
  try {
    const rows = getDb()
      .prepare("SELECT id FROM leads WHERE delivered = 0 AND ts >= ? ORDER BY id DESC LIMIT 20")
      .all(Date.now() - RESEND_WINDOW_MS) as { id: number }[];
    for (const r of rows) await deliverLead(Number(r.id));
  } finally {
    g.__leadsResending = false;
  }
}

/** Фоновая досылка раз в 5 минут; запускается один раз при старте сервера. */
export function startResendLoop() {
  if (g.__leadsLoop) return;
  const tick = () => resendUndelivered().catch((e) => console.error("[leads] досылка упала", e));
  g.__leadsLoop = setInterval(tick, RESEND_EVERY_MS);
  g.__leadsLoop.unref();
  setTimeout(tick, 30_000).unref();
}

/* ---------- Экран «Заявки» в админке ---------- */

const LEAD_COLS = "id, ts, name, phone, total, text, delivered, status, status_ts";

function toAdminLead(x: Record<string, unknown>): AdminLead {
  const ts = Number(x.ts);
  return {
    id: Number(x.id),
    ts,
    when: mskDateTime(ts),
    name: String(x.name ?? ""),
    phone: String(x.phone ?? ""),
    total: Number(x.total) || 0,
    text: String(x.text ?? ""),
    delivered: Number(x.delivered) === 1,
    status: leadStatus(x.status),
    statusWhen: x.status_ts == null ? null : mskDateTime(Number(x.status_ts)),
  };
}

export function listLeads(limit = ADMIN_LEADS_LIMIT): AdminLead[] {
  const rows = getDb().prepare(`SELECT ${LEAD_COLS} FROM leads ORDER BY id DESC LIMIT ?`).all(limit) as Record<string, unknown>[];
  return rows.map(toAdminLead);
}

/** Меняет статус и возвращает обновлённую заявку; null — такой заявки нет (удалили). */
export function updateLeadStatus(id: number, status: LeadStatus): AdminLead | null {
  const db = getDb();
  const r = db.prepare("UPDATE leads SET status = ?, status_ts = ? WHERE id = ?").run(status, Date.now(), id);
  if (!Number(r.changes)) return null;
  return toAdminLead(db.prepare(`SELECT ${LEAD_COLS} FROM leads WHERE id = ?`).get(id) as Record<string, unknown>);
}
