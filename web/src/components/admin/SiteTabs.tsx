"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { saveSite } from "@/app/admin/actions";
import type { SiteContent } from "@/data/site";
import type { SiteInput } from "@/lib/content/validate";
import { Field, IconBtn, Input, NumberInput, Repeater, Section, Textarea, useAdmin } from "./ui";
import { uploadPhoto } from "./upload";

/** Тексты из базы → поля формы (ссылки мессенджеров редактируем через ники). */
function toInput(s: SiteContent): SiteInput {
  const { contacts: c, ...rest } = s;
  return {
    ...rest,
    contacts: {
      phone: c.phone,
      whatsappPhone: `+${c.whatsapp.replace(/\D/g, "")}`,
      telegramHandle: c.telegramHandle,
      channelHandle: c.channelHandle,
      instagramHandle: c.instagramHandle,
      owner: c.owner,
      geo: c.geo,
    },
  };
}

/** Черновик всей формы текстов и кнопка «Сохранить» внизу, пока есть изменения. */
function useSiteDraft() {
  const { data, apply } = useAdmin();
  const [base, setBase] = useState(() => toInput(data.site));
  const [draft, setDraft] = useState(base);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const set = (patch: Partial<SiteInput> | ((d: SiteInput) => Partial<SiteInput>)) =>
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  const save = async () => {
    setSaving(true);
    const r = await apply(saveSite(draft), "Сохранено — уже на сайте");
    setSaving(false);
    if (r.ok) {
      const fresh = toInput(r.data.site);
      setBase(fresh);
      setDraft(fresh);
    }
  };
  const bar = dirty ? (
    <div className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-ink p-2 pl-4 text-white shadow-2xl">
      <span className="min-w-0 flex-1 text-[14px] font-semibold">Есть несохранённые изменения</span>
      <button type="button" className="btn btn-sm btn-ghost text-white" onClick={() => setDraft(base)}>
        Отменить
      </button>
      <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={save}>
        {saving ? "Сохраняем…" : <><Check size={18} strokeWidth={3} /> Сохранить</>}
      </button>
    </div>
  ) : null;
  return { draft, set, bar };
}

export function TextsTab() {
  const { draft: d, set, bar } = useSiteDraft();
  const c = d.contacts;
  const setC = (patch: Partial<SiteInput["contacts"]>) => set({ contacts: { ...c, ...patch } });
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Section title="Контакты" hint="Видны в шапке, подвале, корзине и кнопках мессенджеров. Ссылки соберём сами.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Телефон" hint="Как показывать на сайте">
            <Input value={c.phone} onChange={(e) => setC({ phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="WhatsApp, номер" hint="Можно тот же, что телефон">
            <Input value={c.whatsappPhone} onChange={(e) => setC({ whatsappPhone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Telegram менеджера" hint="Ник, например @kkmochalov — сюда уходят заявки">
            <Input value={c.telegramHandle} onChange={(e) => setC({ telegramHandle: e.target.value })} autoCapitalize="off" />
          </Field>
          <Field label="Telegram-канал" hint="Ник канала">
            <Input value={c.channelHandle} onChange={(e) => setC({ channelHandle: e.target.value })} autoCapitalize="off" />
          </Field>
          <Field label="Instagram" hint="Ник">
            <Input value={c.instagramHandle} onChange={(e) => setC({ instagramHandle: e.target.value })} autoCapitalize="off" />
          </Field>
          <Field label="Имя владельца">
            <Input value={c.owner} onChange={(e) => setC({ owner: e.target.value })} />
          </Field>
        </div>
        <Field label="География">
          <Input value={c.geo} onChange={(e) => setC({ geo: e.target.value })} />
        </Field>
        <Field label="Юридическая строка в подвале" hint="ФИО и ИНН">
          <Input value={d.legal} onChange={(e) => set({ legal: e.target.value })} />
        </Field>
      </Section>

      <Section title="Цифры доверия" hint="Блок с цифрами под первым экраном главной. Обычно 4 штуки.">
        <Repeater
          items={d.stats}
          onChange={(stats) => set({ stats })}
          blank={() => ({ value: 0, suffix: "+", label: "" })}
          addLabel="Добавить цифру"
          render={(s, setS) => (
            <>
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <Field label="Число">
                  <NumberInput value={s.value} onChange={(v) => setS({ value: v ?? 0 })} />
                </Field>
                <Field label="После числа">
                  <Input value={s.suffix} onChange={(e) => setS({ suffix: e.target.value })} placeholder="+" />
                </Field>
              </div>
              <Field label="Подпись">
                <Input value={s.label} onChange={(e) => setS({ label: e.target.value })} placeholder="мероприятий проведено" />
              </Field>
            </>
          )}
        />
      </Section>

      <Section title="Как это работает" hint="Шаги на главной.">
        <Repeater
          items={d.steps}
          onChange={(steps) => set({ steps })}
          blank={() => ({ title: "", text: "" })}
          addLabel="Добавить шаг"
          render={(s, setS) => (
            <>
              <Field label="Заголовок">
                <Input value={s.title} onChange={(e) => setS({ title: e.target.value })} />
              </Field>
              <Field label="Текст">
                <Textarea value={s.text} onChange={(v) => setS({ text: v })} rows={2} />
              </Field>
            </>
          )}
        />
      </Section>

      <Section title="Вопросы и ответы" hint="Блок «Коротко о главном» на главной.">
        <Repeater
          items={d.faq}
          onChange={(faq) => set({ faq })}
          blank={() => ({ q: "", a: "" })}
          addLabel="Добавить вопрос"
          render={(f, setF) => (
            <>
              <Field label="Вопрос">
                <Input value={f.q} onChange={(e) => setF({ q: e.target.value })} />
              </Field>
              <Field label="Ответ">
                <Textarea value={f.a} onChange={(v) => setF({ a: v })} rows={3} />
              </Field>
            </>
          )}
        />
      </Section>
      {bar}
    </div>
  );
}

export function GalleryTab() {
  const { notify } = useAdmin();
  const { draft: d, set, bar } = useSiteDraft();
  const [uploading, setUploading] = useState(0);
  const inputId = useId();

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setUploading(list.length);
    const added: SiteInput["gallery"] = [];
    for (const f of list) {
      try {
        added.push({ src: await uploadPhoto(f, "gallery", "event"), alt: "" });
      } catch (e) {
        notify(e instanceof Error ? e.message : "Не получилось загрузить фото", true);
      }
      setUploading((n) => n - 1);
    }
    // Новые фото — в начало галереи; сохраняются вместе с остальными изменениями.
    if (added.length) set((cur) => ({ gallery: [...added, ...cur.gallery] }));
  };

  const g = d.gallery;
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= g.length) return;
    const next = [...g];
    [next[i], next[j]] = [next[j], next[i]];
    set({ gallery: next });
  };
  const setItem = (i: number, patch: Partial<SiteInput["gallery"][number]>) => set({ gallery: g.map((x, k) => (k === i ? { ...x, ...patch } : x)) });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Section title="Фото с праздников" hint="Галерея на главной. Порядок — как здесь. После загрузки не забудьте «Сохранить».">
        <label htmlFor={inputId} className={`btn btn-soft cursor-pointer self-start ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {uploading ? `Загружаем… осталось ${uploading}` : "Загрузить фото"}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {g.map((it, i) => (
            <li key={`${it.src}-${i}`} className="flex gap-3 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
              <span className="relative block aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-rasp-100">
                <Image src={it.src} alt="" fill sizes="96px" className="object-cover" unoptimized={it.src.startsWith("/media/")} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input value={it.alt} onChange={(e) => setItem(i, { alt: e.target.value })} placeholder="Подпись: что на фото" className="!h-10 !text-[15px]" />
                <Input value={it.tag ?? ""} onChange={(e) => setItem(i, { tag: e.target.value || undefined })} placeholder="Метка (необязательно)" className="!h-10 !text-[15px]" />
                <div className="flex items-center">
                  <span className="mr-auto text-[12px] font-bold text-ink-soft">№ {i + 1}</span>
                  <IconBtn label="Выше" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp size={18} />
                  </IconBtn>
                  <IconBtn label="Ниже" onClick={() => move(i, 1)} disabled={i === g.length - 1}>
                    <ArrowDown size={18} />
                  </IconBtn>
                  <IconBtn label="Убрать из галереи" tone="danger" onClick={() => set({ gallery: g.filter((_, k) => k !== i) })}>
                    <Trash2 size={18} />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Отзывы" hint="Только настоящие отзывы — с Яндекс Карт или из переписки.">
        <div className="grid gap-4 sm:grid-cols-[100px_140px_1fr]">
          <Field label="Рейтинг">
            <Input value={d.yandexRating} onChange={(e) => set({ yandexRating: e.target.value })} placeholder="5.0" inputMode="decimal" />
          </Field>
          <Field label="Отзывов">
            <NumberInput value={d.yandexReviewsCount} onChange={(v) => set({ yandexReviewsCount: v ?? 0 })} />
          </Field>
          <Field label="Ссылка на отзывы">
            <Input value={d.yandexUrl} onChange={(e) => set({ yandexUrl: e.target.value })} inputMode="url" autoCapitalize="off" />
          </Field>
        </div>
        <Repeater
          items={d.reviews}
          onChange={(reviews) => set({ reviews })}
          blank={() => ({ name: "", date: "", text: "", source: "Яндекс Карты" })}
          addLabel="Добавить отзыв"
          render={(r, setR) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Имя">
                  <Input value={r.name} onChange={(e) => setR({ name: e.target.value })} placeholder="Анна К." />
                </Field>
                <Field label="Дата">
                  <Input value={r.date} onChange={(e) => setR({ date: e.target.value })} placeholder="7 апреля" />
                </Field>
              </div>
              <Field label="Откуда">
                <Input value={r.source} onChange={(e) => setR({ source: e.target.value })} />
              </Field>
              <Field label="Текст отзыва">
                <Textarea value={r.text} onChange={(v) => setR({ text: v })} rows={4} />
              </Field>
            </>
          )}
        />
      </Section>
      {bar}
    </div>
  );
}
