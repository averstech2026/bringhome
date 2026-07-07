function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function formatDateFull(date) {
  const day = startOfDay(date);
  const dd = String(day.getDate()).padStart(2, '0');
  const mm = String(day.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${day.getFullYear()}`;
}

/** @deprecated используйте formatDateFull */
export function formatDateShort(date, now = new Date()) {
  return formatDateFull(date);
}

export function getListGroupDate(list) {
  const ts =
    list.completedAt?.toMillis?.() ??
    list.updatedAt?.toMillis?.() ??
    list.createdAt?.toMillis?.() ??
    0;

  if (ts) return startOfDay(new Date(ts));

  const match = list.title?.match(/(\d{2})\.(\d{2})$/);
  if (match) {
    const year = new Date().getFullYear();
    return startOfDay(new Date(year, Number(match[2]) - 1, Number(match[1])));
  }

  return startOfDay(new Date());
}

export function formatCompletedGroupRelativeLabel(date, now = new Date()) {
  const day = startOfDay(date);
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (day.getTime() === today.getTime()) return 'Сегодня';
  if (day.getTime() === yesterday.getTime()) return 'Вчера';
  return null;
}

export function formatCompletedListDateShort(date) {
  const day = startOfDay(date);
  const dd = String(day.getDate()).padStart(2, '0');
  const mm = String(day.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

export function formatCompletedListDateLabel(list) {
  return formatCompletedListDateShort(getListGroupDate(list));
}

/** @deprecated используйте formatCompletedGroupRelativeLabel + formatDateFull */
export function formatCompletedGroupLabel(date, now = new Date()) {
  return formatCompletedGroupRelativeLabel(date, now) ?? formatDateFull(date);
}
const BUILTIN_TYPE_ORDER = ['home', 'cottage', 'trip'];

export function countListsByType(lists) {
  const counts = new Map();

  for (const list of lists) {
    const type = list.type || 'home';
    counts.set(type, (counts.get(type) || 0) + 1);
  }

  return Array.from(counts.entries()).sort(([typeA], [typeB]) => {
    const indexA = BUILTIN_TYPE_ORDER.indexOf(typeA);
    const indexB = BUILTIN_TYPE_ORDER.indexOf(typeB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return typeA.localeCompare(typeB, 'ru');
  });
}

export function getListSortTimestamp(list) {
  return (
    list.completedAt?.toMillis?.() ??
    list.updatedAt?.toMillis?.() ??
    list.createdAt?.toMillis?.() ??
    0
  );
}

export function sortCompletedListsByDate(lists) {
  return [...lists].sort((a, b) => getListSortTimestamp(b) - getListSortTimestamp(a));
}

export function groupCompletedListsByDate(lists, now = new Date()) {
  const groups = new Map();

  for (const list of lists) {
    const date = getListGroupDate(list);
    const key = date.toISOString().slice(0, 10);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        date,
        relativeLabel: formatCompletedGroupRelativeLabel(date, now),
        dateFull: formatDateFull(date),
        lists: [],
      });
    }

    groups.get(key).lists.push(list);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      typeCounts: countListsByType(group.lists),
    }))
    .sort((a, b) => b.date - a.date);
}
