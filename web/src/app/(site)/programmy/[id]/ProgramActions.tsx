"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AddToggle } from "@/components/cards";
import { useCatalog } from "@/lib/catalog-context";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";

/** Большая кнопка «Выбрать программу» в шапке. */
export function ProgramToggle({ id }: { id: string }) {
  const { has, toggleProgram } = useCart();
  const on = has("program", id);
  return (
    <AddToggle
      on={on}
      onClick={() => toggleProgram(id)}
      label="Выбрать программу"
      onLabel="Программа выбрана"
      size="btn-lg"
      track={`program_page_add_${id}`}
    />
  );
}

/** Ссылка «дальше в конструктор»: после выбора — сразу к шоу. */
export function NextLink({ id }: { id: string }) {
  const { has } = useCart();
  const on = has("program", id);
  return (
    <Link
      href={on ? "/sobrat?step=3" : "/sobrat?step=2"}
      className="btn btn-lg btn-ghost text-white"
      data-track={on ? "program_page_to_shows" : "program_page_to_builder"}
    >
      {on ? "Добавить шоу" : "Все программы"} <ArrowRight size={18} />
    </Link>
  );
}

/** Липкая плашка внизу на телефоне: цена, выбор, переход в корзину. */
export function StickyCta({ id, from }: { id: string; from: boolean }) {
  const { has, toggleProgram, ready } = useCart();
  const p = useCatalog().programById[id];
  const on = ready && has("program", id);
  if (!p) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+8px)] z-30 mx-auto max-w-md lg:hidden">
      <div className="flex items-center gap-2 rounded-[24px] bg-ink p-2 pl-4 text-white shadow-2xl shadow-rasp-900/40 ring-1 ring-white/10">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[12px] leading-tight text-white/60">{p.name}</span>
          <span className="price block text-[20px] leading-tight">
            {from ? "от " : ""}
            {money(p.price)}
          </span>
        </div>
        {on ? (
          <>
            <button
              type="button"
              onClick={() => toggleProgram(id)}
              aria-pressed
              aria-label="Программа выбрана. Убрать"
              data-track={`program_sticky_remove_${id}`}
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-white/12 text-white transition-transform active:scale-90"
            >
              <Check size={22} strokeWidth={3} />
            </button>
            <Link href="/korzina" className="btn btn-primary min-h-[52px] px-5" data-track="program_sticky_cart">
              В корзину <ArrowRight size={18} />
            </Link>
          </>
        ) : (
          <AddToggle on={false} onClick={() => toggleProgram(id)} label="Выбрать" size="min-h-[52px] px-6" track={`program_sticky_add_${id}`} />
        )}
      </div>
    </div>
  );
}
