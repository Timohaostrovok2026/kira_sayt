"use client";

import { useState } from "react";
import type { Review, SiteContent } from "@/data/site";
import { plural } from "@/lib/format";
import { SectionHead, Stars } from "@/components/cards";
import { useSmoothHeight } from "@/components/Fold";
import { Go } from "@/components/Arrows";

function ReviewItem({ r }: { r: Review }) {
  const long = r.text.length > 300;
  const [open, setOpen] = useState(false);
  const { ref: foldRef, mark: markFold } = useSmoothHeight<HTMLElement>(open);
  return (
    <article ref={foldRef} className="rev">
      <Stars />
      <p className={long && !open ? "clamp" : undefined}>«{r.text}»</p>
      {long && (
        <button
          type="button"
          className="more"
          onClick={() => {
            markFold();
            setOpen(!open);
          }}
        >
          {open ? "Свернуть" : "Читать полностью"}
        </button>
      )}
      <div className="who">
        <span className="av" aria-hidden="true">
          {r.name.charAt(0)}
        </span>
        <span>
          {r.name}
          <small>{[r.date, r.topic, r.source].filter(Boolean).join(" · ")}</small>
        </span>
      </div>
    </article>
  );
}

/** Отзывы: плашки Профи.ру и Яндекс Карт, вкладки, Профи.ру — первым (черновик Кирилла v11). */
export function Reviews({ site }: { site: SiteContent }) {
  const [tab, setTab] = useState<"p" | "y">("p");
  const profi = site.reviews.filter((r) => /профи/i.test(r.source));
  const yandex = site.reviews.filter((r) => !/профи/i.test(r.source));
  const list = tab === "p" ? profi : yandex;
  const n = (k: number) => `${k} ${plural(k, "отзыв", "отзыва", "отзывов")}`;
  return (
    <section id="otzyvy" className="sec cen scroll-mt-20">
      <div className="wrap">
        <SectionHead brace="говорят родители" title="Родители возвращаются снова" />
        <div className="rplq">
          <a className="ymap ymap--p" href={site.profiUrl} target="_blank" rel="noopener" data-track="reviews_profi">
            <span className="ycnt num">{site.profiRating}</span>
            <span>
              <Stars />
              <b>{n(site.profiReviewsCount)} на Профи.ру</b>
              <small>
                Читать все отзывы <Go />
              </small>
            </span>
          </a>
          <a className="ymap" href={site.yandexUrl} target="_blank" rel="noopener" data-track="reviews_yandex">
            <span className="ycnt num">{site.yandexRating}</span>
            <span>
              <Stars />
              <b>{n(site.yandexReviewsCount)} на Яндекс Картах</b>
              <small>
                Читать все отзывы <Go />
              </small>
            </span>
          </a>
        </div>
        <div className="rvtabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "p"} onClick={() => setTab("p")}>
            Профи.ру
          </button>
          <button type="button" role="tab" aria-selected={tab === "y"} onClick={() => setTab("y")}>
            Яндекс Карты
          </button>
        </div>
        <div className={`revs${tab === "p" ? " revs--p" : ""}`} role="tabpanel">
          {list.map((r, i) => (
            <ReviewItem key={`${tab}${i}`} r={r} />
          ))}
        </div>
        <div className="cta-center">
          {tab === "p" ? (
            <a className="pill pill--hot" href={site.profiUrl} target="_blank" rel="noopener" data-track="reviews_profi_all">
              Все {site.profiReviewsCount} {plural(site.profiReviewsCount, "отзыв", "отзыва", "отзывов")} на Профи.ру
            </a>
          ) : (
            <a className="pill pill--hot" href={site.yandexUrl} target="_blank" rel="noopener" data-track="reviews_yandex_all">
              Все отзывы на Яндекс Картах
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
