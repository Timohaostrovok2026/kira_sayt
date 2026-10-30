"use client";

import { useEffect, useRef } from "react";
import { MapPin, TriangleAlert, Volume2 } from "lucide-react";
import { MKAD_BASE, MKAD_PER_KM, SOUND_PRICE } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { needsLoudSound } from "./lead";

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${on ? "bg-rasp-500" : "bg-ink/15"}`}
    >
      <span
        className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : ""}`}
      />
    </span>
  );
}

export function CartOptions() {
  const { state, ready, setForm } = useCart();
  const f = state.form;
  const km = Math.max(0, f.km || 0);
  const loud = needsLoudSound(state, useCatalog());

  // Бумажное шоу без усиленного звука не провести — включаем сами, один раз, когда оно появилось в корзине.
  const autoOn = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!loud) {
      autoOn.current = false;
      return;
    }
    if (!autoOn.current) {
      autoOn.current = true;
      if (!f.sound) setForm({ sound: true });
    }
  }, [ready, loud, f.sound, setForm]);

  return (
    <section aria-labelledby="opts" className="flex flex-col gap-2">
      <h2 id="opts" className="px-1 font-display text-[18px] font-semibold">
        Опции
      </h2>

      {/* За МКАД */}
      <div className="card overflow-hidden">
        <button
          type="button"
          role="switch"
          aria-checked={f.outsideMkad}
          onClick={() => setForm({ outsideMkad: !f.outsideMkad })}
          data-track="cart_mkad"
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rasp-100 text-rasp-600">
            <MapPin size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold leading-tight">Праздник за МКАД</span>
            <span className="mt-0.5 block text-[14px] text-ink-soft">
              {money(MKAD_BASE)} + {money(MKAD_PER_KM)}/км
            </span>
          </span>
          <Switch on={f.outsideMkad} />
        </button>
        {f.outsideMkad && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-rasp-50/60 p-4">
            <label htmlFor="km" className="text-[15px] font-semibold">
              Км от МКАД
            </label>
            <input
              id="km"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={300}
              enterKeyHint="done"
              value={f.km ? String(f.km) : ""}
              placeholder="0"
              onChange={(e) => {
                const n = Math.min(300, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                setForm({ km: n });
              }}
              className="h-12 w-24 rounded-xl bg-white px-3 text-center text-[18px] font-bold tabular-nums ring-1 ring-line outline-none focus:ring-2 focus:ring-rasp-400"
            />
            <span className="ml-auto text-right text-[14px] text-ink-soft">
              <span className="tabular-nums">
                {money(MKAD_BASE)} + {km} × {money(MKAD_PER_KM)}
              </span>
              <span className="price block text-[20px] text-ink">{money(MKAD_BASE + MKAD_PER_KM * km)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Звук */}
      <div className="card overflow-hidden">
        <button
          type="button"
          role="switch"
          aria-checked={f.sound}
          onClick={() => setForm({ sound: !f.sound })}
          data-track="cart_sound"
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rasp-100 text-rasp-600">
            <Volume2 size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold leading-tight">Усиленный звук +{money(SOUND_PRICE)}</span>
            <span className="mt-0.5 block text-[14px] leading-snug text-ink-soft">
              JBL PartyBox 110 и 2 микрофона. Нужен, если детей много или праздник на улице
            </span>
          </span>
          <Switch on={f.sound} />
        </button>
        {loud && (
          <p
            className={`flex items-start gap-2 border-t px-4 py-3 text-[14px] leading-snug ${
              f.sound ? "border-line bg-rasp-50/60 text-ink-soft" : "border-rasp-200 bg-rasp-100 font-semibold text-rasp-800"
            }`}
          >
            <TriangleAlert size={18} className="mt-px shrink-0 text-rasp-500" />
            {f.sound
              ? "Включили сами: в корзине бумажное шоу, для него усиленный звук обязателен."
              : "В корзине бумажное шоу — без усиленного звука его не провести. Включите, пожалуйста."}
          </p>
        )}
      </div>
    </section>
  );
}
