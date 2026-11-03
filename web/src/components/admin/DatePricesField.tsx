"use client";

import { useMemo } from "react";
import { parseDatePrices, rowDates, tableMin } from "@/data/date-prices";
import { money } from "@/lib/format";
import { Field, Textarea } from "./ui";

const HINT = (
  <>
    Для новогодних программ: цена зависит от даты. Первая строка — названия столбцов: <b>Даты | Стандарт | Премиум</b> (или <b>Даты | Цена</b>). Дальше строка на период:{" "}
    <b>1.12–13.12 | 11 000 | 16 100</b>; «—» — варианта на эти даты нет. 31 декабря по времени: <b>31.12 06:00–12:59 | — | 28 750</b>, окна по порядку, окно через полночь (23:00–00:59) и следующие —
    ночь на 1 января. Строки без «|» — условия под таблицей. Пусто — обычная цена.
  </>
);

/** «Цены по датам» в редакторе программы: текст-таблица и сразу под ним — как её понял сайт или где ошибка. */
export function DatePricesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = useMemo(() => (value.trim() ? parseDatePrices(value) : null), [value]);
  const t = parsed?.table;
  return (
    <Field label="Цены по датам" hint={HINT}>
      <Textarea value={value} onChange={onChange} rows={4} className="font-mono text-[14px]" spellCheck={false} />
      {parsed && !t && (
        <span className="mt-2 block rounded-lg border border-[#e0147a] bg-[#fff0f6] p-2 text-[13px] text-[#7e0f45]" role="alert">
          {parsed.errors.map((e) => (
            <span key={e} className="block">
              {e}
            </span>
          ))}
        </span>
      )}
      {t && (
        <span className="mt-2 block overflow-x-auto text-[13px]">
          <span className="mb-1 block text-ink-soft">На сайте: от {money(tableMin(t))}. Так поймёт таблицу сайт:</span>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b p-1 text-left">Даты</th>
                {t.cols.map((c) => (
                  <th key={c} className="border-b p-1 text-right">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr key={i}>
                  <td className="border-b p-1">
                    {rowDates(r)}
                    {r.window && ` · ${r.window.label}${r.window.night ? " (ночь на следующий день)" : ""}`}
                  </td>
                  {r.cells.map((c, j) => (
                    <td key={j} className="border-b p-1 text-right tabular-nums">
                      {c == null ? "—" : money(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {t.notes.length > 0 && <span className="mt-1 block text-ink-soft">Условия: {t.notes.join(" ")}</span>}
        </span>
      )}
    </Field>
  );
}
