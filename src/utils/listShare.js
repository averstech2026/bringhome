import { getListFamilyId } from './familyGroup';

/** Список расшарен с внешними семьями */
export function isCrossFamilySharedList(list) {
  return (list?.sharedWithFamilyIds?.length ?? 0) > 0;
}

/** Текущая семья подключена как гость (не семья-владелец списка) */
export function isExternalGuestList(list, userFamilyId) {
  if (!userFamilyId || !list) return false;
  const sharedIds = list.sharedWithFamilyIds || [];
  if (!sharedIds.includes(userFamilyId)) return false;
  return getListFamilyId(list) !== userFamilyId;
}

/** Семья-владелец списка */
export function isListOwnerFamily(list, userFamilyId) {
  if (!userFamilyId || !list) return false;
  return getListFamilyId(list) === userFamilyId;
}

/** Инициалы семьи: «Компот и Оливье» → «КО» */
export function getFamilyInitials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0]?.charAt(0) || 'С').toUpperCase();
}

/** Данные семьи-отправителя для карточки (гость не читает families/{id} владельца) */
export function getOwnerFamilyDisplay(list, familiesById = {}) {
  const ownerFamilyId = getListFamilyId(list);
  const fromStore = familiesById[ownerFamilyId];

  if (fromStore) {
    return {
      id: ownerFamilyId,
      familyName: fromStore.name || 'Семья',
      avatarUrl: fromStore.avatarUrl || null,
    };
  }

  return {
    id: ownerFamilyId,
    familyName: list?.ownerFamilyName || 'Семья',
    avatarUrl: list?.ownerFamilyAvatarUrl || null,
  };
}

export function getExternalFamiliesList(list, familiesById = {}) {
  const ids = list?.sharedWithFamilyIds || [];
  const map = list?.externalFamilies || {};
  return ids
    .map((familyId) => {
      const fromStore = familiesById[familyId];
      return {
        id: familyId,
        familyName: map[familyId]?.familyName || fromStore?.name || 'Семья',
        avatarUrl: map[familyId]?.avatarUrl || fromStore?.avatarUrl || null,
        joinedAt: map[familyId]?.joinedAt || null,
        joinedBy: map[familyId]?.joinedBy || null,
      };
    })
    .sort((a, b) => a.familyName.localeCompare(b.familyName, 'ru'));
}
