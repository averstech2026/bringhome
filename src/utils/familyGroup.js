export const DEFAULT_GROUP_ID = 'family';

export function getFamilyGroupId(profile) {
  return profile?.groupId || DEFAULT_GROUP_ID;
}
