import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ChevronDown, Send } from "lucide-react";
import { EXTRA_GROUPS, SPECIAL_EXTRAS, type Catalog, type Kind } from "@/data/catalog";
import type { Contacts, FaqItem, GalleryItem, Step } from "@/data/site";
import { CostumeCard, ExtraCard, ProgramCard, SectionHead } from "@/components/cards";
import { Photo } from "@/components/Photo";
import { HomePackages } from "./HomePackages";
import { AutoRail } from "./AutoRail";
import { Smile } from "./Smile";

export { Formats } from "./Formats";
export { Reviews } from "./Reviews";

const SHOWCASE_COSTUMES = ["c_grinch", "c_ded", "h025", "h042", "h016", "h051", "h017", "h076", "h101", "h010", "h046", "h117", "h036", "h095"];

/** Свои любимцы по списку; если кого-то скрыли или удалили — добираем следующими по порядку. */
function pick<T extends { id: string }>(ids: string[], all: T[], byId: Record<string, T>) {
  const chosen = ids.map((id) => byId[id]).filter(Boolean);
  const rest = all.filter((x) => !ids.includes(x.id));
  return [...chosen, ...rest].slice(0, ids.length);
}

/** Цвет светлого раздела, который идёт после тёмного: в него рисуется «улыбка». */
export type NextTone = "paper" | "rasp-50";
const SMILE_FILL: Record<NextTone, string> = { paper: "fill-paper", "rasp-50": "fill-rasp-50" };

export function CostumesRail({ cat, next = "paper" }: { cat: Catalog; next?: NextTone }) {
  const { costumes } = cat;
  const list = pick(SHOWCASE_COSTUMES, costumes, cat.costumeById);
  return (
    <section className="stage-soft overflow-hidden">
      <Smile edge="top" className="fill-paper" />
      <div className="wrap py-12 md:py-16">
        <SectionHead
          dark
          eyebrow="Костюмы"
          title={<>Любой герой, которого ждёт&nbsp;ребёнок</>}
          text="Нажмите «+», чтобы выбрать героя. Стандартный костюм уже в цене программы."
          action={
            <Link href="/kostyumy" className="btn btn-light hidden md:inline-flex" data-track="home_costumes_all">
              Все {costumes.length} героев <ArrowRight size={18} />
            </Link>
          }
        />
        {/* Лента сама медленно едет; свайп или наведение мыши её останавливают */}
        <AutoRail className="reveal">
          {list.map((c) => (
            <CostumeCard key={c.id} c={c} size="sm" />
          ))}
          <Link
            href="/kostyumy"
            data-track="home_costumes_tile"
            className="grid w-[160px] place-items-center rounded-[22px] bg-white/10 p-4 text-center ring-1 ring-white/15 sm:w-[190px]"
          >
            <span>
              <span className="font-display block text-[40px] font-bold leading-none">+{costumes.length - list.length}</span>
              <span className="mt-2 block text-[15px] font-semibold text-white/75">героев ещё</span>
            </span>
          </Link>
        </AutoRail>
        <Link href="/kostyumy" className="btn btn-light mt-6 w-full md:hidden" data-track="home_costumes_all_m">
          Все {costumes.length} героев <ArrowRight size={18} />
        </Link>
      </div>
      <Smile edge="bottom" className={SMILE_FILL[next]} />
    </section>
  );
}

export function SeasonHits({ cat, kind, title, text }: { cat: Catalog; kind: Kind; title: string; text: string }) {
  const list = cat.programs.filter((p) => p.kind === kind);
  if (!list.length) return null;
  return (
    <section className="bg-rasp-50 py-14 md:py-20">
      <div className="wrap">
        <SectionHead
          eyebrow="Хиты сезона"
          title={title}
          text={text}
          action={
            <Link href={`/sobrat?kind=${encodeURIComponent(kind)}`} className="btn btn-soft hidden md:inline-flex">
              Все программы <ArrowRight size={18} />
            </Link>
          }
        />
        <div className="rail">
          {list.map((p) => (
            <ProgramCard key={p.id} p={p} compact />
          ))}
        </div>
      </div>
    </section>
  );
}

const SHOW_IDS = ["e_cryo45", "e_paper", "e_neon", "e_soap", "e_trash", "xmvlkmw9s"];

export function Shows({ cat }: { cat: Catalog }) {
  const shows = cat.extras.filter((e) => e.group === EXTRA_GROUPS[0].id && !SPECIAL_EXTRAS.has(e.id));
  const list = pick(SHOW_IDS, shows, cat.extraById);
  const showCount = shows.length;
  return (
    <section className="py-14 md:py-20">
      <div className="wrap">
        <SectionHead
          eyebrow="Шоу"
          title="Вау-момент праздника"
          text="Добавьте шоу к любой программе: дети будут вспоминать его неделю."
          action={
            <Link href="/sobrat?step=3" className="btn btn-soft hidden md:inline-flex">
              Все {showCount} шоу <ArrowRight size={18} />
            </Link>
          }
        />
        <div className="rail">
          {list.map((e) => (
            <div key={e.id} className="flex w-[280px] [&>article]:flex-1">
              <ExtraCard e={e} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PackagesTeaser({ cat }: { cat: Catalog }) {
  const { packages } = cat;
  return (
    <section className="stage relative overflow-hidden">
      <Smile edge="top" className="fill-paper" />
      {/* Свет прожектора над пакетами */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-10 h-72 w-[min(680px,90vw)] -translate-x-1/2 rounded-full bg-rasp-500/25 blur-[100px]" />
      <div className="wrap relative py-12 md:py-16">
        <SectionHead
          dark
          eyebrow="Пакеты"
          title="Не хотите собирать? Возьмите готовое"
          text="Пакет всегда выгоднее, чем те же позиции по отдельности. Скидка до 20%."
          action={
            <Link href="/pakety" className="btn btn-light hidden md:inline-flex" data-track="home_packs_all">
              Все пакеты <ArrowRight size={18} />
            </Link>
          }
        />
        <HomePackages ids={["kmvlki0fs", "k_all", "k_start"]} />
        <Link href="/pakety" className="btn btn-light mt-6 w-full md:hidden" data-track="home_packs_all_m">
          Все {packages.length} пакетов <ArrowRight size={18} />
        </Link>
      </div>
      <Smile edge="bottom" className="fill-paper" />
    </section>
  );
}

/** Живые фото с праздников + пара слов о команде. Фото редактируются в админке. */
export function Gallery({ gallery, contacts }: { gallery: GalleryItem[]; contacts: Contacts }) {
  if (!gallery.length) return null;
  return (
    <section className="overflow-hidden py-14 md:py-20">
      <div className="wrap">
        <SectionHead
          eyebrow="Живые праздники"
          title={
            <>
              Артистам <span className="text-rasp-500">19–23</span> года — и это видно
            </>
          }
          text="Энергия, современный вкус и общий язык и с малышами, и с подростками. Вот как это выглядит."
          action={
            <a href={contacts.channel} target="_blank" rel="noopener" className="btn btn-primary hidden md:inline-flex" data-track="gallery_channel">
              <Send size={18} /> Больше в Telegram-канале
            </a>
          }
        />
        {/* Телефон: лента со свайпом. Ноутбук: мозаика, каждое пятое фото крупно. */}
        <div className="rail md:!mx-0 md:!grid md:!grid-flow-row md:!grid-cols-4 md:auto-rows-[200px] md:!px-0 lg:auto-rows-[230px]">
          {gallery.map((g, i) => (
            <figure
              key={g.src}
              style={{ "--d": `${(i % 5) * 50}ms` } as CSSProperties}
              className={`reveal group relative w-[78vw] max-w-[340px] overflow-hidden rounded-[22px] bg-rasp-100 md:w-auto md:max-w-none ${
                i % 5 === 0 ? "aspect-[4/5] md:col-span-2 md:row-span-2 md:aspect-auto" : "aspect-[4/5] md:aspect-auto"
              }`}
            >
              <Photo
                tone="light"
                src={g.src}
                alt={g.alt}
                fill
                sizes={i % 5 === 0 ? "(max-width: 768px) 80vw, 600px" : "(max-width: 768px) 80vw, 300px"}
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              {(g.tag || g.alt) && (
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold text-ink backdrop-blur">
                  {g.tag || g.alt}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row md:hidden">
          <a href={contacts.channel} target="_blank" rel="noopener" className="btn btn-primary" data-track="gallery_channel_m">
            <Send size={18} /> Больше в Telegram-канале
          </a>
          <a href={contacts.instagram} target="_blank" rel="noopener" className="btn btn-soft" data-track="gallery_instagram_m">
            Instagram {contacts.instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ steps }: { steps: Step[] }) {
  return (
    <section className="py-14 md:py-20">
      <div className="wrap">
        <SectionHead center eyebrow="Как это работает" title="Четыре шага до праздника" />
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card lift reveal relative overflow-hidden p-4 md:p-5" style={{ "--d": `${i * 80}ms` } as CSSProperties}>
              <span aria-hidden="true" className="font-display absolute -right-2 -top-4 text-[96px] font-bold leading-none text-rasp-100">
                {i + 1}
              </span>
              <span className="relative grid h-10 w-10 place-items-center rounded-full bg-rasp-500 font-display text-[17px] font-bold text-white">{i + 1}</span>
              <h3 className="h-card relative mt-3 text-[16px] md:text-[19px]">{s.title}</h3>
              <p className="relative mt-1.5 text-[14px] leading-snug text-ink-soft md:text-[15px]">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex justify-center">
          <Link href="/sobrat" className="btn btn-lg btn-primary" data-track="how_build">
            Начать: собрать праздник <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Faq({ faq }: { faq: FaqItem[] }) {
  return (
    <section className="py-14 md:py-20">
      <div className="wrap grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <SectionHead eyebrow="Вопросы" title="Коротко о главном" />
        <div className="flex flex-col gap-2">
          {faq.map((f) => (
            <details key={f.q} className="card group overflow-hidden" data-track={`faq_${f.q.slice(0, 20)}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={22} className="shrink-0 text-rasp-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-[16px] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ contacts }: { contacts: Contacts }) {
  return (
    <section className="px-4 pb-14 md:pb-20">
      <div className="stage relative mx-auto max-w-[1176px] overflow-hidden rounded-[32px] px-6 py-12 text-center md:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-rasp-500/40 blur-[90px]" />
        <h2 className="h-section relative mx-auto max-w-2xl">Соберите праздник за 2 минуты</h2>
        <p className="lead relative mx-auto mt-3 max-w-md text-white/70">Цены сразу. Заявка уходит менеджеру одной кнопкой.</p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/sobrat" className="btn btn-lg btn-light" data-track="final_build">
            Собрать праздник
          </Link>
          <a href={contacts.telegram} target="_blank" rel="noopener" className="btn btn-lg btn-ghost text-white" data-track="final_tg">
            <Send size={18} /> Спросить в Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
