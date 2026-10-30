import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/** Папка с базой и загруженными фото (в проде — постоянный том). */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const dir = DATA_DIR;

// Одно соединение на процесс: маршруты и фоновая досылка заявок (instrumentation)
// собираются в разные бандлы, поэтому держим его на globalThis.
const g = globalThis as { __siteDb?: DatabaseSync };

export function getDb() {
  if (g.__siteDb) return g.__siteDb;
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "site.db"));
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      visitor TEXT NOT NULL,
      session TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      props TEXT,
      ref TEXT,
      utm TEXT,
      device TEXT
    );
    CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS events_name ON events(name, ts);
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      visitor TEXT,
      name TEXT,
      phone TEXT,
      total INTEGER,
      text TEXT NOT NULL,
      payload TEXT NOT NULL,
      delivered INTEGER NOT NULL DEFAULT 0
    );
  `);
  // Статус заявки для экрана «Заявки» (2026-10-30). ALTER только если колонки ещё нет — миграция идемпотентна,
  // старые заявки получают «new». Базу открывает и `next build` рядом с работающей службой (deploy.sh),
  // поэтому выше busy_timeout, а «колонку уже добавил соседний процесс» — не ошибка.
  const cols = new Set((db.prepare("PRAGMA table_info(leads)").all() as { name: string }[]).map((c) => c.name));
  const addColumn = (name: string, def: string) => {
    if (cols.has(name)) return;
    try {
      db.exec(`ALTER TABLE leads ADD COLUMN ${name} ${def}`);
    } catch (e) {
      if (!String(e).includes("duplicate column")) throw e;
    }
  };
  try {
    addColumn("status", "TEXT NOT NULL DEFAULT 'new'");
    addColumn("status_ts", "INTEGER");
  } catch (e) {
    // Не кэшируем и закрываем: иначе каждый следующий вызов открывал бы ещё одно соединение.
    db.close();
    throw e;
  }
  // Кэшируем только готовое соединение: упадёт создание таблиц — следующий вызов попробует снова.
  g.__siteDb = db;
  return db;
}
