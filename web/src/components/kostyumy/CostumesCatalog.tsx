"use client";

import { Accent } from "@/components/Accent";
import { Photo } from "@/components/Photo";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SearchX, Send, X } from "lucide-react";
import { useCatalog, useSite } from "@/lib/catalog-context";
import { telegramLink } from "@/components/korzina/lead";
import { normQuery, plural } from "@/lib/format";
import { track } from "@/lib/track";
import { HeroCard } from "./HeroCard";
import { HeroSheet } from "./HeroSheet";
import { SelectedBar } from "./SelectedBar";

const QUICK = ["Эльза", "Человек-паук", "Лабубу", "Майнкрафт", "Соник", "Щенки"];
const SHOWCASE = ["h025", "h042", "h101"];

const heroWord = (n: number) => plural(n, "герой", "героя", "героев");

function matches(hay: string, words: string[]) {
  return words.every((w) => hay.includes(w));
}

/** Читает ?cat= и ?q= один раз. Отдельно и внутри <Suspense>, чтобы сетка осталась в статической оболочке. */
function UrlParams({ onRead }: { onRead: (cat: string | null, q: string | null) => void }) {
  const sp = useSearchParams();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    onRead(sp.get("cat"), sp.get("q"));
  }, [sp, onRead]);
  return null;
}

export function CostumesCatalog() {
  const { costumes, costumeCats, costumeImg, costumeById } = useCatalog();
  const { contacts } = useSite();
  /** Нормализованный текст для поиска: имя + категория + описание. */
  const hay = useMemo(() => costumes.map((c) => normQuery(`${c.name} ${c.cat} ${c.t ?? ""}`)), [costumes]);
  const rounded = costumes.length >= 20 ? `${Math.floor(costumes.length / 10) * 10}+` : String(costumes.length);
  // Витрина: свои любимцы, а если их скрыли — первые по порядку.
  const showcase = [...SHOWCASE.filter((id) => costumeById[id]), ...costumes.map((c) => c.id)].filter((id, i, a) => a.indexOf(id) === i).slice(0, 3);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(""); // "" — все
  const [openId, setOpenId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const nq = normQuery(q);
  const words = useMemo(() => nq.split(/\s+/).filter(Boolean), [nq]);

  const byQuery = useMemo(() => costumes.filter((_, i) => matches(hay[i], words)), [costumes, hay, words]);
  const allCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of costumes) m.set(c.cat, (m.get(c.cat) ?? 0) + 1);
    return m;
  }, [costumes]);
  const queryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of byQuery) m.set(c.cat, (m.get(c.cat) ?? 0) + 1);
    return m;
  }, [byQuery]);
  const cats = useMemo(() => costumeCats.filter((k) => (allCounts.get(k) ?? 0) > 0), [costumeCats, allCounts]);
  const list = useMemo(() => (cat ? byQuery.filter((c) => c.cat === cat) : byQuery), [byQuery, cat]);

  const openIndex = openId ? list.findIndex((c) => c.id === openId) : -1;

  // Глубокие ссылки: /kostyumy?cat=Принцессы&q=эльза
  const onUrl = useCallback((pCat: string | null, pQ: string | null) => {
    if (pCat) {
      const found = costumeCats.find((k) => normQuery(k) === normQuery(pCat));
      if (found) setCat(found);
    }
    if (pQ) setQ(pQ.slice(0, 60));
  }, [costumeCats]);

  // Поиск в аналитику — с задержкой, чтобы не слать каждую букву.
  const found = byQuery.length;
  useEffect(() => {
    if (nq.length < 2) return;
    const t = setTimeout(() => track("costume_search", { q: nq, n: found }), 900);
    return () => clearTimeout(t);
  }, [nq, found]);

  // Активный чип — в центр ленты.
  useEffect(() => {
    const box = chipsRef.current;
    const el = box?.querySelector<HTMLElement>('[aria-pressed="true"][data-cat]');
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
  }, [cat]);

  /** Если сетка уже прокручена, после смены фильтра возвращаемся к её началу. */
  const toGridTop = () => {
    const a = anchorRef.current;
    if (!a) return;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
    const top = a.getBoundingClientRect().top + window.scrollY - header;
    if (window.scrollY > top + 1) window.scrollTo({ top, behavior: "smooth" });
  };

  const pickCat = (k: string) => {
    if (k === cat) return;
    setCat(k);
    track("costume_cat", { cat: k || "Все" });
    toGridTop();
  };

  const reset = () => {
    setQ("");
    if (cat) {
      setCat("");
      track("costume_cat", { cat: "Все" });
    }
    toGridTop();
  };

  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    inputRef.current?.focus({ preventScroll: true });
  };

  const open = (id: string) => {
    setOpenId(id);
    track("costume_view", { id });
  };

  // Совет для пустого результата: в выбранной категории нет, а во всех — есть.
  const elsewhere = cat && list.length === 0 ? found : 0;

  return (
    <>
      <Suspense fallback={null}>
        <UrlParams onRead={onUrl} />
      </Suspense>

      {/* Сцена с поиском */}
      <section className="stage relative overflow-hidden">
        <div className="wrap relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-8 pt-8 md:pb-12 md:pt-14 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow mb-3 text-rasp-300">Костюмы и герои</p>
            <h1 className="h-hero text-[clamp(32px,7vw,68px)]">
              {rounded} героев для вашего <Accent>праздника</Accent>
            </h1>
            <p className="lead mt-3 text-white/70">Отмечайте любимых — каждый подходит к любой анимационной программе.</p>

            <form
              role="search"
              className="relative mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                inputRef.current?.blur();
              }}
            >
              <label htmlFor="hero-search" className="sr-only">
                Найти героя
              </label>
              <Search size={22} strokeWidth={2.5} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-rasp-500" aria-hidden="true" />
              <input
                ref={inputRef}
                id="hero-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Найти героя: Эльза, Человек-паук…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                maxLength={60}
                className="h-[60px] w-full rounded-full bg-white pl-14 pr-14 text-[17px] font-medium text-ink shadow-[0_18px_40px_-16px_rgb(0_0_0/0.55)] outline-none placeholder:text-ink-soft/70 focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-rasp-300 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Очистить поиск"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-rasp-50 text-rasp-700 transition-colors hover:bg-rasp-100"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              )}
            </form>

            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {QUICK.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setQ(w)}
                  aria-pressed={normQuery(w) === nq}
                  className="chip min-h-9 shrink-0 px-3.5 text-[14px]"
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Честно: в каталоге не все костюмы (просьба Кирилла 31.10) — нужного героя можно спросить */}
            <p className="mt-4 text-[15px] leading-snug text-white/70">
              На сайте не все костюмы.{" "}
              <a
                href={telegramLink(contacts, "Здравствуйте! Подскажите, есть ли у вас костюм героя, которого нет на сайте?")}
                target="_blank"
                rel="noopener"
                data-track="costumes_ask_tg"
                className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Спросите менеджера про своего героя
              </a>
            </p>
          </div>

          {/* Витрина героев — только на широком экране */}
          <div className="relative hidden h-[300px] w-[380px] lg:block" aria-hidden="true">
            {showcase.map((id, i) => (
              <div
                key={id}
                className="absolute top-0 h-[280px] w-[210px] overflow-hidden rounded-[26px] bg-rasp-900 shadow-2xl shadow-black/50 ring-1 ring-white/10"
                style={{
                  left: i * 85,
                  top: i === 1 ? 0 : 22,
                  zIndex: i === 1 ? 2 : 1,
                  transform: `rotate(${(i - 1) * 7}deg)`,
                }}
              >
                <Photo src={costumeImg(id)} alt="" fill sizes="210px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Категории + сетка */}
      <section aria-labelledby="heroes-title" className="pb-10 md:pb-16">
        <div ref={anchorRef} />
        <div className="sticky top-[var(--header-h)] z-30 border-b border-line bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="wrap">
            <div
              ref={chipsRef}
              role="group"
              aria-label="Категории героев"
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 py-3 [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-28px),transparent)] md:-mx-8 md:px-8"
            >
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label={`Убрать поиск «${q}»`}
                  className="chip shrink-0 bg-ink text-white shadow-none hover:shadow-none"
                >
                  <Search size={16} strokeWidth={2.5} />
                  <span className="max-w-[9rem] truncate">{q}</span>
                  <X size={16} strokeWidth={2.5} />
                </button>
              ) : (
                <button type="button" onClick={focusSearch} aria-label="Поиск героя" className="chip shrink-0 px-3">
                  <Search size={18} strokeWidth={2.5} />
                </button>
              )}
              {[{ k: "", label: "Все" }, ...cats.map((k) => ({ k, label: k }))].map(({ k, label }) => {
                const n = k ? (queryCounts.get(k) ?? 0) : found;
                const on = cat === k;
                return (
                  <button
                    key={label}
                    type="button"
                    data-cat
                    onClick={() => pickCat(k)}
                    aria-pressed={on}
                    className={`chip shrink-0 ${n === 0 && !on ? "opacity-45" : ""}`}
                  >
                    {label}
                    <span className={`text-[13px] font-semibold tabular-nums ${on ? "text-white/75" : "text-ink-soft"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="wrap pt-4 md:pt-6">
          <h2 id="heroes-title" className="mb-4 flex items-baseline gap-2 text-[15px] text-ink-soft" aria-live="polite">
            <span className="font-display text-[18px] font-semibold text-ink">{cat || (nq ? "Нашлось" : "Все герои")}</span>
            <span className="tabular-nums">
              {list.length} {heroWord(list.length)}
            </span>
          </h2>

          {list.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((c, i) => (
                <li key={c.id}>
                  <HeroCard c={c} index={i} onOpen={open} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-rasp-50 text-rasp-500">
                <SearchX size={30} strokeWidth={2.2} />
              </span>
              <p className="h-card">{q ? `«${q}» не нашли` : "Здесь пока пусто"}</p>
              <p className="text-[16px] text-ink-soft">
                {elsewhere
                  ? `В категории «${cat}» нет, но в других — ${elsewhere} ${heroWord(elsewhere)}.`
                  : "Попробуйте другое имя или посмотрите всех героев."}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {elsewhere > 0 && (
                  <button type="button" onClick={() => pickCat("")} className="btn btn-primary">
                    Искать во всех
                  </button>
                )}
                <button type="button" onClick={reset} className={`btn ${elsewhere ? "btn-soft" : "btn-primary"}`} data-track="costume_search_reset">
                  Сбросить
                </button>
                {q && (
                  <a
                    href={telegramLink(contacts, `Здравствуйте! Есть ли у вас костюм «${q.trim()}»?`)}
                    target="_blank"
                    rel="noopener"
                    data-track="costumes_empty_ask_tg"
                    className="btn btn-soft"
                  >
                    <Send size={18} /> Спросить в Telegram
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <SelectedBar />

      {openIndex >= 0 && (
        <HeroSheet
          list={list}
          index={openIndex}
          onIndex={(i) => {
            const id = list[i]?.id;
            if (id && id !== openId) open(id);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
