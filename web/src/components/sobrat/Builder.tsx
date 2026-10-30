"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AGE_GROUPS, ageFits, type AgeGroupId, type Kind } from "@/data/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { currentSeason } from "@/data/site";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/track";
import { STEPS, parseAge, parseKind, parseStep, type StepN } from "./model";
import { StepTabs } from "./StepTabs";
import { SummaryBar, SummaryPanel } from "./Summary";
import { AgeStep, DoneStep, ExtrasStep, ProgramStep, ShowStep } from "./steps";

/**
 * Конструктор праздника. Шаг, возраст и вид программы живут в URL (?step=2&age=4-6&kind=Квест),
 * поэтому работают «Назад» и прямые ссылки с главной. Должен быть внутри <Suspense> (useSearchParams).
 */
export function Builder() {
  const sp = useSearchParams();
  const { programs, programById, extraById } = useCatalog();
  const age = parseAge(sp.get("age"));
  const rawKind = parseKind(sp.get("kind"));
  // Вид из ссылки учитываем, только если для возраста есть такие программы.
  const kind = rawKind && programs.some((p) => p.kind === rawKind && ageFits(p, age)) ? rawKind : null;
  const step = parseStep(sp.get("step"), age || rawKind ? 2 : 1);

  const season = useMemo(() => currentSeason(), []);
  const { state } = useCart();
  const program = state.programs[0] ? (programById[state.programs[0]] ?? null) : null;
  const topRef = useRef<HTMLDivElement>(null);

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
      requestAnimationFrame(() => {
        const el = topRef.current;
        if (el && el.getBoundingClientRect().top < 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [setQuery],
  );

  const chooseAge = useCallback(
    (a: AgeGroupId | null) => {
      track("builder_age", { age: a ?? "skip" });
      goStep(2, { age: a });
    },
    [goStep],
  );

  const chooseKind = useCallback((k: Kind | null) => setQuery({ kind: k, step: "2" }, false), [setQuery]);

  const next = useCallback(() => {
    if (step < 5) goStep((step + 1) as StepN);
  }, [step, goStep]);

  useEffect(() => {
    track("builder_step", { step });
  }, [step]);

  const extrasOn = Object.entries(state.extras).filter(([, q]) => q > 0).map(([id]) => extraById[id]).filter(Boolean);
  const done: Record<StepN, boolean> = {
    1: !!age,
    2: state.programs.length > 0 || state.packages.length > 0,
    3: extrasOn.some((e) => e?.group === "Шоу"),
    4: extrasOn.some((e) => e && e.group !== "Шоу"),
    5: false,
  };

  const meta = STEPS[step - 1];
  const ageLabel = AGE_GROUPS.find((g) => g.id === age)?.label;

  return (
    <div ref={topRef} className="scroll-mt-[var(--header-h)]">
      <StepTabs step={step} done={done} onStep={(n) => goStep(n)} />
      <div className="wrap grid gap-8 pt-6 pb-32 md:pt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-20">
        <div className="min-w-0">
          <header key={`h${step}`} className="mb-6 animate-rise">
            <p className="eyebrow mb-2 text-rasp-600">
              Шаг {step} из 5{step > 1 && ageLabel ? ` · ${ageLabel}` : ""}
            </p>
            <h2 className="font-display text-[28px] font-bold leading-[1.1] tracking-tight md:text-[40px]">{meta.title}</h2>
            <p className="mt-2 text-ink-soft">{meta.text}</p>
          </header>
          <div key={step} className="animate-rise [animation-delay:60ms]">
            {step === 1 && <AgeStep age={age} onAge={chooseAge} />}
            {step === 2 && <ProgramStep age={age} kind={kind} season={season} onKind={chooseKind} />}
            {step === 3 && <ShowStep age={age} program={program} onStep={goStep} />}
            {step === 4 && <ExtrasStep age={age} program={program} />}
            {step === 5 && <DoneStep onStep={goStep} />}
          </div>
        </div>
        <SummaryPanel step={step} onNext={next} />
      </div>
      <SummaryBar step={step} onNext={next} />
    </div>
  );
}
