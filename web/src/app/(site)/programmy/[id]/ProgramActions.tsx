"use client";

import { useCart } from "@/lib/cart";
import { QtyControl } from "@/components/cards";

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

/** «Добавить», затем «− N +» для допа или шоу в правой колонке. */
export function AddExtraButton({ id }: { id: string }) {
  return <QtyControl id={id} track={`program_page_extra_${id}`} ghost />;
}
