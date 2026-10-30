import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, ChevronLeft, Clock, Smile, Users } from "lucide-react";
import { SPECIAL_EXTRAS, type Program, ageText, largePhoto, lines, showFitsProgram, splitHow } from "@/data/catalog";
import { getCatalog } from "@/lib/content/get";
import { ExtraCard, ProgramCard } from "@/components/cards";
import { Photo } from "@/components/Photo";
import { money } from "@/lib/format";
import { NextLink, ProgramToggle, StickyCta } from "./ProgramActions";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  // Новые программы из админки, которых не было при сборке, рендерятся по первому запросу.
  return (await getCatalog()).programs.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { programById, programCover } = await getCatalog();
  const p = programById[id] as Program | undefined;
  if (!p) return { title: "Программа не найдена" };
  const intro = splitHow(p.how).intro;
  const description = intro.length > 160 ? `${intro.slice(0, 157).trimEnd()}…` : intro;
  return {
    title: p.name,
    description,
    openGraph: { title: p.name, description, images: [programCover(p.id)] },
  };
}

/** Возрасты пересекаются (пустая граница = без ограничения). */
function agesOverlap(x: { a?: number | null; b?: number | null }, y: { a?: number | null; b?: number | null }) {
  return (x.a ?? 0) <= (y.b ?? 99) && (x.b ?? 99) >= (y.a ?? 0);
}

/** Фото «растворяется» в сцене: мягкие края и низ уходит в тень под заголовком. */
const HERO_MASK =
  "radial-gradient(80% 90% at 50% 35%, #000 55%, transparent 100%), linear-gradient(to bottom, #000 60%, transparent 96%)";

function HeroSkeleton() {
  return <div aria-hidden className="stage h-[620px] lg:h-[600px]" />;
}

export default function ProgramPage({ params }: Props) {
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <ProgramView params={params} />
    </Suspense>
  );
}

async function ProgramView({ params }: Props) {
  const { id } = await params;
  const { programById, programCover, programs, extras } = await getCatalog();
  const p = programById[id] as Program | undefined;
  if (!p) notFound();

  const { intro, steps } = splitHow(p.how);
  const inc = lines(p.inc);
  const from = /^от\s/i.test(p.dur);
  const shows = extras.filter((e) => e.group === "Шоу" && !SPECIAL_EXTRAS.has(e.id) && showFitsProgram(e, p) && agesOverlap(e, p));
  const sameKind = programs.filter((x) => x.kind === p.kind && x.id !== p.id);
  const similar = sameKind.length ? sameKind : programs.filter((x) => x.id !== p.id && agesOverlap(x, p)).slice(0, 8);

  return (
    <div className="pb-28 lg:pb-0">
      {/* Шапка: фото героя на сцене */}
      <section className="stage relative overflow-hidden">
        <div className="wrap grid items-end lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-10">
          <div className="relative -mb-20 h-[min(56svh,440px)] lg:order-2 lg:mb-0 lg:h-[600px]">
            <Photo
              src={largePhoto(programCover(p.id))}
              alt=""
              fill
              preload
              tone="none"
              sizes="(max-width: 1024px) 100vw, 460px"
              className="animate-rise object-contain object-bottom"
              style={{ maskImage: HERO_MASK, WebkitMaskImage: HERO_MASK, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
            />
          </div>
          <div className="relative z-10 flex flex-col gap-4 pb-10 lg:order-1 lg:py-16">
            <Link
              href="/sobrat?step=2"
              className="-ml-1 inline-flex w-fit items-center gap-1 py-1 text-[15px] font-semibold text-white/70 hover:text-white"
            >
              <ChevronLeft size={18} /> Все программы
            </Link>
            <span className="w-fit rounded-full bg-white/12 px-3 py-1 text-[13px] font-semibold ring-1 ring-white/15">{p.kind}</span>
            <h1 className="font-display text-[34px] font-bold leading-[1.04] tracking-tight text-balance md:text-[52px]">{p.name}</h1>
            <ul className="flex flex-wrap gap-2 text-[14px] font-medium">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-rasp-700">
                <Smile size={16} /> {ageText(p)}
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Clock size={16} /> {p.dur}
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Users size={16} /> {p.art}
              </li>
            </ul>
            <p className="price mt-1 text-[36px] leading-none md:text-[44px]">
              {from && <span className="text-[0.6em] text-white/70">от </span>}
              {money(p.price)}
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <ProgramToggle id={p.id} />
              <NextLink id={p.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Как проходит + что входит */}
      <section className="wrap grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h2 className="h-section">Как проходит</h2>
          {intro && <p className="lead mt-4 text-ink-soft">{intro}</p>}
          {steps.length > 0 && (
            <ol className="relative mt-7 flex flex-col gap-5">
              <span aria-hidden className="absolute bottom-4 left-[19px] top-4 w-[2px] bg-rasp-100" />
              {steps.map((s, i) => (
                <li key={i} className="relative flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rasp-500 font-display text-[15px] font-bold text-white ring-4 ring-paper">
                    {i + 1}
                  </span>
                  <span className="pt-1.5 text-[17px] font-medium leading-snug">{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        {inc.length > 0 && (
          <div>
            <h2 className="h-section">Что входит</h2>
            <ul className="card mt-6 flex flex-col gap-3 p-5 md:p-6">
              {inc.map((s, i) => (
                <li key={i} className="flex items-start gap-3 leading-snug">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rasp-100 text-rasp-600">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {shows.length > 0 && (
        <section className="wrap pb-12 md:pb-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="h-section">Добавьте шоу</h2>
              <p className="mt-2 text-ink-soft">Вау-момент к этой программе.</p>
            </div>
            <Link href="/sobrat?step=3" className="hidden shrink-0 font-bold text-rasp-600 hover:text-rasp-700 sm:block">
              Все шоу
            </Link>
          </div>
          <div className="rail">
            {shows.map((e) => (
              <div key={e.id} className="flex w-[280px] md:w-[320px] [&>article]:flex-1">
                <ExtraCard e={e} />
              </div>
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="wrap pb-14 md:pb-20">
          <h2 className="h-section mb-5">{sameKind.length ? "Похожие программы" : "Ещё программы"}</h2>
          <div className="rail">
            {similar.map((x) => (
              <ProgramCard key={x.id} p={x} compact />
            ))}
          </div>
        </section>
      )}

      <StickyCta id={p.id} from={from} />
    </div>
  );
}
