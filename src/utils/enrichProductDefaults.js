import { detectCategory } from './categories';
import { normalizeItemName } from './mergeItems';
import { getLearnedCategory } from './productCategoryMap';
import { getRecommendedUnit } from './recommendedUnit';
import { formatQuantity, parseQuantity } from './quantity';
import {
  findPartialCustomProductMatch,
  lookupCustomProduct,
} from '../services/customProductsDictionaryService';

/**
 * Подставляет категорию и единицу измерения по тем же правилам, что и ручной ввод.
 */
export function enrichProductDefaults(product, { listItems = [], firestoreUnit = null } = {}) {
  const name = normalizeItemName(product?.name || '');
  if (!name) return null;

  const exact = lookupCustomProduct(name);
  const partial = exact ? null : findPartialCustomProductMatch(name);
  const dictEntry = exact || partial;

  let category = product.category || 'Прочее';
  if (dictEntry?.category) {
    category = dictEntry.category;
  } else {
    category = getLearnedCategory(name) || detectCategory(name) || category;
  }

  const rawQuantity = product.quantity || '1 шт';
  const { count, unit } = parseQuantity(rawQuantity);
  const isDefaultQuantity = !product.quantity || rawQuantity.trim() === '1 шт';

  let finalUnit = unit;
  if (dictEntry?.unit) {
    finalUnit = dictEntry.unit;
  } else if (isDefaultQuantity || (unit === 'шт' && count === 1)) {
    finalUnit = getRecommendedUnit(name, { listItems, firestoreUnit });
  }

  return {
    name,
    category,
    quantity: formatQuantity(count, finalUnit),
  };
}

export function enrichProductsBatch(products, options = {}) {
  return products
    .map((product) => enrichProductDefaults(product, options))
    .filter(Boolean);
}
