import { useCallback, useState } from 'react';

function initFromList(list) {
  return {
    isPublic: Boolean(list.isPublic),
    allowedUsers: [...(list.allowedUsers || [])],
  };
}

function sameUserIds(a, b) {
  const left = [...a].sort();
  const right = [...(b || [])].sort();
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function usePendingListAccess() {
  const [pendingAccess, setPendingAccess] = useState(null);

  const resetPendingAccess = useCallback(() => {
    setPendingAccess(null);
  }, []);

  const getEffectiveAccess = useCallback(
    (list) => {
      if (!list) return { isPublic: false, allowedUsers: [] };
      return pendingAccess ?? initFromList(list);
    },
    [pendingAccess],
  );

  const isAccessDirty = useCallback(
    (list) => {
      if (!list || !pendingAccess) return false;
      if (pendingAccess.isPublic !== Boolean(list.isPublic)) return true;
      return !sameUserIds(pendingAccess.allowedUsers, list.allowedUsers);
    },
    [pendingAccess],
  );

  const togglePendingPublic = useCallback((list, isPublic) => {
    setPendingAccess((prev) => {
      const base = prev ?? initFromList(list);
      return { ...base, isPublic };
    });
  }, []);

  const togglePendingMember = useCallback((list, userId, hasAccess) => {
    if (userId === list.createdBy) return;

    setPendingAccess((prev) => {
      const base = prev ?? initFromList(list);
      let allowedUsers = [...base.allowedUsers];

      if (hasAccess) {
        allowedUsers = allowedUsers.filter((id) => id !== userId);
      } else if (!allowedUsers.includes(userId)) {
        allowedUsers.push(userId);
      }

      return { ...base, allowedUsers };
    });
  }, []);

  return {
    pendingAccess,
    resetPendingAccess,
    getEffectiveAccess,
    isAccessDirty,
    togglePendingPublic,
    togglePendingMember,
  };
}
