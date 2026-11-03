// Новогодние цены по датам (вариант А, раунды 29–33): разбор таблицы Кирилла и цена по дате, варианту и окну времени.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OTHER_SLOT, parseDatePrices, priceFor, rowDates, splitCols, tableMin, type PriceTable } from "./date-prices.ts";
import { NY_DATE_PRICES } from "./migrations.ts";
import { programTable } from "./catalog.ts";

const table = (id: string): PriceTable => {
  assert.deepEqual(parseDatePrices(NY_DATE_PRICES[id]).errors, [], id);
  return programTable(id, NY_DATE_PRICES[id])!;
};
const ded = table("p_ded");
const grinch = table("p_grinch1");
const letter = table("p_letter");
const show = table("p_grinch2");
const S30 = "Стандарт, 30 мин";
const P30 = "Премиум, 30 мин";
const S60 = "Стандарт, 1 час";
const P60 = "Премиум, 1 час";
const at = (t: PriceTable, date: string, col?: string, slot?: string) => priceFor(t, { date, col, slot });

test("все таблицы из презентаций разбираются, условия — под таблицей", () => {
  for (const id of Object.keys(NY_DATE_PRICES)) table(id);
  assert.equal(ded.cols.length, 4);
  assert.ok(ded.notes.includes("Стандарт — только до 22 декабря, дальше работает Премиум."));
  assert.deepEqual(splitCols(ded.cols), { a: ["Стандарт", "Премиум"], b: ["30 мин", "1 час"] });
  assert.equal(splitCols(grinch.cols), null);
});

test("наименьшая цена — для «от» на карточке", () => {
  assert.equal(tableMin(ded), 11000);
  assert.equal(tableMin(ded, 3), 25800, "Премиум на 1 час — от 25 800");
  assert.equal(tableMin(table("p_yaga")), 9900);
  assert.equal(tableMin(show), 40300);
});

test("границы периодов: 1.12, 13.12/14.12, 22.12/23.12, 30.12", () => {
  assert.equal(at(ded, "2026-12-01").price, 11000);
  assert.equal(at(ded, "2026-12-13").price, 11000);
  assert.equal(at(ded, "2026-12-14").price, 13200);
  assert.equal(at(ded, "2026-12-22").price, 16500);
  assert.equal(at(ded, "2026-12-30", P30).price, 29900);
  assert.equal(at(grinch, "2026-12-20").price, 14300);
  assert.equal(at(grinch, "2026-12-21").price, 17600);
  assert.equal(at(letter, "2026-12-25").price, 11000);
  assert.equal(at(letter, "2026-12-26").price, 14300);
});

test("год не важен: таблица одна на сезон, спектакль 31.12–3.01 через Новый год", () => {
  assert.equal(at(ded, "2027-12-05").price, 11000);
  assert.equal(at(show, "2026-12-31").price, 72800);
  assert.equal(at(show, "2027-01-03").price, 72800);
  assert.equal(at(show, "2027-01-04").mode, "manager");
});

test("дата вне таблиц — «цену укажет менеджер» (ноябрь, Гринч в январе, Дед Мороз 8.01)", () => {
  for (const [t, d] of [[ded, "2026-11-30"], [grinch, "2027-01-03"], [ded, "2027-01-08"], [letter, "2027-01-02"]] as const) {
    const r = at(t, d);
    assert.equal(r.mode, "manager", d);
    assert.equal(r.price, 0);
    assert.equal(r.note, "Цену укажет менеджер");
  }
});

test("письмо 31.12 не работает — «укажет менеджер»", () => {
  assert.equal(at(letter, "2026-12-31").mode, "manager");
});

test("нет даты — «от» по выбранному варианту", () => {
  assert.deepEqual([at(ded, "").mode, at(ded, "").price], ["from", 11000]);
  assert.equal(at(ded, "", P60).price, 25800);
  assert.equal(at(ded, "мусор", P30).price, 16100, "битая дата — как без даты");
});

test("Стандарт после 22.12 недоступен — считаем Премиум той же длительности, с подписью", () => {
  const r = at(ded, "2026-12-23", S30);
  assert.equal(r.price, 27600);
  assert.equal(ded.cols[r.col], P30);
  assert.equal(r.note, "На эту дату — только Премиум");
  assert.deepEqual(r.off, [0, 2]);
  const h = at(ded, "2027-01-05", S60);
  assert.deepEqual([h.price, ded.cols[h.col]], [31300, P60]);
  assert.equal(at(ded, "2026-12-22", S30).note, undefined, "22.12 Стандарт ещё есть");
});

test("Дед Мороз: в таблице Кирилла только 30 минут, 1 час сайт добавляет сам", () => {
  assert.deepEqual(parseDatePrices(NY_DATE_PRICES.p_ded).table!.cols, ["Стандарт", "Премиум"]);
  assert.deepEqual(ded.cols, [S30, P30, S60, P60]);
  // Кирилл поднял цену на 30 минут — цена на час пересчиталась.
  const t = programTable("p_ded", "Даты | Стандарт | Премиум\n1.12–13.12 | 12 000 | 16 150")!;
  assert.deepEqual(t.rows[0].cells, [12000, 16150, 19200, 25900]);
  const own = programTable("p_ded", "Даты | Стандарт, 30 мин | Стандарт, 1 час\n1.12–13.12 | 11 000 | 18 000")!;
  assert.deepEqual([own.cols.length, own.rows[0].cells[1]], [2, 18000], "часы вписаны сами — не умножаем");
});

test("Дед Мороз на 1 час — весь столбец совпадает с таблицей из разбора (×1,6 вверх до сотни)", () => {
  const p60 = ["2026-12-05", "2026-12-15", "2026-12-20", "2026-12-25", "2026-12-29", "2027-01-03"].map((d) => at(ded, d, P60).price);
  assert.deepEqual(p60, [25800, 33200, 40500, 44200, 47900, 31300]);
  const s60 = ["2026-12-05", "2026-12-15", "2026-12-20"].map((d) => at(ded, d, S60).price);
  assert.deepEqual(s60, [17600, 21200, 26400]);
  // Каждая цена на 1 час = 30 минут × 1,6, округлённые вверх до сотни.
  for (const r of ded.rows) {
    for (const [a, b] of [[0, 2], [1, 3]]) {
      const x = r.cells[a];
      if (x != null) assert.equal(r.cells[b], Math.ceil((x * 16) / 1000) * 100);
    }
  }
});

test("31.12 без времени — «от» по окнам дня и список окон", () => {
  const r = at(ded, "2026-12-31", P30);
  assert.deepEqual([r.mode, r.price, r.note], ["from", 28750, "Выберите время приезда"]);
  assert.deepEqual(r.windows.map((w) => w.label), ["06:00–12:59", "13:00–15:59", "16:00–18:59", "19:00–22:59", "23:00–00:59", "01:00–04:00"]);
  assert.deepEqual(r.windows.map((w) => w.night), [false, false, false, false, true, true]);
  assert.equal(at(ded, "2026-12-31", S30).price, 28750, "Стандарта 31.12 нет — «от» по Премиуму");
  const h = at(ded, "2026-12-31", S60);
  assert.deepEqual([h.price, ded.cols[h.col]], [46000, P60], "Стандарт на 1 час 31.12 без времени — «от» по Премиуму на 1 час, не на 30 минут");
  assert.equal(at(grinch, "2026-12-31").price, 26400);
});

test("31.12 по окну: каждое окно и 1 час", () => {
  const p = (slot: string, col = P30) => at(ded, "2026-12-31", col, slot).price;
  assert.deepEqual(["06:00–12:59", "13:00–15:59", "16:00–18:59", "19:00–22:59", "23:00–00:59", "01:00–04:00"].map((s) => p(s)), [28750, 32200, 34500, 39100, 71300, 57500]);
  assert.equal(p("23:00–00:59", P60), 114100);
  assert.equal(p("01:00–04:00", P60), 92000);
  assert.deepEqual(["07:00–17:59", "18:00–22:59", "23:00–00:59"].map((s) => at(grinch, "2026-12-31", undefined, s).price), [26400, 34100, 57200]);
  assert.equal(at(ded, "2026-12-31", P30, "10:00–11:00").mode, "from", "неизвестное окно — как не выбрано");
});

test("31.12 «Другое время» (Баба Яга в 06:30, Дед Мороз в 05:00) — «укажет менеджер»; на 1.01 так не работает", () => {
  const r = at(table("p_yaga"), "2026-12-31", undefined, OTHER_SLOT);
  assert.deepEqual([r.mode, r.price, r.slot], ["manager", 0, OTHER_SLOT]);
  assert.equal(at(ded, "2026-12-31", P30, OTHER_SLOT).mode, "manager");
  assert.equal(at(ded, "2026-12-10", P30, OTHER_SLOT).price, 16100, "дата без окон — пункт ни на что не влияет");
});

test("1 января: только ночные окна; днём — «укажет менеджер»", () => {
  const r = at(ded, "2027-01-01", P30);
  assert.equal(r.mode, "manager");
  assert.equal(r.nightOnly, true);
  assert.deepEqual(r.windows.map((w) => w.label), ["23:00–00:59", "01:00–04:00"]);
  assert.equal(at(ded, "2027-01-01", P30, "01:00–04:00").price, 57500);
  assert.equal(at(ded, "2027-01-01", P30, "06:00–12:59").mode, "manager", "дневное окно 31.12 на 1.01 не действует");
  assert.equal(at(grinch, "2027-01-01", undefined, "23:00–00:59").price, 57200);
  assert.equal(at(grinch, "2027-01-01").mode, "manager");
});

test("ночные окна последнего дня короткого месяца находятся на следующий день", () => {
  const ok = parseDatePrices("Даты | Цена\n30.11 20:00–22:59 | 1 000\n30.11 23:00–00:59 | 2 000").table!;
  assert.equal(priceFor(ok, { date: "2026-12-01", slot: "23:00–00:59" }).price, 2000);
});

test("подписи дат строк", () => {
  assert.equal(rowDates(ded.rows[0]), "1–13 декабря");
  assert.equal(rowDates(show.rows[5]), "31 декабря – 3 января");
  assert.equal(rowDates(ded.rows[5]), "31 декабря");
});

test("разбор терпит неразрывные пробелы, разные тире, «₽» и год в дате", () => {
  const { table: t, errors } = parseDatePrices("Даты | Цена\n1.12.2026 - 13.12.2026 | 11 000 ₽\n14.12—18.12 | 13 200\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(t!.rows.map((r) => r.cells[0]), [11000, 13200]);
});

test("ошибки — с номером строки", () => {
  const err = (s: string) => parseDatePrices(s).errors;
  assert.match(err("1.12 | 100")[0], /Строка 1: первой строкой нужны названия столбцов/);
  assert.match(err("Даты | Цена\n31.11 | 100")[0], /Строка 2: не понял дату/);
  assert.match(err("Даты | Цена\n1.12–5.12 | сто")[0], /Строка 2: «сто» — не число/);
  assert.match(err("Даты | А | Б\n1.12 | 100")[0], /Строка 2: цен 1, а столбцов 2/);
  assert.match(err("Даты | Цена\n1.12–5.12 | 100\n5.12–9.12 | 200")[0], /Строки 2 и 3: периоды пересекаются/);
  assert.match(err("Даты | Цена\n30.12–31.12 | 100\n31.12 06:00–12:59 | 200")[0], /Строки 2 и 3: у даты есть окна времени/);
  assert.match(err("Даты | Цена\n5.12–1.12 | 100")[0], /конец периода раньше начала/);
  assert.match(err("Даты | Цена\n1.12 | —")[0], /нет ни одной цены/);
  assert.match(err("Даты | Цена\n31.12 13:00–15:59 | 1\n31.12 06:00–12:59 | 2")[0], /Строка 3: окна времени одной даты пишутся по порядку/, "переставленные строки");
  assert.match(err("Даты | Цена\n31.12 23:00–00:59 | 1\n31.12 22:00–23:30 | 2")[0], /по порядку/, "ночное окно позже начала дня");
  assert.match(err("")[0], /Таблица пустая/);
  assert.equal(parseDatePrices("Даты | Цена\n1.12 | 100").errors.length, 0);
});
