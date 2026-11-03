"use client";

import { useEffect } from "react";
import { MKAD_BASE, MKAD_PER_KM, OUTDOOR_PRICE, SOUND_PRICE } from "@/data/catalog";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog-context";
import { money } from "@/lib/format";
import { needsLoudSound } from "./lead";

/** Выезд за МКАД, праздник на улице (новогодние программы) и усиленный звук — переключатели, как в черновике Кирилла. */
export function CartOptions() {
  const { state, ready, setForm } = useCart();
  const f = state.form;
  const cat = useCatalog();
  const loud = needsLoudSound(state, cat);
  // «На улице» — только новогодние программы (раунд 33): переключатель виден, когда такая программа в заявке.
  const outdoor = state.programs.filter((id) => cat.programById[id] && OUTDOOR_PRICE[id]);
  const outdoorSum = outdoor.reduce((s, id) => s + OUTDOOR_PRICE[id], 0);

  // Бумажное шоу без усиленного звука не провести — включаем сами, один раз, когда оно появилось в корзине.
  // Флаг — в корзине, а не в компоненте: иначе после возврата на страницу звук включался снова.
  useEffect(() => {
    if (!ready) return;
    if (!loud) {
      if (f.soundAuto) setForm({ soundAuto: false });
      return;
    }
    if (!f.soundAuto) setForm(f.sound ? { soundAuto: true } : { sound: true, soundAuto: true });
  }, [ready, loud, f.sound, f.soundAuto, setForm]);

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
      {outdoor.length > 0 && (
        <label className="opt-line" data-track="cart_outdoor">
          <input type="checkbox" checked={f.outdoor} onChange={(e) => setForm({ outdoor: e.target.checked })} />
          <span>
            Праздник на улице +{money(outdoorSum)}
            <small>Зимой — {money(2000)} за каждый начатый час на каждого артиста: {outdoor.map((id) => `${cat.programById[id].name} — ${money(OUTDOOR_PRICE[id])}`).join(", ")}.</small>
          </span>
        </label>
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
