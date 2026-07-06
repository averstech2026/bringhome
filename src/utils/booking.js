export function formatBookerLabel(name) {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

export function getActiveCategoryItems(items) {
  return items.filter((item) => !item.checked);
}

export function getCategoryBookingState(items, displayName) {
  const active = getActiveCategoryItems(items);
  if (active.length === 0) {
    return { allMine: false, hasFree: false, activeCount: 0 };
  }

  const mine = active.filter((item) => item.bookedBy === displayName);
  const free = active.filter((item) => !item.bookedBy);

  return {
    allMine: mine.length === active.length,
    hasFree: free.length > 0,
    activeCount: active.length,
  };
}

export function resolveCategoryBookingAction(items, displayName) {
  const active = getActiveCategoryItems(items);
  const { allMine } = getCategoryBookingState(items, displayName);

  if (allMine) {
    return {
      bookedBy: null,
      itemIds: active.filter((item) => item.bookedBy === displayName).map((item) => item.id),
    };
  }

  return {
    bookedBy: displayName,
    itemIds: active
      .filter((item) => !item.bookedBy || item.bookedBy === displayName)
      .map((item) => item.id),
  };
}
