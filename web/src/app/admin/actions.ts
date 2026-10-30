"use server";

import { updateTag } from "next/cache";
import type { CatalogData } from "@/data/catalog";
import { isAuthed } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/content/get";
import { readContent, writeContent, type ContentAll } from "@/lib/content/store";
import { Invalid, cleanCostume, cleanExtra, cleanPackage, cleanProgram, cleanSite, makeId, str } from "@/lib/content/validate";

export type Coll = "programs" | "extras" | "packages" | "costumes";
export type AdminResult = { ok: true; data: ContentAll; id?: string } | { ok: false; error: string };

const COLLS: Coll[] = ["programs", "extras", "packages", "costumes"];
const PREFIX: Record<Coll, string> = { programs: "p", extras: "e", packages: "k", costumes: "c" };

/** Общая обёртка: вход, ошибки формы, запись и сброс кэша сайта. */
async function run(fn: (c: ContentAll) => { patch: Partial<Record<keyof CatalogData | "site", unknown>>; id?: string }): Promise<AdminResult> {
  if (!(await isAuthed())) return { ok: false, error: "Сессия закончилась — войдите заново (обновите страницу)." };
  try {
    const { patch, id } = fn(readContent());
    writeContent(patch);
    // Публичный сайт перечитает каталог на следующем запросе.
    updateTag(CATALOG_TAG);
    return { ok: true, data: readContent(), id };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    console.error("[admin]", e);
    return { ok: false, error: "Не получилось сохранить. Попробуйте ещё раз." };
  }
}

function coll(c: unknown): Coll {
  if (!COLLS.includes(c as Coll)) throw new Invalid("Неизвестный раздел");
  return c as Coll;
}

/** Где используется программа или доп: пакеты, в которых она основная позиция или вариант. */
function usedIn(cat: CatalogData, id: string) {
  return cat.packages.filter((k) => k.items.some((it) => it.ref === id || it.alts?.includes(id))).map((k) => `«${k.name}»`);
}

/** Создать (id = null) или обновить позицию. Id существующих позиций не меняется никогда. */
export async function saveItem(c: Coll, id: string | null, input: unknown): Promise<AdminResult> {
  return run(({ catalog }) => {
    const key = coll(c);
    const list = catalog[key] as { id: string }[];
    const prev = id ? list.find((x) => x.id === id) : undefined;
    if (id && !prev) throw new Invalid("Эта позиция уже удалена. Обновите страницу.");
    const taken = new Set([...catalog.programs, ...catalog.extras, ...catalog.packages, ...catalog.costumes].map((x) => x.id));
    const newId = id ?? makeId(PREFIX[key], str((input as { name?: unknown })?.name), taken);

    let item: { id: string };
    const patch: Partial<Record<keyof CatalogData, unknown>> = {};
    if (key === "programs") item = cleanProgram(input, newId, prev as never);
    else if (key === "extras") item = cleanExtra(input, newId, prev as never);
    else if (key === "packages") item = cleanPackage(input, newId, catalog, prev as never);
    else {
      const cos = cleanCostume(input, newId, prev as never);
      item = cos;
      // Новая категория — сразу в список категорий (в конец).
      if (!catalog.costumeCats.includes(cos.cat)) patch.costumeCats = [...catalog.costumeCats, cos.cat];
    }
    patch[key] = prev ? list.map((x) => (x.id === id ? item : x)) : [item, ...list];
    return { patch, id: newId };
  });
}

export async function deleteItem(c: Coll, id: string): Promise<AdminResult> {
  return run(({ catalog }) => {
    const key = coll(c);
    const list = catalog[key] as { id: string }[];
    if (!list.some((x) => x.id === id)) throw new Invalid("Уже удалено");
    if (key === "programs" || key === "extras") {
      const where = usedIn(catalog, id);
      if (where.length) throw new Invalid(`Сначала уберите из пакетов: ${where.join(", ")}. Или просто скройте.`);
    }
    return { patch: { [key]: list.filter((x) => x.id !== id) } };
  });
}

export async function setHidden(c: Coll, id: string, hidden: boolean): Promise<AdminResult> {
  return run(({ catalog }) => {
    const key = coll(c);
    const list = catalog[key] as { id: string; hidden?: boolean }[];
    return {
      patch: {
        [key]: list.map((x) => {
          if (x.id !== id) return x;
          const { hidden: _, ...rest } = x;
          void _;
          return hidden ? { ...rest, hidden: true } : rest;
        }),
      },
    };
  });
}

/**
 * Поменять местами две позиции (соседей в видимом списке — с учётом поиска и фильтра).
 * Новые позиции появляются первыми.
 */
export async function swapItems(c: Coll, id: string, otherId: string): Promise<AdminResult> {
  return run(({ catalog }) => {
    const key = coll(c);
    const list = [...(catalog[key] as { id: string }[])];
    const i = list.findIndex((x) => x.id === id);
    const j = list.findIndex((x) => x.id === otherId);
    if (i < 0 || j < 0 || i === j) return { patch: {} };
    [list[i], list[j]] = [list[j], list[i]];
    return { patch: { [key]: list } };
  });
}

/** Список категорий костюмов: порядок, новые, переименование. Удалять можно только пустые. */
export async function saveCategories(cats: string[], rename?: { from: string; to: string }): Promise<AdminResult> {
  return run(({ catalog }) => {
    const clean = [...new Set((Array.isArray(cats) ? cats : []).map((x) => str(x, 60)).filter(Boolean))];
    const patch: Partial<Record<keyof CatalogData, unknown>> = {};
    let costumes = catalog.costumes;
    if (rename) {
      const from = str(rename.from, 60);
      const to = str(rename.to, 60);
      if (!to) throw new Invalid("Пустое название категории");
      costumes = costumes.map((c) => (c.cat === from ? { ...c, cat: to } : c));
      patch.costumes = costumes;
    }
    const used = new Set(costumes.map((c) => c.cat));
    for (const u of used) if (!clean.includes(u)) throw new Invalid(`В категории «${u}» есть герои — сначала перенесите их.`);
    patch.costumeCats = clean;
    return { patch };
  });
}

export async function saveSite(input: unknown): Promise<AdminResult> {
  return run(() => ({ patch: { site: cleanSite(input) } }));
}
