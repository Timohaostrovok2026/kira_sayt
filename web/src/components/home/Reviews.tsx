import { ArrowUpRight, Star } from "lucide-react";
import type { SiteContent } from "@/data/site";
import { plural } from "@/lib/format";
import { SectionHead } from "@/components/cards";
import { Accent } from "@/components/Accent";
import { ReviewCard } from "./ReviewCard";

/** Настоящие отзывы с Яндекс Карт (редактируются в админке). */
export function Reviews({ site }: { site: SiteContent }) {
  if (!site.reviews.length) return null;
  return (
    <section id="otzyvy" className="scroll-mt-16 bg-rasp-50 py-14 md:py-20">
      <div className="wrap">
        <SectionHead
          eyebrow="Отзывы"
          title={<>Родители возвращаются <Accent>снова</Accent></>}
          action={
            <a
              href={site.yandexUrl}
              target="_blank"
              rel="noopener"
              data-track="reviews_yandex"
              className="card lift inline-flex items-center gap-3 self-start px-4 py-3 md:self-auto"
            >
              <span className="font-display text-[32px] font-bold leading-none">{site.yandexRating}</span>
              <span className="flex flex-col">
                <span className="flex text-star" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
                <span className="text-[13px] font-semibold text-ink-soft">
                  {site.yandexReviewsCount} {plural(site.yandexReviewsCount, "отзыв", "отзыва", "отзывов")} на Яндекс Картах
                </span>
              </span>
              <ArrowUpRight size={18} className="text-rasp-500" />
            </a>
          }
        />
        {/* Телефон: лента со свайпом. Ноутбук: сетка, карточки одной высоты. */}
        <div className="rail items-start md:!mx-0 md:!grid md:!grid-flow-row md:!grid-cols-2 md:!px-0 lg:!grid-cols-4">
          {site.reviews.map((r) => (
            <ReviewCard key={r.name + r.date} r={r} />
          ))}
        </div>
        <a
          href={site.yandexUrl}
          target="_blank"
          rel="noopener"
          data-track="reviews_all"
          className="btn btn-soft mt-6 w-full md:w-auto"
        >
          Все отзывы на Яндекс Картах <ArrowUpRight size={18} />
        </a>
      </div>
    </section>
  );
}
