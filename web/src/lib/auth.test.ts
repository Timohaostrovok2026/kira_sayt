// Вход в /admin и /stats: кука = HMAC от пароля; в продакшене без STATS_PASSWORD не пускаем никого.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// auth.ts тянет «server-only» и next/headers — подменяем: куки берём из globalThis.__testCookie.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (spec === "next/headers")
      return {
        url:
          "data:text/javascript,export async function cookies(){return{get:(n)=>globalThis.__testCookie==null?undefined:{name:n,value:globalThis.__testCookie}}}",
        shortCircuit: true,
      };
    return next(spec, ctx);
  },
});
const { statsPassword, tokenFor, safeEqual, isAuthed } = await import("./auth.ts");

const g = globalThis as { __testCookie?: string | null };
const env = process.env as Record<string, string | undefined>;
const saved = { NODE_ENV: env.NODE_ENV, STATS_PASSWORD: env.STATS_PASSWORD, STATS_SECRET: env.STATS_SECRET };

beforeEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  delete env.STATS_PASSWORD;
  delete env.STATS_SECRET;
  g.__testCookie = null;
});

test("продакшен без STATS_PASSWORD — вход выключен, запасной пароль не работает", async () => {
  env.NODE_ENV = "production";
  assert.equal(statsPassword(), null);
  env.STATS_PASSWORD = "   ";
  assert.equal(statsPassword(), null, "пароль из одних пробелов — то же, что нет пароля");
  g.__testCookie = tokenFor("uly-dev");
  assert.equal(await isAuthed(), false);
});

test("разработка без пароля — uly-dev с пометкой; заданный пароль обрезается", () => {
  env.NODE_ENV = "development";
  assert.deepEqual(statsPassword(), { password: "uly-dev", devDefault: true });
  env.STATS_PASSWORD = "  секрет ";
  assert.deepEqual(statsPassword(), { password: "секрет", devDefault: false });
  env.NODE_ENV = "production";
  assert.deepEqual(statsPassword(), { password: "секрет", devDefault: false });
});

test("токен зависит от пароля и от STATS_SECRET, пароль в куке не виден", () => {
  const a = tokenFor("pass1");
  assert.equal(a, tokenFor("pass1"));
  assert.notEqual(a, tokenFor("pass2"));
  assert.ok(!a.includes("pass1"));
  assert.match(a, /^[A-Za-z0-9_-]{43}$/, "HMAC-SHA256 в base64url");
  env.STATS_SECRET = "other";
  assert.notEqual(tokenFor("pass1"), a, "смена секрета сбрасывает все входы");
});

test("safeEqual: разная длина — false, а не исключение", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.doesNotThrow(() => safeEqual("abc", "abcd"));
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", "x"), false);
});

test("isAuthed: только кука с токеном текущего пароля", async () => {
  env.NODE_ENV = "production";
  env.STATS_PASSWORD = "kirill";
  assert.equal(await isAuthed(), false, "без куки");
  g.__testCookie = "";
  assert.equal(await isAuthed(), false, "пустая кука");
  g.__testCookie = "kirill";
  assert.equal(await isAuthed(), false, "пароль в куке открытым текстом");
  g.__testCookie = tokenFor("kirill").slice(0, -1);
  assert.equal(await isAuthed(), false, "обрезанный токен");
  g.__testCookie = tokenFor("old-password");
  assert.equal(await isAuthed(), false, "токен старого пароля");
  g.__testCookie = tokenFor("kirill");
  assert.equal(await isAuthed(), true);
});
