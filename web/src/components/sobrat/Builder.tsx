"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AGE_GROUPS, MKAD_BASE, MKAD_PER_KM, SITE_KINDS, SOUND_PRICE, SPECIAL_EXTRAS, ageFits, type AgeGroupId, type Extra, type Kind } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { LINE_GROUPS, useCart, useRemoveLine } from "@/lib/cart";
import { money, plural } from "@/lib/format";
import { track } from "@/lib/track";
import { ExtraCard, ProgramCard } from "@/components/cards";
import { DOP_GROUPS, STEPS, parseAge, parseGroup, parseKind, parseStep, type StepN } from "./model";

const AGE_TILE = ["wa1", "wa2", "wa3", "wa4"];
const MEMO = (
  <div className="memo">
    <h3>Памятка к любой программе</h3>
    <p>
      <b>Звук.</b> Обычный звук входит в любой праздник. Усиленный (JBL PARTY BOX 110 и 2 микрофона) стоит +{money(SOUND_PRICE)}. Он нужен, если детей много или праздник на
      улице, и обязателен для бумажного шоу.
    </p>
    <p>
      <b>Выезд за МКАД.</b> {money(MKAD_BASE)} за выезд и {money(MKAD_PER_KM)} за каждый км от МКАД.
    </p>
  </div>
);

function StepHead({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="stephd">
      <span className="sn">{n}</span>
      <div>
        <h2 className="display">{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

/** Шаг 6: что выбрано, по группам, с суммой. */
function Recap({ onStep }: { onStep: (n: StepN) => void }) {
  const { lines, total } = useCart();
  const remove = useRemoveLine();
  const items = lines.filter((l) => l.type !== "mkad" && l.type !== "sound");
  if (!items.length)
    return (
      <div className="rc-empty">
        <p>Пока ничего не выбрано. Вернитесь на шаг «Программа» или возьмите готовый пакет со скидкой.</p>
        <div className="rc-btns">
          <button className="pill pill--hot pulse pulse--h" type="button" onClick={() => onStep(2)}>
            Выбрать программу
          </button>
          <Link className="pill pill--ghost" href="/pakety" data-track="builder_to_packages">
            Готовые пакеты
          </Link>
        </div>
      </div>
    );
  return (
    <>
      {LINE_GROUPS.map(({ type: t, title }) => {
        const ls = items.filter((l) => l.type === t);
        if (!ls.length) return null;
        return (
          <div key={t}>
            <h3 className="cg">
              {title} <small>{ls.length}</small>
            </h3>
            <div className="rcl">
              {ls.map((l) => (
                <div className="rci" key={l.key}>
                  <div className="t">
                    {l.title}
                    {l.qty > 1 ? ` × ${l.qty}` : ""}
                    {l.subtitle && <small>{l.subtitle}</small>}
                  </div>
                  <div className="p num">{l.price ? money(l.price) : ""}</div>
                  <button className="rmx" type="button" aria-label="Убрать" onClick={() => remove(l)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="rcsum">
        <span>Ориентировочно</span>
        <b className="num">{money(total)}</b>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        Цена ориентировочная. Точную сумму подтвердим после заявки. Выезд за МКАД и усиленный звук добавляются в заявке.
      </p>
      <div className="sum" style={{ marginTop: 14 }}>
        <div>
          Комплект персонажей пришлёт менеджер
          <small>После заявки покажем героев и образы, вы выберете своё.</small>
        </div>
      </div>
    </>
  );
}

/**
 * Конструктор по шагам (черновик Кирилла v11): Возраст → Программа → Шоу → МК → Допы → Готово.
 * Шаг, возраст, вид программы и раздел допов живут в URL (?step=2&age=4-6&kind=Квест) — работают «Назад» и ссылки с главной.
 * Должен быть внутри <Suspense> (useSearchParams).
 */
export function Builder() {
  const sp = useSearchParams();
  const { programs, extras, packages } = useCatalog();
  // Скидки пакетов правит Кирилл в админке — обещание «до N%» берём из каталога.
  const maxDisc = Math.max(0, ...packages.map((k) => k.disc ?? 0));
  const age = parseAge(sp.get("age"));
  const kind = parseKind(sp.get("kind"));
  const xg = parseGroup(sp.get("xg"));
  const step = parseStep(sp.get("step"), age || kind ? 2 : 1);

  const setQuery = useCallback((patch: Record<string, string | null>, push = true) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  const goStep = useCallback(
    (n: StepN, extra: Record<string, string | null> = {}) => {
      setQuery({ step: String(n), ...extra });
      window.scrollTo({ top: 0 });
    },
    [setQuery],
  );

  useEffect(() => {
    track("builder_step", { step });
  }, [step]);

  const chooseAge = (a: AgeGroupId | null) => {
    track("builder_age", { age: a ?? "skip" });
    goStep(2, { age: a, kind: null });
  };

  const list = programs.filter((p) => (!kind || p.kind === kind) && ageFits(p, age));
  const pool = extras.filter((e) => !SPECIAL_EXTRAS.has(e.id) && ageFits(e, age));
  const grid = (xs: Extra[]) => (
    <div className="cards">
      {xs.map((e) => (
        <ExtraCard key={e.id} e={e} />
      ))}
    </div>
  );

  let body;
  if (step === 1) {
    body = (
      <>
        <StepHead n={1} title="Сколько лет ребёнку?" text="Покажем только то, что подходит по возрасту." />
        <div className="agetiles">
          {AGE_GROUPS.map((g, i) => {
            const c = programs.filter((p) => ageFits(p, g.id)).length;
            return (
              <button key={g.id} type="button" className={`agetile ${AGE_TILE[i]}`} onClick={() => chooseAge(g.id)} data-track={`builder_age_${g.id}`}>
                <b>{g.label.replace(/ (года|лет)$/, "")}</b>
                <span>{i === 0 ? "года" : "лет"}</span>
                <small>
                  {c} {plural(c, "программа", "программы", "программ")}
                </small>
              </button>
            );
          })}
        </div>
        <div className="cta-center">
          <button className="pill pill--ghost" type="button" onClick={() => chooseAge(null)} data-track="builder_age_skip">
            Любой возраст, показать всё
          </button>
        </div>
      </>
    );
  } else if (step === 2) {
    body = (
      <>
        <StepHead n={2} title="Выберите программу" text="Это основа праздника. Комплект персонажей пришлёт менеджер." />
        <div className="filters" role="group" aria-label="Возраст ребёнка">
          <span className="lbl">Возраст</span>
          <button className="fchip" type="button" aria-pressed={!age} onClick={() => setQuery({ age: null }, false)}>
            Любой
          </button>
          {AGE_GROUPS.map((g) => (
            <button key={g.id} className="fchip" type="button" aria-pressed={age === g.id} onClick={() => setQuery({ age: g.id }, false)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="filters" role="group" aria-label="Формат">
          <span className="lbl">Формат</span>
          <button className="fchip" type="button" aria-pressed={!kind} onClick={() => setQuery({ kind: null }, false)}>
            Все
          </button>
          {SITE_KINDS.filter((k) => programs.some((p) => p.kind === k.id)).map((k) => (
            <button key={k.id} className="fchip" type="button" aria-pressed={kind === k.id} onClick={() => setQuery({ kind: k.id as Kind }, false)}>
              {k.title}
            </button>
          ))}
        </div>
        <p className="count" aria-live="polite">
          Найдено: {list.length}
        </p>
        {list.length ? (
          <div className="cards">
            {list.map((p) => (
              <ProgramCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="empty">По этим условиям программ нет. Сбросьте возраст или формат, или напишите нам: подберём вручную.</p>
        )}
        <Link className="packsban" href="/pakety" data-track="builder_to_packages">
          <b>Не хотите собирать?</b>
          <span>{maxDisc ? `Готовые пакеты со скидкой до ${maxDisc}%` : "Готовые пакеты: всё уже подобрано"}</span>
          <i aria-hidden="true">→</i>
        </Link>
      </>
    );
  } else if (step === 3) {
    const shows = pool.filter((e) => e.group === "Шоу");
    body = (
      <>
        <StepHead n={3} title="Добавьте шоу" text="Шоу запоминается надолго. Цена указана за единицу." />
        {shows.length ? grid(shows) : <p className="empty">Для этого возраста шоу нет. Сбросьте возраст.</p>}
      </>
    );
  } else if (step === 4) {
    const mks = pool.filter((e) => e.group === "Мастер-классы");
    body = (
      <>
        <StepHead n={4} title="Мастер-классы" text="Дети сами делают подарок на память. Цена указана за единицу. Этот шаг можно пропустить." />
        {mks.length ? grid(mks) : <p className="empty">Для этого возраста мастер-классов нет. Нажмите «Дальше».</p>}
      </>
    );
  } else if (step === 5) {
    const groups = DOP_GROUPS.filter((g) => pool.some((e) => e.group === g));
    const shown = groups.filter((g) => !xg || g === xg);
    body = (
      <>
        <StepHead n={5} title="Допы" text="Подарки, съёмка и опции." />
        <div className="filters" role="group" aria-label="Раздел допов">
          <span className="lbl">Раздел</span>
          <button className="fchip" type="button" aria-pressed={!xg} onClick={() => setQuery({ xg: null }, false)}>
            Все
          </button>
          {groups.map((g) => (
            <button key={g} className="fchip" type="button" aria-pressed={xg === g} onClick={() => setQuery({ xg: g }, false)}>
              {g}
            </button>
          ))}
        </div>
        {shown.map((g) => (
          <div className="xgroup" key={g}>
            <h3>{g}</h3>
            {grid(pool.filter((e) => e.group === g))}
          </div>
        ))}
        {MEMO}
      </>
    );
  } else {
    body = (
      <>
        <StepHead n={6} title="Ваш праздник" text="Проверьте выбор. Дальше останется оставить телефон." />
        <Recap onStep={goStep} />
      </>
    );
  }

  return (
    <section className="sec sec--blush" style={{ paddingTop: 8 }}>
      <div className="wrap">
        <nav className="wz" aria-label="Шаги конструктора">
          {STEPS.map((s) => {
            const c = s.n < step ? "done" : s.n === step ? "cur" : s.n === step + 1 ? "nxt" : "";
            return (
              <button key={s.n} type="button" className={`wzs ${c}`} aria-current={s.n === step ? "step" : undefined} onClick={() => goStep(s.n)}>
                {c === "nxt" && (
                  <span className="wza" aria-hidden="true">
                    <b>›</b>
                    <b>›</b>
                    <b>›</b>
                  </span>
                )}
                <i>{s.n < step ? "✓" : s.n}</i>
                <span>{s.tab}</span>
              </button>
            );
          })}
        </nav>
        {body}
        <div className="wznav">
          {step > 1 ? (
            <button className="pill pill--ghost" type="button" onClick={() => goStep((step - 1) as StepN)}>
              ← Назад
            </button>
          ) : (
            <span />
          )}
          {step === 6 ? (
            <Link className="pill pill--lime" href="/korzina" data-track="builder_checkout">
              Оформить заявку
            </Link>
          ) : (
            // Без пульсации (владелец, 02.11): «перегружает дизайн».
            <button className="pill pill--hot" type="button" onClick={() => goStep((step + 1) as StepN)} data-track={`builder_next_${step}`}>
              {step === 5 ? "Готово" : "Дальше"} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
