import {
  ensureDictionaryLoaded,
  saveCustomProduct,
} from '../services/customProductsDictionaryService';
import { saveLearnedCategory } from './productCategoryMap';
import { saveLearnedUnit } from './productUnitMap';
import { normalizeItemName } from './mergeItems';
import { formatQuantity, parseQuantity } from './quantity';

/**
 * Сохраняет связки «товар → категория → единица» в общий словарь.
 * @param {Array<{ name: string, category: string, quantity?: string }>} products
 * @param {{ respectExisting?: boolean }} options
 *   respectExisting: true для ИИ — не перезаписывать ручные правки
 */
export async function learnProducts(products, { respectExisting = false } = {}) {
  if (!products?.length) return;

  try {
    await ensureDictionaryLoaded();
  } catch {
    // Словарь в Firestore недоступен — продолжаем с localStorage
  }

  await Promise.all(
    products.map(async (product) => {
      const name = normalizeItemName(product.name);
      const category = product.category;
      if (!name || !category) return;

      const { unit, count } = parseQuantity(product.quantity || '1 шт');

      saveLearnedCategory(name, category);
      saveLearnedUnit(name, product.quantity || formatQuantity(count, unit));

      await saveCustomProduct({
        name,
        category,
        unit,
        respectExisting,
      });
    }),
  );
}
