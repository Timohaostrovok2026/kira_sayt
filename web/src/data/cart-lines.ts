// Строки корзины и итог — чистые функции без React (тесты — cart-lines.test.ts). Состояние и хуки — в lib/cart.tsx.
import { MKAD_BASE, MKAD_PER_KM, SOUND_PRICE, slotRef, type Catalog } from "./catalog.ts";

export interface CartPackage {
  id: string;
  /** Индекс слота пакета → выбранная позиция (для слотов с альтернативами). */
  choices: Record<number, string>;
}

export interface CartForm {
  childAge: string;
  date: string;
  place: string;
  name: string;
  phone: string;
  note: string;
  outsideMkad: boolean;
  km: number;
  sound: boolean;
  /** Звук уже включили сами за бумажное шоу — второй раз не включаем, даже если клиент выключил. */
  soundAuto: boolean;
}

export interface CartState {
  programs: string[];
  extras: Record<string, number>;
  packages: CartPackage[];
  costumes: string[];
  form: CartForm;
}

export interface CartLine {
  key: string;
  type: "program" | "extra" | "package" | "costume" | "mkad" | "sound";
  id: string;
  title: string;
  subtitle?: string;
  qty: number;
  price: number;
  fullPrice?: number;
}

/** Строки корзины. Позиции, которых больше нет на сайте (удалены или скрыты), пропускаем. */
export function buildLines(s: CartState, cat: Catalog): CartLine[] {
  const { programById, packageById, extraById, costumeById, anyItem, packagePrice } = cat;
  const out: CartLine[] = [];
  for (const id of s.programs) {
    const p = programById[id];
    if (p) out.push({ key: `p:${id}`, type: "program", id, title: p.name, subtitle: p.kind, qty: 1, price: p.price });
  }
  for (const k of s.packages) {
    const pk = packageById[k.id];
    if (!pk) continue;
    const pr = packagePrice(pk, k.choices);
    const parts = pk.items.map((it, i) => anyItem(slotRef(it, k.choices?.[i]))?.name).filter(Boolean);
    out.push({
      key: `k:${k.id}`,
      type: "package",
      id: k.id,
      title: `Пакет «${pk.name}»`,
      subtitle: pk.custom ? "Стоимость обсудим" : parts.join(" + "),
      qty: 1,
      price: pk.custom ? 0 : pr.price,
      fullPrice: pk.custom ? undefined : pr.full,
    });
  }
  for (const [id, qty] of Object.entries(s.extras)) {
    const e = extraById[id];
    if (e && qty > 0)
      out.push({ key: `x:${id}`, type: "extra", id, title: e.name, subtitle: e.unit, qty, price: e.price * qty });
  }
  for (const id of s.costumes) {
    const c = costumeById[id];
    if (c) out.push({ key: `c:${id}`, type: "costume", id, title: c.name, subtitle: "Герой", qty: 1, price: 0 });
  }
  if (s.form.outsideMkad) {
    const km = Math.max(0, s.form.km || 0);
    out.push({
      key: "mkad",
      type: "mkad",
      id: "e_mkad",
      title: "Выезд за МКАД",
      subtitle: `${km} км от МКАД`,
      qty: 1,
      price: MKAD_BASE + MKAD_PER_KM * km,
    });
  }
  if (s.form.sound)
    out.push({ key: "sound", type: "sound", id: "e_sound", title: "Усиленный звук", subtitle: "JBL PartyBox 110 и 2 микрофона", qty: 1, price: SOUND_PRICE });
  return out;
}

/** Итог корзины — сумма строк (индивидуальный пакет — 0, герой — 0). */
export function linesTotal(lines: readonly CartLine[]) {
  return lines.reduce((s, l) => s + l.price, 0);
}

/** Позиций в корзине — без выезда и звука. Считаем по строкам: скрытые и удалённые не в счёт. */
export function linesCount(lines: readonly CartLine[]) {
  return lines.filter((l) => l.type !== "mkad" && l.type !== "sound").length;
}
