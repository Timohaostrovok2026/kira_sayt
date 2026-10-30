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
  // Кэшируем только готовое соединение: упадёт создание таблиц — следующий вызов попробует снова.
  g.__siteDb = db;
  return db;
}
