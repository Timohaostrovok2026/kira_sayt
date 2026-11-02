"use client";

import { useEffect, useRef } from "react";
import { MKAD_BASE, MKAD_PER_KM, SOUND_PRICE } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { needsLoudSound } from "./lead";

/** Выезд за МКАД и усиленный звук — переключатели, как в черновике Кирилла. */
export function CartOptions() {
  const { state, ready, setForm } = useCart();
  const f = state.form;
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
    <div className="grid gap-3">
      <label className="opt-line" data-track="cart_mkad">
        <input type="checkbox" checked={f.outsideMkad} onChange={(e) => setForm({ outsideMkad: e.target.checked })} />
        <span>
          Праздник за МКАД
          <small>
            {money(MKAD_BASE)} за выезд + {money(MKAD_PER_KM)} за каждый км от МКАД
          </small>
        </span>
      </label>
      {f.outsideMkad && (
        <div className="f">
          <label htmlFor="lead-km">Расстояние от МКАД, км</label>
          <input
            id="lead-km"
            type="number"
            inputMode="numeric"
            min={0}
            max={300}
            placeholder="Например, 15"
            value={f.km ? String(f.km) : ""}
            onChange={(e) => setForm({ km: Math.min(300, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
          />
        </div>
      )}
      <label className="opt-line" data-track="cart_sound">
        <input type="checkbox" checked={f.sound} onChange={(e) => setForm({ sound: e.target.checked })} />
        <span>
          Усиленный звук +{money(SOUND_PRICE)}
          <small>
            {loud && f.sound
              ? "Включили сами: в заявке бумажное шоу, для него усиленный звук обязателен."
              : loud
                ? "В заявке бумажное шоу — без усиленного звука его не провести. Включите, пожалуйста."
                : "JBL PARTY BOX 110 и 2 микрофона. Нужен, если детей много или праздник на улице, и обязателен для бумажного шоу. Обычный звук входит в любой праздник."}
          </small>
        </span>
      </label>
    </div>
  );
}
