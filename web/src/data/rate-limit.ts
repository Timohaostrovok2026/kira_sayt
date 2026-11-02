// Ограничение частоты запросов с одного адреса: чистые функции без сети и базы (тесты — rate-limit.test.ts).
// Счётчики живут в памяти процесса: сервер у нас один, после перезапуска они просто обнуляются.

/** Сколько адресов помнить. Больше — забываем самые старые окна, чтобы поток с разных адресов не съел память. */
const MAX_KEYS = 10_000;

/** Фиксированное окно: `limit` попыток за `windowMs` с одного ключа (обычно IP). */
export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  readonly limit: number;
  readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Засчитать попытку. false — лимит исчерпан, запрос отклоняем. */
  hit(key: string, now = Date.now()): boolean {
    const cur = this.hits.get(key);
    if (!cur || now - cur.start >= this.windowMs) {
      this.hits.delete(key); // заново в конец Map — порядок вставки = порядок старости
      this.hits.set(key, { start: now, count: 1 });
      this.prune(now);
      return true;
    }
    cur.count++;
    return cur.count <= this.limit;
  }

  /** Снять счётчик: например, после верного пароля неудачные попытки больше не считаются. */
  reset(key: string) {
    this.hits.delete(key);
  }

  get size() {
    return this.hits.size;
  }

  private prune(now: number) {
    if (this.hits.size <= MAX_KEYS) return;
    for (const [k, v] of this.hits) {
      if (this.hits.size <= MAX_KEYS) break;
      // Самые старые окна идут первыми: истёкшие удаляем, а при переполнении — и живые.
      if (now - v.start >= this.windowMs || this.hits.size > MAX_KEYS) this.hits.delete(k);
    }
  }
}

/**
 * Адрес клиента. Перед сайтом стоит Caddy: присланный клиентом X-Forwarded-For он заменяет
 * настоящим адресом. Берём последний элемент — так подделка не пройдёт, даже если перед Caddy появится ещё прокси.
 * Без заголовка (локальный запуск) — общий ключ "local".
 */
export function clientIp(forwardedFor: string | null): string {
  const last = forwardedFor?.split(",").pop()?.trim();
  return last || "local";
}

export const TOO_LARGE = Symbol("too_large");

/**
 * Тело запроса как JSON, но не больше `maxBytes`: иначе любой скрипт пишет в базу мегабайты.
 * TOO_LARGE — слишком большое, undefined — не JSON.
 */
export async function readJsonLimited(req: Request, maxBytes: number): Promise<unknown> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return TOO_LARGE;
  // Читаем потоком и обрываем на лимите: без Content-Length (chunked) req.text() сначала проглотил бы всё тело.
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return TOO_LARGE;
      }
      chunks.push(value);
    }
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}
