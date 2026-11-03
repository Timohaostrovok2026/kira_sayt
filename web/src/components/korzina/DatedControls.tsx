"use client";

import { LETTER } from "@/data/catalog";
import { splitCols } from "@/data/date-prices";
import { useCart, type CartLine } from "@/lib/cart";
import { money } from "@/lib/format";

/** Цена строки заявки: «от 11 000 ₽», «укажет менеджер» или точная. Ноль без пометки (герой) — пусто. */
export function LinePrice({ l }: { l: CartLine }) {
  if (l.mode === "manager") return <small className="li-mgr">укажет менеджер</small>;
  if (!l.price) return null;
  return <>{l.mode === "from" ? `от ${money(l.price)}` : money(l.price)}</>;
}

/** Прокрутка к полю даты в форме заявки — «Укажите дату — посчитаем точно». */
function focusDate() {
  const el = document.getElementById("lead-date");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  (el as HTMLInputElement | null)?.focus({ preventScroll: true });
}

function Seg({ items, value, off, onPick, label }: { items: string[]; value: string; off: Set<string>; onPick: (v: string) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((x) => (
        <button key={x} type="button" aria-pressed={x === value} disabled={off.has(x)} onClick={() => onPick(x)}>
          {x}
        </button>
      ))}
    </div>
  );
}

/**
 * Выбор у новогодней программы прямо в строке заявки (вариант А, раунды 29–33):
 * Стандарт/Премиум и 30 мин/1 час, время приезда 31 декабря, число писем. Цена строки пересчитывается сразу.
 */
export function DatedControls({ l }: { l: CartLine }) {
  const { state, setProgramOpts } = useCart();
  const d = l.dated;
  if (!d) return null;
  const { cols } = d;
  const sp = splitCols(cols);
  const want = cols[d.want];
  const offCols = new Set(d.off.map((i) => cols[i]));
  const set = (patch: Parameters<typeof setProgramOpts>[1]) => setProgramOpts(l.id, patch);
  const noDate = !state.form.date;
  // Стандарт неактивен, если на дату его нет ни в какой длительности; выбранная длительность — та, по которой считаем.
  const [wa, wb] = sp ? want.split(/\s*,\s*/) : [want, ""];
  const shownB = sp ? cols[d.col].split(/\s*,\s*/)[1] : "";

  return (
    <div className="dated">
      {sp ? (
        <>
          <Seg
            label="Костюмы"
            items={sp.a}
            value={cols[d.col].split(/\s*,\s*/)[0]}
            off={new Set(sp.a.filter((a) => sp.b.every((b) => offCols.has(`${a}, ${b}`))))}
            onPick={(a) => set({ col: `${a}, ${wb}` })}
          />
          <Seg label="Длительность" items={sp.b} value={shownB} off={new Set()} onPick={(b) => set({ col: `${wa}, ${b}` })} />
        </>
      ) : (
        cols.length > 1 && <Seg label="Вариант" items={cols} value={cols[d.col]} off={offCols} onPick={(c) => set({ col: c })} />
      )}

      {d.windows.length > 0 && (
        <label className="dsel">
          <span>Время приезда</span>
          <select value={d.slot ?? ""} onChange={(e) => set({ slot: e.target.value || undefined })}>
            <option value="">{d.nightOnly ? "Днём — цену укажет менеджер" : "Выберите время"}</option>
            {d.windows.map((w, i) => (
              <option key={w.label} value={w.label}>
                {w.night ? "Ночь на 1 января, " : ""}
                {w.label}
                {d.windowPrices[i] != null ? ` · ${money(d.windowPrices[i]!)}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {d.letters != null && (
        <div className="dsel">
          <span>Писем — по одному на ребёнка</span>
          <div className="qty" role="group" aria-label="Сколько писем">
            <button type="button" aria-label="Меньше" disabled={d.letters <= 1} onClick={() => set({ qty: d.letters! - 1 })}>
              −
            </button>
            <b className="num" aria-live="polite">
              {d.letters}
            </b>
            <button type="button" aria-label="Больше" disabled={d.letters >= LETTER.max} onClick={() => set({ qty: d.letters! + 1 })}>
              +
            </button>
          </div>
        </div>
      )}

      {/* «Укажет менеджер» уже написано на месте цены — второй раз не повторяем. */}
      {l.note && l.mode !== "manager" && (
        <p className={`dnote${l.note.startsWith("На эту дату") ? " dnote--hot" : ""}`}>
          {l.note}
          {noDate && (
            <>
              {" · "}
              <button type="button" className="dlink" onClick={focusDate}>
                Укажите дату — посчитаем точно
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
