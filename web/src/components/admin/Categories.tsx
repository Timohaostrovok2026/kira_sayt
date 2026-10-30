"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { saveCategories } from "@/app/admin/actions";
import { IconBtn, Input, Sheet, useAdmin } from "./ui";

/** Категории костюмов: порядок чипсов на странице «Костюмы», новые, переименование, удаление пустых. */
export function CategoriesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-soft shrink-0 px-4" onClick={() => setOpen(true)}>
        <FolderTree size={18} /> <span className="hidden sm:inline">Категории</span>
      </button>
      {open && <Categories onClose={() => setOpen(false)} />}
    </>
  );
}

function Categories({ onClose }: { onClose: () => void }) {
  const { data, apply } = useAdmin();
  const cats = data.catalog.costumeCats;
  const count = (c: string) => data.catalog.costumes.filter((x) => x.cat === c).length;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (list: string[], ok: string, rename?: { from: string; to: string }) => {
    setBusy(true);
    await apply(saveCategories(list, rename), ok);
    setBusy(false);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats];
    [next[i], next[j]] = [next[j], next[i]];
    void run(next, "Порядок сохранён");
  };

  return (
    <Sheet
      title="Категории героев"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary w-full" onClick={onClose}>
          Готово
        </button>
      }
    >
      <p className="mb-4 text-[14px] text-ink-soft">Порядок — как в ленте категорий на странице «Костюмы». Изменения сохраняются сразу.</p>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          void run([...cats, n], `Категория «${n}» добавлена`).then(() => setName(""));
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая категория" />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || !name.trim()}>
          <Plus size={20} /> <span className="hidden sm:inline">Добавить</span>
        </button>
      </form>
      <ul className={`card divide-y divide-line overflow-hidden ${busy ? "opacity-60" : ""}`}>
        {cats.map((c, i) => {
          const n = count(c);
          return (
            <li key={c} className="flex items-center gap-1 py-1.5 pl-4 pr-1">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c}</span>
                <span className="text-[13px] text-ink-soft">{n ? `${n} героев` : "пусто"}</span>
              </span>
              <IconBtn label="Выше" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp size={18} />
              </IconBtn>
              <IconBtn label="Ниже" onClick={() => move(i, 1)} disabled={i === cats.length - 1}>
                <ArrowDown size={18} />
              </IconBtn>
              <IconBtn
                label="Переименовать"
                onClick={() => {
                  const to = prompt("Новое название категории", c)?.trim();
                  if (to && to !== c) void run(cats.map((x) => (x === c ? to : x)), "Переименовано", { from: c, to });
                }}
              >
                <Pencil size={18} />
              </IconBtn>
              <IconBtn
                label={n ? "Сначала перенесите героев" : "Удалить"}
                tone="danger"
                disabled={n > 0}
                onClick={() => confirm(`Удалить категорию «${c}»?`) && void run(cats.filter((x) => x !== c), "Категория удалена")}
              >
                <Trash2 size={18} />
              </IconBtn>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
