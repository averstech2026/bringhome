import { addQuantities } from './quantity';

export function normalizeItemName(name) {
  return (name || '').trim().toLowerCase();
}

export function findItemByName(items, name) {
  const norm = normalizeItemName(name);
  return items.find((item) => normalizeItemName(item.name) === norm);
}

/** Совпадение по имени только среди некупленных позиций */
export function findActiveItemByName(items, name) {
  const norm = normalizeItemName(name);
  return items.find(
    (item) => normalizeItemName(item.name) === norm && !item.checked,
  );
}

/** Схлопывает incoming в массив items; возвращает новый массив */
export function mergeItemIntoList(items, incoming) {
  const existing = findActiveItemByName(items, incoming.name);
  if (!existing) {
    return [...items, incoming];
  }

  return items.map((item) => {
    if (item !== existing) return item;
    return {
      ...item,
      quantity: addQuantities(item.quantity, incoming.quantity || '1 шт'),
      comment: incoming.comment || item.comment || null,
    };
  });
}

/** Последовательно схлопывает массив новых позиций между собой и с existing */
export function mergeItemsBatch(existingItems, incomingItems) {
  let result = [...existingItems];
  for (const incoming of incomingItems) {
    result = mergeItemIntoList(result, incoming);
  }
  return result;
}
