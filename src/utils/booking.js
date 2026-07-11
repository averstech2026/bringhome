export function formatBookerLabel(name) {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

export function getActiveCategoryItems(items) {
  return items.filter((item) => !item.checked);
}

function bookerNamesMatch(leftName, rightName) {
  if (!leftName || !rightName) return false;
  const left = formatBookerLabel(leftName).trim().toLowerCase();
  const right = formatBookerLabel(rightName).trim().toLowerCase();
  if (left === right) return true;
  return leftName.trim().toLowerCase() === rightName.trim().toLowerCase();
}

/** @param {{ displayName?: string, familyId?: string, userId?: string }} ctx */
export function isItemBookedByMe(item, ctx = {}) {
  if (!item?.bookedBy) return false;
  if (item.bookedByUid && ctx.userId) {
    return item.bookedByUid === ctx.userId;
  }
  if (ctx.displayName && bookerNamesMatch(item.bookedBy, ctx.displayName)) {
    return true;
  }
  return false;
}

/** Забронировано другой семьёй (кросс-семейный список) */
export function isItemBookedByOtherFamily(item, familyId) {
  if (!item?.bookedBy || !familyId) return false;
  if (item.bookedByFamilyId) {
    return item.bookedByFamilyId !== familyId;
  }
  return false;
}

/** @param {{ displayName?: string, familyId?: string }} ctx */
export function getCategoryBookingState(items, ctx) {
  const active = getActiveCategoryItems(items);
  if (active.length === 0) {
    return { allMine: false, hasFree: false, activeCount: 0, blockedByOtherFamily: false };
  }

  const mine = active.filter((item) => isItemBookedByMe(item, ctx));
  const free = active.filter((item) => !item.bookedBy);
  const blocked = active.filter((item) => isItemBookedByOtherFamily(item, ctx.familyId));

  return {
    allMine: mine.length === active.length,
    hasFree: free.length > 0,
    activeCount: active.length,
    blockedByOtherFamily: blocked.length > 0 && mine.length === 0 && free.length === 0,
  };
}

/** @param {{ displayName?: string, familyId?: string }} ctx */
export function resolveCategoryBookingAction(items, ctx) {
  const active = getActiveCategoryItems(items);
  const { allMine } = getCategoryBookingState(items, ctx);

  if (allMine) {
    return {
      booking: null,
      itemIds: active.filter((item) => isItemBookedByMe(item, ctx)).map((item) => item.id),
    };
  }

  return {
    booking: ctx.displayName
      ? {
          bookedBy: ctx.displayName,
          bookedByFamilyId: ctx.familyId || null,
          bookedByFamilyName: ctx.familyName || null,
          bookedByUid: ctx.userId || null,
        }
      : null,
    itemIds: active
      .filter((item) => {
        if (!item.bookedBy) return true;
        if (isItemBookedByMe(item, ctx)) return true;
        if (isItemBookedByOtherFamily(item, ctx.familyId)) return false;
        return false;
      })
      .map((item) => item.id),
  };
}

export function buildBookingPayload(bookedBy, meta = {}) {
  if (!bookedBy) {
    return {
      bookedBy: null,
      bookedByFamilyId: null,
      bookedByFamilyName: null,
      bookedByUid: null,
    };
  }

  return {
    bookedBy,
    bookedByFamilyId: meta.familyId || null,
    bookedByFamilyName: meta.familyName || null,
    bookedByUid: meta.userId || null,
  };
}

export function getBookerDisplayInfo(item, {
  familyId,
  userId = null,
  displayName = null,
  externalFamilies = {},
  ownerFamily = null,
} = {}) {
  if (!item?.bookedBy) return null;

  const ctx = { familyId, userId, displayName };
  if (isItemBookedByMe(item, ctx)) {
    return {
      kind: 'mine',
      label: 'Вы',
      name: item.bookedBy,
      avatarUrl: null,
      familyId: item.bookedByFamilyId || familyId,
    };
  }

  if (isItemBookedByOtherFamily(item, familyId)) {
    const ext = externalFamilies[item.bookedByFamilyId];
    return {
      kind: 'otherFamily',
      label: item.bookedByFamilyName || ext?.familyName || 'Другая семья',
      name: item.bookedByFamilyName || ext?.familyName || item.bookedBy,
      avatarUrl: ext?.avatarUrl || null,
      familyId: item.bookedByFamilyId,
    };
  }

  if (item.bookedByFamilyId && item.bookedByFamilyId === familyId) {
    return {
      kind: 'otherUser',
      label: formatBookerLabel(item.bookedBy),
      name: item.bookedBy,
      avatarUrl: null,
      familyId,
    };
  }

  if (item.bookedByFamilyId && item.bookedByFamilyId !== familyId) {
    const ext = externalFamilies[item.bookedByFamilyId] || ownerFamily;
    return {
      kind: 'otherFamily',
      label: item.bookedByFamilyName || ext?.familyName || ext?.name || formatBookerLabel(item.bookedBy),
      name: item.bookedBy,
      avatarUrl: ext?.avatarUrl || null,
      familyId: item.bookedByFamilyId,
    };
  }

  return {
    kind: 'otherUser',
    label: formatBookerLabel(item.bookedBy),
    name: item.bookedBy,
    avatarUrl: null,
    familyId: null,
  };
}
