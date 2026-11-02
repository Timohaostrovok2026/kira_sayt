"use client";

import { useCatalog } from "@/lib/catalog-context";
import { PackageCard, SectionHead } from "@/components/cards";

/** Все пакеты на тёмном фоне в порядке каталога (черновик Кирилла v11). */
export function PackagesView() {
  const { packages } = useCatalog();
  return (
    <>
      <SectionHead
        as="h1"
        title="Пакетные предложения"
        lead="Пакет всегда выгоднее, чем те же позиции по отдельности. Внутри можно выбрать шоу, квест и съёмку. Программа оплачивается отдельно, кроме тех, что уже входят в пакет."
      />
      <div className="pgrid">
        {packages.map((k) => (
          <PackageCard key={k.id} k={k} />
        ))}
      </div>
    </>
  );
}
