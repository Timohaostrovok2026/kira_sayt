import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { AGE_GROUPS, minPrice, type Catalog } from "@/data/catalog";
import { money } from "@/lib/format";
import { Photo } from "@/components/Photo";
import { splitWords } from "@/components/SplitWords";
import { HeroScene } from "./HeroScene";
import { Smile } from "./Smile";

/** Мягкая маска по краям: фото на малиновом фоне растворяются в сцене. */
const FADE = {
  maskImage: "radial-gradient(closest-side, black 70%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(closest-side, black 70%, transparent 100%)",
};

// depth — насколько герой «дальше» (сильнее отстаёт при прокрутке и движении мыши).
const NY_HEROES = [
  { src: "/img/photos/elf.webp", alt: "Эльф", w: 1024, h: 1536, depth: 22, cls: "left-[2%] top-[14%] w-[34%] lg:left-[-4%] lg:w-[44%]" },
  { src: "/img/photos/grinch.webp", alt: "Гринч", w: 1086, h: 1448, depth: 26, cls: "right-[0%] top-[12%] w-[38%] lg:right-[-4%] lg:w-[46%]" },
  { src: "/img/photos/ded-moroz-2.webp", alt: "Дед Мороз", w: 900, h: 1600, depth: 10, cls: "left-1/2 top-0 z-10 w-[34%] -translate-x-1/2 lg:w-[50%]" },
];

/** Сдвиг слоя по переменным от HeroScene. */
function depth(d: number): CSSProperties {
  return {
    transform: `translate3d(calc(var(--px, 0) * ${-d * 0.5}px), calc(var(--py, 0) * ${-d * 0.3}px + var(--sy, 0) * ${d * 2}px), 0)`,
    transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

/** Снег: фиксированный «случайный» узор, чтобы сервер и браузер рисовали одно и то же. */
const FLAKES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2) % 1;
  return {
    left: `${(r(1) * 100).toFixed(1)}%`,
    size: 3 + Math.round(r(2) * 5),
    opacity: 0.35 + r(3) * 0.5,
    d: `${(11 + r(4) * 10).toFixed(1)}s`,
    delay: `${(-r(5) * 20).toFixed(1)}s`,
    sway: `${Math.round((r(6) - 0.5) * 60)}px`,
  };
});

function Snow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={{ left: f.left, width: f.size, height: f.size, opacity: f.opacity, "--d": f.d, "--delay": f.delay, "--sway": f.sway } as CSSProperties}
        />
      ))}
    </div>
  );
}

const COLLAGE = ["h025", "h042", "h016", "h051", "h010", "h076"];

export function Hero({ newYear, cat }: { newYear: boolean; cat: Catalog }) {
  const { programs, costumeImg } = cat;
  // Видео-поздравление — не праздник, в «от» его не считаем.
  const from = minPrice(programs.filter((p) => p.id !== "p_video"));
  const ded = cat.programById.p_ded;
  return (
    <section className="stage relative overflow-hidden">
      {/* мягкие световые пятна, как студийный свет */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-rasp-500/25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-[380px] w-[380px] rounded-full bg-rasp-400/15 blur-[120px]" />
      {newYear && <Snow />}

      <div className="wrap relative grid items-center gap-1 pt-2 pb-7 md:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-16 lg:pb-16">
        <div className="relative z-10">
          <p className="mb-5 hidden items-center gap-2 sm:inline-flex rounded-full bg-white/10 py-1.5 pr-4 pl-1.5 text-[14px] font-semibold ring-1 ring-white/15 backdrop-blur">
            <span className="rounded-full bg-rasp-500 px-2.5 py-0.5 text-[12px] font-bold">
              {newYear ? "Новый год" : "Каждый день"}
            </span>
            {newYear ? "Даты на декабрь уже бронируют" : "Праздники в Москве и области"}
          </p>
          {/* Слова заголовка выезжают по очереди сразу при загрузке (CSS, без ожидания скриптов) */}
          <h1 className="h-hero split-now">
            {splitWords(
              <>
                Праздник, который <span className="text-rasp-300">дети запомнят</span>
              </>,
            )}
          </h1>
          <p className="lead mt-5 max-w-[34ch] animate-rise text-white/75 [animation-delay:.35s]">
            110+ героев, квесты и шоу. Цены сразу на сайте, заявка в&nbsp;один клик.
          </p>
          <div className="mt-7 flex animate-rise flex-col gap-3 [animation-delay:.45s] sm:flex-row">
            <Link href="/sobrat" className="btn btn-lg btn-light" data-track="hero_build">
              <Sparkles size={20} /> Собрать праздник
            </Link>
            <Link href="/pakety" className="btn btn-lg btn-ghost text-white" data-track="hero_packs">
              Готовые пакеты <ArrowRight size={20} />
            </Link>
          </div>
          <p className="mt-4 animate-rise text-[14px] text-white/55 [animation-delay:.55s]">
            Программы от <b className="font-semibold text-white">{money(from)}</b> · артисты 19–23 лет · 1700+ праздников
          </p>
        </div>

        {newYear ? (
          <HeroScene className="relative order-first mx-auto aspect-[1/0.66] w-full max-w-[560px] lg:order-none lg:aspect-[1/1.02] lg:max-w-none">
            {/* Свечение за героями — как прожектор на сцене */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[15%] top-[10%] bottom-[5%] rounded-full bg-rasp-400/30 blur-[80px]" />
            {NY_HEROES.map((h, i) => (
              // Внешний слой — место и появление с пружиной, внутренний — объём (параллакс).
              <div key={h.src} className={`absolute ${h.cls}`} style={{ animation: `hero-in 1s var(--ease-spring) ${0.15 + i * 0.14}s both` }}>
                <div style={depth(h.depth)}>
                  <Photo
                    src={h.src}
                    alt={h.alt}
                    width={h.w}
                    height={h.h}
                    preload
                    tone="none"
                    sizes="(max-width: 1024px) 50vw, 300px"
                    className="h-auto w-full"
                    style={FADE}
                  />
                </div>
              </div>
            ))}
            <span className="absolute bottom-[4%] left-[0%] z-20 rotate-[-6deg] rounded-2xl bg-white px-2.5 py-1.5 text-[12px] font-bold text-rasp-700 shadow-xl lg:bottom-[10%] lg:px-3 lg:py-2 lg:text-[14px]">
              Гринч уже в деле
            </span>
            {/* Цена — из каталога (Кирилл меняет её в админке). «от»: часовая программа дороже. */}
            {ded && (
              <span className="absolute right-[0%] bottom-[8%] z-20 rotate-[5deg] rounded-2xl bg-rasp-500 px-2.5 py-1.5 text-[12px] font-bold shadow-xl lg:right-[3%] lg:bottom-[18%] lg:px-3 lg:py-2 lg:text-[14px]">
                Дед Мороз от {money(ded.price)}
              </span>
            )}
          </HeroScene>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {COLLAGE.map((id, i) => (
              <div key={id} className={`relative aspect-[3/4] overflow-hidden rounded-2xl ${i % 2 ? "translate-y-6" : ""}`}>
                <Photo src={costumeImg(id)} alt="" fill preload={i < 3} sizes="33vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Быстрый вход в воронку: выбор возраста */}
      <div className="relative border-t border-white/10 bg-black/15">
        <div className="wrap flex flex-col gap-3 py-5 md:flex-row md:items-center md:gap-6">
          <p className="font-display text-[17px] font-semibold">Сколько лет ребёнку?</p>
          <div className="rail md:!mx-0 md:!px-0">
            {AGE_GROUPS.map((g) => (
              <Link key={g.id} href={`/sobrat?age=${g.id}`} className="chip !min-h-12 !px-5 !text-[16px]" data-track={`hero_age_${g.id}`}>
                {g.label}
              </Link>
            ))}
          </div>
        </div>
        <Smile edge="bottom" className="fill-white" />
      </div>
    </section>
  );
}
