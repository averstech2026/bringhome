import { POPULAR_PACKING_ITEMS } from './popularPackingItems';
import { getPackingCategoryIcon } from './packingLists';
import { normalizePackingItemName } from './mergePackingItems';

/**
 * Подсказки автодополнения для сборов: история списка + словарь.
 * Возвращает объекты { name, type, category, categoryIcon }.
 */
export function mergePackingAutocompleteSuggestions(input, historyEntries = []) {
  const lower = normalizePackingItemName(input);
  if (lower.length < 2) return [];

  const seen = new Set();
  const results = [];

  const push = (entry) => {
    const name = normalizePackingItemName(entry?.name ?? entry);
    if (!name || !name.includes(lower) || seen.has(name)) return;
    seen.add(name);

    const category = String(entry?.category || '').trim();
    results.push({
      name,
      type: entry?.type || null,
      category,
      categoryIcon: getPackingCategoryIcon(category, entry?.categoryIcon),
    });
  };

  (Array.isArray(historyEntries) ? historyEntries : []).forEach(push);
  POPULAR_PACKING_ITEMS.forEach(push);

  return results
    .sort((a, b) => {
      const aStarts = a.name.startsWith(lower);
      const bStarts = b.name.startsWith(lower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name, 'ru');
    })
    .slice(0, 8);
}

/** Точное совпадение в словаре (для подстановки type/category при ручном вводе). */
export function lookupPopularPackingItem(name) {
  const lower = normalizePackingItemName(name);
  if (!lower) return null;
  const found = POPULAR_PACKING_ITEMS.find(
    (entry) => normalizePackingItemName(entry.name) === lower,
  );
  if (!found) return null;
  return {
    name: found.name,
    type: found.type,
    category: found.category,
    categoryIcon: getPackingCategoryIcon(found.category),
  };
}
