"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { restoreCart } from "@/data/cart-restore";
import { buildLines, linesCount, linesTotal, type CartForm, type CartLine, type CartState } from "@/data/cart-lines";
import { useCatalog } from "@/lib/catalog-context";
import { track } from "@/lib/track";

export type { CartForm, CartLine, CartPackage, CartState } from "@/data/cart-lines";

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
  soundAuto: false,
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
        // Корзину читаем только после гидратации: на сервере localStorage нет, иначе разметка разойдётся.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(restoreCart(JSON.parse(raw), EMPTY));
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
  const total = useMemo(() => linesTotal(lines), [lines]);
  // Считаем по строкам: удалённые или скрытые в админке позиции из старой корзины не учитываются.
  const count = linesCount(lines);

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

/** Группы строк заявки — одинаково в корзине и на шаге «Готово» конструктора. */
export const LINE_GROUPS: { type: CartLine["type"]; title: string }[] = [
  { type: "program", title: "Программы" },
  { type: "package", title: "Пакеты" },
  { type: "extra", title: "Шоу и допы" },
  { type: "costume", title: "Герои" },
];

/** «Убрать» строку заявки любого типа (МКАД и звук выключаются в корзине переключателями). */
export function useRemoveLine() {
  const { toggleProgram, setExtra, removePackage, toggleCostume } = useCart();
  return (l: CartLine) => {
    if (l.type === "program") toggleProgram(l.id);
    else if (l.type === "extra") setExtra(l.id, 0);
    else if (l.type === "package") removePackage(l.id);
    else if (l.type === "costume") toggleCostume(l.id);
  };
}
