"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Объём на первом экране: герои чуть сдвигаются за мышкой (ноутбук) и отстают при прокрутке (телефон).
 * Пишем только CSS-переменные --px/--py/--sy, сами сдвиги считает каждый слой (depth в Hero.tsx).
 */
export function HeroScene({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.closest("section");
    if (!el || !section || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let px = 0;
    let py = 0;
    const paint = () => {
      raf = 0;
      // Прокрутка: 0 вверху страницы, 1 — когда первый экран ушёл целиком.
      const sy = Math.min(1, Math.max(0, window.scrollY / Math.max(1, section.offsetHeight)));
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--sy", sy.toFixed(3));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = section.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };
    const onLeave = () => {
      px = 0;
      py = 0;
      schedule();
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

