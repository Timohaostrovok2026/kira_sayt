"use client";

/**
 * Своя аналитика: события копятся в очереди и уходят пачкой на /api/track.
 * Яндекс Метрика (вебвизор, карта кликов) подключается отдельно в layout, если задан NEXT_PUBLIC_YM_ID.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

interface QueuedEvent {
  name: string;
  path: string;
  props?: Props;
  ts: number;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function uid(key: string, storage: Storage | null) {
  try {
    if (!storage) return "na";
    let v = storage.getItem(key);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      storage.setItem(key, v);
    }
    return v;
  } catch {
    return "na";
  }
}

function flush() {
  timer = null;
  if (!queue.length || typeof window === "undefined") return;
  const body = JSON.stringify({
    visitor: uid("uly-vid", window.localStorage),
    session: uid("uly-sid", window.sessionStorage),
    ref: document.referrer || null,
    utm: new URLSearchParams(location.search).get("utm_source"),
    w: window.innerWidth,
    events: queue,
  });
  queue = [];
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {}
}

/** Постоянный id посетителя (создаётся при первом обращении). */
export function visitorId() {
  if (typeof window === "undefined") return null;
  return uid("uly-vid", window.localStorage);
}

export function track(name: string, props?: Props) {
  if (typeof window === "undefined") return;
  queue.push({ name, path: location.pathname, props, ts: Date.now() });
  const ym = (window as unknown as { ym?: (id: number, a: string, g: string, p?: Props) => void }).ym;
  const ymId = Number(process.env.NEXT_PUBLIC_YM_ID);
  if (ym && ymId) ym(ymId, "reachGoal", name, props);
  if (!timer) timer = setTimeout(flush, 1500);
}

export function flushNow() {
  if (timer) clearTimeout(timer);
  flush();
}
