"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Quote, Star } from "lucide-react";
import type { SiteContent } from "@/data/site";

type Review = SiteContent["reviews"][number];

/** Отзыв: 4 строки, остальное — по кнопке «Читать полностью» (кнопка есть, только если текст не влез). */
export function ReviewCard({ r }: { r: Review }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);

  // Перемеряем при смене ширины (поворот телефона, подгрузка шрифта): влезает ли текст в 4 строки.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => {
      if (el.classList.contains("line-clamp-4")) setLong(el.scrollHeight > el.clientHeight + 2);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r.text]);

  return (
    <article className="card lift reveal relative flex w-[82vw] max-w-[340px] flex-col gap-4 overflow-hidden p-5 md:w-auto md:max-w-none">
      <Quote aria-hidden="true" size={64} className="absolute -right-2 -top-2 rotate-180 text-rasp-100" fill="currentColor" strokeWidth={0} />
      <span className="relative flex text-star" role="img" aria-label="5 из 5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <div className="relative flex-1">
        <p ref={textRef} className={`text-[16px] leading-relaxed text-ink/85 ${open ? "" : "line-clamp-4"}`}>
          «{r.text}»
        </p>
        {(long || open) && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1 min-h-10 text-[15px] font-semibold text-rasp-600 hover:text-rasp-700"
          >
            {open ? "Свернуть" : "Читать полностью"}
          </button>
        )}
      </div>
      <footer className="flex items-center gap-3 border-t border-line pt-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rasp-500 font-display text-[16px] font-bold text-white">
          {r.name.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{r.name}</span>
          <span className="block text-[13px] text-ink-soft">
            {r.date} · {r.source}
          </span>
        </span>
      </footer>
    </article>
  );
}
