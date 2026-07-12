import { formatBookerLabel } from './booking';

/** Актуальное фото: Firestore-профиль приоритетнее Auth (обновляется сразу после загрузки). */
export function getUserPhotoUrl(user, profile) {
  return profile?.avatarUrl || user?.photoURL || null;
}

function memberNamesMatch(memberName, checkedBy) {
  if (!memberName || !checkedBy) return false;
  const left = memberName.trim().toLowerCase();
  const right = checkedBy.trim().toLowerCase();
  if (left === right) return true;
  return formatBookerLabel(memberName).toLowerCase() === formatBookerLabel(checkedBy).toLowerCase();
}

/** Фото пользователя, отметившего товар — для чекбокса у других участников списка. */
export function resolveCheckerPhotoUrl({
  checkedByName,
  checkedByUid,
  checkedByPhotoUrl,
  membersById = {},
  currentDisplayName,
  currentUserPhotoUrl,
}) {
  if (!checkedByName && !checkedByUid && !checkedByPhotoUrl) return null;

  if (
    currentDisplayName
    && checkedByName
    && memberNamesMatch(currentDisplayName, checkedByName)
  ) {
    return currentUserPhotoUrl || checkedByPhotoUrl || null;
  }

  if (checkedByPhotoUrl) return checkedByPhotoUrl;

  if (checkedByUid && membersById[checkedByUid]?.avatarUrl) {
    return membersById[checkedByUid].avatarUrl;
  }

  if (checkedByName) {
    const byName = Object.values(membersById).find(
      (member) => memberNamesMatch(member.displayName, checkedByName),
    );
    if (byName?.avatarUrl) return byName.avatarUrl;
  }

  return null;
}
