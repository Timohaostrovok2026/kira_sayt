"use client";

import { useEffect } from "react";

/**
 * Общие эффекты публичного сайта, один раз на layout:
 * 1) появление блоков .reveal при прокрутке;
 * 2) лёгкий 3D-наклон карточек [data-tilt] за мышкой (только ноутбук).
 */
export function Motion() {
  useReveal();
  useTilt();
  return null;
}

/**
 * Блоки прячутся только после загрузки скриптов и только ниже экрана.
 * Всё, что уже видно, остаётся на месте — на медленном интернете страница не выглядит пустой.
 */
function useReveal() {
  useEffect(() => {
    const html = document.documentElement;
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.shown = "true";
          io.unobserve(el);
          // После появления снимаем лесенку задержек, чтобы наведение не запаздывало.
          setTimeout(() => (el.dataset.shown = "done"), 1400);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    // Первый проход: видимое и то, что выше экрана, показываем сразу, остальное ждёт прокрутки.
    const bottom = window.innerHeight;
    document.querySelectorAll<HTMLElement>(".reveal:not([data-shown])").forEach((el) => {
      if (el.getBoundingClientRect().top < bottom) el.dataset.shown = "done";
      else io.observe(el);
    });
    html.dataset.reveal = "on";

    // Новые блоки (переход на другую страницу, фильтры) — анимируем, когда попадут на экран.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches(".reveal:not([data-shown])")) io.observe(n);
          n.querySelectorAll<HTMLElement>(".reveal:not([data-shown])").forEach((el) => io.observe(el));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      delete html.dataset.reveal;
    };
  }, []);
}

const MAX_TILT = 5; // градусов — заметно, но не укачивает

function useTilt() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let current: HTMLElement | null = null;
    let raf = 0;
    let last: PointerEvent | null = null;

    const reset = (el: HTMLElement) => {
      el.removeAttribute("data-tilting");
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };

    const apply = () => {
      raf = 0;
      if (!current || !last) return;
      const r = current.getBoundingClientRect();
      const x = (last.clientX - r.left) / r.width;
      const y = (last.clientY - r.top) / r.height;
      current.style.setProperty("--rx", `${((0.5 - y) * MAX_TILT * 2).toFixed(2)}deg`);
      current.style.setProperty("--ry", `${((x - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
      current.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      current.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (el !== current) {
        if (current) reset(current);
        current = el;
        current?.setAttribute("data-tilting", "");
      }
      last = e;
      if (current && !raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (current) reset(current);
      current = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
}
