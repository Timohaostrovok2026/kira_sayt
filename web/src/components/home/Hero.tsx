import Link from "next/link";
import { Photo } from "@/components/Photo";
import { Go } from "@/components/Arrows";

export interface HeroPhoto {
  src: string;
  alt: string;
}

/**
 * Первый экран по черновику Кирилла v11: «Поздравляем с праздником!», две кнопки,
 * три героя сезона медленно парят. В Новый год — наклейка «Новогодний сезон» и плашка «Даты на декабрь».
 */
export function Hero({ photos, newYear, telegram }: { photos: HeroPhoto[]; newYear: boolean; telegram: string }) {
  return (
    <>
      <section className="hero2">
        <div className="wrap">
          <h1 className="display">
            <span>Поздравляем</span>
            <span>
              с <b className="ac">праздником!</b>
            </span>
          </h1>
          <p className="h2sub">Кстати, отпраздновать его с нами — отличная идея.</p>
          <div className="hero-cta">
            <Link className="pill pill--lime pulse" href="/sobrat" data-track="hero_build">
              Рассчитать праздник
            </Link>
            <a className="pill pill--white" href={telegram} target="_blank" rel="noopener" data-track="hero_telegram">
              Telegram
            </a>
          </div>
        </div>
      </section>
      <section className="nyphs">
        <div className="wrap">
          {newYear && <span className="seas seas--ph">Новогодний сезон</span>}
          <div className="h2ph">
            {photos.map((ph, i) => (
              <figure key={ph.src} className={`nyp nyp${i + 1}`}>
                <Photo src={ph.src} alt={ph.alt} fill preload sizes="(max-width: 760px) 33vw, 250px" className="object-cover" />
              </figure>
            ))}
          </div>
        </div>
      </section>
      {newYear && (
        <section className="nysec">
          <div className="wrap">
            <Link className="nybar" href={`/sobrat?kind=${encodeURIComponent("Новый год")}`} data-track="hero_season">
              <b>Новый год</b>
              <span>Даты на декабрь уже бронируют</span>
              <i>
                Выбрать <Go />
              </i>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
