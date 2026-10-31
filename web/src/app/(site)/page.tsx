import { currentSeason } from "@/data/site";
import { Hero } from "@/components/home/Hero";
import { Stats } from "@/components/home/Stats";
import {
  CostumesRail,
  Faq,
  FinalCta,
  Formats,
  HowItWorks,
  PackagesTeaser,
  Gallery,
  Reviews,
  SeasonHits,
  Shows,
} from "@/components/home/Sections";
import type { Kind } from "@/data/catalog";
import type { ReactNode } from "react";
import { Accent } from "@/components/Accent";

import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_TAG, getCatalog, getSiteContent } from "@/lib/content/get";

const SEASON: Record<ReturnType<typeof currentSeason>, { kind: Kind | null; title: ReactNode; text: string }> = {
  halloween: { kind: "Новый год", title: <>Новый год уже <Accent>бронируют</Accent></>, text: "Лучшие даты в декабре разбирают первыми." },
  newyear: { kind: "Новый год", title: <>Новый год уже <Accent>бронируют</Accent></>, text: "Лучшие даты в декабре разбирают первыми." },
  graduation: { kind: "Выпускной", title: <>Выпускной для <Accent>4 класса</Accent></>, text: "Пакеты под класс до 20 выпускников." },
  birthday: { kind: "Квест", title: <>Квесты, которые любят <Accent>все</Accent></>, text: "Сюжет, загадки и командная игра." },
};

export default async function Home() {
  "use cache";
  // Сезон пересчитывается в фоне раз в несколько часов: главная сама переключится на Новый год, выпускные и т.д.
  cacheLife("hours");
  // Каталог и тексты из базы: после сохранения в админке главная пересобирается сразу.
  cacheTag(CATALOG_TAG);
  const [cat, site] = await Promise.all([getCatalog(), getSiteContent()]);
  const season = currentSeason();
  const s = SEASON[season];
  const newYear = season === "halloween" || season === "newyear";
  // Хиты сезона показываются, только если в каталоге есть программы этого вида.
  const hits = !!s.kind && cat.programs.some((p) => p.kind === s.kind);
  return (
    <>
      <Hero newYear={newYear} cat={cat} />
      <Stats stats={site.stats} />
      <Formats cat={cat} seasonKind={s.kind} />
      <CostumesRail cat={cat} next={hits ? "rasp-50" : "paper"} />
      {s.kind && <SeasonHits cat={cat} kind={s.kind} title={s.title} text={s.text} />}
      <Shows cat={cat} />
      <PackagesTeaser cat={cat} />
      <Gallery gallery={site.gallery} contacts={site.contacts} />
      <Reviews site={site} />
      <HowItWorks steps={site.steps} />
      <Faq faq={site.faq} />
      <FinalCta contacts={site.contacts} />
    </>
  );
}
