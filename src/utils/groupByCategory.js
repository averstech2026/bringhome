import { CATEGORY_ORDER } from './categories';

export function groupItemsByCategory(items) {
  const groups = {};

  items.forEach((item) => {
    const category = item.category || 'Прочее';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });

  return Object.entries(groups).sort(([a], [b]) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    const rankA = ia === -1 ? 999 : ia;
    const rankB = ib === -1 ? 999 : ib;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b, 'ru');
  });
}

export function getListProgress(items) {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const allDone = total > 0 && checked === total;
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  return { total, checked, allDone, percent };
}
