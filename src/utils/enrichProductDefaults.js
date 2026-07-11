import { detectCategory } from './categories';
import { normalizeItemName } from './mergeItems';
import { getLearnedCategory } from './productCategoryMap';
import { getAiRecommendedUnit, isHardKgProduct } from './recommendedUnit';
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
  if (isHardKgProduct(name) && (isDefaultQuantity || (unit === 'шт' && count === 1))) {
    finalUnit = 'кг';
  } else if (dictEntry?.unit && dictEntry.unit !== 'шт') {
    finalUnit = dictEntry.unit;
  } else if (isDefaultQuantity || (unit === 'шт' && count === 1)) {
    finalUnit = getAiRecommendedUnit(name, { listItems, firestoreUnit });
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

export async function enrichProductsForAi(
  products,
  { listItems = [], userId = null, isDraft = false, getProductHistoryUnit },
) {
  const historyUnits = await Promise.all(
    products.map(async (product) => {
      if (!userId || isDraft || !getProductHistoryUnit) return null;
      try {
        return await getProductHistoryUnit(userId, product.name);
      } catch {
        return null;
      }
    }),
  );

  return products
    .map((product, index) => enrichProductDefaults(product, {
      listItems,
      firestoreUnit: historyUnits[index],
    }))
    .filter(Boolean);
}
