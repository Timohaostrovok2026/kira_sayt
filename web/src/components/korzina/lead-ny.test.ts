// Текст заявки для новогодних программ: в скобках — только выбор клиента (вариант, время, письма).
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { buildCatalog, type Program } from "../../data/catalog.ts";
import { NY_DATE_PRICES } from "../../data/migrations.ts";
import { buildLines, linesTotal, type CartState } from "../../data/cart-lines.ts";

registerHooks({
  resolve(spec, ctx, next) {
    return next(spec.startsWith("@/") ? new URL(`../../${spec.slice(2)}.ts`, import.meta.url).href : spec, ctx);
  },
});
const lead = await import("./lead.ts");

const ny = (id: string, name: string): Program => ({
  id, name, kind: "Новый год", group: "", a: 1, b: 8, price: 1, dur: "", art: "", how: "", inc: "", datePrices: NY_DATE_PRICES[id],
});
const cat = buildCatalog({ programs: [ny("p_grinch1", "Гринч")], extras: [], packages: [], costumes: [], costumeCats: [] });

// НАСТОЯЩАЯ ОШИБКА (косметика, падает на коде 48c9bbc): у Гринча один столбец и нет окна вне 31.12 —
// подпись строки падает на вид программы, и менеджер получает «• Гринч (Новый год) — 14 300 ₽».
test("Гринч в обычную дату — без «(Новый год)» в скобках", () => {
  const s: CartState = {
    programs: ["p_grinch1"], extras: {}, packages: [], costumes: [], programOpts: {},
    form: { childAge: "", date: "2026-12-10", place: "", name: "", phone: "", note: "", outsideMkad: false, km: 0, sound: false, soundAuto: false, outdoor: false },
  };
  const ls = buildLines(s, cat);
  const text = lead.buildLeadText(s, ls, linesTotal(ls), cat).replace(/[  ]/g, " ");
  assert.match(text, /• Гринч — 14 300 ₽/);
});
