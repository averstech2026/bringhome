import { POPULAR_PRODUCTS } from './popularProducts';
import { normalizeItemName } from './mergeItems';

/**
 * Объединяет историю пользователя и популярные продукты для автодополнения.
 * Все подсказки — строго в нижнем регистре.
 */
export function mergeAutocompleteSuggestions(input, historyNames = []) {
  const lower = normalizeItemName(input);
  if (lower.length < 2) return [];

  const seen = new Set();
  const results = [];

  const push = (rawName) => {
    const name = normalizeItemName(rawName);
    if (!name || !name.includes(lower) || seen.has(name)) return;
    seen.add(name);
    results.push(name);
  };

  historyNames.forEach(push);
  POPULAR_PRODUCTS.forEach(push);

  return results
    .sort((a, b) => {
      const aStarts = a.startsWith(lower);
      const bStarts = b.startsWith(lower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b, 'ru');
    })
    .slice(0, 8);
}
