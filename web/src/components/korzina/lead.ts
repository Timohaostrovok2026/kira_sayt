import { slotRef, type Catalog } from "@/data/catalog";
import type { Contacts } from "@/data/site";
import type { CartLine, CartState } from "@/lib/cart";
import { money } from "@/lib/format";

/** Шоу, которым обязателен усиленный звук. */
const LOUD_SHOWS = new Set(["e_paper", "e_silver"]);

/** Позиции, у которых количество имеет смысл (как в ExtraCard). */
export function isPerUnit(unit?: string) {
  return /шт|ребёнка|слайм|тыкву|позицию|сот|детей/.test(unit ?? "");
}

/** Есть ли в корзине бумажное шоу — отдельно или внутри пакета. */
export function needsLoudSound(s: CartState, cat: Catalog) {
  if (Object.entries(s.extras).some(([id, q]) => q > 0 && LOUD_SHOWS.has(id) && cat.extraById[id])) return true;
  return s.packages.some((p) => cat.packageById[p.id]?.items.some((it, i) => LOUD_SHOWS.has(slotRef(it, p.choices?.[i]))));
}

/* ---------- Телефон ---------- */

/** 10 цифр номера без кода страны (7 или 8 в начале считаем кодом). */
export function phoneDigits(v: string) {
  let d = v.replace(/\D/g, "");
  if (d[0] === "7" || d[0] === "8") d = d.slice(1);
  return d.slice(0, 10);
}

/** «+7 (977) 593-97-39». Разделители добавляем только перед введённой цифрой — так Backspace не «залипает». */
export function formatPhone(v: string) {
  const d = phoneDigits(v);
  if (!d) return "";
  let s = `+7 (${d.slice(0, 3)}`;
  if (d.length > 3) s += `) ${d.slice(3, 6)}`;
  if (d.length > 6) s += `-${d.slice(6, 8)}`;
  if (d.length > 8) s += `-${d.slice(8, 10)}`;
  return s;
}

export function phoneValid(v: string) {
  return phoneDigits(v).length === 10;
}

/* ---------- Даты ---------- */

export function isoToRu(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function todayIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- Текст заявки ---------- */

function lineText(l: CartLine, cat: Catalog) {
  if (l.type === "package") {
    const pk = cat.packageById[l.id];
    if (pk?.custom) return `• ${l.title} — стоимость обсудим`;
    return `• ${l.title}: ${l.subtitle} — ${money(l.price)}`;
  }
  if (l.type === "extra") {
    const e = cat.extraById[l.id];
    const q = isPerUnit(e?.unit) && l.qty > 1 ? ` × ${l.qty}` : "";
    return `• ${l.title}${q} — ${money(l.price)}`;
  }
  return `• ${l.title} — ${money(l.price)}`;
}

export function buildLeadText(s: CartState, lines: CartLine[], total: number, cat: Catalog) {
  const by = (t: CartLine["type"]) => lines.filter((l) => l.type === t);
  const out: string[] = ["Здравствуйте! Хочу заказать праздник."];

  const block = (title: string, ls: CartLine[]) => {
    if (ls.length) out.push("", `${title}:`, ...ls.map((l) => lineText(l, cat)));
  };
  block("Программы", by("program"));
  block("Пакеты", by("package"));
  block("Шоу и допы", by("extra"));

  const heroes = by("costume");
  if (heroes.length) out.push("", `Герои: ${heroes.map((h) => h.title).join(", ")}`);

  const mkad = by("mkad")[0];
  const sound = by("sound")[0];
  if (mkad || sound) out.push("");
  if (mkad) out.push(`Выезд за МКАД, ${Math.max(0, s.form.km || 0)} км — ${money(mkad.price)}`);
  if (sound) out.push(`Усиленный звук — ${money(sound.price)}`);

  out.push("", `Итого ориентировочно: ${money(total)}`);

  const f = s.form;
  const info: string[] = [];
  if (f.childAge.trim()) info.push(`Возраст ребёнка: ${f.childAge.trim()}`);
  if (f.date) info.push(`Дата: ${isoToRu(f.date)}`);
  if (f.place.trim()) info.push(`Место: ${f.place.trim()}`);
  if (f.note.trim()) info.push(`Пожелания: ${f.note.trim()}`);
  if (info.length) out.push("", ...info);

  // Без телефона текст уходит прямо в мессенджер (ссылки под формой): там клиента и так видно — пустые строки не нужны.
  if (phoneValid(f.phone)) out.push("", `Имя: ${f.name.trim() || "—"}`, `Телефон: ${formatPhone(f.phone) || f.phone}`);
  else if (f.name.trim()) out.push("", `Имя: ${f.name.trim()}`);
  return out.join("\n");
}

/* ---------- Мессенджеры ---------- */

export function telegramLink(contacts: Contacts, text: string) {
  return `${contacts.telegram}?text=${encodeURIComponent(text)}`;
}

export function whatsappLink(contacts: Contacts, text: string) {
  return `${contacts.whatsapp}?text=${encodeURIComponent(text)}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Старые браузеры / нет разрешения — через скрытое поле.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
