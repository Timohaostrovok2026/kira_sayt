import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/** Папка с базой и загруженными фото (в проде — постоянный том). */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const dir = DATA_DIR;

let db: DatabaseSync | null = null;

export function getDb() {
  if (db) return db;
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, "site.db"));
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
  return db;
}
