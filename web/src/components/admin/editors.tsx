"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { Check, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import { saveItem, type Coll } from "@/app/admin/actions";
import {
  DEFAULT_COVER,
  EXTRA_GROUPS,
  KINDS,
  buildCatalog,
  calcPackagePrice,
  type Costume,
  type Extra,
  type Package,
  type PackageItem,
  type Program,
} from "@/data/catalog";
import { money, normQuery } from "@/lib/format";
import { useRemove } from "./ItemList";
import { Field, IconBtn, Input, NumberInput, PhotoField, Select, Sheet, Switch, Textarea, inputCls, useAdmin } from "./ui";

/* ---------- Общая оболочка редактора ---------- */

function useEditor<T extends object>(coll: Coll, id: string | null, initial: T, onClose: () => void) {
  const { apply } = useAdmin();
  const [start] = useState(() => JSON.stringify(initial));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== start;
  const close = () => {
    if (!dirty || confirm("Закрыть без сохранения?")) onClose();
  };
  const save = async () => {
    setSaving(true);
    const r = await apply(saveItem(coll, id, draft), id ? "Сохранено — уже на сайте" : "Добавлено — уже на сайте");
    setSaving(false);
    if (r.ok) onClose();
  };
  return { draft, set, saving, close, save, dirty };
}

function Editor({
  coll,
  id,
  name,
  title,
  view,
  ed,
  onClose,
  children,
}: {
  coll: Coll;
  id: string | null;
  name: string;
  title: string;
  view?: string;
  ed: { saving: boolean; close: () => void; save: () => void; dirty: boolean };
  onClose: () => void;
  children: ReactNode;
}) {
  const remove = useRemove(coll);
  return (
    <Sheet
      title={title}
      onClose={ed.close}
      aside={
        id && view ? (
          <a href={view} target="_blank" rel="noopener" className="btn btn-sm btn-ghost shrink-0 px-3 text-[14px]">
            <ExternalLink size={16} /> <span className="hidden sm:inline">На сайте</span>
          </a>
        ) : null
      }
      footer={
        <div className="flex items-center gap-2">
          {id && (
            <IconBtn label="Удалить" tone="danger" onClick={() => void remove(id, name).then((ok) => ok && onClose())}>
              <Trash2 size={20} />
            </IconBtn>
          )}
          <button type="button" className="btn btn-ghost ml-auto" onClick={ed.close}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary min-w-[140px]" disabled={ed.saving} onClick={ed.save}>
            {ed.saving ? "Сохраняем…" : <><Check size={20} strokeWidth={3} /> Сохранить</>}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {children}
        {id && <p className="text-[12px] text-ink-soft">Код позиции: {id} (не меняется — на него ссылаются корзины и статистика)</p>}
      </div>
    </Sheet>
  );
}

function Ages({ a, b, onChange }: { a: number | null | undefined; b: number | null | undefined; onChange: (p: { a?: number | null; b?: number | null }) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Возраст от, лет" hint="Пусто — без ограничения">
        <NumberInput value={a} onChange={(v) => onChange({ a: v })} placeholder="—" />
      </Field>
      <Field label="до, лет">
        <NumberInput value={b} onChange={(v) => onChange({ b: v })} placeholder="—" />
      </Field>
    </div>
  );
}

/* ---------- Программа ---------- */

const HOW_HINT = (
  <>
    Первый абзац — описание. Потом <b>пустая строка</b>, и дальше <b>каждый шаг с новой строки</b> — на сайте они станут нумерованным списком.
  </>
);

export function ProgramEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useAdmin();
  const prev = id ? data.catalog.programs.find((p) => p.id === id) : undefined;
  const ed = useEditor<Partial<Program>>(
    "programs",
    id,
    prev ?? { name: "", kind: "Анимация", a: null, b: null, dur: "От 1 часа", art: "1 артист", price: 0, how: "", inc: "", cover: DEFAULT_COVER },
    onClose,
  );
  const d = ed.draft;
  const cat = useMemo(() => buildCatalog(data.catalog), [data.catalog]);
  return (
    <Editor coll="programs" id={id} name={d.name ?? ""} title={id ? d.name || "Программа" : "Новая программа"} view={id ? `/programmy/${id}` : undefined} ed={ed} onClose={onClose}>
      <Field label="Название">
        <Input value={d.name ?? ""} onChange={(e) => ed.set({ name: e.target.value })} placeholder="Например, Пиратский квест" autoFocus={!id} />
      </Field>
      <Field label="Вид программы" hint="От вида зависит, в каком разделе конструктора программа появится">
        <Select value={d.kind ?? "Анимация"} onChange={(v) => ed.set({ kind: v as Program["kind"] })}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Цена, ₽">
          <NumberInput value={d.price} onChange={(v) => ed.set({ price: v ?? 0 })} />
        </Field>
        <Field label="Длительность" hint="«От 1 часа» — цена покажется как «от»">
          <Input value={d.dur ?? ""} onChange={(e) => ed.set({ dur: e.target.value })} />
        </Field>
      </div>
      <Ages a={d.a} b={d.b} onChange={ed.set} />
      <Field label="Артисты">
        <Input value={d.art ?? ""} onChange={(e) => ed.set({ art: e.target.value })} placeholder="1–3 артиста" />
      </Field>
      <Field label="Как проходит" hint={HOW_HINT}>
        <Textarea value={d.how ?? ""} onChange={(v) => ed.set({ how: v })} rows={8} />
      </Field>
      <Field label="Что входит" hint="Каждый пункт с новой строки">
        <Textarea value={d.inc ?? ""} onChange={(v) => ed.set({ inc: v })} rows={6} />
      </Field>
      <CoverPicker costumes={data.catalog.costumes} value={d.cover} img={cat.costumeImg} onPick={(c) => ed.set({ cover: c })} disabled={!!d.photo} />
      <PhotoField
        label="Или своё фото программы"
        kind="programs"
        prefix={id ?? "program"}
        value={d.photo}
        onChange={(photo) => ed.set({ photo })}
        hint="Своё фото важнее героя-обложки. Лучше вертикальное: обрежем до 3:4."
      />
      <Switch on={!!d.hidden} onChange={(hidden) => ed.set({ hidden })} label="Скрыть с сайта" hint="Программа останется в админке, её можно вернуть" />
    </Editor>
  );
}

function CoverPicker({ costumes, value, img, onPick, disabled }: { costumes: Costume[]; value?: string; img: (id: string) => string; onPick: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = costumes.find((c) => c.id === value);
  const words = normQuery(q).split(/\s+/).filter(Boolean);
  const list = costumes.filter((c) => words.every((w) => normQuery(`${c.name} ${c.cat}`).includes(w)));
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <span className="mb-1.5 block text-[14px] font-semibold">Обложка: герой из костюмов</span>
      <div className="flex items-center gap-3">
        <span className="relative block w-20 shrink-0 overflow-hidden rounded-xl bg-rasp-900" style={{ aspectRatio: "3/4" }}>
          <Image src={img(value || DEFAULT_COVER)} alt="" fill sizes="80px" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{cur?.name ?? "Герой по умолчанию"}</p>
          <button type="button" className="btn btn-sm btn-soft mt-2" onClick={() => setOpen((o) => !o)}>
            {open ? "Свернуть" : "Выбрать героя"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
          <div className="relative mb-3">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти героя" className={`${inputCls} h-11 pl-10`} />
          </div>
          <div className="grid max-h-[360px] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onPick(c.id);
                  setOpen(false);
                }}
                className={`relative overflow-hidden rounded-xl bg-rasp-900 ${c.id === value ? "ring-4 ring-rasp-500" : ""}`}
                style={{ aspectRatio: "3/4" }}
                title={c.name}
              >
                <Image src={img(c.id)} alt={c.name} fill sizes="90px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[11px] font-semibold text-white">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Шоу и допы ---------- */

export function ExtraEditor({ id, onClose, group }: { id: string | null; onClose: () => void; group?: string }) {
  const { data } = useAdmin();
  const prev = id ? data.catalog.extras.find((e) => e.id === id) : undefined;
  const g = (EXTRA_GROUPS.find((x) => x.id === group)?.id ?? "Шоу") as Extra["group"];
  const ed = useEditor<Partial<Extra>>("extras", id, prev ?? { name: "", group: g, kind: g, a: null, b: null, dur: "", unit: "за шоу", price: 0, how: "", inc: "" }, onClose);
  const d = ed.draft;
  const units = useMemo(() => [...new Set(data.catalog.extras.map((e) => e.unit).filter(Boolean))] as string[], [data.catalog.extras]);
  const step = d.group === "Шоу" ? 3 : 4;
  return (
    <Editor coll="extras" id={id} name={d.name ?? ""} title={id ? d.name || "Позиция" : "Новое шоу или доп"} view={`/sobrat?step=${step}`} ed={ed} onClose={onClose}>
      <Field label="Название">
        <Input value={d.name ?? ""} onChange={(e) => ed.set({ name: e.target.value })} placeholder="Например, Шоу мыльных пузырей" autoFocus={!id} />
      </Field>
      <Field label="Раздел" hint="Шоу — шаг «Шоу» в конструкторе, остальное — шаг «Допы»">
        <Select value={d.group ?? "Шоу"} onChange={(v) => ed.set({ group: v as Extra["group"] })}>
          {EXTRA_GROUPS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Цена, ₽">
          <NumberInput value={d.price} onChange={(v) => ed.set({ price: v ?? 0 })} />
        </Field>
        <Field label="За что цена" hint="«за ребёнка», «за 1 шт.» — появится счётчик">
          <Input value={d.unit ?? ""} onChange={(e) => ed.set({ unit: e.target.value })} list="units" />
          <datalist id="units">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Длительность">
        <Input value={d.dur ?? ""} onChange={(e) => ed.set({ dur: e.target.value })} placeholder="45 минут" />
      </Field>
      <Ages a={d.a} b={d.b} onChange={ed.set} />
      <Field label="Описание" hint="Первый абзац виден на карточке (3 строки)">
        <Textarea value={d.how ?? ""} onChange={(v) => ed.set({ how: v })} rows={5} />
      </Field>
      <Field label="Что входит" hint="Каждый пункт с новой строки">
        <Textarea value={d.inc ?? ""} onChange={(v) => ed.set({ inc: v })} rows={4} />
      </Field>
      <PhotoField
        kind="extras"
        prefix={id ?? "extra"}
        aspect="16/10"
        value={d.photo}
        onChange={(photo) => ed.set({ photo })}
        hint="Необязательно. С фото карточка становится с картинкой сверху (обрежем до 16:10)."
      />
      <Switch on={!!d.hidden} onChange={(hidden) => ed.set({ hidden })} label="Скрыть с сайта" hint="В пакетах позиция продолжит считаться" />
    </Editor>
  );
}

/* ---------- Пакеты ---------- */

export function PackageEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useAdmin();
  const prev = id ? data.catalog.packages.find((k) => k.id === id) : undefined;
  const ed = useEditor<Partial<Package>>("packages", id, prev ?? { name: "", tag: "", disc: 15, items: [], override: null, custom: false, note: "" }, onClose);
  const d = ed.draft;
  const items = d.items ?? [];
  const all = useMemo(() => {
    const m = new Map<string, { id: string; name: string; price: number; hidden?: boolean }>();
    for (const x of [...data.catalog.programs, ...data.catalog.extras]) m.set(x.id, x);
    return m;
  }, [data.catalog]);
  const pr = calcPackagePrice({ items, disc: d.disc ?? null, override: d.override ?? null }, (rid) => all.get(rid));
  const setItem = (i: number, patch: Partial<PackageItem>) => ed.set({ items: items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });

  const options = (
    <>
      <option value="" disabled>
        Выберите…
      </option>
      <optgroup label="Программы">
        {data.catalog.programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {money(p.price)}
            {p.hidden ? " (скрыта)" : ""}
          </option>
        ))}
      </optgroup>
      {EXTRA_GROUPS.map((g) => (
        <optgroup key={g.id} label={g.title}>
          {data.catalog.extras
            .filter((e) => e.group === g.id)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {money(e.price)}
                {e.hidden ? " (скрыт)" : ""}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <Editor coll="packages" id={id} name={d.name ?? ""} title={id ? `Пакет «${d.name || ""}»` : "Новый пакет"} view={id ? `/pakety#${id}` : undefined} ed={ed} onClose={onClose}>
      <Field label="Название">
        <Input value={d.name ?? ""} onChange={(e) => ed.set({ name: e.target.value })} placeholder="Например, Улыбка" autoFocus={!id} />
      </Field>
      <Field label="Короткое описание">
        <Textarea value={d.tag ?? ""} onChange={(v) => ed.set({ tag: v })} rows={2} />
      </Field>
      <Switch on={!!d.custom} onChange={(custom) => ed.set({ custom })} label="Индивидуальный (цена по запросу)" hint="Без состава и цены — «Посчитаем после разговора»" />

      {!d.custom && (
        <>
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold">Что входит</span>
            <div className="flex flex-col gap-3">
              {items.map((it, i) => (
                <div key={i} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                  <div className="flex items-start gap-2">
                    <Select value={it.ref} onChange={(ref) => setItem(i, { ref })} className="min-w-0 flex-1 text-[15px]">
                      {options}
                    </Select>
                    <IconBtn label="Убрать позицию" tone="danger" onClick={() => ed.set({ items: items.filter((_, k) => k !== i) })}>
                      <Trash2 size={18} />
                    </IconBtn>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[14px] text-ink-soft">
                      Кол-во
                      <NumberInput value={it.qty} onChange={(v) => setItem(i, { qty: v ?? 1 })} className="!h-10 !w-16 !px-2 text-center" />
                    </label>
                  </div>
                  <div className="mt-3">
                    <span className="text-[13px] font-semibold text-ink-soft">Варианты на выбор клиенту (необязательно)</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(it.alts ?? []).map((a) => (
                        <span key={a} className="inline-flex items-center gap-1 rounded-full bg-rasp-50 py-1 pl-3 pr-1 text-[13px] font-semibold">
                          {all.get(a)?.name ?? a}
                          <button type="button" aria-label="Убрать вариант" className="grid h-7 w-7 place-items-center rounded-full hover:bg-rasp-100" onClick={() => setItem(i, { alts: (it.alts ?? []).filter((x) => x !== a) })}>
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <Select
                      value=""
                      onChange={(v) => v && v !== it.ref && setItem(i, { alts: [...new Set([...(it.alts ?? []), v])] })}
                      className="mt-2 !h-10 text-[14px]"
                    >
                      {options}
                    </Select>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-soft self-start" onClick={() => ed.set({ items: [...items, { ref: "", qty: 1 }] })}>
                <Plus size={18} /> Добавить позицию
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Скидка, %">
              <NumberInput value={d.disc} onChange={(v) => ed.set({ disc: v })} placeholder="0" />
            </Field>
            <Field label="Своя цена, ₽" hint="Если заполнить — скидка не считается">
              <NumberInput value={d.override} onChange={(v) => ed.set({ override: v })} placeholder="—" />
            </Field>
          </div>

          <div className="rounded-2xl bg-ink p-4 text-white">
            <p className="text-[13px] text-white/60">Цена на сайте (с основными позициями)</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
              {pr.save > 0 && <s className="text-white/50 tabular-nums">{money(pr.full)}</s>}
              <span className="price text-[28px]">{money(pr.price)}</span>
              {pr.save > 0 && <span className="text-[14px] font-semibold text-rasp-300">выгода {money(pr.save)}</span>}
            </p>
          </div>
        </>
      )}

      <Field label="Примечание" hint="Например, длительность">
        <Textarea value={d.note ?? ""} onChange={(v) => ed.set({ note: v })} rows={2} />
      </Field>
      <Switch on={!!d.hidden} onChange={(hidden) => ed.set({ hidden })} label="Скрыть с сайта" />
    </Editor>
  );
}

/* ---------- Костюмы ---------- */

export function CostumeEditor({ id, onClose, cat: defaultCat }: { id: string | null; onClose: () => void; cat?: string }) {
  const { data } = useAdmin();
  const prev = id ? data.catalog.costumes.find((c) => c.id === id) : undefined;
  const ed = useEditor<Partial<Costume>>("costumes", id, prev ?? { name: "", cat: defaultCat || data.catalog.costumeCats[0] || "", t: "" }, onClose);
  const d = ed.draft;
  const [adding, setAdding] = useState(false);
  const cats = data.catalog.costumeCats.includes(d.cat ?? "") || !d.cat ? data.catalog.costumeCats : [...data.catalog.costumeCats, d.cat];
  return (
    <Editor
      coll="costumes"
      id={id}
      name={d.name ?? ""}
      title={id ? d.name || "Герой" : "Новый герой"}
      view={id ? `/kostyumy?q=${encodeURIComponent(d.name ?? "")}` : undefined}
      ed={ed}
      onClose={onClose}
    >
      <PhotoField
        kind="costumes"
        prefix={id ?? "costume"}
        value={d.photo}
        fallback={id ? `/img/costumes/${id}.webp` : undefined}
        onChange={(photo) => ed.set({ photo })}
        hint="Вертикальное фото героя, лучше на однотонном фоне. Обрежем до 3:4 (480×640)."
      />
      <Field label="Имя героя">
        <Input value={d.name ?? ""} onChange={(e) => ed.set({ name: e.target.value })} placeholder="Например, Эльза" autoFocus={!id} />
      </Field>
      <Field label="Категория">
        {adding ? (
          <div className="flex gap-2">
            <Input value={d.cat ?? ""} onChange={(e) => ed.set({ cat: e.target.value })} placeholder="Новая категория" autoFocus />
            <button type="button" className="btn btn-ghost shrink-0" onClick={() => { setAdding(false); ed.set({ cat: prev?.cat ?? data.catalog.costumeCats[0] }); }}>
              Отмена
            </button>
          </div>
        ) : (
          <Select
            value={d.cat ?? ""}
            onChange={(v) => {
              if (v === "__new") {
                setAdding(true);
                ed.set({ cat: "" });
              } else ed.set({ cat: v });
            }}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__new">+ Новая категория…</option>
          </Select>
        )}
      </Field>
      <Field label="Описание" hint="Пара фраз — видно в карточке героя">
        <Textarea value={d.t ?? ""} onChange={(v) => ed.set({ t: v })} rows={3} />
      </Field>
      <Switch on={!!d.hidden} onChange={(hidden) => ed.set({ hidden })} label="Скрыть с сайта" hint="Например, костюм в химчистке" />
    </Editor>
  );
}
