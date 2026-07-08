import { isPendingListItem } from '../hooks/usePendingListItems';

const COMPARE_FIELDS = ['name', 'quantity', 'category', 'comment', 'checked', 'checkedBy', 'bookedBy'];

function normalizeComparableItem(item) {
  return {
    id: item.id,
    name: (item.name || '').trim(),
    quantity: item.quantity || '1 шт',
    category: item.category || 'Прочее',
    comment: item.comment?.trim() || null,
    checked: Boolean(item.checked),
    checkedBy: item.checked ? item.checkedBy || null : null,
    bookedBy: item.bookedBy || null,
  };
}

function itemsEqual(a, b) {
  return COMPARE_FIELDS.every((field) => a[field] === b[field]);
}

/** Сравнивает два массива товаров (без pending-черновиков) по id и полям, включая quantity */
export function listItemsHaveChanges(baselineItems = [], currentItems = []) {
  const baseline = baselineItems
    .filter((item) => item?.id && !isPendingListItem(item.id))
    .map(normalizeComparableItem)
    .sort((a, b) => a.id.localeCompare(b.id));

  const current = currentItems
    .filter((item) => item?.id && !isPendingListItem(item.id))
    .map(normalizeComparableItem)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (baseline.length !== current.length) return true;

  for (let i = 0; i < baseline.length; i += 1) {
    if (baseline[i].id !== current[i].id || !itemsEqual(baseline[i], current[i])) {
      return true;
    }
  }

  return false;
}

/** Накладывает локальные правки существующих товаров поверх live-данных */
export function applyPendingItemEdits(items = [], pendingEdits = {}) {
  const editIds = Object.keys(pendingEdits);
  if (editIds.length === 0) return items;

  return items.map((item) => {
    const edits = pendingEdits[item.id];
    return edits ? { ...item, ...edits } : item;
  });
}
