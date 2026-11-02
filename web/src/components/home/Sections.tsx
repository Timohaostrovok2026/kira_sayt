import Link from "next/link";
import { HOME_SHOWS, SITE_KINDS, type Catalog, type Kind } from "@/data/catalog";
import type { Contacts, FaqItem, GalleryItem, Step, TrustStat } from "@/data/site";
import { money, plural } from "@/lib/format";
import { Photo } from "@/components/Photo";
import { ExtraCard, PackageCard, ProgramCard, SectionHead } from "@/components/cards";
import { LiveRibbon } from "./LiveRibbon";

/** «С чего начнём?» — разноцветные плитки форматов, сезонный первым (черновик Кирилла v11, без фото героев). */
export function Formats({ cat, seasonKind }: { cat: Catalog; seasonKind: Kind | null }) {
  const tiles = SITE_KINDS.map((k) => ({ ...k, list: cat.programs.filter((p) => p.kind === k.id) }))
    .filter((k) => k.list.length)
    .sort((x, y) => Number(y.id === seasonKind) - Number(x.id === seasonKind));
  return (
    <section className="sec">
      <div className="wrap">
        <SectionHead title="С чего начнём?" lead="Выберите формат, покажем программы с ценами." />
        <div className="ftiles">
          {tiles.map((k) => {
            const season = k.id === seasonKind;
            return (
              <Link
                key={k.id}
                href={`/sobrat?kind=${encodeURIComponent(k.id)}`}
                className={`ftile ${k.tile}${season ? " ftile--season" : ""}`}
                data-track={`home_kind_${k.id}`}
              >
                {season ? <span className="seas">Сезон</span> : k.id === "Выпускной" && <span className="seas seas--book">Бронируйте заранее</span>}
                <b>{k.title}</b>
                <span>
                  {k.list.length} {plural(k.list.length, "программа", "программы", "программ")}
                </span>
                <em>от {money(Math.min(...k.list.map((p) => p.price)))}</em>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** «Как проходит праздник» — четыре шага (тексты в админке). */
export function HowItWorks({ steps }: { steps: Step[] }) {
  return (
    <section className="sec cen" style={{ paddingBottom: "clamp(20px, 4vw, 40px)" }}>
      <div className="wrap">
        <SectionHead title="Как проходит праздник" />
        <div className="hsteps">
          {steps.map((s, i) => (
            <div key={s.title} className="hstep reveal" style={{ "--d": `${i * 180}ms` } as React.CSSProperties}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** «Хиты сезона» — программы сезона лентой на телефоне. */
export function SeasonHits({ cat, kind, lead }: { cat: Catalog; kind: Kind; lead: string }) {
  const list = cat.programs.filter((p) => p.kind === kind);
  if (!list.length) return null;
  return (
    <section className="sec">
      <div className="wrap">
        <SectionHead title="Хиты сезона" lead={lead} />
        <div className="cards swipe">
          {list.map((p) => (
            <ProgramCard key={p.id} p={p} />
          ))}
        </div>
        <div className="cta-center">
          <Link className="pill pill--ghost pulse pulse--w" href="/sobrat?step=2" data-track="home_all_programs">
            Все программы
          </Link>
        </div>
      </div>
    </section>
  );
}

/** «Вау-момент праздника» — подборка шоу Кирилла. */
export function Shows({ cat }: { cat: Catalog }) {
  const list = HOME_SHOWS.map((id) => cat.extraById[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <SectionHead title="Вау-момент праздника" lead="Добавьте любое из предложенных шоу к вашей программе." />
        <div className="cards swipe">
          {list.map((e) => (
            <ExtraCard key={e.id} e={e} />
          ))}
        </div>
        <div className="cta-center">
          <Link className="pill pill--ghost pulse pulse--w" href="/sobrat?step=3" data-track="home_all_shows">
            Все шоу
          </Link>
        </div>
      </div>
    </section>
  );
}

/** «Как выглядит праздник?» — героев не выбирают на сайте: комплект присылает менеджер. */
export function HowItLooks({ cat, contacts }: { cat: Catalog; contacts: Contacts }) {
  const photos = [
    ["c_ded", "hp1"],
    ["c_snow", "hp2"],
    ["h004", "hp3"],
  ];
  return (
    <section className="sec" id="looks">
      <div className="wrap">
        <div className="howcard">
          <div className="howph" aria-hidden="true">
            {photos.map(([id, cls]) => (
              <div key={id} className={`hp ${cls}`}>
                <Photo src={cat.costumeImg(id)} alt="" fill sizes="(max-width: 820px) 45vw, 260px" className="object-cover" />
              </div>
            ))}
          </div>
          <div className="howtx">
            <p className="brace">праздник вашей мечты</p>
            <SectionTitle title="Как выглядит праздник?" />
            <p className="howq">А как будет выглядеть ваш праздник, решать вам.</p>
            <p>
              Герои, образы и сюжет мы подбираем под возраст, повод и характер именинника.
              <br />
              Комплект персонажей пришлёт менеджер.
              <br />
              Вы посмотрите фото и выберете сами, а если сомневаетесь, мы подскажем.
            </p>
            <div className="howbtn">
              <a className="pill pill--lime pulse" href="#live" data-track="home_looks_photos">
                Смотреть фото с праздников
              </a>
              <a className="pill pill--ghost" href={contacts.telegram} target="_blank" rel="noopener" data-track="home_looks_heroes">
                Получить подборку героев
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="display h-lg">
      Как выглядит <span className="ac">{title.replace("Как выглядит ", "")}</span>
    </h2>
  );
}

/** «19–23». Число мероприятий — из цифр доверия (правятся в админке); нет такой цифры — без последней фразы. */
export function Team({ stats }: { stats: TrustStat[] }) {
  const events = stats.find((s) => /мероприят/i.test(s.label));
  return (
    <section className="sec team">
      <div className="wrap team-in">
        <div className="age">19–23</div>
        <div>
          <h2 className="display h-lg">
            Все артисты <span className="ac">молодые</span>
          </h2>
          <p>
            Нашим артистам от 19 до 23 лет.
            <br />
            Энергия, современный вкус и общий язык с детьми и подростками.
            {events && (
              <>
                <br />
                Мы провели больше {events.value.toLocaleString("ru-RU")} мероприятий и знаем, как зажечь любую аудиторию.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

/** «Живые праздники» — лента фото (галерея в админке), ссылки на канал и Instagram. */
export function Live({ gallery, contacts }: { gallery: GalleryItem[]; contacts: Contacts }) {
  if (!gallery.length) return null;
  return (
    <section className="sec cen scroll-mt-20" id="live">
      <div className="wrap">
        <SectionHead title="Живые праздники" lead="Фото с наших праздников. Вот как это выглядит." />
      </div>
      <LiveRibbon items={gallery} />
      <div className="wrap">
        <div className="cta-center cta-two">
          <a className="pill pill--hot pulse pulse--h" href={contacts.channel} target="_blank" rel="noopener" data-track="home_live_channel">
            Больше в Telegram-канале
          </a>
          <a className="pill pill--ghost" href={contacts.instagram} target="_blank" rel="noopener" data-track="home_live_instagram">
            Instagram {contacts.instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}

/** Пакетные предложения: на главной один пакет «ВАУ!», свёрнутый. */
export function PackagesTeaser({ cat }: { cat: Catalog }) {
  const k = cat.packageById.kmvlki0fs ?? cat.packages.find((x) => !x.custom);
  if (!k) return null;
  return (
    <section className="sec cen">
      <div className="wrap">
        <SectionHead title="Пакетные предложения" lead="Программа и допы со скидкой. Внутри пакета можно выбрать шоу себе по душе." />
        <div className="pgrid">
          <PackageCard k={k} />
        </div>
        <div className="cta-center">
          <Link className="pill pill--lime pill--big pulse" href="/pakety" data-track="home_all_packages">
            Посмотреть все пакеты
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Частые вопросы (тексты в админке). */
export function Faq({ faq, contacts }: { faq: FaqItem[]; contacts: Contacts }) {
  return (
    <section className="sec" id="faq">
      <div className="wrap">
        <div className="cen">
          <SectionHead title="Частые вопросы" />
        </div>
        <div className="faqs">
          {faq.map((q) => (
            <details key={q.q} className="fq">
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </div>
        <div className="cta-center">
          <a className="pill pill--hot" href={contacts.telegram} target="_blank" rel="noopener" data-track="home_faq_telegram">
            Спросить в Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
