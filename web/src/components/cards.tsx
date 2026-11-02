"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { KIND_CLASS, ageBig, ageText, lines, slotRef, splitHow, type Extra, type Package, type Program } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";
import { money } from "@/lib/format";

/**
 * Акцентное слово заголовка (Nauryz): как в черновике Кирилла — последнее слово из 4–9 букв.
 * Можно указать слово явно через accent.
 */
export function accentTitle(title: string, accent?: string): ReactNode {
  const words = title.split(" ");
  let pick = accent ? words.indexOf(accent) : -1;
  if (pick < 0 && !accent && words.length > 1) {
    words.forEach((w, i) => {
      const n = w.replace(/[^А-Яа-яЁё]/g, "").length;
      if (n >= 4 && n <= 9) pick = i;
    });
  }
  if (pick < 0) return title;
  return (
    <>
      {words.slice(0, pick).join(" ")}
      {pick > 0 && " "}
      <span className="ac">{words[pick]}</span>
      {pick < words.length - 1 && " "}
      {words.slice(pick + 1).join(" ")}
    </>
  );
}

/** Каждое предложение с новой строки — так короткие абзацы читаются в черновике Кирилла. */
export function bySentence(text: string): ReactNode {
  const parts = text.split(/(?<=[.!?…])\s+(?=[А-ЯЁA-Z«])/);
  return parts.map((s, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {s}
    </span>
  ));
}

/** Заголовок раздела: капс, акцентное слово, подзаголовок. */
export function SectionHead({ title, accent, lead, brace, as = "h2" }: { title: string; accent?: string; lead?: string; brace?: string; as?: "h1" | "h2" }) {
  const H = as;
  return (
    <header className="sec-head">
      {brace && <p className="brace">{brace}</p>}
      <H className="display h-lg">{accentTitle(title, accent)}</H>
      {lead && <p>{bySentence(lead)}</p>}
    </header>
  );
}

export function Stars() {
  return (
    <span className="stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className="st" />
      ))}
    </span>
  );
}

/** Программа: цветная обложка с крупным возрастом, описание, цена, «Подробнее» и «Выбрать». */
export function ProgramCard({ p }: { p: Program }) {
  const { has, toggleProgram } = useCart();
  const on = has("program", p.id);
  const href = `/programmy/${p.id}`;
  return (
    <article className="pcard">
      <Link href={href} className={`cover ${KIND_CLASS[p.kind] ?? "k-anim"}`} aria-label={`Открыть программу ${p.name}`} data-track={`program_open_${p.id}`}>
        <span className="tag">{p.kind}</span>
        <span className="ages">
          {ageBig(p)}
          <small>{p.a == null && p.b == null ? "возраст" : "лет"}</small>
        </span>
      </Link>
      <div className="pcard-body">
        <h3>
          <Link href={href}>{p.name}</Link>
        </h3>
        <p className="intro">{splitHow(p.how).intro}</p>
        <div className="meta">
          {p.dur && <span>{p.dur}</span>}
          {p.art && <span>{p.art}</span>}
        </div>
        <div className="card-foot">
          <div className="cost num">{money(p.price)}</div>
          <div className="btn-row">
            <Link className="pill pill--ghost pill--sm" href={href}>
              Подробнее
            </Link>
            <button className="pill pill--hot pill--sm" type="button" aria-pressed={on} onClick={() => toggleProgram(p.id)} data-track={`program_add_${p.id}`}>
              {on ? "В заявке" : "Выбрать"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Шоу, мастер-класс или доп: каждое нажатие «Добавить» — ещё одна штука, как в черновике. */
export function ExtraCard({ e }: { e: Extra }) {
  const { state, setExtra } = useCart();
  const qty = state.extras[e.id] ?? 0;
  const { intro, steps } = splitHow(e.how);
  const inc = lines(e.inc || steps.join("\n"));
  const age = e.a != null || e.b != null ? ageText(e) : "";
  return (
    <article className="xcard">
      <h4>{e.name}</h4>
      {intro && <p className="intro">{intro}</p>}
      {(e.dur || age) && (
        <div className="meta">
          {e.dur && <span>{e.dur}</span>}
          {age && <span>{age}</span>}
        </div>
      )}
      {inc.length > 0 && (
        <details>
          <summary>Что входит</summary>
          <ul className="checks">
            {inc.map((t, i) => (
              <li key={i}>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="card-foot">
        <div className="cost num">
          {money(e.price)}
          {e.unit && <small>{e.unit}</small>}
        </div>
        <button className="pill pill--hot pill--sm" type="button" onClick={() => setExtra(e.id, qty + 1)} data-track={`extra_add_${e.id}`}>
          {qty ? `В заявке: ${qty}` : "Добавить"}
        </button>
      </div>
    </article>
  );
}

/** Подпись слота пакета: квест, съёмка или шоу. */
function slotLabel(opts: string[], find: (id: string) => { kind: string; name: string } | undefined) {
  if (opts.every((r) => find(r)?.kind === "Квест")) return "Выберите квест";
  if (opts.some((r) => /Фотограф/.test(find(r)?.name ?? ""))) return "Фотограф или Reels: выберите одно";
  return "Выберите одно";
}

/**
 * Пакет: состав, варианты в слотах кнопками, цена со скидкой.
 * Пакет с выбором по умолчанию свёрнут — «Развернуть состав».
 */
export function PackageCard({ k }: { k: Package }) {
  const { state, addPackage, removePackage, setPackageChoices } = useCart();
  const { anyItem, packagePrice } = useCatalog();
  const inCart = state.packages.find((x) => x.id === k.id);
  const [own, setOwn] = useState<Record<number, string>>({});
  const choices = inCart?.choices ?? own;
  const [open, setOpen] = useState(false);

  if (k.custom) {
    return (
      <article className="pack">
        <h3>{k.name}</h3>
        {/* Тексты — из админки (tag и note), как у остальных пакетов. */}
        <p className="tagl">{k.tag}</p>
        {k.note && <p className="pnote">{k.note}</p>}
        <div className="pfoot">
          <div className="pprice">
            <b>Цена после обсуждения</b>
          </div>
          <button className="pill pill--lime" type="button" aria-pressed={!!inCart} onClick={() => (inCart ? removePackage(k.id) : addPackage(k.id))} data-track={`package_add_${k.id}`}>
            {inCart ? "В заявке ✓" : "Обсудить"}
          </button>
        </div>
      </article>
    );
  }

  const pick = (i: number, ref: string) => {
    const next = { ...choices, [i]: ref };
    if (inCart) setPackageChoices(k.id, next);
    else setOwn(next);
  };
  const pr = packagePrice(k, choices);
  const hasSlot = k.items.some((it) => it.alts && it.alts.length > 0);
  const dur = /длительность/i.test(k.note) ? `Длительность: ${k.note.replace(/\s*длительность\s*/i, "").trim()}` : k.note;
  return (
    <article className={`pack${hasSlot ? " pack--c" : ""}${open ? " open" : ""}`}>
      <span className="badge">{k.disc ? `Скидка ${k.disc}%` : "Пакет"}</span>
      <h3>{k.name}</h3>
      <p className="tagl">{k.tag}</p>
      {hasSlot && (
        <button className="pkx" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span>{open ? "Свернуть состав" : "Развернуть состав"}</span>
          <i aria-hidden="true">{open ? "▴" : "▾"}</i>
        </button>
      )}
      <div className="pbody">
        <div className="pitems">
          {k.items.map((it, i) => {
            if (it.alts && it.alts.length) {
              const opts = [it.ref, ...it.alts];
              const cur = slotRef(it, choices[i]);
              return (
                <div className="slot" key={i}>
                  <span className="lbl">{slotLabel(opts, anyItem)}</span>
                  <div className="opts">
                    {opts.map((r) => {
                      const e = anyItem(r);
                      if (!e) return null;
                      return (
                        <button key={r} className="opt" type="button" aria-pressed={cur === r} onClick={() => pick(i, r)} data-track={`package_slot_${k.id}`}>
                          <span>{e.name}</span>
                          <span>{money(e.price * (it.qty || 1))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            const e = anyItem(it.ref);
            if (!e) return null;
            return (
              <div className="pitem" key={i}>
                <span>
                  {e.name}
                  {it.qty > 1 ? ` × ${it.qty}` : ""}
                </span>
                <span>{money(e.price * (it.qty || 1))}</span>
              </div>
            );
          })}
        </div>
        {dur && <p className="pnote">{dur}</p>}
      </div>
      <div className="pfoot">
        <div className="pprice">
          <b className="num">{money(pr.price)}</b>
          {pr.save > 0 && <s className="num">{money(pr.full)}</s>}
        </div>
        {pr.save > 0 && <p className="pnote">Выгода: {money(pr.save)}</p>}
        <button
          className="pill pill--lime"
          type="button"
          aria-pressed={!!inCart}
          onClick={() => (inCart ? removePackage(k.id) : addPackage(k.id, choices))}
          data-track={`package_add_${k.id}`}
        >
          {inCart ? "В заявке ✓" : hasSlot ? "Добавить с выбором" : "Добавить пакет"}
        </button>
      </div>
    </article>
  );
}
