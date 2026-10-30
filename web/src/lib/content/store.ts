import "server-only";
import type { CatalogData } from "@/data/catalog";
import type { SiteContent } from "@/data/site";
import { getDb } from "@/lib/db";
import { seedCatalog, seedSite } from "./seed";

/**
 * Хранилище контента: таблица content (ключ → JSON) в той же SQLite-базе.
 * Каждая запись сохраняет прошлую версию в content_history — можно откатить руками.
 * Не кэширует между запросами сам: для сайта есть getCatalog() с "use cache".
 */

export type ContentKey = "programs" | "extras" | "packages" | "costumes" | "costumeCats" | "site";
const KEYS: ContentKey[] = ["programs", "extras", "packages", "costumes", "costumeCats", "site"];
const HISTORY_KEEP = 50;

export interface ContentAll {
  catalog: CatalogData;
  site: SiteContent;
}

let ready = false;

function db() {
  const d = getDb();
  if (ready) return d;
  d.exec(`
    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL
    );
  `);
  // Первое обращение: наполняем из catalog.json и site.ts, только отсутствующие ключи.
  const cat = seedCatalog();
  const seed: Record<ContentKey, unknown> = { ...cat, site: seedSite() };
  const ins = d.prepare("INSERT OR IGNORE INTO content (key, value, updated) VALUES (?, ?, ?)");
  for (const k of KEYS) ins.run(k, JSON.stringify(seed[k]), Date.now());
  ready = true;
  return d;
}

let memo: { stamp: string; value: ContentAll } | null = null;

/** Всё содержимое как есть, включая скрытые позиции (копия — можно менять). */
export function readContent(): ContentAll {
  return structuredClone(readContentShared());
}

/** То же без копирования: один общий объект, пока данные не поменялись. Только для чтения! */
export function readContentShared(): Readonly<ContentAll> {
  const d = db();
  const stamp = d.prepare("SELECT group_concat(key || ':' || updated) AS s FROM (SELECT key, updated FROM content ORDER BY key)").get() as { s: string };
  if (memo && memo.stamp === stamp.s) return memo.value;
  const rows = d.prepare("SELECT key, value FROM content").all() as { key: ContentKey; value: string }[];
  const m = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)])) as Record<ContentKey, never>;
  const value: ContentAll = {
    catalog: {
      programs: m.programs ?? [],
      extras: m.extras ?? [],
      packages: m.packages ?? [],
      costumes: m.costumes ?? [],
      costumeCats: m.costumeCats ?? [],
    },
    // Новые поля текстов (галерея, отзывы…) берём из начального наполнения, пока их не сохранили.
    site: { ...seedSite(), ...((m.site as object | undefined) ?? {}) },
  };
  memo = { stamp: stamp.s, value };
  return value;
}

/** Записать несколько ключей одной транзакцией (старые значения уходят в историю). */
export function writeContent(patch: Partial<Record<ContentKey, unknown>>) {
  const d = db();
  const now = Date.now();
  d.exec("BEGIN IMMEDIATE");
  try {
    for (const [key, value] of Object.entries(patch)) {
      if (!KEYS.includes(key as ContentKey) || value === undefined) continue;
      const old = d.prepare("SELECT value, updated FROM content WHERE key = ?").get(key) as { value: string; updated: number } | undefined;
      if (old) {
        d.prepare("INSERT INTO content_history (ts, key, value) VALUES (?, ?, ?)").run(now, key, old.value);
        d.prepare(
          "DELETE FROM content_history WHERE key = ? AND id NOT IN (SELECT id FROM content_history WHERE key = ? ORDER BY id DESC LIMIT ?)",
        ).run(key, key, HISTORY_KEEP);
      }
      // updated строго растёт, даже при двух записях в одну миллисекунду — иначе memo не заметит.
      const stamp = Math.max(now, (old?.updated ?? 0) + 1);
      d.prepare("INSERT INTO content (key, value, updated) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated").run(
        key,
        JSON.stringify(value),
        stamp,
      );
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
  memo = null;
}
