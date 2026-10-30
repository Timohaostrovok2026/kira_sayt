"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { flushNow, track } from "@/lib/track";

/**
 * Автоматическая аналитика:
 * - просмотр страницы при каждой смене адреса;
 * - клик по любому элементу с data-track="имя";
 * - клики по контактам (телефон, Telegram, WhatsApp, Instagram);
 * - глубина прокрутки 50% и 90%.
 */
export function Tracker() {
  const path = usePathname();
  const depth = useRef(new Set<number>());

  useEffect(() => {
    depth.current = new Set();
    track("pageview");
  }, [path]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      const el = t?.closest<HTMLElement>("[data-track]");
      if (el) track("click", { el: el.dataset.track });
      const a = t?.closest<HTMLAnchorElement>("a[href]");
      if (a) {
        const h = a.getAttribute("href") ?? "";
        const via = h.startsWith("tel:")
          ? "phone"
          : h.includes("wa.me")
            ? "whatsapp"
            : h.includes("t.me/smile")
              ? "tg_channel"
              : h.includes("t.me")
                ? "telegram"
                : h.includes("instagram")
                  ? "instagram"
                  : null;
        if (via) track("contact", { via });
      }
    }
    function onScroll() {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max <= 0) return;
      const p = scrollY / max;
      for (const mark of [50, 90]) {
        if (p * 100 >= mark && !depth.current.has(mark)) {
          depth.current.add(mark);
          track("scroll", { depth: mark });
        }
      }
    }
    function onHide() {
      if (document.visibilityState === "hidden") flushNow();
    }
    document.addEventListener("click", onClick, { capture: true });
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
