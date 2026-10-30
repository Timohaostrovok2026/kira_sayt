"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { AdminResult } from "@/app/admin/actions";
import type { ContentAll } from "@/lib/content/store";
import { uploadPhoto, type MediaKind } from "./upload";

/* ---------- Состояние админки ---------- */

export interface AdminApi {
  data: ContentAll;
  /** Выполнить серверное действие: при успехе — новые данные и всплывашка, при ошибке — красная всплывашка. */
  apply: (p: Promise<AdminResult>, okText?: string) => Promise<AdminResult>;
  notify: (text: string, error?: boolean) => void;
}

export const AdminCtx = createContext<AdminApi | null>(null);

export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin outside AdminApp");
  return c;
}

/* ---------- Поля формы ---------- */

export const inputCls =
  "w-full rounded-2xl border-[1.5px] border-line bg-white px-4 text-[17px] text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-rasp-400";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[14px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] leading-snug text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} h-12 ${props.className ?? ""}`} />;
}

export function NumberInput({ value, onChange, ...rest }: { value: number | null | undefined; onChange: (v: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d]/g, "");
        onChange(v === "" ? null : Number(v));
      }}
    />
  );
}

/** Textarea, которая растёт по содержимому — удобно на телефоне. */
export function Textarea({ value, onChange, rows = 3, ...rest }: { value: string; onChange: (v: string) => void; rows?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`;
  }, [value]);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-y py-3 leading-snug ${rest.className ?? ""}`}
    />
  );
}

export function Select({ value, onChange, children, className = "" }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} h-12 appearance-none bg-[length:20px] pr-10 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236c4a55' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
    >
      {children}
    </select>
  );
}

export function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-line">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-ink-soft">{hint}</span>}
      </span>
      <span aria-hidden className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${on ? "bg-rasp-500" : "bg-ink/15"}`}>
        <span className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

/* ---------- Фото ---------- */

/** Превью + загрузка. aspect: соотношение сторон превью (3/4 для героев, 16/10 для шоу). */
export function PhotoField({
  value,
  onChange,
  kind,
  prefix,
  aspect = "3/4",
  fallback,
  label = "Фото",
  hint,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  kind: MediaKind;
  prefix: string;
  aspect?: string;
  /** Что показывается на сайте, если своего фото нет. */
  fallback?: string;
  label?: string;
  hint?: ReactNode;
}) {
  const { notify } = useAdmin();
  const [busy, setBusy] = useState(false);
  const id = useId();
  const shown = value || fallback;
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadPhoto(f, kind, prefix));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Не получилось загрузить фото", true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <span className="mb-1.5 block text-[14px] font-semibold">{label}</span>
      <div className="flex items-end gap-4">
        <div className="relative w-32 shrink-0 overflow-hidden rounded-2xl bg-rasp-900 ring-1 ring-line sm:w-40" style={{ aspectRatio: aspect }}>
          {shown ? (
            <Image src={shown} alt="" fill sizes="160px" className="object-cover" unoptimized={shown.startsWith("/media/")} />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-rasp-50 text-rasp-300">
              <ImagePlus size={32} />
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
              <Loader2 size={28} className="animate-spin" />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={id} className={`btn btn-sm btn-soft cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <ImagePlus size={18} /> {value ? "Заменить" : "Загрузить"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {value && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(undefined)}>
              <X size={18} /> Убрать
            </button>
          )}
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

/* ---------- Списки в формах ---------- */

/** Повторяющиеся блоки (FAQ, цифры, отзывы): добавить, удалить, поднять/опустить. */
export function Repeater<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  addLabel: string;
  render: (item: T, set: (patch: Partial<T>) => void, i: number) => ReactNode;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl bg-paper p-3 ring-1 ring-line">
          <div className="mb-2 flex items-center gap-1">
            <span className="mr-auto text-[13px] font-bold text-ink-soft">№ {i + 1}</span>
            <IconBtn label="Выше" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp size={18} />
            </IconBtn>
            <IconBtn label="Ниже" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
              <ArrowDown size={18} />
            </IconBtn>
            <IconBtn label="Удалить" onClick={() => onChange(items.filter((_, k) => k !== i))}>
              <Trash2 size={18} />
            </IconBtn>
          </div>
          <div className="flex flex-col gap-3">{render(it, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))), i)}</div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-soft self-start" onClick={() => onChange([...items, blank()])}>
        <Plus size={18} /> {addLabel}
      </button>
    </div>
  );
}

export function IconBtn({ label, onClick, disabled, children, tone = "plain" }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; tone?: "plain" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-25 ${
        tone === "danger" ? "text-rasp-600 hover:bg-rasp-50" : "text-ink-soft hover:bg-rasp-50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Лист редактирования ---------- */

/** Полноэкранный лист на телефоне, панель справа на компьютере. */
export function Sheet({ title, onClose, children, footer, aside }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; aside?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full animate-rise flex-col bg-paper shadow-2xl md:max-w-[620px] md:rounded-l-[28px]"
      >
        <header className="flex min-h-16 items-center gap-2 border-b border-line px-4 py-2 md:px-6">
          <h2 className="min-w-0 flex-1 truncate font-display text-[19px] font-semibold">{title}</h2>
          {aside}
          <IconBtn label="Закрыть" onClick={onClose}>
            <X size={22} />
          </IconBtn>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">{children}</div>
        <footer className="border-t border-line bg-white/80 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur md:px-6">{footer}</footer>
      </div>
    </div>
  );
}

export function Section({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-4 md:p-5">
      <h3 className="h-card text-[18px]">{title}</h3>
      {hint && <p className="mt-1 text-[14px] text-ink-soft">{hint}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}
