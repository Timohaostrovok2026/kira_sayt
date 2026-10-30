// Доставка заявок менеджеру: чистые функции без сети и базы (тестируются в notify.test.ts).

/** Telegram не принимает сообщения длиннее 4096 символов — режем с запасом. */
export const TELEGRAM_MAX = 4000;

/** Сколько ждать перед каждой попыткой: Telegram из РФ отвечает через раз. */
export const RETRY_DELAYS_MS = [0, 2_000, 5_000];

/** Недоставленные заявки досылаем в фоне, но не старше двух суток — дальше звонят по /stats. */
export const RESEND_WINDOW_MS = 48 * 3600_000;
export const RESEND_EVERY_MS = 5 * 60_000;

/** Досланную позже этого срока заявку помечаем — менеджер видит, что клиент ждёт давно. */
export const LATE_MS = 5 * 60_000;

/** `late` — время заявки (МСК), если она досылается с опозданием. */
export function leadMessage(id: number, text: string, late?: string): string {
  const head = `🎉 Заявка №${id} с сайта\n${late ? `⏰ Дошла с опозданием — отправлена ${late}\n` : ""}\n`;
  const tail = "\n\n… заявка длинная — целиком в /stats";
  // Битые эмодзи (одиночные суррогаты) Telegram не принимает — заменяем на «�».
  const full = head + text.toWellFormed();
  if (full.length <= TELEGRAM_MAX) return full;
  // Не оставляем половину эмодзи на обрезе: Telegram не примет такой текст.
  const cut = full.slice(0, TELEGRAM_MAX - tail.length).replace(/[\uD800-\uDBFF]$/, "");
  return cut.trimEnd() + tail;
}

/**
 * Пробует `send` с паузами из `delays`, пока не получится.
 * Возвращает true, если хоть одна попытка удалась.
 */
export async function withRetries(
  send: () => Promise<boolean>,
  delays: readonly number[] = RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<boolean> {
  for (const ms of delays) {
    if (ms > 0) await sleep(ms);
    try {
      if (await send()) return true;
    } catch {
      // сеть упала — следующая попытка
    }
  }
  return false;
}
