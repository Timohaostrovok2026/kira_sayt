import "server-only";
import raw from "@/data/catalog.json";
import type { CatalogData, Costume, Extra, Package, Program } from "@/data/catalog";
import { SITE_SEED, type SiteContent } from "@/data/site";

/** У программ нет своих фото — показываем подходящего героя из коллекции. */
const PROGRAM_COVER: Record<string, string> = {
  p_anim: "h042",
  p_express: "h018",
  p_football: "h079",
  p_pajama: "h013",
  p_mafia: "h080",
  p_bunker: "h078",
  p_melody: "h082",
  p_pirates: "h008",
  p_dino: "h010",
  p_fort: "h096",
  p_spy: "h036",
  p_hogwarts: "h051",
  p_series: "h089",
  p_granny: "h074",
  p_ch_min: "h078",
  p_ch_mid: "h082",
  p_ch_max: "h079",
  p_halloween: "h117",
  p_ded: "c_ded",
  p_grinch1: "c_grinch",
  p_grinch2: "h004",
  p_yaga: "h098",
  p_letter: "c_elf",
  p_video: "h002",
  p_v1: "h021",
  p_v2: "h023",
  p_v3: "h079",
  p_v4: "h080",
  p_v5: "h078",
  p_v6: "h082",
};

/** Фото шоу и допов (public/img/events). */
const EXTRA_PHOTO: Record<string, string> = {
  e_cryo45: "/img/events/cryo-show.webp",
  e_cryo30: "/img/events/fire-trick.webp",
  xmvlkmw9s: "/img/events/shake-show.webp",
  e_trash: "/img/events/trashbox-puppy.webp",
  e_photozone: "/img/events/photozone.webp",
};

/** Начальное наполнение базы: catalog.json + обложки программ + тексты из site.ts. */
export function seedCatalog(): CatalogData {
  return {
    programs: (raw.programs as Program[]).map((p) => ({ ...p, cover: PROGRAM_COVER[p.id] ?? "h042" })),
    extras: (raw.extras as Extra[]).map((e) => (EXTRA_PHOTO[e.id] ? { ...e, photo: EXTRA_PHOTO[e.id] } : e)),
    packages: raw.packages as Package[],
    costumes: raw.costumes as Costume[],
    costumeCats: raw.costumeCats as string[],
  };
}

export function seedSite(): SiteContent {
  return structuredClone(SITE_SEED);
}
