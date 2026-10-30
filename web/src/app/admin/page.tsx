import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminApp, type TabId } from "@/components/admin/AdminApp";
import { LoginForm } from "@/components/stats/LoginForm";
import { isAuthed, statsPassword } from "@/lib/auth";
import { readContent } from "@/lib/content/store";
import { listLeads } from "@/lib/leads";

/*
  Админка Кирилла. Тот же пароль и кука, что у /stats.
  Всё, что читает куки и базу, — внутри <Suspense> (cacheComponents): страница считается на каждом запросе.
*/

export const metadata: Metadata = {
  title: "Админка",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

function Skeleton() {
  return (
    <div className="wrap py-6" aria-busy="true" aria-label="Загружаем админку">
      <div className="mb-5 h-12 w-48 animate-pulse rounded-2xl bg-rasp-100/60" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function Gate({ searchParams }: { searchParams: SP }) {
  const cfg = statsPassword();
  if (!(await isAuthed())) {
    return (
      <div className="wrap grid min-h-dvh place-items-center py-10">
        <LoginForm next="/admin" title="Админка сайта" devPassword={cfg?.devDefault ? cfg.password : undefined} />
      </div>
    );
  }
  const tab = (await searchParams).tab;
  return <AdminApp initial={readContent()} initialLeads={listLeads()} initialTab={(typeof tab === "string" ? tab : "leads") as TabId} />;
}

export default function AdminPage(props: { searchParams: SP }) {
  return (
    <div className="min-h-dvh bg-paper">
      <Suspense fallback={<Skeleton />}>
        <Gate searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
