import { POPULAR_PRODUCTS } from './popularProducts';

/**
 * Объединяет историю пользователя и популярные продукты для автодополнения.
 */
export function mergeAutocompleteSuggestions(input, historyNames = []) {
  const lower = input.toLowerCase().trim();
  if (lower.length < 2) return [];

  const fromHistory = historyNames.filter((name) => name.toLowerCase().includes(lower));
  const fromPopular = POPULAR_PRODUCTS.filter((name) => name.toLowerCase().includes(lower));

  return [...new Set([...fromHistory, ...fromPopular])]
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower);
      const bStarts = b.toLowerCase().startsWith(lower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b, 'ru');
    })
    .slice(0, 8);
}
