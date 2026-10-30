import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { buildCatalog, type CatalogData } from "@/data/catalog";
import type { SiteContent } from "@/data/site";
import { readContent } from "./store";

/** Тег кэша всего контента: админка после сохранения вызывает updateTag(CATALOG_TAG). */
export const CATALOG_TAG = "catalog";

/**
 * Что уходит на публичный сайт: скрытые позиции остаются только как «скелет» (имя, цена, фото) —
 * на них могут ссылаться пакеты и обложки, но описания не раскрываем.
 */
function publicData(d: CatalogData): CatalogData {
  const strip = <T extends { hidden?: boolean }>(x: T, keep: (keyof T)[]) =>
    x.hidden ? (Object.fromEntries(keep.filter((k) => x[k] !== undefined).map((k) => [k, x[k]])) as unknown as T) : x;
  return {
    programs: d.programs.map((p) => strip(p, ["id", "name", "kind", "price", "cover", "photo", "hidden"])),
    extras: d.extras.map((e) => strip(e, ["id", "name", "kind", "group", "price", "unit", "photo", "hidden"])),
    packages: d.packages.filter((k) => !k.hidden),
    costumes: d.costumes.map((c) => strip(c, ["id", "name", "cat", "photo", "hidden"])),
    costumeCats: d.costumeCats,
  };
}

/** Данные каталога для сайта (сериализуемые — можно передать в клиентский CatalogProvider). */
export async function getCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");
  return publicData(readContent().catalog);
}

/** Тексты сайта: контакты, цифры доверия, шаги, FAQ. */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");
  return readContent().site;
}

/** Каталог со справочниками (programById, costumeImg…) для серверных компонентов. */
export async function getCatalog() {
  return buildCatalog(await getCatalogData());
}
