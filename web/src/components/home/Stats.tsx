"use client";

import { useEffect, useRef, useState } from "react";
import type { TrustStat } from "@/data/site";

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // До первого кадра анимации показываем итоговое число: если вкладка в фоне, ноль не застрянет.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1200;
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

/** Цифры доверия: белые карточки, цифры шрифтом Nauryz, докручиваются при появлении. */
export function Stats({ stats }: { stats: TrustStat[] }) {
  return (
    <section className="stats">
      <div className="wrap">
        <div className="stat-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <b>
                <Counter value={s.value} suffix={s.suffix} />
              </b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
