import Image, { type ImageProps } from "next/image";
import { isPresized } from "@/data/catalog";

const svg = (from: string, mid: string, to: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><defs><radialGradient id="g" cx="50%" cy="42%" r="80%"><stop offset="0" stop-color="${from}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs><rect width="30" height="40" fill="url(#g)"/></svg>`,
  )}` as const;

/** Заглушки в тонах сцены и светлых разделов: пока фото грузится, на месте не пусто. */
const PLACEHOLDER = {
  stage: svg("#a10c35", "#6e0628", "#3a020f"),
  light: svg("#fff4f7", "#ffe4ec", "#ffc6d7"),
};

/**
 * Фото сайта. Заглушка рисуется фоном самого <img> и не зависит от JS — работает и до загрузки скриптов.
 * Уже нарезанные фото (герои, загрузки) идут без серверного пережатия.
 */
export function Photo({ tone = "stage", src, alt, unoptimized, ...rest }: ImageProps & { tone?: keyof typeof PLACEHOLDER | "none" }) {
  const raw = typeof src === "string" ? src : "";
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? isPresized(raw)}
      placeholder={tone === "none" ? undefined : PLACEHOLDER[tone]}
      {...rest}
    />
  );
}
