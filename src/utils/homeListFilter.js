import { isCrossFamilySharedList, isExternalGuestList, isListOwnerFamily } from './listShare';

export const HOME_LIST_FILTER = {
  ALL: 'all',
  MINE: 'mine',
  SHARED: 'shared',
};

/** Список «своей» семьи без кросс-семейного шеринга */
export function isOwnFamilyList(list, familyId) {
  return isListOwnerFamily(list, familyId) && !isCrossFamilySharedList(list);
}

/** Список с кросс-семейным шерингом (мы поделились или нас пригласили) */
export function isCrossFamilyListForViewer(list, familyId) {
  if (!isCrossFamilySharedList(list)) return false;
  return isListOwnerFamily(list, familyId) || isExternalGuestList(list, familyId);
}

export function matchesHomeListFilter(list, filter, familyId) {
  if (!filter || filter === HOME_LIST_FILTER.ALL) return true;
  if (!familyId || !list) return false;

  if (filter === HOME_LIST_FILTER.MINE) {
    return isOwnFamilyList(list, familyId);
  }

  if (filter === HOME_LIST_FILTER.SHARED) {
    return isCrossFamilyListForViewer(list, familyId);
  }

  return true;
}

export function filterHomeLists(lists, filter, familyId) {
  if (!Array.isArray(lists)) return [];
  return lists.filter((list) => matchesHomeListFilter(list, filter, familyId));
}
