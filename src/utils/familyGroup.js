export const DEFAULT_GROUP_ID = 'family';

/** Идентификатор семьи пользователя (с обратной совместимостью) */
export function getFamilyId(profile) {
  return profile?.familyId || profile?.groupId || DEFAULT_GROUP_ID;
}

/** @deprecated используйте getFamilyId */
export function getFamilyGroupId(profile) {
  return getFamilyId(profile);
}

/** Идентификатор семьи списка (с обратной совместимостью) */
export function getListFamilyId(list) {
  return list?.familyId || list?.groupId || DEFAULT_GROUP_ID;
}
