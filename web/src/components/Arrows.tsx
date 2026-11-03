import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

/*
 * Стрелки сайта — одни векторные значки вместо символов → ← ▾ ▶ › (у каждого шрифта они свои, друг сказал владельцу: «везде разные»).
 * Движение — в site.css (.ar): «вперёд» мягко подталкивает, «назад» сдвигается при наведении, уголок раскрытия переворачивается.
 */

/** «→»: кнопки и ссылки дальше по воронке. */
export function Go() {
  return <ArrowRight aria-hidden="true" strokeWidth={2.6} className="ar ar--go" />;
}

/** «←»: назад. */
export function Back() {
  return <ArrowLeft aria-hidden="true" strokeWidth={2.6} className="ar ar--back" />;
}

/** Уголок «раскрыть»: в открытом виде повёрнут вверх (`open`, а в <details> — сам по [open]). */
export function Chevron({ open }: { open?: boolean }) {
  return <ChevronDown aria-hidden="true" strokeWidth={2.8} className={`ar ar--chev${open ? " is-open" : ""}`} />;
}

/** «›» в бегущих стрелках полосы шагов. */
export function Step() {
  return <ChevronRight aria-hidden="true" strokeWidth={3} className="ar" />;
}
