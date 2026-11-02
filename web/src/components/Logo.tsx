/* eslint-disable @next/next/no-img-element -- векторный логотип: next/image для SVG ничего не даёт */

/** Ширина и высота логотипа Кирилла в векторе (viewBox), чтобы место под него было занято до загрузки. */
const W = 821;
const H = 398;

/** Логотип Кирилла (03.11, исходник — materials/logo/): белый — на малиновой шапке и тёмном подвале. */
export function Logo({ height = 44, alt = "Улыбайся by Kirill Mochalov", className }: { height?: number; alt?: string; className?: string }) {
  return <img src="/img/brand/ulybaysya-logo-white.svg" alt={alt} width={Math.round((height * W) / H)} height={height} className={className ?? "logo"} />;
}
