import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ANIMATION_EXTRAS, KIND_CLASS, MKAD_BASE, MKAD_PER_KM, SOUND_PRICE, SPECIAL_EXTRAS, type Program, ageText, lines, showFitsProgram, splitHow } from "@/data/catalog";
import { getCatalog } from "@/lib/content/get";
import { money } from "@/lib/format";
import { AddExtraButton, ProgramToggle } from "./ProgramActions";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  // Новые программы из админки, которых не было при сборке, рендерятся по первому запросу.
  return (await getCatalog()).programs.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { programById, programCover } = await getCatalog();
  // Картинка превью ссылки — обложка программы (на самой странице фото нет).
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

function HeroSkeleton() {
  return <div aria-hidden className="sec sec--cream h-[620px]" />;
}

export default function ProgramPage({ params }: Props) {
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <ProgramView params={params} />
    </Suspense>
  );
}

/** Страница программы по черновику Кирилла v11: цветная шапка, «Как проходит», «Что входит», допы и шоу сбоку. */
async function ProgramView({ params }: Props) {
  const { id } = await params;
  const { programById, extras, extraById } = await getCatalog();
  const p = programById[id] as Program | undefined;
  if (!p) notFound();

  const { intro, steps } = splitHow(p.how);
  const inc = lines(p.inc);
  // Пять самых доступных шоу, подходящих по возрасту и сезону.
  const shows = extras
    .filter((e) => e.group === "Шоу" && !SPECIAL_EXTRAS.has(e.id) && showFitsProgram(e, p) && agesOverlap(e, p))
    .sort((x, y) => x.price - y.price)
    .slice(0, 5);
  const animExtras = p.kind === "Анимация" ? ANIMATION_EXTRAS.map((x) => extraById[x]).filter(Boolean) : [];

  return (
    <section className="sec sec--cream sec--top">
      <div className="wrap">
        <Link className="back" href="/sobrat?step=2">
          ← Все программы
        </Link>
        <div className={`dhead ${KIND_CLASS[p.kind] ?? "k-anim"}`}>
          <div className="tags">
            <span className="tag">{p.kind}</span>
            <span className="tag">{ageText(p)}</span>
            {p.dur && <span className="tag">{p.dur}</span>}
            {p.art && <span className="tag">{p.art}</span>}
          </div>
          <h1 className="display h-lg">{p.name}</h1>
          <div className="dbuy">
            <div className="cost num">
              {money(p.price)}
              <small>за программу</small>
            </div>
            <ProgramToggle id={p.id} />
          </div>
        </div>
        <div className="dgrid">
          <div>
            {intro && <p className="dlead">{intro}</p>}
            {steps.length > 0 && (
              <>
                <h2 style={{ marginTop: 30 }}>Как проходит</h2>
                <ol className="osteps">
                  {steps.map((t, i) => (
                    <li key={i}>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {inc.length > 0 && (
              <>
                <h2 style={{ marginTop: 30 }}>Что входит</h2>
                <ul className="checks">
                  {inc.map((t, i) => (
                    <li key={i}>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <aside>
            {animExtras.length > 0 && (
              <div className="aside-box">
                <h2>Допы к анимации</h2>
                <div className="addrow">
                  {animExtras.map((e) => (
                    <div className="it" key={e.id}>
                      <div className="nm">
                        {e.name}
                        <small>
                          {money(e.price)} · {e.unit}
                        </small>
                      </div>
                      <AddExtraButton id={e.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shows.length > 0 && (
              <div className="aside-box">
                <h2>Добавить шоу</h2>
                <div className="addrow">
                  {shows.map((e) => (
                    <div className="it" key={e.id}>
                      <div className="nm">
                        {e.name}
                        <small>{[e.dur, money(e.price)].filter(Boolean).join(" · ")}</small>
                      </div>
                      <AddExtraButton id={e.id} />
                    </div>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 12 }}>
                  <Link className="back" style={{ margin: 0 }} href="/sobrat?step=3">
                    Все шоу и допы →
                  </Link>
                </p>
              </div>
            )}
            <div className="memo">
              <h3>Памятка</h3>
              <p>
                <b>Звук.</b> Обычный звук входит в любой праздник. Усиленный (JBL PARTY BOX 110 и 2 микрофона) стоит +{money(SOUND_PRICE)}.
              </p>
              <p>
                <b>Выезд за МКАД.</b> {money(MKAD_BASE)} за выезд и {money(MKAD_PER_KM)} за каждый км от МКАД.
              </p>
              <p>
                <b>Персонажи.</b> Комплект персонажей пришлёт менеджер после заявки.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
