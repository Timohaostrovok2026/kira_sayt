"use client";

import { useEffect, useRef, type ReactNode } from "react";

const SPEED = 0.036; // px в мс ≈ 36 px/с — спокойно, глаз успевает разглядеть героя
const IDLE_AFTER_TOUCH = 4000; // после свайпа пользователя ждём, потом едем дальше

/**
 * Лента, которая сама медленно едет по кругу. Свайп, колесо, наведение мыши и фокус клавиатуры её останавливают.
 * Содержимое повторено дважды, чтобы круг был бесшовным. Копия скрыта от экранного диктора и Tab,
 * но нажимается мышкой и пальцем (inert не ставим — иначе «+» у героев справа не работает).
 * Если пользователь просит меньше движения — копия скрыта CSS, лента обычная.
 */
export function AutoRail({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  // Кнопки и ссылки копии убираем из обхода по Tab.
  useEffect(() => {
    copyRef.current?.querySelectorAll<HTMLElement>("a, button").forEach((el) => (el.tabIndex = -1));
  });

  useEffect(() => {
    const el = ref.current;
    const copy = copyRef.current;
    if (!el || !copy || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = 0;
    let pos = el.scrollLeft;
    let pausedUntil = 0;
    let hover = false;
    let period = 0;

    // Длина одного круга: от первого элемента до первого элемента копии. Пересчёт — только при смене размеров.
    const measure = () => {
      const first = el.firstElementChild as HTMLElement | null;
      const twin = copy.firstElementChild as HTMLElement | null;
      period = first && twin ? twin.offsetLeft - first.offsetLeft : 0;
    };
    measure();

    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 0;
      last = t;
      const moving = !hover && t > pausedUntil && !el.matches(":focus-within") && period > 0;
      if (moving) {
        pos += SPEED * dt;
        if (pos >= period) pos -= period;
        el.scrollLeft = pos;
      } else {
        // Пока стоим — запоминаем, куда ленту докрутил человек, и не даём уйти за круг.
        pos = el.scrollLeft;
        if (period > 0 && pos >= period && t > pausedUntil && !hover) {
          pos -= period;
          el.scrollLeft = pos;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const pause = () => {
      pausedUntil = performance.now() + IDLE_AFTER_TOUCH;
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const leave = () => {
      hover = false;
    };

    // Крутим только пока лента на экране.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(el);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("pointerdown", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={`rail rail-auto ${className}`}>
      {children}
      <div ref={copyRef} aria-hidden="true" className="rail-copy contents">
        {children}
      </div>
    </div>
  );
}
