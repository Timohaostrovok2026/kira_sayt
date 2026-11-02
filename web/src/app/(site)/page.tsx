import { currentSeason } from "@/data/site";
import type { Kind } from "@/data/catalog";
import { Hero, type HeroPhoto } from "@/components/home/Hero";
import { Stats } from "@/components/home/Stats";
import { Reviews } from "@/components/home/Reviews";
import { Faq, Formats, HowItLooks, HowItWorks, Live, PackagesTeaser, SeasonHits, Shows, Team } from "@/components/home/Sections";

import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_TAG, getCatalog, getSiteContent } from "@/lib/content/get";

const NY_PHOTOS: HeroPhoto[] = [
  { src: "/img/ny/grinch.webp", alt: "Гринч" },
  { src: "/img/ny/ded.webp", alt: "Дед Мороз" },
  { src: "/img/ny/elf.webp", alt: "Эльф" },
];

const SEASON: Record<ReturnType<typeof currentSeason>, { kind: Kind | null; lead: string }> = {
  halloween: { kind: "Новый год", lead: "Новогодние программы, которые заказывают чаще всего." },
  newyear: { kind: "Новый год", lead: "Новогодние программы, которые заказывают чаще всего." },
  graduation: { kind: "Выпускной", lead: "Пакеты под класс до 20 выпускников." },
  birthday: { kind: "Квест", lead: "Сюжет, загадки и командная игра." },
};

/** Главная по черновику Кирилла v11: один тёмный фон без швов, порядок блоков — DESIGN.md §10. */
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
  // Вне новогоднего сезона — три героя из коллекции (Новый год не показываем летом).
  const photos = newYear ? NY_PHOTOS : ["h025", "h042", "h016"].map((id) => ({ src: cat.costumeImg(id), alt: cat.all.costumes.find((c) => c.id === id)?.name ?? "" }));
  return (
    <div className="vhome">
      <Hero photos={photos} newYear={newYear} telegram={site.contacts.telegram} />
      <Stats stats={site.stats} />
      <Formats cat={cat} seasonKind={s.kind} />
      <HowItWorks steps={site.steps} />
      {s.kind && <SeasonHits cat={cat} kind={s.kind} lead={s.lead} />}
      <Shows cat={cat} />
      <HowItLooks cat={cat} contacts={site.contacts} />
      <Team stats={site.stats} />
      <Live gallery={site.gallery} contacts={site.contacts} />
      <PackagesTeaser cat={cat} />
      <Reviews site={site} />
      <Faq faq={site.faq} contacts={site.contacts} />
    </div>
  );
}
