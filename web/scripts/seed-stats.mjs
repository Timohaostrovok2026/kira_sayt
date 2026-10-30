#!/usr/bin/env node
/**
 * ДЕМО-данные для /stats: ~2 недели правдоподобных событий и несколько заявок.
 * Только для локальной разработки! В продакшене не запускается.
 *
 *   node scripts/seed-stats.mjs          — добавить демо (если база пустая)
 *   node scripts/seed-stats.mjs --force  — добавить, даже если в базе уже что-то есть
 *   node scripts/seed-stats.mjs --wipe   — удалить только демо-строки (visitor начинается с "seed-")
 *
 * Полностью стереть всё: удалите файл data/site.db (и data/site.db-wal, data/site.db-shm).
 *
 * ВАЖНО: запускайте при ОСТАНОВЛЕННОМ dev-сервере (или перезапустите его после).
 * Иначе открытое в next dev соединение SQLite может «увидеть» базу как повреждённую
 * («database disk image is malformed») — сам файл при этом цел, помогает перезапуск сервера.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("✋ seed-stats: NODE_ENV=production — демо-данные в боевую базу не пишем.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const dir = process.env.DATA_DIR ?? path.join(root, "data");
const file = path.join(dir, "site.db");
fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(file);
// Та же схема, что в src/lib/db.ts.
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

const howToWipe = () => {
  console.log("\nКак убрать демо:");
  console.log("  • только демо-строки:  node scripts/seed-stats.mjs --wipe");
  console.log(`  • всю базу целиком:   rm ${path.relative(root, file)}*   (site.db, -wal, -shm)`);
};

if (args.has("--wipe")) {
  const e = db.prepare("DELETE FROM events WHERE visitor LIKE 'seed-%'").run();
  const l = db.prepare("DELETE FROM leads WHERE visitor LIKE 'seed-%'").run();
  console.log(`🧹 Удалено демо: ${e.changes} событий, ${l.changes} заявок.`);
  process.exit(0);
}

const existing = db.prepare("SELECT COUNT(*) n FROM events").get().n;
if (existing > 0 && !args.has("--force")) {
  console.error(`✋ В базе уже ${existing} событий. Чтобы всё равно добавить демо, запустите с --force.`);
  howToWipe();
  process.exit(1);
}

/* ---------- Каталог ---------- */

const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog.json"), "utf8"));
const programs = catalog.programs;
const extras = catalog.extras.filter((e) => e.id !== "e_mkad" && e.id !== "e_sound");
const packages = catalog.packages;
const costumes = catalog.costumes;
const cats = catalog.costumeCats;

/* ---------- Случайность с зерном, чтобы демо было повторяемым ---------- */

let seed = 20261029;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const chance = (p) => rnd() < p;
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
// Популярные элементы чаще: квадрат смещает к началу списка.
const pickHot = (arr) => arr[Math.floor(rnd() ** 2.2 * arr.length)];
const weighted = (pairs) => {
  const sum = pairs.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * sum;
  for (const [v, w] of pairs) if ((x -= w) <= 0) return v;
  return pairs[pairs.length - 1][0];
};
const id36 = () => Math.floor(rnd() * 2 ** 40).toString(36);

const SOURCES = [
  [{ ref: null, utm: null }, 34],
  [{ ref: "yandex.ru", utm: null }, 26],
  [{ ref: "google.com", utm: null }, 7],
  [{ ref: "l.instagram.com", utm: null }, 8],
  [{ ref: null, utm: "instagram_bio" }, 6],
  [{ ref: "t.me", utm: null }, 5],
  [{ ref: null, utm: "tg_channel" }, 4],
  [{ ref: "vk.com", utm: null }, 4],
  [{ ref: "avito.ru", utm: null }, 3],
  [{ ref: "yandex.ru", utm: "yandex_direct" }, 6],
];
const DEVICES = [["mobile", 72], ["desktop", 21], ["tablet", 7]];
const SEARCHES = [
  "человек паук", "Человек-паук", "эльза", "Эльза", "щенячий патруль", "гарри поттер", "единорог",
  "дед мороз", "майнкрафт", "барби", "соник", "фея", "пират", "динозавр", "леди баг", "холодное сердце",
  "бэтмен", "миньон", "хаги ваги",
];
const AGES = ["1-3", "4-6", "4-6", "4-6", "7-10", "7-10", "11-15"];
const NAMES = ["Анна", "Мария", "Екатерина", "Ольга", "Татьяна", "Юлия", "Наталья", "Ирина", "Дмитрий", "Алексей", "Светлана", "Ксения"];
const CONTACTS = [["whatsapp", 40], ["phone", 30], ["telegram", 20], ["tg_channel", 6], ["instagram", 8]];

const insEvent = db.prepare(
  "INSERT INTO events (ts, visitor, session, name, path, props, ref, utm, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
const insLead = db.prepare(
  "INSERT INTO leads (ts, visitor, name, phone, total, text, payload, delivered) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);

const DAY = 86_400_000;
const MSK = 3 * 3_600_000;
const now = Date.now();
const todayMsk = Math.floor((now + MSK) / DAY) * DAY - MSK;
const visitors = [];
let nEvents = 0;
let nSessions = 0;
let nLeads = 0;

function session(start, isNow = false) {
  const returning = visitors.length > 20 && chance(0.18);
  const visitor = returning ? pick(visitors) : `seed-${id36()}`;
  if (!returning) visitors.push(visitor);
  const sid = id36();
  const src = weighted(SOURCES);
  const device = weighted(DEVICES);
  let t = start;
  let p = weighted([["/", 60], ["/kostyumy", 14], ["/sobrat", 10], [`/programmy/${pickHot(programs).id}`, 10], ["/pakety", 6]]);
  const cart = { items: [], total: 0 };
  const ev = (name, props = null, at = p) => {
    t += int(2, 40) * 1000;
    if (isNow && t > now) t = now - int(0, 60) * 1000;
    insEvent.run(t, visitor, sid, name, at, props ? JSON.stringify(props) : null, src.ref, src.utm, device);
    nEvents++;
  };
  const add = (type, item) => {
    ev("cart_add", { type, id: item.id });
    ev("click", { el: `${type === "package" ? "package_add" : type === "costume" ? "costume_add" : type + "_add"}_${item.id}` });
    cart.items.push(`${item.name}${item.price ? ` — ${item.price.toLocaleString("ru-RU")} ₽` : ""}`);
    cart.total += item.price ?? 0;
  };

  // Примерно треть заходов — посмотрели одну страницу и ушли, ничего не нажав.
  if (chance(0.34)) {
    ev("pageview");
    if (chance(0.35)) ev("scroll", { depth: 50 });
    nSessions++;
    return;
  }

  for (let step = 0; step < 9; step++) {
    ev("pageview");
    if (chance(0.55)) ev("scroll", { depth: 50 });
    if (chance(0.28)) ev("scroll", { depth: 90 });

    if (p === "/kostyumy") {
      if (chance(0.5)) ev("costume_cat", { cat: pickHot(cats) });
      if (chance(0.35)) ev("costume_search", { q: pickHot(SEARCHES), n: chance(0.12) ? 0 : int(1, 9) });
      for (let i = 0, k = int(0, 4); i < k; i++) {
        const c = pickHot(costumes);
        ev("costume_view", { id: c.id });
        if (chance(0.22)) add("costume", { ...c, price: 0 });
      }
    } else if (p === "/sobrat") {
      ev("builder_step", { step: 1 });
      if (chance(0.8)) ev("builder_age", { age: pick(AGES) });
      if (chance(0.7)) {
        ev("builder_step", { step: 2 });
        if (chance(0.6)) add("program", pickHot(programs));
      }
      if (chance(0.45)) {
        ev("builder_step", { step: 3 });
        if (chance(0.5)) add("extra", pickHot(extras));
      }
      if (chance(0.3)) ev("builder_step", { step: 4 });
    } else if (p.startsWith("/programmy/")) {
      if (chance(0.3)) add("program", programs.find((x) => p.endsWith(x.id)) ?? pick(programs));
      if (chance(0.15)) add("extra", pickHot(extras));
    } else if (p === "/pakety") {
      if (chance(0.25)) {
        const k = pickHot(packages);
        add("package", { ...k, price: 25000 + int(0, 30) * 1000 });
      }
    } else if (p === "/") {
      if (chance(0.4)) ev("click", { el: `program_open_${pickHot(programs).id}` });
      if (chance(0.12)) add("program", pickHot(programs));
    } else if (p === "/korzina") {
      ev("cart_open");
      if (cart.total > 0 && chance(0.1)) {
        ev("lead_submit");
        if (chance(0.94)) {
          ev("lead_ok");
          const name = pick(NAMES);
          const phone = `+7 (9${int(10, 99)}) ${int(100, 999)}-${int(10, 99)}-${int(10, 99)}`;
          const date = new Date(t + int(3, 20) * DAY).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
          const text = [
            `Имя: ${name}`,
            `Телефон: ${phone}`,
            `Дата праздника: ${date}`,
            `Возраст: ${pick(AGES).replace("-", "–")} лет, детей: ${int(5, 15)}`,
            "",
            "Состав:",
            ...cart.items.map((x) => `• ${x}`),
            "",
            `Итого: ${cart.total.toLocaleString("ru-RU")} ₽`,
            "(ДЕМО-заявка из scripts/seed-stats.mjs)",
          ].join("\n");
          insLead.run(t, visitor, name, phone, cart.total, text, JSON.stringify({ demo: true }), chance(0.85) ? 1 : 0);
          nLeads++;
        } else ev("lead_fail", { total: cart.total });
        break;
      }
    }

    if (chance(0.06)) ev("contact", { via: weighted(CONTACTS) });
    if (chance(0.3)) break; // ушли

    // Куда дальше
    const next = cart.items.length && chance(0.3)
      ? "/korzina"
      : weighted([["/sobrat", 26], ["/kostyumy", 24], ["/pakety", 14], [`/programmy/${pickHot(programs).id}`, 22], ["/", 8], ["/korzina", 6]]);
    const how = device === "mobile"
      ? `bottom_${{ "/sobrat": "Собрать", "/kostyumy": "Костюмы", "/pakety": "Пакеты", "/korzina": "Корзина", "/": "Главная" }[next] ?? "Собрать"}`
      : next === "/korzina" ? "header_cart" : `nav_${next.startsWith("/programmy") ? "/sobrat" : next}`;
    if (next.startsWith("/programmy/")) ev("click", { el: `program_open_${next.split("/").pop()}` });
    else ev("click", { el: how });
    if (next === "/korzina" && cart.items.length && chance(0.3)) ev("click", { el: "toast_to_cart" });
    p = next;
  }
  nSessions++;
}

db.exec("BEGIN");
try {
  for (let d = 13; d >= 0; d--) {
    const dayStart = todayMsk - d * DAY;
    const dow = new Date(dayStart + MSK).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const base = 38 + (13 - d) * 2.2; // небольшой рост
    let count = Math.round(base * (weekend ? 1.35 : 1) * (0.8 + rnd() * 0.4));
    if (d === 0) count = Math.round(count * Math.min(1, (now - dayStart) / DAY));
    for (let i = 0; i < count; i++) {
      // Больше заходов днём и вечером по Москве.
      const hour = weighted([[8, 2], [9, 3], [10, 5], [11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 7], [18, 8], [19, 9], [20, 9], [21, 8], [22, 5], [23, 3], [0, 1], [7, 1]]);
      const start = dayStart + hour * 3_600_000 + int(0, 3_599) * 1000;
      if (start > now - 10 * 60_000) continue;
      session(start);
    }
  }
  // Пара человек «прямо сейчас».
  for (let i = 0; i < 3; i++) session(now - int(1, 3) * 60_000, true);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

console.log(`✅ Демо добавлено в ${path.relative(root, file)}: ${nSessions} визитов, ${nEvents} событий, ${nLeads} заявок.`);
console.log("   Откройте /stats (в разработке пароль uly-dev, если не задан STATS_PASSWORD).");
console.log("⚠️  Если next dev был запущен — перезапустите его, чтобы он заново открыл базу.");
howToWipe();
