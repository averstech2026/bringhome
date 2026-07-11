import { normalizeItemName } from './mergeItems';
import { parseQuantity } from './quantity';
import { getLearnedUnit } from './productUnitMap';
import { lookupCustomProduct } from '../services/customProductsDictionaryService';

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
  'картоф', 'картош', 'морков', 'помид', 'томат', 'огур', 'капуст', 'перец', 'баклажан',
  'кабач', 'тыкв', 'свекл', 'редис', 'яблок', 'банан', 'апельс', 'мандар',
  'груш', 'авокад', 'имбир', 'фрукт', 'овощ',
  'мяс', 'кури', 'говя', 'свини', 'индей', 'фарш', 'рыб', 'лосос', 'семг',
  'форел', 'треск', 'кревет', 'кальмар', 'колбас', 'сосиск', 'ветчин',
  'сыр', 'творог', 'твор', 'греч', 'рис', 'мук', 'сахар', 'круп',
];

/** Продукты, для которых ИИ-ввод всегда подставляет «кг», даже если в истории был «шт». */
export const AI_HARD_KG_ROOTS = ['картоф', 'картош', 'морков', 'огур', 'помид', 'томат'];

function matchesRoots(name, roots) {
  const lower = name.toLowerCase().trim();
  if (!lower) return false;
  return roots.some((root) => lower.includes(root));
}

export function isHardKgProduct(name) {
  return matchesRoots(name, AI_HARD_KG_ROOTS);
}

function findUnitInListItems(listItems, name) {
  const norm = normalizeItemName(name);
  if (!norm || !listItems?.length) return null;

  for (let i = listItems.length - 1; i >= 0; i -= 1) {
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

  const fromDictionary = lookupCustomProduct(trimmed);
  if (fromDictionary?.unit) return fromDictionary.unit;

  if (firestoreUnit) return firestoreUnit;

  const learned = getLearnedUnit(trimmed);
  if (learned) return learned;

  return detectUnitFromDictionary(trimmed);
}

/**
 * Для ИИ-ввода: приоритет у словарных «кг/л/пуч.», история «шт» не перебивает овощи.
 */
export function getAiRecommendedUnit(name, { listItems = [], firestoreUnit = null } = {}) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'шт';

  if (isHardKgProduct(trimmed)) return 'кг';

  const dictionaryDefault = detectUnitFromDictionary(trimmed);
  if (dictionaryDefault !== 'шт') return dictionaryDefault;

  const fromDictionary = lookupCustomProduct(trimmed);
  if (fromDictionary?.unit && fromDictionary.unit !== 'шт') return fromDictionary.unit;

  const learned = getLearnedUnit(trimmed);
  if (learned && learned !== 'шт') return learned;

  const fromList = findUnitInListItems(listItems, trimmed);
  if (fromList && fromList !== 'шт') return fromList;

  if (firestoreUnit && firestoreUnit !== 'шт') return firestoreUnit;

  return dictionaryDefault;
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
