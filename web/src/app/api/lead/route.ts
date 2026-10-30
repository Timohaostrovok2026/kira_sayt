import { after } from "next/server";
import { getDb } from "@/lib/db";
import { deliverLead } from "@/lib/leads";

interface LeadBody {
  visitor?: string;
  name?: string;
  phone?: string;
  total?: number;
  text?: string;
  payload?: unknown;
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
  // Заявка уже в базе — клиенту отвечаем сразу, в Telegram отправляем после ответа
  // (с повторами; не дошла — досылает фоновая проверка из instrumentation.ts).
  after(() => deliverLead(id));
  return Response.json({ ok: true, id });
}
