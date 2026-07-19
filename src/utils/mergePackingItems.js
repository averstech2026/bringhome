import {
  getPackingCategoryIcon,
  normalizePackingActivity,
  normalizePackingItem,
  PACKING_ACTIVITY_MAIN,
  PACKING_SCOPE,
} from './packingLists';

export function normalizePackingItemName(name) {
  return String(name || '').trim().toLowerCase();
}

/**
 * Ищет пункт с тем же именем (и scope, если задан).
 * Статус checked не влияет — дубликат не создаём даже для отмеченных.
 */
export function findPackingItemByName(items, name, { scope } = {}) {
  const norm = normalizePackingItemName(name);
  if (!norm) return null;

  return (Array.isArray(items) ? items : []).find((item) => {
    if (normalizePackingItemName(item?.name) !== norm) return false;
    if (scope && item?.scope && item.scope !== scope) return false;
    return true;
  }) || null;
}

/**
 * Обогащает существующий пункт данными из ИИ/ввода, сохраняя id и checked.
 * Новая activity из контекста перекрывает старую, если передана.
 * category (тег вещи) — только если явно пришла.
 */
export function enrichPackingItem(existing, incoming = {}) {
  const hasIncomingActivity = Object.prototype.hasOwnProperty.call(incoming, 'activity');
  const nextActivity = hasIncomingActivity
    ? normalizePackingActivity(incoming.activity)
    : normalizePackingActivity(existing.activity);
  const nextActivityIcon = nextActivity === PACKING_ACTIVITY_MAIN
    ? ''
    : String(incoming.activityIcon || existing.activityIcon || '').trim();

  const nextCategory = String(incoming.category || '').trim();
  const category = nextCategory || existing.category || '';
  const categoryIcon = nextCategory
    ? getPackingCategoryIcon(nextCategory, incoming.categoryIcon || existing.categoryIcon)
    : (existing.categoryIcon || getPackingCategoryIcon(existing.category, incoming.categoryIcon));

  return normalizePackingItem({
    ...existing,
    type: incoming.type || existing.type,
    activity: nextActivity,
    activityIcon: nextActivityIcon,
    category,
    categoryIcon,
    note: incoming.note || existing.note || '',
    bookingUrl: incoming.bookingUrl || existing.bookingUrl || '',
    quantity: incoming.quantity || existing.quantity || '',
    dueDate: incoming.dueDate || existing.dueDate || '',
  });
}

/** Схлопывает incoming в список; при совпадении имени — enrich, иначе append. */
export function mergePackingItemIntoList(items, incoming) {
  const normalized = normalizePackingItem(incoming);
  if (!normalized.name) return Array.isArray(items) ? [...items] : [];

  const existing = findPackingItemByName(items, normalized.name, {
    scope: normalized.scope || PACKING_SCOPE.COMMON,
  });

  if (!existing) {
    return [...(Array.isArray(items) ? items : []), normalized];
  }

  return (Array.isArray(items) ? items : []).map((item) => (
    item.id === existing.id ? enrichPackingItem(item, normalized) : item
  ));
}

/** Последовательно мержит batch в existing (и внутри batch по имени+scope). */
export function mergePackingItemsBatch(existingItems, incomingItems) {
  let result = [...(Array.isArray(existingItems) ? existingItems : [])];
  for (const incoming of Array.isArray(incomingItems) ? incomingItems : []) {
    result = mergePackingItemIntoList(result, incoming);
  }
  return result;
}
