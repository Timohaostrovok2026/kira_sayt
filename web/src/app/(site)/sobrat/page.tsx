import type { Metadata } from "next";
import { Suspense } from "react";
import { Builder } from "@/components/sobrat/Builder";

export const metadata: Metadata = {
  title: "Соберите праздник",
  description: "Конструктор детского праздника: возраст, программа, шоу и допы. Цены сразу, заявка в один клик.",
};

/** Пока читаем параметры из URL — показываем каркас той же высоты, без прыжков. */
function BuilderSkeleton() {
  return (
    <div aria-hidden>
      <div className="sticky top-[var(--header-h)] z-30 h-[65px] border-b border-white/10 bg-rasp-950/92" />
      <div className="wrap pt-6 pb-32 md:pt-10">
        <div className="mb-6 flex flex-col gap-3">
          <div className="h-4 w-24 rounded-full bg-rasp-100" />
          <div className="h-8 w-72 max-w-full rounded-full bg-rasp-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-[24px] bg-rasp-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SobratPage() {
  return (
    <>
      <section className="stage">
        <div className="wrap py-7 md:py-12">
          <p className="eyebrow mb-2 text-rasp-300">Конструктор</p>
          <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight md:text-[56px]">Соберите праздник</h1>
          <p className="lead mt-2 text-white/75">5 шагов, пара минут. Цены видно сразу.</p>
        </div>
      </section>
      <Suspense fallback={<BuilderSkeleton />}>
        <Builder />
      </Suspense>
    </>
  );
}
