import { normalizeItemName } from './mergeItems';
import { parseQuantity } from './quantity';
import { getLearnedUnit } from './productUnitMap';

const HERB_ROOTS = [
  'петруш', 'укроп', 'кинз', 'базилик', 'сельдер', 'шпинат', 'руккол', 'салат',
  'зелень', 'зелен', 'мята', 'чабрец', 'эстрагон',
];

const LIQUID_ROOTS = [
  'молок', 'кефир', 'ряжен', 'простокваш', 'сливк', 'бифид', 'йогурт пить',
  'вода', 'сок', 'квас', 'лимонад', 'компот', 'морс', 'напиток',
];

const WEIGHT_ROOTS = [
  'клубник', 'малин', 'черник', 'смородин', 'голубик', 'ягод', 'виногра',
  'картоф', 'морков', 'помид', 'томат', 'огур', 'капуст', 'перец', 'баклажан',
  'кабач', 'тыкв', 'свекл', 'редис', 'яблок', 'банан', 'апельс', 'мандар',
  'груш', 'авокад', 'имбир', 'фрукт', 'овощ',
  'мяс', 'кури', 'говя', 'свини', 'индей', 'фарш', 'рыб', 'лосос', 'семг',
  'форел', 'треск', 'кревет', 'кальмар', 'колбас', 'сосиск', 'ветчин',
  'сыр', 'творог', 'твор', 'греч', 'рис', 'мук', 'сахар', 'круп',
];

function matchesRoots(name, roots) {
  const lower = name.toLowerCase().trim();
  if (!lower) return false;
  return roots.some((root) => lower.includes(root));
}

function findUnitInListItems(listItems, name) {
  const norm = normalizeItemName(name);
  if (!norm || !listItems?.length) return null;

  for (let i = listItems.length - 1; i >= 0; i--) {
    const item = listItems[i];
    if (normalizeItemName(item.name) === norm && item.quantity) {
      return parseQuantity(item.quantity).unit;
    }
  }
  return null;
}

function detectUnitFromDictionary(name) {
  if (matchesRoots(name, HERB_ROOTS)) return 'пуч.';
  if (matchesRoots(name, LIQUID_ROOTS)) return 'л';
  if (matchesRoots(name, WEIGHT_ROOTS)) return 'кг';
  return 'шт';
}

/**
 * Рекомендует единицу измерения: история списка → localStorage → справочник → шт.
 */
export function getRecommendedUnit(name, { listItems = [], firestoreUnit = null } = {}) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'шт';

  const fromList = findUnitInListItems(listItems, trimmed);
  if (fromList) return fromList;

  if (firestoreUnit) return firestoreUnit;

  const learned = getLearnedUnit(trimmed);
  if (learned) return learned;

  return detectUnitFromDictionary(trimmed);
}

export function hasDictionaryUnitHint(name) {
  const trimmed = (name || '').trim();
  if (trimmed.length < 3) return false;
  return (
    matchesRoots(trimmed, HERB_ROOTS)
    || matchesRoots(trimmed, LIQUID_ROOTS)
    || matchesRoots(trimmed, WEIGHT_ROOTS)
  );
}
