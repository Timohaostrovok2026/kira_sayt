"use client";

import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";

// Все раскрытия на сайте — одной скоростью (отзыв клиентов, 03.11: «резко открывается»).
const MS = 280;
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const running = new WeakMap<HTMLElement, Animation>();

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Плавно меняет высоту элемента с `from` до текущей. `done` — после конца (или страховки по таймеру:
 * в фоновой вкладке событие конца анимации может не прийти).
 */
function animateHeight(el: HTMLElement, from: number, to: number, done?: () => void) {
  running.get(el)?.cancel();
  running.delete(el);
  el.style.overflow = "";
  if (from === to || reduced()) {
    done?.();
    return;
  }
  el.style.overflow = "hidden";
  const a = el.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: MS, easing: EASE });
  running.set(el, a);
  const finish = () => {
    if (running.get(el) !== a) return;
    running.delete(el);
    el.style.overflow = "";
    a.cancel();
    done?.();
  };
  a.onfinish = finish;
  window.setTimeout(finish, MS + 60);
}

/**
 * Для блоков, которые раскрываются состоянием React: `mark()` — перед setState, высота анимируется сама.
 * `dep` — то, что меняется при раскрытии (обычно флаг open).
 */
export function useSmoothHeight<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const from = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && from.current != null) animateHeight(el, from.current, el.offsetHeight);
    from.current = null;
  }, [dep]);
  return {
    ref,
    mark: () => {
      from.current = ref.current?.offsetHeight ?? null;
    },
  };
}

/**
 * <details>, который раскрывается плавно. Без JS и при prefers-reduced-motion — обычный <details>.
 * Нажали посреди движения — движение разворачивается обратно.
 */
export function Fold({ summary, children, className, summaryClassName }: { summary: ReactNode; children: ReactNode; className?: string; summaryClassName?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const closing = useRef(false);

  function onClick(e: MouseEvent<HTMLElement>) {
    const d = ref.current;
    const sum = d?.querySelector("summary");
    if (!d || !sum || reduced()) return;
    e.preventDefault();
    const open = running.has(d) ? closing.current : !d.open;
    const start = d.offsetHeight;
    running.get(d)?.cancel();
    const cs = getComputedStyle(d);
    const shut = sum.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    d.open = true;
    closing.current = !open;
    d.dataset.closing = open ? "" : "1";
    animateHeight(d, start, open ? d.offsetHeight : shut, () => {
      if (!open) d.open = false;
      d.dataset.closing = "";
    });
  }

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName} onClick={onClick}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
