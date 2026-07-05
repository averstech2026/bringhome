/** @typedef {'active' | 'completed' | 'archived'} ListStatus */

export function computeListStatusFromItems(items) {
  if (!items.length) return 'active';
  return items.every((item) => item.checked) ? 'completed' : 'active';
}

/** Статус для UI: прогресс товаров — главный источник, поле status — fallback */
export function resolveListStatus(list, progress) {
  if (list?.archived || list?.status === 'archived') return 'archived';

  const { total = 0, percent = 0 } = progress || {};

  if (total > 0) {
    return percent === 100 ? 'completed' : 'active';
  }

  return list?.status === 'completed' ? 'completed' : 'active';
}
