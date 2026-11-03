// Строки корзины и итог — чистые функции без React (тесты — cart-lines.test.ts). Состояние и хуки — в lib/cart.tsx.
import { LETTER, MKAD_BASE, MKAD_PER_KM, OUTDOOR_PRICE, SOUND_PRICE, slotRef, type Catalog } from "./catalog.ts";
import { OTHER_SLOT, priceFor, type PriceWindow } from "./date-prices.ts";
import { plural } from "../lib/format.ts";

export interface CartPackage {
  id: string;
  /** Индекс слота пакета → выбранная позиция (для слотов с альтернативами). */
  choices: Record<number, string>;
}

/** Выбор у новогодней программы с ценами по датам: столбец таблицы, окно времени 31.12, число писем. */
export interface ProgramOpts {
  col?: string;
  slot?: string;
  qty?: number;
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
  /** Праздник на улице зимой — доплата за новогодние программы (OUTDOOR_PRICE). */
  outdoor: boolean;
}

export interface CartState {
  programs: string[];
  extras: Record<string, number>;
  packages: CartPackage[];
  costumes: string[];
  programOpts: Record<string, ProgramOpts>;
  form: CartForm;
}

/** Для строки программы с таблицей: что показать в корзине (выбор варианта, окна, письма). */
export interface DatedInfo {
  cols: string[];
  /** Выбранный столбец и тот, по которому посчитано (на дату выбранного может не быть). */
  want: number;
  col: number;
  off: number[];
  windows: PriceWindow[];
  slot?: string;
  /** Цена каждого окна по посчитанному столбцу — подписи в списке «Время приезда». */
  windowPrices: (number | null)[];
  nightOnly?: boolean;
  /** Число писем — только у Волшебного письма. */
  letters?: number;
  /** Выбор клиента одной строкой («Премиум, 1 час · 19:00–22:59 · 3 письма») — для текста заявки; пусто — выбора нет. */
  choice: string;
}

export interface CartLine {
  key: string;
  type: "program" | "extra" | "package" | "costume" | "mkad" | "sound" | "outdoor";
  id: string;
  title: string;
  subtitle?: string;
  qty: number;
  price: number;
  fullPrice?: number;
  /** Цена не точная: «от» (нет даты или времени) или «укажет менеджер» (price = 0). Нет поля — точная. */
  mode?: "from" | "manager";
  /** Пояснение к цене: «Цена зависит от даты», «На эту дату — только Премиум». */
  note?: string;
  dated?: DatedInfo;
}

/** Окно в подписи и в заявке: ночные — «ночь на 1 января, 01:00–04:00», чтобы менеджер не перепутал ночь. */
function slotLabel(slot: string | undefined, windows: PriceWindow[]) {
  if (!slot) return "";
  if (slot === OTHER_SLOT) return "другое время";
  return windows.find((w) => w.label === slot)?.night ? `ночь на 1 января, ${slot}` : slot;
}

/** Число писем: целое от 1 до LETTER.max, по умолчанию 1 (ответ 17: «сколько детей»). */
export function letterCount(q: unknown) {
  return typeof q === "number" && Number.isInteger(q) ? Math.min(LETTER.max, Math.max(1, q)) : 1;
}

/** Строки корзины. Позиции, которых больше нет на сайте (удалены или скрыты), пропускаем. */
export function buildLines(s: CartState, cat: Catalog): CartLine[] {
  const { programById, packageById, extraById, costumeById, anyItem, packagePrice, tableById } = cat;
  const out: CartLine[] = [];
  for (const id of s.programs) {
    const p = programById[id];
    if (!p) continue;
    const line: CartLine = { key: `p:${id}`, type: "program", id, title: p.name, subtitle: p.kind, qty: 1, price: p.price };
    if (id in tableById) {
      const t = tableById[id];
      const o = s.programOpts?.[id] ?? {};
      if (!t) Object.assign(line, { price: 0, mode: "manager", note: "Цену укажет менеджер" });
      else {
        const col = typeof o.col === "string" ? o.col : undefined;
        const r = priceFor(t, { col, date: s.form.date, slot: typeof o.slot === "string" ? o.slot : undefined });
        const windowPrices = r.windows.map((w) => {
          const x = priceFor(t, { col, date: s.form.date, slot: w.label });
          return x.mode === "exact" ? x.price : null;
        });
        const letters = id === LETTER.id ? letterCount(o.qty) : undefined;
        let price = r.price;
        if (letters && r.mode !== "manager") price += Math.max(0, letters - LETTER.included) * LETTER.add;
        const parts = [t.cols.length > 1 ? t.cols[r.col] : "", slotLabel(r.slot, r.windows), letters ? `${letters} ${plural(letters, "письмо", "письма", "писем")}` : ""];
        const choice = parts.filter(Boolean).join(" · ");
        Object.assign(line, {
          price,
          subtitle: choice || p.kind,
          mode: r.mode === "exact" ? undefined : r.mode,
          note: r.note,
          dated: { cols: t.cols, want: Math.max(0, t.cols.indexOf(col ?? "")), col: r.col, off: r.off, windows: r.windows, windowPrices, slot: r.slot, nightOnly: r.nightOnly, letters, choice },
        });
      }
    }
    out.push(line);
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
  if (s.form.outdoor) {
    const ids = s.programs.filter((id) => programById[id] && OUTDOOR_PRICE[id]);
    if (ids.length)
      out.push({
        key: "outdoor",
        type: "outdoor",
        id: "outdoor",
        title: "Праздник на улице",
        subtitle: ids.map((id) => programById[id].name).join(", "),
        qty: 1,
        price: ids.reduce((sum, id) => sum + OUTDOOR_PRICE[id], 0),
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

/** Позиций в корзине — без выезда, звука и улицы. Считаем по строкам: скрытые и удалённые не в счёт. */
export function linesCount(lines: readonly CartLine[]) {
  return lines.filter((l) => l.type !== "mkad" && l.type !== "sound" && l.type !== "outdoor").length;
}

/** Итог не точный: есть цены «от» (from) или строки, цену которых назовёт менеджер (manager). */
export function linesApprox(lines: readonly CartLine[]) {
  return { from: lines.some((l) => l.mode === "from"), manager: lines.some((l) => l.mode === "manager") };
}

