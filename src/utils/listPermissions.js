import { ROLES, normalizeRole } from './roles';

export function isListOwner(list, userId) {
  return Boolean(userId && list && list.createdBy === userId);
}

/** Список расшарен с пользователем (в allowedUsers), но он не владелец */
export function isListSharedWithUser(list, userId) {
  if (!userId || !list || list.createdBy === userId) return false;
  const allowed = Array.isArray(list.allowedUsers) ? list.allowedUsers : [];
  return allowed.includes(userId);
}

/** Пользователь ещё не открывал список (viewedBy[uid] !== true) */
export function isListUnviewedByUser(list, userId) {
  if (!userId || !list) return false;
  return list.viewedBy?.[userId] !== true;
}

export function canArchiveList(list, userId, isAppAdmin = false) {
  if (!userId || !list) return false;
  if (isAppAdmin) return true;
  if (list.createdBy === userId) return true;
  if (Array.isArray(list.admins) && list.admins.includes(userId)) return true;
  return false;
}

/** Кому можно обратиться, чтобы заархивировать список: владелец и админы с доступом */
export function getListArchiveAdmins(list, membersById = {}) {
  if (!list) return [];

  const seen = new Set();
  const result = [];

  const addMember = (id) => {
    if (!id || seen.has(id)) return;
    const member = membersById[id];
    if (!member || member.disabled) return;
    seen.add(id);
    result.push(member);
  };

  addMember(list.createdBy);

  if (list.isPublic) {
    Object.values(membersById)
      .filter((member) => {
        const role = normalizeRole(member.role);
        return role === ROLES.SUPER_ADMIN || role === ROLES.FAMILY_ADMIN;
      })
      .forEach((member) => addMember(member.id));
  } else {
    (list.allowedUsers || []).forEach((id) => {
      const role = normalizeRole(membersById[id]?.role);
      if (role === ROLES.SUPER_ADMIN || role === ROLES.FAMILY_ADMIN) addMember(id);
    });
  }

  return result.sort((a, b) => {
    if (a.id === list.createdBy) return -1;
    if (b.id === list.createdBy) return 1;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'ru');
  });
}
