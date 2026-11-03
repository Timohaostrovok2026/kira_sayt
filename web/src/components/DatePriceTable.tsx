import { rowDates, splitCols, type PriceRow, type PriceTable } from "@/data/date-prices";
import { money } from "@/lib/format";

function when(r: PriceRow) {
  if (!r.window) return rowDates(r);
  return r.window.night ? `Ночь на 1 января, ${r.window.label}` : `${rowDates(r)}, ${r.window.label}`;
}

function Table({ t, cols, caption }: { t: PriceTable; cols: number[]; caption?: string }) {
  const rows = t.rows.filter((r) => cols.some((i) => r.cells[i] != null));
  const head = splitCols(t.cols);
  return (
    <table className="ptable">
      {caption && <caption>{caption}</caption>}
      {cols.length > 1 && (
        <thead>
          <tr>
            <th scope="col">Даты</th>
            {cols.map((i) => (
              <th key={i} scope="col">
                {head ? t.cols[i].split(/\s*,\s*/)[0] : t.cols[i]}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, k) => (
          <tr key={k}>
            <td>{when(r)}</td>
            {cols.map((i) => (
              <td key={i} className={r.cells[i] == null ? "na" : "num"}>
                {r.cells[i] == null ? "—" : money(r.cells[i]!)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * «Цены по датам» на странице новогодней программы (вариант А): строки дат, столбцы вариантов, условия под таблицей.
 * Столбцы «Стандарт, 30 мин | Премиум, 30 мин | …» — отдельная таблица на каждую длительность (на телефоне четыре столбца не влезут).
 */
export function DatePriceTable({ t }: { t: PriceTable }) {
  const sp = splitCols(t.cols);
  return (
    <>
      <h2 style={{ marginTop: 30 }}>Цены по датам</h2>
      {sp ? (
        sp.b.map((b) => (
          <Table
            key={b}
            t={t}
            caption={b}
            cols={t.cols.map((c, i) => (c.split(/\s*,\s*/)[1] === b ? i : -1)).filter((i) => i >= 0)}
          />
        ))
      ) : (
        <Table t={t} cols={t.cols.map((_, i) => i)} />
      )}
      {t.notes.length > 0 && (
        <ul className="pnotes">
          {t.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
