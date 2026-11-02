"use client";

import { useEffect, useRef } from "react";
import type { GalleryItem } from "@/data/site";
import { Photo } from "@/components/Photo";

const ROT = [-2.4, 1.6, -1.2, 2.4, -1.8, 1.2, -2.2, 1.8];

/**
 * Лента «Живые праздники» (черновик Кирилла v11): сама медленно едет вправо, карточки слегка парят.
 * Листается пальцем, колесом и мышью; после касания замирает на пару секунд. Стрелок нет.
 * Фото идут дважды подряд — так лента бесконечная. При prefers-reduced-motion не едет.
 */
export function LiveRibbon({ items }: { items: GalleryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sc = ref.current;
    if (!sc) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let started = false;
    let pos = 0;
    let last = 0;
    let quietAt = 0;
    let hover = false;
    let t0 = performance.now();
    let drag: { x: number; l: number } | null = null;
    // Кадры крутятся, только пока лента на экране: вне экрана не читаем раскладку каждый кадр (батарея телефона).
    let visible = false;
    const user = () => (quietAt = performance.now() + 2200);
    const onScroll = () => {
      if (Math.abs(sc.scrollLeft - last) > 2) {
        user();
        pos = sc.scrollLeft;
        last = pos;
      }
    };
    const onEnter = () => (hover = true);
    const onLeave = () => (hover = false);
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      drag = { x: e.clientX, l: sc.scrollLeft };
      sc.classList.add("drag");
      user();
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      sc.scrollLeft = drag.l - (e.clientX - drag.x);
      user();
    };
    const onUp = () => {
      if (!drag) return;
      drag = null;
      sc.classList.remove("drag");
      user();
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    sc.addEventListener("touchstart", user, { passive: true });
    sc.addEventListener("wheel", user, { passive: true });
    sc.addEventListener("mouseenter", onEnter);
    sc.addEventListener("mouseleave", onLeave);
    sc.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const tick = (t: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      const dt = Math.min(64, t - t0);
      t0 = t;
      const W = (sc.firstElementChild as HTMLElement).scrollWidth / 2;
      if (!started) {
        if (W < sc.clientWidth) {
          raf = requestAnimationFrame(tick);
          return;
        }
        pos = W * 0.5;
        last = pos;
        sc.scrollLeft = pos;
        started = true;
      }
      // Без движения: ленту только ставим в середину, чтобы листалась в обе стороны.
      if (reduce) {
        raf = 0;
        return;
      }
      if (!hover && !drag && t > quietAt) {
        if (Math.abs(sc.scrollLeft - last) > 2) pos = sc.scrollLeft;
        pos += dt * 0.045;
        if (pos > W * 1.25) pos -= W;
        else if (pos < W * 0.25) pos += W;
        sc.scrollLeft = pos;
        last = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        t0 = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(sc);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      sc.removeEventListener("scroll", onScroll);
      sc.removeEventListener("touchstart", user);
      sc.removeEventListener("wheel", user);
      sc.removeEventListener("mouseenter", onEnter);
      sc.removeEventListener("mouseleave", onLeave);
      sc.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const set = (dup: boolean) =>
    items.map((g, i) => (
      <figure
        key={`${dup ? "d" : "o"}${i}`}
        className="rbf"
        aria-hidden={dup || undefined}
        style={{ "--r": `${ROT[i % ROT.length]}deg`, "--d": `-${((i * 0.73) % 5.5).toFixed(2)}s` } as React.CSSProperties}
      >
        <Photo src={g.src} alt={dup ? "" : g.alt} width={432} height={288} sizes="(max-width: 760px) 260px, 380px" draggable={false} />
      </figure>
    ));

  return (
    <div className="rb" role="group" aria-label="Фото с наших праздников">
      <div className="rbv" ref={ref} tabIndex={0}>
        <div className="rbt">
          {set(false)}
          {set(true)}
        </div>
      </div>
    </div>
  );
}
