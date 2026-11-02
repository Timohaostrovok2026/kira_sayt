"use client";

import { useCart } from "@/lib/cart";

/** «Добавить в заявку» / «Убрать из заявки» в цветной шапке программы. */
export function ProgramToggle({ id }: { id: string }) {
  const { has, toggleProgram } = useCart();
  const on = has("program", id);
  return (
    <button className={`pill ${on ? "pill--white" : "pill--lime"}`} type="button" aria-pressed={on} onClick={() => toggleProgram(id)} data-track={`program_page_add_${id}`}>
      {on ? "Убрать из заявки" : "Добавить в заявку"}
    </button>
  );
}

/** «Добавить» / «Ещё +1» для допа или шоу в правой колонке. */
export function AddExtraButton({ id }: { id: string }) {
  const { state, setExtra } = useCart();
  const qty = state.extras[id] ?? 0;
  return (
    <button className="pill pill--ghost pill--sm" type="button" onClick={() => setExtra(id, qty + 1)} data-track={`program_page_extra_${id}`}>
      {qty ? "Ещё +1" : "Добавить"}
    </button>
  );
}
