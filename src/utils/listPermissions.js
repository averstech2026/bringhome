export function isListOwner(list, userId) {
  return Boolean(userId && list && list.createdBy === userId);
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
      .filter((member) => member.role === 'admin')
      .forEach((member) => addMember(member.id));
  } else {
    (list.allowedUsers || []).forEach((id) => {
      if (membersById[id]?.role === 'admin') addMember(id);
    });
  }

  return result.sort((a, b) => {
    if (a.id === list.createdBy) return -1;
    if (b.id === list.createdBy) return 1;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'ru');
  });
}
