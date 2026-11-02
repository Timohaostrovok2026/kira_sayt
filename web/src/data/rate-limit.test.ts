// Лимиты частоты: перебор пароля и поток мусора должны упираться в потолок, обычный посетитель — нет.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, TOO_LARGE, clientIp, readJsonLimited } from "./rate-limit.ts";

test("пускает ровно limit попыток за окно, дальше отказ", () => {
  const rl = new RateLimiter(3, 1000);
  assert.deepEqual([1, 2, 3, 4, 5].map(() => rl.hit("a", 0)), [true, true, true, false, false]);
});

test("новое окно — счётчик с нуля", () => {
  const rl = new RateLimiter(1, 1000);
  assert.equal(rl.hit("a", 0), true);
  assert.equal(rl.hit("a", 999), false);
  assert.equal(rl.hit("a", 1000), true);
});

test("разные адреса считаются отдельно", () => {
  const rl = new RateLimiter(1, 1000);
  assert.equal(rl.hit("a", 0), true);
  assert.equal(rl.hit("b", 0), true);
  assert.equal(rl.hit("a", 0), false);
});

test("reset снимает счётчик", () => {
  const rl = new RateLimiter(1, 1000);
  rl.hit("a", 0);
  rl.reset("a");
  assert.equal(rl.hit("a", 0), true);
});

test("поток с тысяч адресов не раздувает память", () => {
  const rl = new RateLimiter(5, 60_000);
  for (let i = 0; i < 25_000; i++) rl.hit(`ip${i}`, i);
  assert.ok(rl.size <= 10_000);
  // Свежий адрес по-прежнему учитывается
  assert.equal(rl.hit("ip24999", 25_000), true);
});

test("адрес клиента — последний в X-Forwarded-For (его дописывает Caddy)", () => {
  assert.equal(clientIp("6.6.6.6, 1.2.3.4"), "1.2.3.4");
  assert.equal(clientIp(" 1.2.3.4 "), "1.2.3.4");
  assert.equal(clientIp(null), "local");
  assert.equal(clientIp(""), "local");
});

test("тело запроса: большое — TOO_LARGE, кривое — undefined, null — null", async () => {
  const req = (body: string, len?: string) =>
    new Request("http://x/", { method: "POST", body, headers: len ? { "content-length": len } : {} });
  assert.equal(await readJsonLimited(req("x".repeat(101)), 100), TOO_LARGE);
  assert.equal(await readJsonLimited(req("{}", "5000"), 100), TOO_LARGE);
  assert.equal(await readJsonLimited(req("{не json"), 100), undefined);
  assert.equal(await readJsonLimited(req("null"), 100), null);
  assert.deepEqual(await readJsonLimited(req('{"a":1}'), 100), { a: 1 });
});

test("тело без Content-Length считается в байтах и обрывается на лимите", async () => {
  const stream = (s: string) => new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(s)); c.close(); } });
  const req = (s: string) => new Request("http://x/", { method: "POST", body: stream(s), duplex: "half" } as RequestInit);
  // 60 кириллических букв — 120 байт: в символах влезло бы, в байтах — нет
  assert.equal(await readJsonLimited(req(JSON.stringify("я".repeat(60))), 100), TOO_LARGE);
  assert.equal(await readJsonLimited(req(JSON.stringify("я".repeat(40))), 100), "я".repeat(40));
});
