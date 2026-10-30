"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { BarChart3, CircleAlert, CircleCheck, ExternalLink, Gift, LogOut, Settings2, Sparkles } from "lucide-react";
import { logout } from "@/app/stats/actions";
import type { AdminResult } from "@/app/admin/actions";
import { countByStatus, lostAndNew, type AdminLead } from "@/data/leads";
import { EXTRA_GROUPS, KINDS, ageText, buildCatalog } from "@/data/catalog";
import type { ContentAll } from "@/lib/content/store";
import { money } from "@/lib/format";
import { CostumeEditor, ExtraEditor, PackageEditor, ProgramEditor } from "./editors";
import { ItemList } from "./ItemList";
import { CategoriesButton } from "./Categories";
import { GalleryTab, TextsTab } from "./SiteTabs";
import { LeadsTab } from "./LeadsTab";
import { AdminCtx, useAdmin, type AdminApi } from "./ui";

const TABS = [
  { id: "leads", label: "Заявки" },
  { id: "programs", label: "Программы" },
  { id: "extras", label: "Шоу и допы" },
  { id: "packages", label: "Пакеты" },
  { id: "costumes", label: "Костюмы" },
  { id: "texts", label: "Тексты и контакты" },
  { id: "gallery", label: "Фото и отзывы" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

type Editing = { id: string | null; preset?: string } | null;

export function AdminApp({ initial, initialLeads, initialTab }: { initial: ContentAll; initialLeads: AdminLead[]; initialTab: TabId }) {
  const [data, setData] = useState(initial);
  const [leads, setLeads] = useState(initialLeads);
  // Заявки — первая вкладка: админку открывают прежде всего ради них.
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "leads");
  const [editing, setEditing] = useState<Editing>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error, at: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), error ? 6000 : 2600);
  }, []);

  const apply = useCallback(
    async (p: Promise<AdminResult>, okText?: string) => {
      let r: AdminResult;
      try {
        r = await p;
      } catch {
        r = { ok: false, error: "Нет связи с сервером. Проверьте интернет." };
      }
      if (r.ok) {
        setData(r.data);
        if (okText) notify(okText);
      } else notify(r.error, true);
      return r;
    },
    [notify],
  );

  const api: AdminApi = useMemo(() => ({ data, apply, notify }), [data, apply, notify]);

  const pickTab = (t: TabId) => {
    setTab(t);
    setEditing(null);
    window.history.replaceState(null, "", `/admin?tab=${t}`);
    window.scrollTo({ top: 0 });
  };

  const counts: Record<TabId, number | null> = {
    leads: countByStatus(leads).new,
    programs: data.catalog.programs.length,
    extras: data.catalog.extras.length,
    packages: data.catalog.packages.length,
    costumes: data.catalog.costumes.length,
    texts: null,
    gallery: data.site.gallery.length,
  };

  const lost = lostAndNew(leads).length;

  return (
    <AdminCtx.Provider value={api}>
      <div className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-xl">
        <div className="wrap flex min-h-16 items-center gap-2 py-2">
          <Link href="/admin" className="mr-auto flex items-center gap-2.5" aria-label="Улыбайся · Админка">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rasp-500 text-white" aria-hidden>
              <Settings2 size={20} />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-bold tracking-tight">Улыбайся</span>
              <span className="block text-[12.5px] font-semibold text-ink-soft">Админка</span>
            </span>
          </Link>
          <a href="/" target="_blank" rel="noopener" aria-label="Сайт" title="Сайт" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink">
            <ExternalLink size={15} aria-hidden />
            <span className="hidden sm:inline">Сайт</span>
          </a>
          {/* На телефоне — только иконки: с подписями шапка шире 390 px. */}
          <Link href="/stats" aria-label="Статистика" title="Статистика" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink">
            <BarChart3 size={15} aria-hidden />
            <span className="hidden sm:inline">Статистика</span>
          </Link>
          <form action={logout}>
            <input type="hidden" name="next" value="/admin" />
            <button type="submit" aria-label="Выйти" title="Выйти" className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft hover:bg-rasp-50 hover:text-ink">
              <LogOut size={15} aria-hidden />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </form>
        </div>
        <nav aria-label="Разделы" className="wrap no-scrollbar flex gap-2 overflow-x-auto pb-3">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="chip shrink-0" aria-pressed={tab === t.id} onClick={() => pickTab(t.id)}>
              {t.label}
              {counts[t.id] != null && <span className={`text-[13px] tabular-nums ${tab === t.id ? "text-white/75" : "text-ink-soft"}`}>{counts[t.id]}</span>}
              {t.id === "leads" && lost > 0 && (
                <span className={`h-2.5 w-2.5 rounded-full ${tab === "leads" ? "bg-white" : "bg-rasp-500"}`} title="Есть заявки, не дошедшие до Telegram">
                  <span className="sr-only">есть не дошедшие</span>
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="wrap pb-28 pt-5">
        {tab === "leads" && <LeadsTab leads={leads} setLeads={setLeads} />}
        {tab === "programs" && <ProgramsTab onEdit={setEditing} />}
        {tab === "extras" && <ExtrasTab onEdit={setEditing} />}
        {tab === "packages" && <PackagesTab onEdit={setEditing} />}
        {tab === "costumes" && <CostumesTab onEdit={setEditing} />}
        {tab === "texts" && <TextsTab />}
        {tab === "gallery" && <GalleryTab />}
      </main>

      {editing && tab === "programs" && <ProgramEditor key={editing.id ?? "new"} id={editing.id} onClose={() => setEditing(null)} />}
      {editing && tab === "extras" && <ExtraEditor key={editing.id ?? "new"} id={editing.id} group={editing.preset} onClose={() => setEditing(null)} />}
      {editing && tab === "packages" && <PackageEditor key={editing.id ?? "new"} id={editing.id} onClose={() => setEditing(null)} />}
      {editing && tab === "costumes" && <CostumeEditor key={editing.id ?? "new"} id={editing.id} cat={editing.preset} onClose={() => setEditing(null)} />}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </AdminCtx.Provider>
  );
}

function Toast({ toast, onClose }: { toast: { text: string; error: boolean; at: number } | null; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[60] flex justify-center" role="status" aria-live="polite">
      <button
        key={toast.at /* новое сообщение — заново с анимацией */}
        type="button"
        onClick={onClose}
        className={`pointer-events-auto flex max-w-md animate-pop items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-[15px] font-semibold text-white shadow-2xl ${toast.error ? "bg-rasp-700" : "bg-ink"}`}
      >
        {toast.error ? <CircleAlert size={20} className="mt-px shrink-0" /> : <CircleCheck size={20} className="mt-px shrink-0 text-rasp-300" />}
        {toast.text}
      </button>
    </div>
  );
}

/* ---------- Вкладки-списки ---------- */

type TabProps = { onEdit: (e: Editing) => void };

function useCat() {
  const { data } = useAdmin();
  return useMemo(() => buildCatalog(data.catalog), [data.catalog]);
}

function ProgramsTab({ onEdit }: TabProps) {
  const cat = useCat();
  const rows = cat.all.programs.map((p) => ({
    id: p.id,
    name: p.name,
    hidden: p.hidden,
    meta: `${/^от\s/i.test(p.dur) ? "от " : ""}${money(p.price)} · ${ageText(p)} · ${p.kind}`,
    thumb: cat.programCover(p.id),
    filter: p.kind,
    search: p.how,
    view: `/programmy/${p.id}`,
  }));
  return (
    <ItemList
      coll="programs"
      rows={rows}
      filters={KINDS.map((k) => ({ id: k.id, label: k.title }))}
      onEdit={(id) => onEdit({ id })}
      onAdd={() => onEdit({ id: null })}
      addLabel="Добавить"
      noun="программ"
    />
  );
}

function ExtrasTab({ onEdit }: TabProps) {
  const cat = useCat();
  const rows = cat.all.extras.map((e) => ({
    id: e.id,
    name: e.name,
    hidden: e.hidden,
    meta: `${money(e.price)}${e.unit ? ` ${e.unit}` : ""} · ${EXTRA_GROUPS.find((g) => g.id === e.group)?.title ?? e.group}`,
    thumb: e.photo ?? null,
    icon: e.group === "Шоу" ? <Sparkles size={22} /> : <Gift size={22} />,
    filter: e.group,
    search: e.how,
    view: `/sobrat?step=${e.group === "Шоу" ? 3 : 4}`,
  }));
  return (
    <ItemList
      coll="extras"
      rows={rows}
      thumbAspect="16/10"
      filters={EXTRA_GROUPS.map((g) => ({ id: g.id, label: g.title }))}
      onEdit={(id) => onEdit({ id })}
      onAdd={() => onEdit({ id: null })}
      addLabel="Добавить"
      noun="позиций"
    />
  );
}

/** Как в src/components/home/Sections.tsx (PackagesTeaser). */
const HOME_PACKS = ["kmvlki0fs", "k_all", "k_start"];

function PackagesTab({ onEdit }: TabProps) {
  const cat = useCat();
  const rows = cat.all.packages.map((k) => {
    const pr = cat.packagePrice(k);
    return {
      id: k.id,
      name: k.name,
      hidden: k.hidden,
      meta: k.custom ? "по запросу" : `${money(pr.price)}${k.disc ? ` · скидка ${k.disc}%` : ""} · ${k.items.length} поз.`,
      icon: <Gift size={22} />,
      filter: k.custom ? "custom" : "fixed",
      view: `/pakety#${k.id}`,
    };
  });
  return (
    <>
      <p className="mb-4 rounded-2xl bg-rasp-50 px-4 py-3 text-[14px] leading-snug text-ink-soft">
        На главной: {HOME_PACKS.map((id) => `«${cat.all.packages.find((k) => k.id === id)?.name ?? id}»`).join(", ")}, первый из них — хит на странице пакетов. Если какой-то скрыть или удалить, его место займёт следующий по списку.
      </p>
      <ItemList
        coll="packages"
        rows={rows}
        filters={[]}
        onEdit={(id) => onEdit({ id })}
        onAdd={() => onEdit({ id: null })}
        addLabel="Добавить"
        noun="пакетов"
      />
    </>
  );
}

function CostumesTab({ onEdit }: TabProps) {
  const cat = useCat();
  const rows = cat.all.costumes.map((c) => ({
    id: c.id,
    name: c.name,
    hidden: c.hidden,
    meta: c.cat,
    thumb: cat.costumeImg(c.id),
    filter: c.cat,
    search: c.t,
    view: `/kostyumy?q=${encodeURIComponent(c.name)}`,
  }));
  return (
    <ItemList
      coll="costumes"
      rows={rows}
      filters={cat.costumeCats.map((c) => ({ id: c, label: c }))}
      onEdit={(id) => onEdit({ id })}
      onAdd={() => onEdit({ id: null })}
      addLabel="Добавить"
      noun="героев"
      toolbar={<CategoriesButton />}
    />
  );
}
