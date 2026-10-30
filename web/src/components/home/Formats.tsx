import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { KINDS, minPrice, type Catalog, type Kind } from "@/data/catalog";
import { money, plural } from "@/lib/format";
import { SectionHead } from "@/components/cards";
import { Photo } from "@/components/Photo";

/** Фото героя растворяется влево, в текст плитки. */
const PHOTO_MASK = {
  maskImage: "linear-gradient(to right, transparent 0%, black 55%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 55%)",
};

export function Formats({ cat, seasonKind }: { cat: Catalog; seasonKind: Kind | null }) {
  const { programs, programCover } = cat;
  // У каждого формата свой герой: обложка его программы, без повторов между плитками.
  const used = new Set<string>();
  const tiles = KINDS.map((k) => {
    const list = programs.filter((p) => p.kind === k.id);
    const covers = list.map((p) => programCover(p.id));
    const photo = covers.find((c) => !used.has(c)) ?? covers[0];
    if (photo) used.add(photo);
    // Видео-поздравление не праздник — в «от» не считаем.
    return { ...k, photo, count: list.length, from: minPrice(list.filter((p) => p.id !== "p_video")) };
  })
    .filter((k) => k.count)
    .sort((a, b) => Number(b.id === seasonKind) - Number(a.id === seasonKind));

  return (
    <section className="py-14 md:py-20">
      <div className="wrap">
        <SectionHead eyebrow="Форматы" title="С чего начнём?" text="Выберите формат — покажем программы с ценами." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((k, i) => {
            const big = i === 0;
            return (
              <Link
                key={k.id}
                href={`/sobrat?kind=${encodeURIComponent(k.id)}`}
                data-track={`home_kind_${k.slug}`}
                data-tilt
                style={{ "--d": `${(i % 4) * 60}ms` } as CSSProperties}
                className={`reveal stage group relative flex flex-col justify-between overflow-hidden rounded-[24px] p-4 shadow-[0_18px_40px_-24px_rgb(110_6_40/0.7)] md:p-5 ${
                  big ? "col-span-2 min-h-[220px] md:col-span-1 md:row-span-2" : "min-h-[176px] md:min-h-[200px]"
                }`}
              >
                {k.photo && (
                  <div className={`absolute inset-y-0 right-0 ${big ? "w-[62%] md:w-full md:top-[28%]" : "w-[64%]"}`} style={PHOTO_MASK}>
                    <Photo
                      src={k.photo}
                      alt=""
                      fill
                      sizes={big ? "(max-width: 768px) 60vw, 300px" : "(max-width: 768px) 30vw, 200px"}
                      className="object-cover object-[50%_15%] transition-transform duration-700 group-hover:scale-[1.06]"
                    />
                  </div>
                )}
                {/* Затемнение снизу: цена и стрелка читаются на любом фото */}
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-rasp-950/90 via-rasp-950/40 to-transparent" />
                <div className="relative">
                  {big && seasonKind && <span className="mb-2 inline-block rounded-full bg-rasp-500 px-2.5 py-0.5 text-[12px] font-bold">Сезон</span>}
                  <h3 className={`font-display font-bold leading-tight tracking-tight ${big ? "text-[28px] md:text-[34px]" : "text-[19px] md:text-[20px]"}`}>{k.title}</h3>
                  <p className={`mt-1 text-[14px] leading-snug text-white/75 ${big ? "max-w-[55%] md:max-w-none" : "max-w-[70%]"}`}>{k.blurb}</p>
                </div>
                <div className="relative flex items-end justify-between gap-2">
                  <span className="flex flex-col text-[13px] text-white/75">
                    <span className="whitespace-nowrap">
                      {k.count} {plural(k.count, "программа", "программы", "программ")}
                    </span>
                    <b className="price whitespace-nowrap text-[17px] text-white">от {money(k.from)}</b>
                  </span>
                  {/* На телефоне в маленькой плитке стрелка не влезает рядом с ценой — вся плитка и так кнопка */}
                  <span
                    className={`h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-rasp-700 transition-transform group-hover:translate-x-1 ${big ? "grid" : "hidden lg:grid"}`}
                  >
                    <ArrowRight size={20} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
