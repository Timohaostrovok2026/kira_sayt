import { getDb } from "@/lib/db";

interface LeadBody {
  visitor?: string;
  name?: string;
  phone?: string;
  total?: number;
  text?: string;
  payload?: unknown;
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let b: LeadBody;
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const phone = String(b.phone ?? "").trim();
  const text = String(b.text ?? "").slice(0, 6000);
  if (phone.replace(/\D/g, "").length < 10 || !text) {
    return Response.json({ ok: false, error: "phone_required" }, { status: 400 });
  }
  const db = getDb();
  const res = db
    .prepare("INSERT INTO leads (ts, visitor, name, phone, total, text, payload) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(
      Date.now(),
      b.visitor ? String(b.visitor).slice(0, 64) : null,
      String(b.name ?? "").slice(0, 120),
      phone.slice(0, 40),
      Math.round(Number(b.total) || 0),
      text,
      JSON.stringify(b.payload ?? null).slice(0, 20000),
    );
  const id = Number(res.lastInsertRowid);
  const delivered = await sendTelegram(`🎉 Заявка №${id} с сайта\n\n${text}`);
  if (delivered) db.prepare("UPDATE leads SET delivered = 1 WHERE id = ?").run(id);
  return Response.json({ ok: true, id, delivered });
}
