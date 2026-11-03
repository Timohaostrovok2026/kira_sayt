import { after } from "next/server";
import { clientIp, readJsonLimited, TOO_LARGE } from "@/data/rate-limit";
import { getDb } from "@/lib/db";
import { deliverLead } from "@/lib/leads";
import { limits } from "@/lib/limits";

interface LeadBody {
  visitor?: string;
  name?: string;
  phone?: string;
  total?: number;
  text?: string;
  payload?: unknown;
  /** Поле-ловушка: невидимо для человека, его заполняют только боты. */
  hp?: unknown;
}

export async function POST(req: Request) {
  // Клиент с лимитом не теряет заявку: браузер покажет кнопки мессенджеров с готовым текстом.
  if (!limits.lead.hit(clientIp(req.headers.get("x-forwarded-for")))) {
    return Response.json({ ok: false, error: "too_many" }, { status: 429 });
  }
  // Настоящая заявка — несколько килобайт; 100 КБ с запасом.
  const parsed = await readJsonLimited(req, 100_000);
  if (parsed === TOO_LARGE) return Response.json({ ok: false, error: "too_large" }, { status: 413 });
  // `null`, число или массив — тоже корректный JSON; без проверки дальше падение и ответ 500.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  const b = parsed as LeadBody;
  // Бот заполнил ловушку — отвечаем «принято», чтобы он не пробовал иначе, но никуда не пишем.
  if (b.hp) return Response.json({ ok: true, id: 0 });
  const phone = String(b.phone ?? "").trim();
  const text = String(b.text ?? "").slice(0, 6000);
  // Та же проверка, что в браузере: ровно 10 цифр номера (+7/8 впереди не считаем), а не просто «10 цифр с кодом».
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1);
  if (digits.length !== 10 || !text.trim()) {
    return Response.json({ ok: false, error: "phone_required" }, { status: 400 });
  }
  // Обрезанный JSON — уже не JSON: слишком большую корзину не храним вовсе, текст заявки всё равно есть.
  const payload = JSON.stringify(b.payload ?? null);
  const db = getDb();
  const res = db
    .prepare("INSERT INTO leads (ts, visitor, name, phone, total, text, payload) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(
      Date.now(),
      b.visitor ? String(b.visitor).slice(0, 64) : null,
      String(b.name ?? "").slice(0, 120),
      phone.slice(0, 40),
      Math.max(0, Math.round(Number(b.total) || 0)), // сумма от браузера — только для справки менеджеру; отрицательной не бывает
      text,
      payload.length <= 20000 ? payload : "null",
    );
  const id = Number(res.lastInsertRowid);
  // Заявка уже в базе — клиенту отвечаем сразу, в Telegram отправляем после ответа
  // (с повторами; не дошла — досылает фоновая проверка из instrumentation.ts).
  after(() => deliverLead(id));
  return Response.json({ ok: true, id });
}
