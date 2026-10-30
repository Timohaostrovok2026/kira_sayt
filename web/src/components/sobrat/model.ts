import { AGE_GROUPS, KINDS, type AgeGroupId, type Kind } from "@/data/catalog";
import type { Season } from "@/data/site";

export const STEPS = [
  { n: 1, tab: "Возраст", title: "Сколько лет имениннику?", text: "Покажем только то, что подходит." },
  { n: 2, tab: "Программа", title: "Выберите программу", text: "Основа праздника. Нажмите на карточку, чтобы узнать больше." },
  { n: 3, tab: "Шоу", title: "Добавьте шоу", text: "Вау-момент, который запомнят. Можно пропустить." },
  { n: 4, tab: "Допы", title: "Мастер-классы и допы", text: "Фото, подарки, мастер-классы. По желанию." },
  { n: 5, tab: "Готово", title: "Праздник собран", text: "Проверьте и отправьте заявку. Менеджер ответит в течение дня." },
] as const;

export type StepN = 1 | 2 | 3 | 4 | 5;

const SEASON_KIND: Record<Season, Kind | null> = {
  halloween: "Хэллоуин",
  newyear: "Новый год",
  graduation: "Выпускной",
  birthday: null,
};
const SEASONAL: Kind[] = ["Новый год", "Хэллоуин", "Выпускной"];

/** Виды программ: текущий сезон первым, дальше обычные, остальные сезонные — в конце. */
export function orderedKinds(season: Season) {
  const hot = SEASON_KIND[season];
  const rank = (k: Kind) => (k === hot ? 0 : SEASONAL.includes(k) ? 2 : 1);
  return [...KINDS].sort((x, y) => rank(x.id) - rank(y.id));
}

export function parseAge(v: string | null): AgeGroupId | null {
  return AGE_GROUPS.find((g) => g.id === v)?.id ?? null;
}

export function parseKind(v: string | null): Kind | null {
  return KINDS.find((k) => k.id === v)?.id ?? null;
}

export function parseStep(v: string | null, fallback: StepN): StepN {
  const n = Number(v);
  return n >= 1 && n <= 5 && Number.isInteger(n) ? (n as StepN) : fallback;
}
