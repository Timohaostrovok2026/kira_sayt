"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { deleteItem, setHidden, swapItems, type AdminResult, type Coll } from "@/app/admin/actions";
import { normQuery } from "@/lib/format";
import { IconBtn, useAdmin } from "./ui";

export interface Row {
  id: string;
  name: string;
  hidden?: boolean;
  /** Строка под названием: цена, возраст, категория. */
  meta: string;
  thumb?: string | null;
  icon?: ReactNode;
  /** Ключ фильтра (вид, раздел, категория). */
  filter: string;
  /** Дополнительный текст для поиска. */
  search?: string;
  view?: string;
}

/**
 * Список позиций раздела: поиск, фильтр, скрыть/показать, порядок, правка, удаление.
 * Порядок здесь = порядок на сайте. Стрелки двигают позицию среди видимых в списке.
 */
export function ItemList({
  coll,
  rows,
  filters,
  thumbAspect = "3/4",
  onEdit,
  onAdd,
  addLabel,
  noun,
  toolbar,
}: {
  coll: Coll;
  rows: Row[];
  filters: { id: string; label: string }[];
  thumbAspect?: string;
  onEdit: (id: string) => void;
  onAdd: () => void;
  addLabel: string;
  noun: string;
  toolbar?: ReactNode;
}) {
  const { apply } = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.filter, (m.get(r.filter) ?? 0) + 1);
    return m;
  }, [rows]);

  const words = normQuery(q).split(/\s+/).filter(Boolean);
  const list = rows.filter((r) => (!filter || r.filter === filter) && words.every((w) => normQuery(`${r.name} ${r.meta} ${r.search ?? ""} ${r.id}`).includes(w)));
  const hiddenCount = rows.filter((r) => r.hidden).length;

  const act = async (id: string, p: () => Promise<AdminResult>, ok?: string) => {
    setBusy(id);
    try {
      await apply(p(), ok);
    } finally {
      setBusy(null);
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const other = list[i + d];
    if (other) void act(list[i].id, () => swapItems(coll, list[i].id, other.id));
  };

  const remove = (r: Row) => {
    if (!confirm(`Удалить «${r.name}» насовсем?\n\nЕсли нужно только убрать с сайта на время — лучше скройте (глазик).`)) return;
    void act(r.id, () => deleteItem(coll, r.id), "Удалено");
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск"
            aria-label="Поиск"
            className="h-12 w-full rounded-full border-[1.5px] border-line bg-white pl-12 pr-12 text-[17px] outline-none focus:border-rasp-400 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Очистить" className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-rasp-50">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {toolbar}
          <button type="button" onClick={onAdd} className="btn btn-primary flex-1 sm:flex-none">
            <Plus size={20} strokeWidth={3} /> {addLabel}
          </button>
        </div>
      </div>

      {filters.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Фильтр">
          {[{ id: "", label: "Все" }, ...filters].map((f) => {
            const n = f.id ? (counts.get(f.id) ?? 0) : rows.length;
            if (f.id && !n) return null;
            return (
              <button key={f.id || "all"} type="button" className="chip shrink-0" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span className={`text-[13px] tabular-nums ${filter === f.id ? "text-white/75" : "text-ink-soft"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mb-2 px-1 text-[13px] text-ink-soft">
        {list.length} {noun}
        {hiddenCount > 0 && ` · скрыто с сайта: ${hiddenCount}`} · порядок как на сайте
      </p>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft">Ничего не нашли</div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {list.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-2 py-2 pl-2 pr-1 sm:gap-3 sm:pl-3 ${busy === r.id ? "opacity-50" : ""}`}>
              <button type="button" onClick={() => onEdit(r.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left">
                <span
                  className={`relative block w-12 shrink-0 overflow-hidden rounded-xl bg-rasp-100 ${r.hidden ? "opacity-40 grayscale" : ""}`}
                  style={{ aspectRatio: r.thumb ? thumbAspect : "1/1" }}
                >
                  {r.thumb ? (
                    <Image src={r.thumb} alt="" fill sizes="48px" className="object-cover object-[50%_20%]" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-rasp-600">{r.icon}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[16px] font-bold leading-tight ${r.hidden ? "text-ink-soft line-through decoration-1" : ""}`}>{r.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                    {r.hidden && <b className="mr-1 font-semibold text-rasp-600">Скрыто ·</b>}
                    {r.meta}
                  </span>
                </span>
              </button>
              <IconBtn
                label={r.hidden ? "Показать на сайте" : "Скрыть с сайта"}
                onClick={() => void act(r.id, () => setHidden(coll, r.id, !r.hidden), r.hidden ? "Снова на сайте" : "Скрыто с сайта")}
              >
                {r.hidden ? <EyeOff size={20} className="text-rasp-600" /> : <Eye size={20} />}
              </IconBtn>
              <span className="flex flex-col">
                <button type="button" aria-label="Выше" title="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-9 place-items-center rounded-full text-ink-soft hover:bg-rasp-50 disabled:opacity-25">
                  <ArrowUp size={18} />
                </button>
                <button type="button" aria-label="Ниже" title="Ниже" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-9 place-items-center rounded-full text-ink-soft hover:bg-rasp-50 disabled:opacity-25">
                  <ArrowDown size={18} />
                </button>
              </span>
              <span className="hidden items-center md:flex">
                {r.view && !r.hidden && (
                  <a href={r.view} target="_blank" rel="noopener" aria-label="Посмотреть на сайте" title="Посмотреть на сайте" className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-rasp-50 hover:text-ink">
                    <ExternalLink size={18} />
                  </a>
                )}
                <IconBtn label="Изменить" onClick={() => onEdit(r.id)}>
                  <Pencil size={18} />
                </IconBtn>
                <IconBtn label="Удалить" tone="danger" onClick={() => remove(r)}>
                  <Trash2 size={18} />
                </IconBtn>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Удаление из формы редактирования (на телефоне кнопки удаления в строке нет). */
export function useRemove(coll: Coll) {
  const { apply } = useAdmin();
  return async (id: string, name: string) => {
    if (!confirm(`Удалить «${name}» насовсем?\n\nЕсли нужно только убрать с сайта на время — лучше скройте.`)) return false;
    const r = await apply(deleteItem(coll, id), "Удалено");
    return r.ok;
  };
}
