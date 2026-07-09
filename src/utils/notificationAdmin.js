import { isSuperAdmin, isAnyAdmin } from './roles';

/**
 * Глобальные уведомления (все семьи / global) — только владелец платформы.
 */
export function canManageNotifications({ profile, platformAdminUid = null }) {
  return isSuperAdmin(profile, platformAdminUid);
}

/**
 * Объявление своей семье — админ семьи или владелец платформы.
 */
export function canSendFamilyAnnouncement({ profile, platformAdminUid = null }) {
  return isAnyAdmin(profile, platformAdminUid);
}
