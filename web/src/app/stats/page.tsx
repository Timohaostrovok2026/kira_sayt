import { Suspense } from "react";
import type { Metadata } from "next";
import { Dashboard } from "@/components/stats/Dashboard";

/*
  В проекте включён cacheComponents, поэтому `export const dynamic = "force-dynamic"` недоступен.
  Вместо него всё, что читает запрос (куки, ?p=, время, база), живёт в <Dashboard> под <Suspense> —
  страница всегда считается на сервере при каждом запросе.
*/

export const metadata: Metadata = {
  title: "Статистика",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Загружаем статистику">
      <div className="mb-5 flex min-h-16 items-center border-b border-line py-2">
        <div className="h-10 w-40 animate-pulse rounded-2xl bg-rasp-100/60" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-80 animate-pulse lg:col-span-2" />
        <div className="card h-80 animate-pulse" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card h-64 animate-pulse" />
        <div className="card h-64 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    </div>
  );
}

export default function StatsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="wrap pb-12">
        <Suspense fallback={<Skeleton />}>
          <Dashboard searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
