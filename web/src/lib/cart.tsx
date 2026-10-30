"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MKAD_BASE, MKAD_PER_KM, SOUND_PRICE, slotRef, type Catalog } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { track } from "@/lib/track";

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

const EMPTY_FORM: CartForm = {
  childAge: "",
  date: "",
  place: "",
  name: "",
  phone: "",
  note: "",
  outsideMkad: false,
  km: 0,
  sound: false,
};

const EMPTY: CartState = { programs: [], extras: {}, packages: [], costumes: [], form: EMPTY_FORM };
const KEY = "uly-cart-v1";

interface CartApi {
  state: CartState;
  lines: CartLine[];
  total: number;
  count: number;
  ready: boolean;
  has: (type: "program" | "extra" | "package" | "costume", id: string) => boolean;
  toggleProgram: (id: string) => void;
  setExtra: (id: string, qty: number) => void;
  toggleExtra: (id: string) => void;
  addPackage: (id: string, choices?: Record<number, string>) => void;
  removePackage: (id: string) => void;
  /** Смена шоу/квеста внутри пакета, который уже в корзине — без события и всплывашки. */
  setPackageChoices: (id: string, choices: Record<number, string>) => void;
  toggleCostume: (id: string) => void;
  setForm: (patch: Partial<CartForm>) => void;
  clear: () => void;
  /** Последнее добавление — для всплывашки «Добавлено». */
  notice: { title: string; at: number } | null;
  dismissNotice: () => void;
}

const Ctx = createContext<CartApi | null>(null);

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cat = useCatalog();
  const { programById, extraById, packageById, costumeById } = cat;
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<{ title: string; at: number } | null>(null);
  const notify = useCallback((title: string) => setNotice({ title, at: Date.now() }), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CartState>;
        // Корзину читаем только после гидратации: на сервере localStorage нет, иначе разметка разойдётся.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ ...EMPTY, ...parsed, form: { ...EMPTY_FORM, ...(parsed.form ?? {}) } });
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const lines = useMemo(() => buildLines(state, cat), [state, cat]);
  const total = useMemo(() => lines.reduce((s, l) => s + l.price, 0), [lines]);
  // Считаем по строкам: удалённые или скрытые в админке позиции из старой корзины не учитываются.
  const count = lines.filter((l) => l.type !== "mkad" && l.type !== "sound").length;

  const has = useCallback(
    (type: "program" | "extra" | "package" | "costume", id: string) => {
      if (type === "program") return state.programs.includes(id);
      if (type === "extra") return (state.extras[id] ?? 0) > 0;
      if (type === "package") return state.packages.some((k) => k.id === id);
      return state.costumes.includes(id);
    },
    [state],
  );

  // Побочные эффекты (аналитика, всплывашка) — вне setState, чтобы не дублировались в StrictMode.
  const toggleProgram = useCallback(
    (id: string) => {
      const on = state.programs.includes(id);
      track(on ? "cart_remove" : "cart_add", { type: "program", id });
      if (!on) notify(programById[id]?.name ?? "");
      setState((s) => ({ ...s, programs: on ? s.programs.filter((x) => x !== id) : [...s.programs.filter((x) => x !== id), id] }));
    },
    [state.programs, notify, programById],
  );

  const setExtra = useCallback(
    (id: string, qty: number) => {
      const prev = state.extras[id] ?? 0;
      if (prev === 0 && qty > 0) {
        track("cart_add", { type: "extra", id });
        notify(extraById[id]?.name ?? "");
      }
      if (prev > 0 && qty <= 0) track("cart_remove", { type: "extra", id });
      setState((s) => {
        const extras = { ...s.extras };
        if (qty <= 0) delete extras[id];
        else extras[id] = qty;
        return { ...s, extras };
      });
    },
    [state.extras, notify, extraById],
  );

  const toggleExtra = useCallback(
    (id: string) => setExtra(id, (state.extras[id] ?? 0) > 0 ? 0 : 1),
    [setExtra, state.extras],
  );

  const addPackage = useCallback((id: string, choices: Record<number, string> = {}) => {
    track("cart_add", { type: "package", id });
    notify(`Пакет «${packageById[id]?.name ?? ""}»`);
    setState((s) => ({ ...s, packages: [...s.packages.filter((k) => k.id !== id), { id, choices }] }));
  }, [notify, packageById]);

  const removePackage = useCallback((id: string) => {
    track("cart_remove", { type: "package", id });
    setState((s) => ({ ...s, packages: s.packages.filter((k) => k.id !== id) }));
  }, []);

  const setPackageChoices = useCallback((id: string, choices: Record<number, string>) => {
    setState((s) => ({ ...s, packages: s.packages.map((k) => (k.id === id ? { ...k, choices } : k)) }));
  }, []);

  const toggleCostume = useCallback(
    (id: string) => {
      const on = state.costumes.includes(id);
      track(on ? "cart_remove" : "cart_add", { type: "costume", id });
      if (!on) notify(costumeById[id]?.name ?? "");
      setState((s) => ({ ...s, costumes: on ? s.costumes.filter((x) => x !== id) : [...s.costumes.filter((x) => x !== id), id] }));
    },
    [state.costumes, notify, costumeById],
  );

  const setForm = useCallback((patch: Partial<CartForm>) => {
    setState((s) => ({ ...s, form: { ...s.form, ...patch } }));
  }, []);

  const clear = useCallback(() => setState((s) => ({ ...EMPTY, form: { ...EMPTY_FORM, name: s.form.name, phone: s.form.phone } })), []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const api: CartApi = {
    state,
    lines,
    total,
    count,
    ready,
    has,
    toggleProgram,
    setExtra,
    toggleExtra,
    addPackage,
    removePackage,
    setPackageChoices,
    toggleCostume,
    setForm,
    clear,
    notice,
    dismissNotice,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
